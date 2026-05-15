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
  async sendFriendRequest(fromUid, toUid) {
    await this.db.collection('friendRequests').add({
      from: fromUid, to: toUid, status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await this.db.collection('notifications').add({
      userId: toUid, type: 'friendRequest', fromUid, read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async acceptFriendRequest(requestId, fromUid, toUid) {
    await this.db.collection('friendRequests').doc(requestId).update({ status: 'accepted' });
    await this.db.collection('users').doc(toUid).update({
      friendIds:   firebase.firestore.FieldValue.arrayUnion(fromUid),
      friendCount: firebase.firestore.FieldValue.increment(1),
    });
    await this.db.collection('users').doc(fromUid).update({
      friendIds:   firebase.firestore.FieldValue.arrayUnion(toUid),
      friendCount: firebase.firestore.FieldValue.increment(1),
    });
    await this.db.collection('notifications').add({
      userId: fromUid, type: 'friendAccepted', fromUid: toUid, read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async declineFriendRequest(requestId) {
    await this.db.collection('friendRequests').doc(requestId).update({ status: 'declined' });
  },

  async getFriendRequests(uid) {
    const snap = await this.db.collection('friendRequests')
      .where('to', '==', uid).where('status', '==', 'pending').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getFriends(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.friendIds?.length) return [];
    return (await Promise.all(profile.friendIds.map(fid => this.getUserProfile(fid)))).filter(Boolean);
  },

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
      .orderBy('updatedAt', 'desc')
      .onSnapshot(snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
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
