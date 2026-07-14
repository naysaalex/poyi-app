// js/pages/profile.js
window.ProfilePage = {
  unsubs: [],
  activeTab: 'boards',
  view: 'profile', // 'profile' | 'settings'

  destroy() { this.unsubs.forEach(u => u()); this.unsubs = []; },

  render() {
    const el = document.createElement('div');
    el.className = 'profile-page';
    el.id = 'profile-page-root';
    if (this.view === 'settings') {
      this._renderSettingsView(el);
    } else {
      this._renderProfileView(el);
    }
    return el;
  },

  // ── Main profile view ──────────────────────────────────────
  _renderProfileView(el) {
    const user = window.currentProfile || {};
    const initials = UI.initials(user.displayName);

    el.innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar-wrap">
          ${user.photoURL
            ? `<img src="${user.photoURL}" class="profile-avatar-img profile-avatar-clickable" id="profile-avatar-click" alt="" title="Open settings">`
            : `<div class="profile-avatar-initials profile-avatar-clickable" id="profile-avatar-click" title="Open settings">${initials}</div>`}
        </div>
        <div class="profile-info">
          <h1 class="profile-name">${user.displayName || 'Your Name'}</h1>
          <p class="profile-handle">@${user.handle || ''}</p>
          ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
          <div class="profile-stats">
            <div style="cursor:pointer" id="own-follower-stat">
              <span class="stat-num" id="follower-count">0</span><span class="stat-label">followers</span>
            </div>
            <div style="cursor:pointer" id="own-following-stat">
              <span class="stat-num" id="following-count">0</span><span class="stat-label">following</span>
            </div>
            <div><span class="stat-num" id="board-count">0</span><span class="stat-label">boards</span></div>
          </div>
          ${UI.privacyBadge(user.isPublic ? 'public' : 'private')}
        </div>
        <button class="profile-settings-btn" id="profile-gear-btn" title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      <div class="profile-tabs">
        <button class="profile-tab ${this.activeTab==='boards'   ?'active':''}" data-tab="boards">Boards</button>
        <button class="profile-tab ${this.activeTab==='followers'?'active':''}" data-tab="followers">Followers</button>
        <button class="profile-tab ${this.activeTab==='following'?'active':''}" data-tab="following">Following</button>
        <button class="profile-tab ${this.activeTab==='find'     ?'active':''}" data-tab="find">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:3px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>Find
        </button>
      </div>
      <div class="profile-content" id="profile-content"></div>`;

    const openSettings = () => {
      this.view = 'settings';
      const root = document.getElementById('profile-page-root');
      root.innerHTML = '';
      this._renderSettingsView(root);
    };

    el.querySelector('#profile-gear-btn').onclick   = openSettings;
    el.querySelector('#profile-avatar-click').onclick = openSettings;

    el.querySelectorAll('.profile-tab').forEach(btn => {
      btn.onclick = () => {
        this.activeTab = btn.dataset.tab;
        el.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTab(btn.dataset.tab, el.querySelector('#profile-content'));
      };
    });

    // Follower/following stats on own profile → switch to that tab
    el.querySelector('#own-follower-stat').onclick = () => {
      this.activeTab = 'followers';
      el.querySelectorAll('.profile-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'followers'));
      this.renderTab('followers', el.querySelector('#profile-content'));
    };
    el.querySelector('#own-following-stat').onclick = () => {
      this.activeTab = 'following';
      el.querySelectorAll('.profile-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'following'));
      this.renderTab('following', el.querySelector('#profile-content'));
    };

    const boardUnsub = window.DB.subscribeToUserBoards(window.currentUser.uid, boards => {
      const c = document.getElementById('board-count');
      if (c) c.textContent = boards.length;
    });
    this.unsubs.push(boardUnsub);

    const profUnsub = window.DB.subscribeToUser(window.currentUser.uid, prof => {
      if (!prof) return;
      const fc  = document.getElementById('follower-count');
      const fwc = document.getElementById('following-count');
      if (fc)  fc.textContent  = (prof.followerIds  || []).length;
      if (fwc) fwc.textContent = (prof.followingIds || []).length;
    });
    this.unsubs.push(profUnsub);

    this.renderTab(this.activeTab, el.querySelector('#profile-content'));
  },

  // ── Settings view (accessed via gear icon or avatar click) ─
  _renderSettingsView(el) {
    const profile = window.currentProfile || {};
    let isPublic = profile.isPublic ?? true;

    el.innerHTML = `
      <div class="settings-header">
        <button class="settings-back-btn" id="settings-back-btn" title="Back to profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 class="settings-title">Settings</h1>
      </div>

      <div class="profile-content" style="padding-top:8px">

        <!-- Profile details -->
        <div class="settings-section">
          <div class="field"><label>Display name</label>
            <input id="s-name" value="${profile.displayName || ''}" />
          </div>
          <div class="field">
            <label>Handle</label>
            <div style="display:flex;align-items:center;border:1px solid var(--ink-20);border-radius:12px;overflow:hidden;background:var(--white)">
              <span style="padding:10px 0 10px 14px;color:var(--ink-40)">@</span>
              <input id="s-handle" value="${profile.handle || ''}" style="border:none;padding-left:4px" />
            </div>
          </div>
          <div class="field">
            <label>Email</label>
            <input value="${window.currentUser?.email || profile.email || ''}" disabled
              style="background:var(--sand);color:var(--ink-40);cursor:not-allowed"
              title="Email cannot be changed here" />
            <p class="hint" style="margin-top:4px">Email address cannot be changed from this screen.</p>
          </div>
          <div class="field">
            <label>Bio</label>
            <textarea id="s-bio" rows="3" placeholder="Tell the world where you've been...">${profile.bio || ''}</textarea>
          </div>
          <div class="field">
            <label>Account visibility</label>
            <div class="toggle-wrap" id="s-vis-toggle">
              <span id="s-vis-label" style="font-size:13px;color:var(--ink-60)">${isPublic ? 'Public' : 'Private'}</span>
              <button class="toggle ${isPublic ? 'on' : ''}" id="s-vis-btn"><span class="toggle-thumb"></span></button>
            </div>
            <p class="hint" id="s-vis-hint">${isPublic ? 'Anyone can view your profile.' : 'Only friends can see your boards.'}</p>
          </div>
          <button class="btn btn-clay btn-md btn-full" id="save-settings-btn">Save changes</button>
        </div>

        <!-- Danger zone -->
        <div style="background:var(--white);border:1px solid rgba(184,92,110,0.25);border-radius:var(--radius-lg);padding:20px;display:flex;flex-direction:column;gap:12px;margin-top:8px">
          <p style="font-size:13px;font-weight:600;color:var(--rose);text-transform:uppercase;letter-spacing:0.5px;padding-bottom:10px;border-bottom:0.5px solid rgba(184,92,110,0.15)">Danger Zone</p>
          <p style="font-size:13px;color:var(--ink-60);line-height:1.5">Permanently deletes your account, profile, and all associated data. This cannot be undone.</p>
          <button class="btn btn-danger btn-md" id="delete-account-btn">Delete My Account</button>
          <p id="delete-account-hint" style="font-size:11px;color:var(--ink-40);display:none;line-height:1.6">
            For security, you may be asked to sign in again before deletion can complete.
          </p>
        </div>

      </div>`;

    // ── Back arrow ───────────────────────────────────────────
    el.querySelector('#settings-back-btn').onclick = () => {
      this.view = 'profile';
      el.innerHTML = '';
      this._renderProfileView(el);
    };

    // ── Visibility toggle ─────────────────────────────────────
    const visBtn   = el.querySelector('#s-vis-btn');
    const visLabel = el.querySelector('#s-vis-label');
    const visHint  = el.querySelector('#s-vis-hint');
    el.querySelector('#s-vis-toggle').onclick = () => {
      isPublic = !isPublic;
      visBtn.classList.toggle('on', isPublic);
      visLabel.textContent = isPublic ? 'Public' : 'Private';
      visHint.textContent  = isPublic ? 'Anyone can view your profile.' : 'Only friends can see your boards.';
    };

    // ── Save changes ──────────────────────────────────────────
    el.querySelector('#save-settings-btn').onclick = async () => {
      const btn = el.querySelector('#save-settings-btn');
      btn.textContent = 'Saving...'; btn.disabled = true;
      await window.DB.updateUserProfile(window.currentUser.uid, {
        displayName: el.querySelector('#s-name').value.trim(),
        handle:      el.querySelector('#s-handle').value.toLowerCase().replace(/[^a-z0-9_.]/g, ''),
        bio:         el.querySelector('#s-bio').value.trim(),
        isPublic,
      });
      window.currentProfile = { ...window.currentProfile, isPublic };
      btn.textContent = '✓ Saved!';
      setTimeout(() => { btn.textContent = 'Save changes'; btn.disabled = false; }, 2000);
    };

    // ── Delete account ────────────────────────────────────────
    let deleteStep = 0;
    const deleteBtn  = el.querySelector('#delete-account-btn');
    const deleteHint = el.querySelector('#delete-account-hint');

    deleteBtn.onclick = async () => {
      if (deleteStep === 0) {
        deleteStep = 1;
        deleteBtn.textContent = 'Yes, permanently delete my account';
        deleteHint.style.display = 'block';
        setTimeout(() => {
          if (deleteStep === 1) {
            deleteStep = 0;
            deleteBtn.textContent = 'Delete My Account';
            deleteHint.style.display = 'none';
          }
        }, 8000);
        return;
      }

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting…';

      try {
        const uid = window.currentUser.uid;
        await window.DB.deleteUserProfile(uid);
        await firebase.auth().currentUser.delete();
        window._userSignedOut = true;
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          deleteBtn.textContent = 'Session expired — sign in again to confirm';
          deleteBtn.disabled = false;
          deleteHint.innerHTML = `
            Your session has expired. Please sign in again to complete account deletion.<br><br>
            <button class="btn btn-danger btn-sm" id="reauth-btn">Sign in & delete account</button>`;
          deleteHint.style.display = 'block';
          el.querySelector('#reauth-btn').onclick = async () => {
            try {
              const provider = new firebase.auth.GoogleAuthProvider();
              await firebase.auth().currentUser.reauthenticateWithPopup(provider);
              await window.DB.deleteUserProfile(window.currentUser.uid);
              await firebase.auth().currentUser.delete();
              window._userSignedOut = true;
            } catch (e) {
              UI.toast('Could not complete deletion: ' + (e.message || e.code), 'error');
              deleteBtn.textContent = 'Delete My Account';
              deleteBtn.disabled = false;
              deleteStep = 0;
            }
          };
        } else {
          UI.toast('Could not delete account: ' + (err.message || err.code), 'error');
          deleteBtn.textContent = 'Delete My Account';
          deleteBtn.disabled = false;
          deleteStep = 0;
        }
      }
    };
  },

  renderTab(tab, container) {
    container.innerHTML = '';
    if (tab === 'boards')    this.renderBoards(container);
    if (tab === 'followers') this.renderUserList(container, 'followers', window.currentUser.uid);
    if (tab === 'following') this.renderUserList(container, 'following', window.currentUser.uid);
    if (tab === 'find')      this.renderFindPeople(container);
  },

  renderBoards(container) {
    container.innerHTML = `
      <div class="profile-boards-header">
        <span class="section-label">Trip Boards</span>
        <button class="btn btn-clay btn-sm" id="new-trip-btn">+ New Trip</button>
      </div>
      <div class="boards-grid" id="boards-grid">
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
      </div>`;

    container.querySelector('#new-trip-btn').onclick = () => window.App.openNewTripModal();

    const unsub = window.DB.subscribeToUserBoards(window.currentUser.uid, boards => {
      const grid = container.querySelector('#boards-grid');
      if (!grid) return;
      grid.innerHTML = '';
      boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'board-card animate-fade-in';
        card.innerHTML = `
          <div class="board-card-thumb" style="background:${UI.boardGradient(board.title)}">
            <div style="position:absolute;top:8px;right:8px">${UI.privacyBadge(board.privacy)}</div>
          </div>
          <div class="board-card-meta">
            <p class="board-card-name">${board.title}</p>
            <p class="board-card-dest">${(board.destinations||[]).slice(0,3).join(' · ') || 'No destinations'}</p>
          </div>`;
        card.onclick = () => window.App.navigate('board-detail', { boardId: board.id });
        grid.appendChild(card);
      });
      const newCard = document.createElement('button');
      newCard.className = 'board-card-new';
      newCard.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>New Trip</span>`;
      newCard.onclick = () => window.App.openNewTripModal();
      grid.appendChild(newCard);
    });
    this.unsubs.push(unsub);
  },

  // ── Followers / Following list (shared renderer) ─────────
  renderUserList(container, mode, uid) {
    // mode: 'followers' | 'following'
    const isOwnProfile = uid === window.currentUser.uid;
    const emptyMsg = mode === 'followers'
      ? 'No followers yet.'
      : 'Not following anyone yet.';

    container.innerHTML = `
      <p class="section-label" style="margin-bottom:8px">${mode === 'followers' ? 'Followers' : 'Following'}</p>
      <div id="user-list"><p style="font-size:13px;color:var(--ink-40)">Loading…</p></div>`;

    // Load list
    const load = mode === 'followers'
      ? window.DB.getFollowers(uid)
      : window.DB.getFollowing(uid);

    load.then(async users => {
      const listEl = container.querySelector('#user-list');
      if (!listEl) return;
      if (!users.length) {
        listEl.innerHTML = `<p style="font-size:13px;color:var(--ink-40)">${emptyMsg}</p>`;
        return;
      }
      listEl.innerHTML = '';
      await Promise.all(users.map(async u => {
        const status = await window.DB.getFollowStatus(window.currentUser.uid, u.uid);
        listEl.appendChild(this.userRow(u, status));
      }));
    });
  },

  // ── Find People tab ──────────────────────────────────────────
  renderFindPeople(container) {
    container.innerHTML = `
      <div style="padding-bottom:12px;border-bottom:0.5px solid var(--ink-10);margin-bottom:16px">
        <div style="display:flex;gap:8px">
          <div class="search-bar" style="flex:1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input id="find-input" placeholder="Search by @handle or name…" autocomplete="off" autocapitalize="none" />
          </div>
          <button class="btn btn-clay btn-sm" id="find-btn">Search</button>
        </div>
        <p style="font-size:11px;color:var(--ink-40);margin-top:8px">
          Search for users by their handle — e.g. <em>sanah</em> or <em>sanah_alex</em>
        </p>
      </div>
      <div id="find-results"></div>`;

    const input   = container.querySelector('#find-input');
    const btn     = container.querySelector('#find-btn');
    const results = container.querySelector('#find-results');

    let debounceTimer = null;

    const doSearch = async () => {
      const q = input.value.trim().toLowerCase().replace('@', '');
      results.innerHTML = '';
      if (!q) return;

      results.innerHTML = '<p style="font-size:13px;color:var(--ink-40)">Searching…</p>';
      const found = await window.DB.searchUsers(q);
      const filtered = found.filter(u => u.uid !== window.currentUser.uid);

      results.innerHTML = '';
      if (!filtered.length) {
        results.innerHTML = `
          <div class="empty-state" style="padding:32px 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:40px;height:40px;color:var(--ink-20)">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p style="font-size:14px">No users found</p>
            <span>Try searching a different handle</span>
          </div>`;
        return;
      }

      await Promise.all(filtered.map(async u => {
        const status = await window.DB.getFollowStatus(window.currentUser.uid, u.uid);
        results.appendChild(this.userRow(u, status));
      }));
    };

    // Search on button click or Enter
    btn.onclick = doSearch;
    input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } };

    // Live search as user types (debounced 400ms)
    input.oninput = () => {
      clearTimeout(debounceTimer);
      if (!input.value.trim()) { results.innerHTML = ''; return; }
      debounceTimer = setTimeout(doSearch, 400);
    };

    // Focus the input immediately
    setTimeout(() => input.focus(), 50);
  },

  // ── User row ─────────────────────────────────────────────────
  // status: 'none' | 'requested' | 'following' | 'friends'
  userRow(user, status) {
    // Normalise uid — searchUsers returns {id, uid?, ...} so ensure uid is always set
    if (!user.uid && user.id) user.uid = user.id;
    const row = document.createElement('div');
    row.className = 'friend-row animate-fade-in';

    const privacyBadge = user.isPublic
      ? '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--leaf-light);color:var(--leaf);font-weight:500">Public</span>'
      : '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--ink-10);color:var(--ink-60);font-weight:500">Private</span>';
    const mutualBadge = status === 'friends'
      ? '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:rgba(74,103,65,0.12);color:var(--leaf);font-weight:500">Friends</span>'
      : '';

    row.innerHTML = `
      <div class="friend-avatar" style="cursor:pointer" title="View profile">
        ${user.photoURL ? `<img src="${user.photoURL}" alt="">` : UI.initials(user.displayName)}
      </div>
      <div class="friend-info" style="cursor:pointer;flex:1" title="View profile">
        <span class="friend-name">${user.displayName || user.handle}</span>
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:2px">
          <span class="friend-handle">@${user.handle}</span>
          ${privacyBadge}
          ${mutualBadge}
        </div>
      </div>
      <div class="friend-action" style="flex-shrink:0"></div>`;

    const openProfile = () => this.openUserProfile(user);
    row.querySelector('.friend-avatar').onclick = e => { e.stopPropagation(); openProfile(); };
    row.querySelector('.friend-info').onclick   = e => { e.stopPropagation(); openProfile(); };

    this._renderRowAction(row.querySelector('.friend-action'), user, status);
    return row;
  },

  _renderRowAction(container, user, status) {
    container.innerHTML = '';
    if (!user.uid && user.id) user.uid = user.id;
    const uid = window.currentUser.uid;

    if (status === 'friends' || status === 'following') {
      // Unfollow button
      // Public users: unfollow immediately (no confirmation)
      // Private users: require a confirmation tap
      const btn = document.createElement('button');
      btn.className   = 'btn btn-sand btn-sm';
      btn.textContent = status === 'friends' ? 'Friends ✓' : 'Following';
      let confirmState = false;

      btn.onclick = async e => {
        e.stopPropagation();

        if (!user.isPublic && !confirmState) {
          // Private user — ask to confirm
          confirmState = true;
          btn.textContent = 'Unfollow?';
          btn.classList.add('btn-danger-outline');
          setTimeout(() => {
            if (confirmState) {
              confirmState = false;
              btn.textContent = status === 'friends' ? 'Friends ✓' : 'Following';
              btn.classList.remove('btn-danger-outline');
            }
          }, 3000);
          return;
        }

        // Public user: unfollow immediately
        // Private user: already confirmed above
        btn.disabled = true; btn.textContent = '…';
        await window.DB.unfollowUser(uid, user.uid);
        this._renderRowAction(container, user, 'none');
      };
      container.appendChild(btn);

    } else if (status === 'requested') {
      // Pending request to private user — allow cancellation
      const btn = document.createElement('button');
      btn.className   = 'btn btn-sand btn-sm';
      btn.textContent = 'Requested';
      let confirmState = false;
      btn.onclick = async e => {
        e.stopPropagation();
        if (!confirmState) {
          confirmState = true;
          btn.textContent = 'Cancel request?';
          btn.classList.add('btn-danger-outline');
          setTimeout(() => {
            if (confirmState) {
              confirmState = false;
              btn.textContent = 'Requested';
              btn.classList.remove('btn-danger-outline');
            }
          }, 3000);
          return;
        }
        btn.disabled = true; btn.textContent = '…';
        await window.DB.cancelFollowRequest(uid, user.uid);
        this._renderRowAction(container, user, 'none');
      };
      container.appendChild(btn);

    } else {
      // Not following — show Follow button
      const btn = document.createElement('button');
      btn.className   = 'btn btn-clay btn-sm';
      btn.textContent = user.isPublic ? 'Follow' : 'Request';
      btn.onclick = async e => {
        e.stopPropagation();
        btn.disabled = true; btn.textContent = '…';
        const result = await window.DB.followUser(uid, user.uid);
        this._renderRowAction(container, user, result?.status || 'following');
      };
      container.appendChild(btn);
    }
  },

  // Legacy alias kept for any older references
  friendRow(user, status) { return this.userRow(user, status); },

  // ── Navigate to another user's full profile page ────────────
  openUserProfile(user) {
    if (!user.uid && user.id) user.uid = user.id;
    window.App.navigate('user-profile', { user });
  },
};

// ── UserProfilePage — read-only view of another user's profile ──
window.UserProfilePage = {
  unsubs: [],

  destroy() { this.unsubs.forEach(u => u()); this.unsubs = []; },

  render({ user }) {
    const el = document.createElement('div');
    el.className = 'profile-page';

    const initials = UI.initials(user.displayName);

    el.innerHTML = `
      <!-- Header with back arrow -->
      <div class="settings-header" style="padding:16px 20px 14px">
        <button class="settings-back-btn" id="up-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 class="settings-title" style="font-size:20px">${user.displayName || user.handle}</h1>
      </div>

      <!-- Profile hero -->
      <div class="profile-hero" style="border-bottom:0.5px solid var(--ink-10)">
        <div style="flex-shrink:0">
          <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg,var(--clay),var(--sky));display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--white)">
            ${user.photoURL ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover" alt="">` : initials}
          </div>
        </div>
        <div class="profile-info">
          <h1 class="profile-name">${user.displayName || user.handle}</h1>
          <p class="profile-handle">@${user.handle}</p>
          ${user.bio ? `<p class="profile-bio">${user.bio}</p>` : ''}
          <div class="profile-stats">
            <div id="up-follower-stat" style="cursor:pointer">
              <span class="stat-num" id="up-follower-count">—</span><span class="stat-label">followers</span>
            </div>
            <div id="up-following-stat" style="cursor:pointer">
              <span class="stat-num" id="up-following-count">—</span><span class="stat-label">following</span>
            </div>
            <div><span class="stat-num" id="up-board-count">—</span><span class="stat-label">boards</span></div>
          </div>
          ${UI.privacyBadge(user.isPublic ? 'public' : 'private')}
        </div>
        <!-- Follow button -->
        <div id="up-follow-action" style="flex-shrink:0;align-self:flex-start;margin-top:4px"></div>
      </div>

      <!-- Content -->
      <div class="profile-content" id="up-content"></div>`;

    // Back button
    el.querySelector('#up-back').onclick = () => window.App.navigate('profile');

    // Load live profile for counts — numbers are clickable to open modal
    window.DB.subscribeToUser(user.uid, prof => {
      if (!prof) return;
      const fc  = el.querySelector('#up-follower-count');
      const fwc = el.querySelector('#up-following-count');
      if (fc)  fc.textContent  = (prof.followerIds  || []).length;
      if (fwc) fwc.textContent = (prof.followingIds || []).length;
    });

    // Make follower/following counts open a slide-up modal
    el.querySelector('#up-follower-stat').onclick = () =>
      this._openFollowModal(user, 'followers');
    el.querySelector('#up-following-stat').onclick = () =>
      this._openFollowModal(user, 'following');

    // Follow button
    const followEl = el.querySelector('#up-follow-action');
    window.DB.getFollowStatus(window.currentUser.uid, user.uid).then(status => {
      this._renderFollowBtn(followEl, user, status);
    });

    // Content area
    const content = el.querySelector('#up-content');
    if (!user.isPublic) {
      content.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:48px;height:48px;color:var(--ink-20)">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p>Private account</p>
          <span>Follow ${user.displayName || user.handle} and they follow you back to see their boards.</span>
        </div>`;
      return el;
    }

    // Public account — boards only (followers/following via modal from stat numbers)
    content.innerHTML = `
      <div class="profile-boards-header" style="padding:16px 20px 8px">
        <span class="section-label">Public Boards</span>
      </div>
      <div class="boards-grid" style="padding:0 20px 20px" id="up-boards">
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
      </div>`;

    window.DB.getUserPublicBoards(user.uid).then(boards => {
      const grid = content.querySelector('#up-boards');
      if (!grid) return;
      const countEl = el.querySelector('#up-board-count');
      if (countEl) countEl.textContent = boards.length;
      if (!boards.length) {
        grid.innerHTML = '<p style="font-size:13px;color:var(--ink-40);grid-column:1/-1;padding:8px">No public boards yet.</p>';
        return;
      }
      grid.innerHTML = '';
      boards.forEach(board => {
        const card = document.createElement('div');
        card.className = 'board-card animate-fade-in';
        card.innerHTML = `
          <div class="board-card-thumb" style="background:${UI.boardGradient(board.title)};position:relative">
            ${UI.privacyBadge(board.privacy)}
          </div>
          <div class="board-card-meta">
            <p class="board-card-name">${board.title}</p>
            <p class="board-card-dest">${(board.destinations||[]).slice(0,3).join(' · ') || 'No destinations'}</p>
            ${board.startDate ? `<p style="font-size:10px;color:var(--ink-40);margin-top:3px">${board.startDate}${board.endDate ? ' → ' + board.endDate : ''}</p>` : ''}
          </div>`;
        card.onclick = () => window.App.navigate('board-detail', { boardId: board.id, viewOnly: true });
        grid.appendChild(card);
      });
    });

    return el;
  },

  // ── Followers / Following modal (opened by tapping stat numbers) ──
  _openFollowModal(user, mode) {
    const uid   = user.uid || user.id;
    if (!uid) { console.error('_openFollowModal: no uid on user', user); return; }
    // Patch uid onto user object so all downstream calls work
    user = { ...user, uid };
    const title = mode === 'followers' ? 'Followers' : 'Following';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(28,24,20,0.55);backdrop-filter:blur(4px);z-index:600;display:flex;align-items:flex-end;justify-content:center';

    const sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--cream);border-radius:24px 24px 0 0;width:100%;max-width:540px;max-height:80vh;display:flex;flex-direction:column;animation:slideUp 0.3s var(--ease) both';

    sheet.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:18px 20px 14px;border-bottom:0.5px solid var(--ink-10);flex-shrink:0">
        <button id="fm-back" style="width:34px;height:34px;border-radius:50%;border:0.5px solid var(--ink-20);background:var(--white);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink-60);flex-shrink:0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style="font-family:var(--font-display);font-style:italic;font-weight:300;font-size:22px;color:var(--ink);flex:1">${title}</h2>
      </div>
      <div id="fm-list" style="overflow-y:auto;flex:1;padding:8px 16px 24px;-webkit-overflow-scrolling:touch">
        <p style="font-size:13px;color:var(--ink-40);padding:16px 4px">Loading…</p>
      </div>`;

    const close = () => overlay.remove();
    sheet.querySelector('#fm-back').onclick = close;
    overlay.onclick = e => { if (e.target === overlay) close(); };

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    // Load users
    const load = mode === 'followers'
      ? window.DB.getFollowers(user.uid)
      : window.DB.getFollowing(user.uid);

    load.then(async users => {
      const listEl = sheet.querySelector('#fm-list');
      if (!users.length) {
        listEl.innerHTML = `<p style="font-size:13px;color:var(--ink-40);padding:16px 4px">No ${mode} yet.</p>`;
        return;
      }
      listEl.innerHTML = '';
      await Promise.all(users.map(async u => {
        const status = await window.DB.getFollowStatus(window.currentUser.uid, u.uid);
        listEl.appendChild(window.ProfilePage.userRow(u, status));
      }));
    });
  },

  _renderFollowBtn(container, user, status) {
    window.ProfilePage._renderRowAction(container, user, status);
  },
};
