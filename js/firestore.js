// js/firestore.js
// Uses the Firebase compat SDK (v10 compat) which is loaded globally
// via <script> tags in index.html before this file runs.
// All methods are available on window.firebaseDb directly.

window.DB = {
  get db() { return window.firebaseDb; },

  // ── USERS ─────────────────────────────────────────────────
  async createUserProfile(uid, data) {
    await this.db.collection('users').doc(uid).set({
      uid,
      displayName: data.displayName || '',
      handle:      data.handle      || '',
      email:       data.email       || '',
      photoURL:    data.photoURL    || '',
      bio:         '',
      isPublic:    true,
      friendIds:   [],
      friendCount: 0,
      boardCount:  0,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      ...data,
    }, { merge: true });
  },

  async getUserProfile(uid) {
    const snap = await this.db.collection('users').doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async deleteUserProfile(uid) {
    // Delete the Firestore profile document.
    // Note: boards, places, and vision images are NOT cascade-deleted here —
    // that would require Cloud Functions. They become orphaned but are
    // inaccessible since the Auth account is gone.
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
      .where('handle', '==', handle)
      .limit(1)
      .get();
    return snap.empty;
  },

  async searchUsers(term) {
    const snap = await this.db.collection('users')
      .where('handle', '>=', term)
      .where('handle', '<=', term + '\uf8ff')
      .limit(20)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeToUser(uid, cb) {
    return this.db.collection('users').doc(uid)
      .onSnapshot(snap => cb(snap.exists ? { id: snap.id, ...snap.data() } : null));
  },

  // ── FRIENDS ───────────────────────────────────────────────
  // ── Follow model ─────────────────────────────────────────────
  // One-way follows. Mutual follow = friends.
  // user.followingIds = people this user follows
  // user.followerIds  = people who follow this user
  // friendIds         = intersection (both follow each other)

  async followUser(fromUid, toUid) {
    // Add to following/followers arrays
    await this.db.collection('users').doc(fromUid).update({
      followingIds: firebase.firestore.FieldValue.arrayUnion(toUid),
    });
    await this.db.collection('users').doc(toUid).update({
      followerIds: firebase.firestore.FieldValue.arrayUnion(fromUid),
    });
    // Check if toUid already follows fromUid (mutual = friends)
    const toProfile = await this.getUserProfile(toUid);
    const isMutual  = (toProfile?.followingIds || []).includes(fromUid);
    if (isMutual) {
      // Both follow each other — add to friendIds on both
      await this.db.collection('users').doc(fromUid).update({
        friendIds: firebase.firestore.FieldValue.arrayUnion(toUid),
        friendCount: firebase.firestore.FieldValue.increment(1),
      });
      await this.db.collection('users').doc(toUid).update({
        friendIds: firebase.firestore.FieldValue.arrayUnion(fromUid),
        friendCount: firebase.firestore.FieldValue.increment(1),
      });
      // Notify both that they are now friends
      await this.db.collection('notifications').add({
        userId: toUid, type: 'friendAccepted', fromUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await this.db.collection('notifications').add({
        userId: fromUid, type: 'friendAccepted', fromUid: toUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // One-way — notify target that someone followed them
      await this.db.collection('notifications').add({
        userId: toUid, type: 'followed', fromUid, read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    return { mutual: isMutual };
  },

  async getFollowStatus(fromUid, toUid) {
    // Returns: 'none' | 'following' | 'friends'
    const profile = await this.getUserProfile(fromUid);
    if (!profile) return 'none';
    const following = profile.followingIds || [];
    const friends   = profile.friendIds    || [];
    if (friends.includes(toUid))   return 'friends';
    if (following.includes(toUid)) return 'following';
    return 'none';
  },

  async getFriends(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.friendIds?.length) return [];
    return (await Promise.all(profile.friendIds.map(fid => this.getUserProfile(fid)))).filter(Boolean);
  },

  async getFollowing(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.followingIds?.length) return [];
    return (await Promise.all(profile.followingIds.map(fid => this.getUserProfile(fid)))).filter(Boolean);
  },

  // Legacy — kept for notifications tab compatibility
  async getFriendRequests(uid) { return []; },
  async acceptFriendRequest(requestId, fromUid, toUid) {},
  async declineFriendRequest(requestId) {},
  async sendFriendRequest(fromUid, toUid) { return this.followUser(fromUid, toUid); },

  // ── NOTIFICATIONS ─────────────────────────────────────────
  subscribeToNotifications(uid, cb) {
    return this.db.collection('notifications')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
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

  // ── BOARDS ────────────────────────────────────────────────
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

  async getUserPublicBoards(uid) {
    const snap = await this.db.collection('boards')
      .where('ownerId', '==', uid)
      .where('privacy', '==', 'public')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeToUserBoards(uid, cb) {
    // No orderBy to avoid needing a composite Firestore index — sort client-side
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

  async inviteCollaborator(boardId, invitedUid, inviterUid) {
    await this.db.collection('notifications').add({
      userId: invitedUid, type: 'boardInvite', boardId, fromUid: inviterUid,
      read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async acceptBoardInvite(boardId, uid, notifId) {
    await this.db.collection('boards').doc(boardId).update({
      collaborators: firebase.firestore.FieldValue.arrayUnion(uid),
    });
    await this.db.collection('notifications').doc(notifId).update({
      read: true, status: 'accepted',
    });
  },

  // ── PLACES ────────────────────────────────────────────────
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

  // ── VISION IMAGES ─────────────────────────────────────────
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
