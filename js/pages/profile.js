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
            <div><span class="stat-num" id="friend-count">0</span><span class="stat-label">friends</span></div>
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
        <button class="profile-tab ${this.activeTab==='boards'?'active':''}" data-tab="boards">Boards</button>
        <button class="profile-tab ${this.activeTab==='friends'?'active':''}" data-tab="friends">Friends</button>
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

    const boardUnsub = window.DB.subscribeToUserBoards(window.currentUser.uid, boards => {
      const c = document.getElementById('board-count');
      if (c) c.textContent = boards.length;
    });
    this.unsubs.push(boardUnsub);

    const profUnsub = window.DB.subscribeToUser(window.currentUser.uid, prof => {
      const c = document.getElementById('friend-count');
      if (c && prof) c.textContent = prof.friendCount || 0;
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
    if (tab === 'boards')  this.renderBoards(container);
    if (tab === 'friends') this.renderFriends(container);
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

  renderFriends(container) {
    container.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <div class="search-bar" style="flex:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="friend-search" placeholder="Find friends by handle..." />
        </div>
        <button class="btn btn-clay btn-sm" id="friend-search-btn">Search</button>
      </div>
      <div id="friend-results"></div>
      <p class="section-label" style="margin-bottom:8px">Your Friends</p>
      <div id="friends-list"></div>`;

    const doSearch = async () => {
      const q = container.querySelector('#friend-search').value.trim().toLowerCase();
      if (!q) return;
      const resultsEl = container.querySelector('#friend-results');
      resultsEl.innerHTML = '<p class="section-label" style="margin-bottom:8px">Results</p>';
      const results = await window.DB.searchUsers(q);
      const filtered = results.filter(u => u.uid !== window.currentUser.uid);
      if (!filtered.length) {
        resultsEl.innerHTML += '<p style="font-size:13px;color:var(--ink-40)">No users found.</p>';
        return;
      }
      // Load current user's follow status for each result in parallel
      await Promise.all(filtered.map(async u => {
        const status = await window.DB.getFollowStatus(window.currentUser.uid, u.uid);
        resultsEl.appendChild(this.friendRow(u, status));
      }));
    };

    container.querySelector('#friend-search-btn').onclick = doSearch;
    container.querySelector('#friend-search').onkeydown = e => { if (e.key === 'Enter') doSearch(); };

    // Show friends list (mutual follows)
    window.DB.getFriends(window.currentUser.uid).then(friends => {
      const list = container.querySelector('#friends-list');
      if (!friends.length) {
        list.innerHTML = '<p style="font-size:13px;color:var(--ink-40)">No friends yet — follow someone and they follow back!</p>';
        return;
      }
      friends.forEach(f => list.appendChild(this.friendRow(f, 'friends')));
    });
  },

  // ── User row: shows avatar, name, follow button, view profile link ──
  friendRow(user, status) {
    // status: 'none' | 'following' | 'friends'
    const row = document.createElement('div');
    row.className = 'friend-row animate-fade-in';
    row.style.cursor = 'pointer';

    const badgeHtml = user.isPublic
      ? '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--leaf-light);color:var(--leaf);font-weight:500">Public</span>'
      : '<span style="font-size:10px;padding:2px 7px;border-radius:999px;background:var(--ink-10);color:var(--ink-60);font-weight:500">Private</span>';

    row.innerHTML = `
      <div class="friend-avatar" style="cursor:pointer" title="View profile">
        ${user.photoURL ? `<img src="${user.photoURL}" alt="">` : UI.initials(user.displayName)}
      </div>
      <div class="friend-info" style="cursor:pointer" title="View profile">
        <span class="friend-name">${user.displayName || user.handle}</span>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
          <span class="friend-handle">@${user.handle}</span>
          ${badgeHtml}
        </div>
      </div>
      <div class="friend-action"></div>`;

    // Clicking avatar or name opens profile view
    const openProfile = () => this.openUserProfile(user);
    row.querySelector('.friend-avatar').onclick = e => { e.stopPropagation(); openProfile(); };
    row.querySelector('.friend-info').onclick   = e => { e.stopPropagation(); openProfile(); };

    // Follow button
    const actionEl = row.querySelector('.friend-action');
    if (status === 'friends') {
      actionEl.innerHTML = '<span class="friends-tag">Friends ✓</span>';
    } else if (status === 'following') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sand btn-sm';
      btn.textContent = 'Following';
      btn.disabled = true;
      actionEl.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn btn-clay btn-sm';
      btn.textContent = 'Follow';
      btn.onclick = async e => {
        e.stopPropagation();
        btn.disabled = true;
        btn.textContent = '…';
        const result = await window.DB.followUser(window.currentUser.uid, user.uid);
        if (result?.mutual) {
          btn.remove();
          actionEl.innerHTML = '<span class="friends-tag">Friends ✓</span>';
        } else {
          btn.className   = 'btn btn-sand btn-sm';
          btn.textContent = 'Following';
        }
      };
      actionEl.appendChild(btn);
    }

    return row;
  },

  // ── Navigate to another user's full profile page ────────────
  openUserProfile(user) {
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

    // Public account — load boards
    content.innerHTML = `
      <div class="profile-boards-header">
        <span class="section-label">Public Boards</span>
      </div>
      <div class="boards-grid" id="up-boards">
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
        <div class="skeleton" style="aspect-ratio:4/3;border-radius:12px"></div>
      </div>`;

    window.DB.getUserPublicBoards(user.uid).then(boards => {
      const grid = content.querySelector('#up-boards');
      if (!grid) return;

      // Update board count in hero
      const countEl = el.querySelector('#up-board-count');
      if (countEl) countEl.textContent = boards.length;

      if (!boards.length) {
        grid.innerHTML = '<p style="font-size:13px;color:var(--ink-40);grid-column:1/-1">No public boards yet.</p>';
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
        // Navigate to board in view-only mode
        card.onclick = () => window.App.navigate('board-detail', {
          boardId:  board.id,
          viewOnly: true,
        });
        grid.appendChild(card);
      });
    });

    return el;
  },

  _renderFollowBtn(container, user, status) {
    container.innerHTML = '';
    if (status === 'friends') {
      container.innerHTML = '<span class="friends-tag">Friends ✓</span>';
    } else if (status === 'following') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sand btn-sm';
      btn.textContent = 'Following';
      btn.disabled = true;
      container.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn btn-clay btn-sm';
      btn.textContent = 'Follow';
      btn.onclick = async () => {
        btn.disabled = true; btn.textContent = '…';
        const result = await window.DB.followUser(window.currentUser.uid, user.uid);
        this._renderFollowBtn(container, user, result?.mutual ? 'friends' : 'following');
      };
      container.appendChild(btn);
    }
  },
};
