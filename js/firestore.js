// js/firestore.js
// All Firestore operations. Firebase SDK is loaded as ES module in index.html
// and exposed on window. We use dynamic import here to access it.

const FS = {
  get db() { return window.firebaseDb; },

  // ── import helpers lazily ─────────────────────────────────
  async _f() {
    return await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  },

  // ── USERS ─────────────────────────────────────────────────
  async createUserProfile(uid, data) {
    const f = await this._f();
    await f.setDoc(f.doc(this.db, 'users', uid), {
      uid, displayName: data.displayName || '', handle: data.handle || '',
      email: data.email || '', photoURL: data.photoURL || '',
      bio: '', isPublic: true, friendIds: [], friendCount: 0, boardCount: 0,
      createdAt: f.serverTimestamp(), ...data,
    }, { merge: true });
  },

  async getUserProfile(uid) {
    const f = await this._f();
    const snap = await f.getDoc(f.doc(this.db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async updateUserProfile(uid, data) {
    const f = await this._f();
    await f.updateDoc(f.doc(this.db, 'users', uid), { ...data, updatedAt: f.serverTimestamp() });
  },

  async searchUsers(term) {
    const f = await this._f();
    const q = f.query(
      f.collection(this.db, 'users'),
      f.where('handle', '>=', term),
      f.where('handle', '<=', term + '\uf8ff'),
      f.limit(20)
    );
    const snap = await f.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  subscribeToUser(uid, cb) {
    let unsub;
    this._f().then(f => {
      unsub = f.onSnapshot(f.doc(this.db, 'users', uid), snap =>
        cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      );
    });
    return () => unsub && unsub();
  },

  // ── FRIENDS ───────────────────────────────────────────────
  async sendFriendRequest(fromUid, toUid) {
    const f = await this._f();
    await f.addDoc(f.collection(this.db, 'friendRequests'), {
      from: fromUid, to: toUid, status: 'pending', createdAt: f.serverTimestamp(),
    });
    await f.addDoc(f.collection(this.db, 'notifications'), {
      userId: toUid, type: 'friendRequest', fromUid, read: false, createdAt: f.serverTimestamp(),
    });
  },

  async acceptFriendRequest(requestId, fromUid, toUid) {
    const f = await this._f();
    await f.updateDoc(f.doc(this.db, 'friendRequests', requestId), { status: 'accepted' });
    await f.updateDoc(f.doc(this.db, 'users', toUid),   { friendIds: f.arrayUnion(fromUid), friendCount: f.increment(1) });
    await f.updateDoc(f.doc(this.db, 'users', fromUid), { friendIds: f.arrayUnion(toUid),   friendCount: f.increment(1) });
    await f.addDoc(f.collection(this.db, 'notifications'), {
      userId: fromUid, type: 'friendAccepted', fromUid: toUid, read: false, createdAt: f.serverTimestamp(),
    });
  },

  async declineFriendRequest(requestId) {
    const f = await this._f();
    await f.updateDoc(f.doc(this.db, 'friendRequests', requestId), { status: 'declined' });
  },

  async getFriendRequests(uid) {
    const f = await this._f();
    const q = f.query(f.collection(this.db, 'friendRequests'), f.where('to', '==', uid), f.where('status', '==', 'pending'));
    const snap = await f.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getFriends(uid) {
    const profile = await this.getUserProfile(uid);
    if (!profile?.friendIds?.length) return [];
    return (await Promise.all(profile.friendIds.map(fid => this.getUserProfile(fid)))).filter(Boolean);
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────
  subscribeToNotifications(uid, cb) {
    let unsub;
    this._f().then(f => {
      const q = f.query(
        f.collection(this.db, 'notifications'),
        f.where('userId', '==', uid),
        f.orderBy('createdAt', 'desc'),
        f.limit(50)
      );
      unsub = f.onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => unsub && unsub();
  },

  async markNotificationRead(notifId) {
    const f = await this._f();
    await f.updateDoc(f.doc(this.db, 'notifications', notifId), { read: true });
  },

  async markAllNotificationsRead(uid) {
    const f = await this._f();
    const q = f.query(f.collection(this.db, 'notifications'), f.where('userId', '==', uid), f.where('read', '==', false));
    const snap = await f.getDocs(q);
    await Promise.all(snap.docs.map(d => f.updateDoc(d.ref, { read: true })));
  },

  // ── BOARDS ────────────────────────────────────────────────
  async createBoard(uid, data) {
    const f = await this._f();
    const ref = await f.addDoc(f.collection(this.db, 'boards'), {
      ownerId: uid, collaborators: [uid], title: data.title,
      privacy: data.privacy || 'private', destinations: data.destinations || [],
      startDate: data.startDate || null, endDate: data.endDate || null,
      visionBoardOn: data.visionBoardOn ?? true, tags: data.tags || [],
      coverImage: null, published: false, itinerary: [],
      createdAt: f.serverTimestamp(), updatedAt: f.serverTimestamp(),
    });
    await f.updateDoc(f.doc(this.db, 'users', uid), { boardCount: f.increment(1) });
    return ref.id;
  },

  async getBoard(boardId) {
    const f = await this._f();
    const snap = await f.getDoc(f.doc(this.db, 'boards', boardId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  subscribeToBoard(boardId, cb) {
    let unsub;
    this._f().then(f => {
      unsub = f.onSnapshot(f.doc(this.db, 'boards', boardId), snap =>
        cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      );
    });
    return () => unsub && unsub();
  },

  async updateBoard(boardId, data) {
    const f = await this._f();
    await f.updateDoc(f.doc(this.db, 'boards', boardId), { ...data, updatedAt: f.serverTimestamp() });
  },

  async deleteBoard(boardId, uid) {
    const f = await this._f();
    await f.deleteDoc(f.doc(this.db, 'boards', boardId));
    await f.updateDoc(f.doc(this.db, 'users', uid), { boardCount: f.increment(-1) });
  },

  subscribeToUserBoards(uid, cb) {
    let unsub;
    this._f().then(f => {
      const q = f.query(f.collection(this.db, 'boards'), f.where('collaborators', 'array-contains', uid), f.orderBy('updatedAt', 'desc'));
      unsub = f.onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => unsub && unsub();
  },

  async inviteCollaborator(boardId, invitedUid, inviterUid) {
    const f = await this._f();
    await f.addDoc(f.collection(this.db, 'notifications'), {
      userId: invitedUid, type: 'boardInvite', boardId, fromUid: inviterUid,
      read: false, createdAt: f.serverTimestamp(),
    });
  },

  async acceptBoardInvite(boardId, uid, notifId) {
    const f = await this._f();
    await f.updateDoc(f.doc(this.db, 'boards', boardId), { collaborators: f.arrayUnion(uid) });
    await f.updateDoc(f.doc(this.db, 'notifications', notifId), { read: true, status: 'accepted' });
  },

  // ── PLACES ────────────────────────────────────────────────
  async addPlace(boardId, place) {
    const f = await this._f();
    const ref = await f.addDoc(f.collection(this.db, 'boards', boardId, 'places'), {
      name: place.name, address: place.address || '', category: place.category || 'general',
      location: place.location || '', lat: place.lat || null, lng: place.lng || null,
      notes: place.notes || '', tags: place.tags || [], createdAt: f.serverTimestamp(),
    });
    return ref.id;
  },

  subscribeToBoardPlaces(boardId, cb) {
    let unsub;
    this._f().then(f => {
      const q = f.query(f.collection(this.db, 'boards', boardId, 'places'), f.orderBy('createdAt', 'asc'));
      unsub = f.onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => unsub && unsub();
  },

  async deletePlace(boardId, placeId) {
    const f = await this._f();
    await f.deleteDoc(f.doc(this.db, 'boards', boardId, 'places', placeId));
  },

  // ── VISION IMAGES ─────────────────────────────────────────
  async addVisionImage(boardId, image) {
    const f = await this._f();
    await f.addDoc(f.collection(this.db, 'boards', boardId, 'visionImages'), {
      url: image.url, sourceUrl: image.sourceUrl || '',
      tags: image.tags || [], addedBy: image.addedBy, createdAt: f.serverTimestamp(),
    });
  },

  subscribeToVisionImages(boardId, cb) {
    let unsub;
    this._f().then(f => {
      const q = f.query(f.collection(this.db, 'boards', boardId, 'visionImages'), f.orderBy('createdAt', 'desc'));
      unsub = f.onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => unsub && unsub();
  },

  async deleteVisionImage(boardId, imageId) {
    const f = await this._f();
    await f.deleteDoc(f.doc(this.db, 'boards', boardId, 'visionImages', imageId));
  },
};

window.DB = FS;
