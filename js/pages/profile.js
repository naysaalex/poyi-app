// js/pages/profile.js
window.ProfilePage = {
  unsubs: [],
  activeTab: 'boards',

  destroy() { this.unsubs.forEach(u => u()); this.unsubs = []; },

  render() {
    const el   = document.createElement('div');
    el.className = 'profile-page';
    const user = window.currentProfile || {};

    const initials = UI.initials(user.displayName);
    el.innerHTML = `
      <div class="profile-hero">
        <div>
          ${user.photoURL
            ? `<img src="${user.photoURL}" class="profile-avatar-img" alt="">`
            : `<div class="profile-avatar-initials">${initials}</div>`}
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
      </div>
      <div class="profile-tabs">
        <button class="profile-tab active" data-tab="boards">Boards</button>
        <button class="profile-tab" data-tab="friends">Friends</button>
        <button class="profile-tab" data-tab="settings">Settings</button>
      </div>
      <div class="profile-content" id="profile-content"></div>`;

    const content = el.querySelector('#profile-content');

    // Tab switching
    el.querySelectorAll('.profile-tab').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.profile-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTab(btn.dataset.tab, content);
      };
    });

    // Live board count
    const boardUnsub = window.DB.subscribeToUserBoards(window.currentUser.uid, boards => {
      el.querySelector('#board-count').textContent = boards.length;
    });
    this.unsubs.push(boardUnsub);

    // Live profile for friend count
    const profUnsub = window.DB.subscribeToUser(window.currentUser.uid, prof => {
      if (prof) el.querySelector('#friend-count').textContent = prof.friendCount || 0;
    });
    this.unsubs.push(profUnsub);

    this.renderTab('boards', content);
    return el;
  },

  renderTab(tab, container) {
    container.innerHTML = '';
    if (tab === 'boards')   this.renderBoards(container);
    if (tab === 'friends')  this.renderFriends(container);
    if (tab === 'settings') this.renderSettings(container);
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
      // Add new trip card
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
      const results = await window.DB.searchUsers(q);
      const resultsEl = container.querySelector('#friend-results');
      resultsEl.innerHTML = '<p class="section-label" style="margin-bottom:8px">Results</p>';
      results.filter(u => u.uid !== window.currentUser.uid).forEach(u => {
        const row = this.friendRow(u, 'add');
        resultsEl.appendChild(row);
      });
    };

    container.querySelector('#friend-search-btn').onclick = doSearch;
    container.querySelector('#friend-search').onkeydown = e => { if (e.key === 'Enter') doSearch(); };

    window.DB.getFriends(window.currentUser.uid).then(friends => {
      const list = container.querySelector('#friends-list');
      if (!friends.length) {
        list.innerHTML = '<p style="font-size:13px;color:var(--ink-40)">No friends yet — search to connect!</p>';
        return;
      }
      friends.forEach(f => list.appendChild(this.friendRow(f, 'following')));
    });
  },

  friendRow(user, action) {
    const row = document.createElement('div');
    row.className = 'friend-row animate-fade-in';
    row.innerHTML = `
      <div class="friend-avatar">
        ${user.photoURL ? `<img src="${user.photoURL}" alt="">` : UI.initials(user.displayName)}
      </div>
      <div class="friend-info">
        <span class="friend-name">${user.displayName || user.handle}</span>
        <span class="friend-handle">@${user.handle}</span>
      </div>
      <div class="friend-action"></div>`;

    const actionEl = row.querySelector('.friend-action');
    if (action === 'add') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-clay btn-sm';
      btn.textContent = 'Add';
      btn.onclick = async () => {
        await window.DB.sendFriendRequest(window.currentUser.uid, user.uid);
        btn.textContent = 'Requested';
        btn.className = 'btn btn-sand btn-sm';
        btn.disabled = true;
      };
      actionEl.appendChild(btn);
    } else {
      actionEl.innerHTML = '<span class="friends-tag">Friends</span>';
    }
    return row;
  },

  renderSettings(container) {
    const profile = window.currentProfile || {};
    container.innerHTML = `
      <div class="settings-section">
        <div class="field"><label>Display name</label><input id="s-name" value="${profile.displayName || ''}" /></div>
        <div class="field"><label>Handle</label>
          <div style="display:flex;align-items:center;border:1px solid var(--ink-20);border-radius:12px;overflow:hidden;background:var(--white)">
            <span style="padding:10px 0 10px 14px;color:var(--ink-40)">@</span>
            <input id="s-handle" value="${profile.handle || ''}" style="border:none;padding-left:4px" />
          </div>
        </div>
        <div class="field"><label>Bio</label><textarea id="s-bio" rows="3" placeholder="Tell the world where you've been...">${profile.bio || ''}</textarea></div>
        <div class="field">
          <label>Account visibility</label>
          <div class="toggle-wrap" id="s-vis-toggle">
            <span id="s-vis-label" style="font-size:13px;color:var(--ink-60)">${profile.isPublic ? 'Public' : 'Private'}</span>
            <button class="toggle ${profile.isPublic ? 'on' : ''}" id="s-vis-btn"><span class="toggle-thumb"></span></button>
          </div>
          <p class="hint" id="s-vis-hint">${profile.isPublic ? 'Anyone can view your profile.' : 'Only friends can see your boards.'}</p>
        </div>
        <button class="btn btn-clay btn-md btn-full" id="save-settings-btn">Save changes</button>
      </div>

      <!-- Danger zone -->
      <div style="background:var(--white);border:1px solid rgba(184,92,110,0.25);border-radius:var(--radius-lg);padding:20px;display:flex;flex-direction:column;gap:12px;margin-top:8px">
        <p style="font-size:13px;font-weight:600;color:var(--rose);text-transform:uppercase;letter-spacing:0.5px;padding-bottom:10px;border-bottom:0.5px solid rgba(184,92,110,0.15)">Danger Zone</p>
        <p style="font-size:13px;color:var(--ink-60);line-height:1.5">Permanently deletes your account, profile, and all associated data. This cannot be undone.</p>
        <button class="btn btn-danger btn-md" id="delete-account-btn">Delete My Account</button>
        <p id="delete-account-hint" style="font-size:11px;color:var(--ink-40);display:none">
          For security, Google-linked accounts must re-authenticate before deletion.
          You'll be prompted to sign in again — then the account will be permanently removed.
        </p>
      </div>`;

    let isPublic = profile.isPublic ?? true;
    const visBtn   = container.querySelector('#s-vis-btn');
    const visLabel = container.querySelector('#s-vis-label');
    const visHint  = container.querySelector('#s-vis-hint');

    container.querySelector('#s-vis-toggle').onclick = () => {
      isPublic = !isPublic;
      visBtn.classList.toggle('on', isPublic);
      visLabel.textContent = isPublic ? 'Public' : 'Private';
      visHint.textContent  = isPublic ? 'Anyone can view your profile.' : 'Only friends can see your boards.';
    };

    container.querySelector('#save-settings-btn').onclick = async () => {
      const btn = container.querySelector('#save-settings-btn');
      btn.textContent = 'Saving...'; btn.disabled = true;
      await window.DB.updateUserProfile(window.currentUser.uid, {
        displayName: container.querySelector('#s-name').value.trim(),
        handle:      container.querySelector('#s-handle').value.toLowerCase().replace(/[^a-z0-9_.]/g,''),
        bio:         container.querySelector('#s-bio').value.trim(),
        isPublic,
      });
      btn.textContent = '✓ Saved!';
      setTimeout(() => { btn.textContent = 'Save changes'; btn.disabled = false; }, 2000);
    };

    // ── Account deletion ──────────────────────────────────────
    let deleteStep = 0;
    const deleteBtn  = container.querySelector('#delete-account-btn');
    const deleteHint = container.querySelector('#delete-account-hint');

    deleteBtn.onclick = async () => {
      if (deleteStep === 0) {
        // First click — ask for confirmation
        deleteStep = 1;
        deleteBtn.textContent = 'Yes, permanently delete my account';
        deleteBtn.style.opacity = '1';
        deleteHint.style.display = 'block';
        // Auto-reset after 8 seconds if user doesn't confirm
        setTimeout(() => {
          if (deleteStep === 1) {
            deleteStep = 0;
            deleteBtn.textContent = 'Delete My Account';
            deleteHint.style.display = 'none';
          }
        }, 8000);
        return;
      }

      // Second click — execute deletion
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting…';

      try {
        const user = window.currentUser;
        const uid  = user.uid;

        // 1. Delete Firestore profile first (user is still authenticated here)
        await window.DB.deleteUserProfile(uid);

        // 2. Delete Firebase Auth account
        //    This may throw 'auth/requires-recent-login' for old sessions —
        //    handled below with a re-auth prompt.
        await user.delete();

        // 3. onAuthStateChanged fires → shows logout screen
        window._userSignedOut = true;

      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          // Session is stale — re-authenticate then retry
          deleteBtn.textContent = 'Re-authenticate to confirm deletion';
          deleteBtn.disabled = false;
          deleteHint.innerHTML = `
            Your session has expired. Sign in again to complete account deletion.
            <br><br>
            <button class="btn btn-danger btn-sm" id="reauth-btn">Sign in & delete account</button>`;
          deleteHint.style.display = 'block';

          container.querySelector('#reauth-btn').onclick = async () => {
            try {
              // Re-authenticate via Google popup (works for both Google and email users)
              const provider = new firebase.auth.GoogleAuthProvider();
              await firebase.auth().currentUser.reauthenticateWithPopup(provider);
              // Now retry deletion
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
};
