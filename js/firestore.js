// js/firestore.js
// Uses the Firebase compat SDK (v10 compat) which is loaded globally
// via <script> tags in index.html before this file runs.

window.DB = {
  get db() { return window.firebaseDb; },

  // ── USERS ──────────────────────────────────────────────────
  async createUserProfile(uid, data) {
    await this.db.collection('users').doc(uid).set({
      uid,
      displayName:  data.displayName || '',
      handle:       data.handle      || '',
      email:        data.email       || '',
      photoURL:     data.photoURL    || '',
      bio:          '',
      isPublic:     true,
      friendIds:    [],
      friendCount:  0,
      followingIds: [],
      followerIds:  [],
      boardCount:   0,
      createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      ...data,
    }, { merge: true });
  },

  async getUserProfile(uid) {
    const snap = await this.db.collection('users').doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async deleteUserProfile(uid) {
    await this.db.collection('users').doc(uid).delete();
  },

  async updateUserProfile(uid, data) {
    await this.db.collection('users').doc(uid).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async checkHandleAvailable(handle) {
    const snap = await this.db.collection('users')
      .where('handle', '==', handle).limit(1).get();
    return snap.empty;
  },

  async searchUsers(term) {
    const t = term.trim().toLowerCase();
    if (!t) return [];

    // Fetch all users and filter client-side.
    // Avoids Firestore index requirements and case-sensitivity issues,
    // and matches the term anywhere in handle or displayName (not just prefix).
    const snap = await this.db.collection('users').limit(500).get();
    return snap.docs
      .map(d => { const data = d.data(); return { id: d.id, uid: data.uid || d.id, ...data }; })
      .filter(u =>
        (u.handle      || '').toLowerCase().includes(t) ||
        (u.displayName || '').toLowerCase().includes(t)
      );
  },

  subscribeToUser(uid, cb) {
    return this.db.collection('users').doc(uid)
      .onSnapshot(snap => cb(snap.exists ? { id: snap.id, ...snap.data() } : null));
  },

  // ── FOLLOW MODEL ───────────────────────────────────────────
  //
  // Public user  → follow is instant
  // Private user → creates a followRequest doc; target accepts/rejects
  // Mutual follow (A follows B AND B follows A) → both are friends
  //
  // Firestore collections:
  //   users/{uid}.followingIds  — uids this user follows
  //   users/{uid}.followerIds   — uids that follow this user
  //   users/{uid}.friendIds     — mutual follows
  //   followRequests/{id}       — { from, to, status: pending|accepted|rejected }

  async getFollowStatus(fromUid, toUid) {
    // Returns: 'none' | 'requested' | 'following' | 'friends'
    // First check the profile arrays — no extra Firestore query needed.
    const profile = await this.getUserProfile(fromUid);
    if (!profile) return 'none';
    if ((profile.friendIds    || []).includes(toUid)) return 'friends';
    if ((profile.followingIds || []).includes(toUid)) return 'following';
    // Only check followRequests if the target is a private user
    // (avoids composite index requirement on public-user searches)
    const toProfile = await this.getUserProfile(toUid);
    if (!toProfile || toProfile.isPublic) return 'none';
    try {
      const reqSnap = await this.db.collection('followRequests')
        .where('from', '==', fromUid)
        .where('to',   '==', toUid)
        .where('status', '==', 'pending')
        .limit(1).get();
      if (!reqSnap.empty) return 'requested';
    } catch (e) {
      // composite index not yet created — treat as 'none'
      console.warn('followRequests index missing, treating as none:', e.code);
    }
    return 'none';
  },

  async followUser(fromUid, toUid) {
    // Check if target is public or private
    const toProfile = await this.getUserProfile(toUid);
    if (!toProfile) return { status: 'error' };

    if (toProfile.isPublic) {
      // ── PUBLIC: instant follow ──────────────────────────────
      await this.db.collection('users').doc(fromUid).update({
        followingIds: firebase.firestore.FieldValue.arrayUnion(toUid),
      });
      await this.db.collection('users').doc(toUid).update({
        followerIds: firebase.firestore.FieldValue.arrayUnion(fromUid),
      });
      // Check mutual
      const isMutual = (toProfile.followingIds || []).includes(fromUid);
      if (isMutual) {
        await this.db.collection('users').doc(fromUid).update({
          friendIds:   firebase.firestore.FieldValue.arrayUnion(toUid),
          friendCount: firebase.firestore.FieldValue.increment(1),
        });
        await this.db.collection('users').doc(toUid).update({
          friendIds:   firebase.firestore.FieldValue.arrayUnion(fromUid),
          friendCount: firebase.firestore.FieldValue.increment(1),
        });
        await this.db.collection('notifications').add({
          userId: toUid, type: 'friendAccepted', fromUid, read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        await this.db.collection('notifications').add({
          userId: fromUid, type: 'friendAccepted', fromUid: toUid, read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { status: 'friends' };
      } else {
        await this.db.collection('notifications').add({
          userId: toUid, type: 'followed', fromUid, read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return { status: 'following' };
      }
    } else {
      // ── PRIVATE: send follow request ────────────────────────
      await this.db.collection('followRequests').add({
        from: fromUid, to: toUid, status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.db.collection('notifications').add({
        userId: toUid, type: 'followRequest', fromUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { status: 'requested' };
    }
  },

  async acceptFollowRequest(requestId, fromUid, toUid) {
    // Mark request accepted
    await this.db.collection('followRequests').doc(requestId).update({ status: 'accepted' });
    // Add to following/followers
    await this.db.collection('users').doc(fromUid).update({
      followingIds: firebase.firestore.FieldValue.arrayUnion(toUid),
    });
    await this.db.collection('users').doc(toUid).update({
      followerIds: firebase.firestore.FieldValue.arrayUnion(fromUid),
    });
    // Check mutual
    const toProfile = await this.getUserProfile(toUid);
    const isMutual  = (toProfile?.followingIds || []).includes(fromUid);
    if (isMutual) {
      await this.db.collection('users').doc(fromUid).update({
        friendIds:   firebase.firestore.FieldValue.arrayUnion(toUid),
        friendCount: firebase.firestore.FieldValue.increment(1),
      });
      await this.db.collection('users').doc(toUid).update({
        friendIds:   firebase.firestore.FieldValue.arrayUnion(fromUid),
        friendCount: firebase.firestore.FieldValue.increment(1),
      });
    }
    if (isMutual) {
      // Both follow each other — send friendAccepted to both
      await this.db.collection('notifications').add({
        userId: fromUid, type: 'friendAccepted', fromUid: toUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.db.collection('notifications').add({
        userId: toUid, type: 'friendAccepted', fromUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // One-way — just notify requester their request was accepted
      await this.db.collection('notifications').add({
        userId: fromUid, type: 'followAccepted', fromUid: toUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    return { mutual: isMutual };
  },

  async rejectFollowRequest(requestId) {
    await this.db.collection('followRequests').doc(requestId)
      .update({ status: 'rejected' });
  },

  async getPendingFollowRequest(fromUid, toUid) {
    const snap = await this.db.collection('followRequests')
      .where('from', '==', fromUid)
      .where('to',   '==', toUid)
      .where('status', '==', 'pending')
      .limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async unfollowUser(fromUid, toUid) {
    // Check if they were friends BEFORE removing (need original data)
    const fromProfile = await this.getUserProfile(fromUid);
    const wasFriend   = (fromProfile?.friendIds || []).includes(toUid);

    // Remove from following/followers/friends on both sides
    const batch = this.db.batch();
    batch.update(this.db.collection('users').doc(fromUid), {
      followingIds: firebase.firestore.FieldValue.arrayRemove(toUid),
      friendIds:    firebase.firestore.FieldValue.arrayRemove(toUid),
      ...(wasFriend ? { friendCount: firebase.firestore.FieldValue.increment(-1) } : {}),
    });
    batch.update(this.db.collection('users').doc(toUid), {
      followerIds: firebase.firestore.FieldValue.arrayRemove(fromUid),
      friendIds:   firebase.firestore.FieldValue.arrayRemove(fromUid),
      ...(wasFriend ? { friendCount: firebase.firestore.FieldValue.increment(-1) } : {}),
    });
    await batch.commit();
  },

  async cancelFollowRequest(fromUid, toUid) {
    const snap = await this.db.collection('followRequests')
      .where('from', '==', fromUid)
      .where('to',   '==', toUid)
      .where('status', '==', 'pending')
      .limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({ status: 'cancelled' });
    }
  },

  async getFollowers(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.followerIds?.length) return [];
    return (await Promise.all(
      profile.followerIds.map(fid => this.getUserProfile(fid))
    )).filter(Boolean);
  },

  async getFollowing(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.followingIds?.length) return [];
    return (await Promise.all(
      profile.followingIds.map(fid => this.getUserProfile(fid))
    )).filter(Boolean);
  },

  async getFriends(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.friendIds?.length) return [];
    return (await Promise.all(
      profile.friendIds.map(fid => this.getUserProfile(fid))
    )).filter(Boolean);
  },

  // ── NOTIFICATIONS ──────────────────────────────────────────
  subscribeToNotifications(uid, cb) {
    // No orderBy — avoids needing a composite Firestore index. Sort client-side.
    return this.db.collection('notifications')
      .where('userId', '==', uid)
      .limit(50)
      .onSnapshot(snap => {
        const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        notifs.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return tb - ta;
        });
        cb(notifs);
      });
  },

  async markNotificationRead(notifId) {
    await this.db.collection('notifications').doc(notifId).update({ read: true });
  },

  async markAllNotificationsRead(uid) {
    const snap = await this.db.collection('notifications')
      .where('userId', '==', uid).where('read', '==', false).get();
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  },

  // ── BOARDS ─────────────────────────────────────────────────
  async createBoard(uid, data) {
    const ref = await this.db.collection('boards').add({
      ownerId:       uid,
      collaborators: [uid],
      title:         data.title,
      privacy:       data.privacy       || 'private',
      destinations:  data.destinations  || [],
      startDate:     data.startDate     || null,
      endDate:       data.endDate       || null,
      flyInAirport:  data.flyInAirport  || null,
      flyInTime:     data.flyInTime     || null,
      flyOutAirport: data.flyOutAirport || null,
      flyOutTime:    data.flyOutTime    || null,
      visionBoardOn: data.visionBoardOn ?? true,
      tags:          data.tags          || [],
      coverImage:    null,
      published:     false,
      itinerary:     [],
      createdAt:     firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:     firebase.firestore.FieldValue.serverTimestamp(),
    });
    await this.db.collection('users').doc(uid).update({
      boardCount: firebase.firestore.FieldValue.increment(1),
    });
    return ref.id;
  },

  async getBoard(boardId) {
    const snap = await this.db.collection('boards').doc(boardId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  subscribeToBoard(boardId, cb) {
    return this.db.collection('boards').doc(boardId)
      .onSnapshot(snap => cb(snap.exists ? { id: snap.id, ...snap.data() } : null));
  },

  async updateBoard(boardId, data) {
    await this.db.collection('boards').doc(boardId).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async deleteBoard(boardId, uid) {
    await this.db.collection('boards').doc(boardId).delete();
    await this.db.collection('users').doc(uid).update({
      boardCount: firebase.firestore.FieldValue.increment(-1),
    });
  },

  subscribeToUserBoards(uid, cb) {
    return this.db.collection('boards')
      .where('collaborators', 'array-contains', uid)
      .onSnapshot(snap => {
        const boards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        boards.sort((a, b) => {
          const ta = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
          const tb = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
          return tb - ta;
        });
        cb(boards);
      });
  },

  async getUserPublicBoards(uid) {
    const snap = await this.db.collection('boards')
      .where('ownerId',  '==', uid)
      .where('privacy', '==', 'public')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Fetch boards visible to current viewer based on their relationship:
  //   self      → all boards (public, followers, friends, private)
  //   friends   → public + followers + friends boards
  //   following → public + followers boards
  //   none      → public boards only
  async getUserVisibleBoards(uid, viewerRelation) {
    // Query only the privacy levels this viewer is allowed to see.
    // We query each level separately to avoid Firestore rules blocking
    // a combined query that includes boards the viewer can't access.
    const viewerUid = window.currentUser?.uid;

    if (viewerUid === uid) {
      // Own profile — fetch all privacy levels
      const snap = await this.db.collection('boards').where('ownerId', '==', uid).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Build the set of privacy levels this viewer can see
    const levels = ['public'];
    if (viewerRelation === 'following' || viewerRelation === 'friends') {
      levels.push('followers');
    }
    if (viewerRelation === 'friends') {
      levels.push('friends');
    }

    // Run one query per visible privacy level and merge results
    const snaps = await Promise.all(
      levels.map(level =>
        this.db.collection('boards')
          .where('ownerId', '==', uid)
          .where('privacy', '==', level)
          .get()
      )
    );

    const seen = new Set();
    const results = [];
    snaps.forEach(snap => {
      snap.docs.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push({ id: d.id, ...d.data() });
        }
      });
    });
    return results;
  },

  async inviteCollaborator(boardId, invitedUid, inviterUid) {
    // Check for existing pending invite to avoid duplicates
    const existing = await this.db.collection('notifications')
      .where('userId',  '==', invitedUid)
      .where('type',    '==', 'boardInvite')
      .where('boardId', '==', boardId)
      .where('read',    '==', false)
      .limit(1).get();
    if (!existing.empty) return; // already invited

    // Fetch board name so the recipient sees it without needing board read access
    let boardName = '';
    try {
      const board = await this.getBoard(boardId);
      boardName = board?.title || '';
    } catch(e) {}

    await this.db.collection('notifications').add({
      userId:    invitedUid,
      type:      'boardInvite',
      boardId,
      boardName,
      fromUid:   inviterUid,
      read:      false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async acceptBoardInvite(boardId, uid, notifId) {
    // Add to collaborators
    await this.db.collection('boards').doc(boardId).update({
      collaborators: firebase.firestore.FieldValue.arrayUnion(uid),
    });
    // Mark notification read
    await this.db.collection('notifications').doc(notifId).update({
      read: true, status: 'accepted',
    });
    // Notify the board owner that their invite was accepted
    const board = await this.getBoard(boardId);
    if (board && board.ownerId !== uid) {
      const accepter = await this.getUserProfile(uid);
      await this.db.collection('notifications').add({
        userId:    board.ownerId,
        type:      'boardInviteAccepted',
        boardId,
        fromUid:   uid,
        boardName: board.title || 'your board',
        read:      false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  },

  // ── PLACES ─────────────────────────────────────────────────
  async addPlace(boardId, place) {
    const ref = await this.db.collection('boards').doc(boardId)
      .collection('places').add({
        name:      place.name,
        address:   place.address   || '',
        category:  place.category  || 'general',
        location:  place.location  || '',
        lat:       place.lat       || null,
        lng:       place.lng       || null,
        notes:     place.notes     || '',
        tags:      place.tags      || [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    return ref.id;
  },

  subscribeToBoardPlaces(boardId, cb) {
    return this.db.collection('boards').doc(boardId)
      .collection('places').orderBy('createdAt', 'asc')
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  async deletePlace(boardId, placeId) {
    await this.db.collection('boards').doc(boardId)
      .collection('places').doc(placeId).delete();
  },

  // ── VISION IMAGES ──────────────────────────────────────────
  async addVisionImage(boardId, image) {
    await this.db.collection('boards').doc(boardId)
      .collection('visionImages').add({
        url:       image.url,
        sourceUrl: image.sourceUrl || '',
        tags:      image.tags      || [],
        addedBy:   image.addedBy,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
  },

  subscribeToVisionImages(boardId, cb) {
    return this.db.collection('boards').doc(boardId)
      .collection('visionImages').orderBy('createdAt', 'desc')
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  },

  async deleteVisionImage(boardId, imageId) {
    await this.db.collection('boards').doc(boardId)
      .collection('visionImages').doc(imageId).delete();
  },
};
