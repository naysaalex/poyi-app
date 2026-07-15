// js/pages/notifications.js
window.NotificationsPage = {
  unsub: null,

  destroy() { this.unsub && this.unsub(); },

  render() {
    const el = document.createElement('div');
    el.className = 'notifs-page';
    el.innerHTML = `
      <div class="notifs-header">
        <h1 class="page-title">notifications</h1>
        <button class="notifs-mark-all" id="mark-all-btn" style="display:none">Mark all read</button>
      </div>
      <div class="notifs-list" id="notifs-list"></div>`;

    const list       = el.querySelector('#notifs-list');
    const markAllBtn = el.querySelector('#mark-all-btn');
    markAllBtn.onclick = () => window.DB.markAllNotificationsRead(window.currentUser.uid);

    const senders   = {};
    const loadSender = async uid => {
      if (uid && !senders[uid]) senders[uid] = await window.DB.getUserProfile(uid) || {};
      return senders[uid] || {};
    };

    this.unsub = window.DB.subscribeToNotifications(window.currentUser.uid, async notifs => {
      const unread = notifs.filter(n => !n.read);
      markAllBtn.style.display = unread.length ? 'block' : 'none';

      if (!notifs.length) {
        list.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p>You're all caught up!</p></div>`;
        return;
      }

      // Pre-load all sender profiles
      await Promise.all(
        [...new Set(notifs.map(n => n.fromUid).filter(Boolean))].map(loadSender)
      );

      list.innerHTML = '';
      notifs.forEach(n => {
        const sender   = senders[n.fromUid] || {};
        const initials = UI.initials(sender.displayName || sender.handle || '?');
        const ts       = UI.timeAgo(n.createdAt);

        const typeColors = {
          followRequest:       'var(--sky)',
          followAccepted:      'var(--leaf)',
          friendAccepted:      'var(--leaf)',
          followed:            'var(--sky)',
          boardInvite:         'var(--clay)',
          boardInviteAccepted: 'var(--leaf)',
        };
        const color = typeColors[n.type] || 'var(--ink-40)';

        const typeMessages = {
          followRequest:       'sent you a follow request',
          followAccepted:      'accepted your follow request',
          friendAccepted:      'is now your friend — you follow each other! 🎉',
          followed:            'started following you',
          boardInvite:         'invited you to collaborate on a board',
          boardInviteAccepted: `accepted your invite to join "${n.boardName || 'your board'}"`,
        };
        const msg = typeMessages[n.type] || '';

        const item = document.createElement('div');
        item.className = `notif-item ${!n.read ? 'unread' : ''} animate-fade-in`;
        item.innerHTML = `
          <div class="notif-avatar" style="background:${color}1a;color:${color};cursor:pointer" id="nav-${n.id}">
            ${sender.photoURL ? `<img src="${sender.photoURL}" alt="">` : initials}
          </div>
          <div class="notif-content">
            <p class="notif-text">
              <strong style="cursor:pointer" id="nname-${n.id}">${sender.handle ? '@' + sender.handle : sender.displayName || 'Someone'}</strong>
              ${msg}
            </p>
            <div class="notif-actions" id="na-${n.id}"></div>
            <span class="notif-time">${ts}</span>
          </div>
          ${!n.read ? '<div class="notif-dot"></div>' : ''}`;

        // Click avatar or name → open their profile
        const openSender = () => {
          if (sender.uid || sender.id) {
            if (!sender.uid && sender.id) sender.uid = sender.id;
            window.App.navigate('user-profile', { user: sender });
          }
        };
        item.querySelector(`#nav-${n.id}`).onclick   = e => { e.stopPropagation(); openSender(); };
        item.querySelector(`#nname-${n.id}`).onclick = e => { e.stopPropagation(); openSender(); };

        // Mark read on item click (not button clicks)
        item.onclick = e => {
          if (!e.target.closest('button')) window.DB.markNotificationRead(n.id);
        };

        // ── Action buttons ────────────────────────────────────
        const actEl = item.querySelector(`#na-${n.id}`);
        this._renderActions(actEl, n, sender);

        list.appendChild(item);
      });
    });

    return el;
  },

  // Renders action buttons for a notification — works regardless of read state
  _renderActions(actEl, n, sender) {
    actEl.innerHTML = '';

    // ── Follow request (to a private account) ────────────────
    if (n.type === 'followRequest') {
      (async () => {
        const req = await window.DB.getPendingFollowRequest(n.fromUid, window.currentUser.uid);
        if (!req) {
          // Already accepted or declined — show result if we can tell
          actEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Already handled</span>';
          return;
        }
        const accept = document.createElement('button');
        const decline = document.createElement('button');
        accept.className  = 'btn btn-clay btn-sm';
        accept.textContent = 'Accept';
        decline.className  = 'btn btn-sand btn-sm';
        decline.textContent = 'Decline';

        accept.onclick = async () => {
          accept.disabled = true; accept.textContent = '…';
          const result = await window.DB.acceptFollowRequest(req.id, n.fromUid, window.currentUser.uid);
          await window.DB.markNotificationRead(n.id);
          // After accepting — offer to follow them back
          actEl.innerHTML = '';
          const status = await window.DB.getFollowStatus(window.currentUser.uid, n.fromUid);
          this._renderFollowBackBtn(actEl, n.fromUid, sender, status, 'Accepted ✓  ');
        };

        decline.onclick = async () => {
          decline.disabled = true; decline.textContent = '…';
          await window.DB.rejectFollowRequest(req.id);
          await window.DB.markNotificationRead(n.id);
          actEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Declined</span>';
        };

        actEl.appendChild(accept);
        actEl.appendChild(decline);
      })();
    }

    // ── Someone followed you (public account) ─────────────────
    else if (n.type === 'followed') {
      (async () => {
        const status = await window.DB.getFollowStatus(window.currentUser.uid, n.fromUid);
        this._renderFollowBackBtn(actEl, n.fromUid, sender, status, '');
      })();
    }

    // ── Follow request accepted ───────────────────────────────
    else if (n.type === 'followAccepted') {
      (async () => {
        const status = await window.DB.getFollowStatus(window.currentUser.uid, n.fromUid);
        this._renderFollowBackBtn(actEl, n.fromUid, sender, status, '');
      })();
    }

    // ── Now friends (mutual follow) ───────────────────────────
    else if (n.type === 'friendAccepted') {
      actEl.innerHTML = '<span style="font-size:12px;color:var(--leaf);font-weight:500">Friends ✓</span>';
    }

    // ── Board invite accepted (owner gets this) ─────────────
    else if (n.type === 'boardInviteAccepted') {
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-clay btn-sm';
      viewBtn.textContent = 'View Board';
      viewBtn.onclick = () => {
        window.DB.markNotificationRead(n.id);
        window.App.navigate('board-detail', { boardId: n.boardId });
      };
      actEl.appendChild(viewBtn);
    }

    // ── Board invite ──────────────────────────────────────────
    else if (n.type === 'boardInvite') {
      (async () => {
        // Check if already a collaborator
        let boardName = 'a board';
        try {
          const board = await window.DB.getBoard(n.boardId);
          if (board) boardName = board.title;
          if (board && (board.collaborators || []).includes(window.currentUser.uid)) {
            actEl.innerHTML = '<span style="font-size:12px;color:var(--leaf)">Already a collaborator ✓</span>';
            return;
          }
        } catch(e) {}

        const join    = document.createElement('button');
        const decline = document.createElement('button');
        join.className    = 'btn btn-clay btn-sm';
        join.textContent  = 'Accept';
        decline.className = 'btn btn-sand btn-sm';
        decline.textContent = 'Decline';

        join.onclick = async () => {
          join.disabled = true; join.textContent = '…';
          try {
            await window.DB.acceptBoardInvite(n.boardId, window.currentUser.uid, n.id);
            actEl.innerHTML = `<span style="font-size:12px;color:var(--leaf)">Joined "${boardName}" ✓</span>`;
          } catch(e) {
            join.disabled = false; join.textContent = 'Accept';
            console.error('Accept board invite failed:', e);
          }
        };
        decline.onclick = async () => {
          decline.disabled = true;
          await window.DB.markNotificationRead(n.id);
          actEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Declined</span>';
        };

        actEl.appendChild(join);
        actEl.appendChild(decline);
      })();
    }
  },

  // Renders a follow-back / follow / request button based on current status
  _renderFollowBackBtn(actEl, targetUid, targetUser, status, prefix) {
    actEl.innerHTML = '';

    if (status === 'friends') {
      actEl.innerHTML = `<span style="font-size:12px;color:var(--leaf);font-weight:500">${prefix}Friends ✓</span>`;
      return;
    }
    if (status === 'following') {
      actEl.innerHTML = `<span style="font-size:12px;color:var(--sky)">${prefix}Following</span>`;
      return;
    }
    if (status === 'requested') {
      actEl.innerHTML = `<span style="font-size:12px;color:var(--ink-40)">${prefix}Requested</span>`;
      return;
    }

    // Not following — show follow/request button
    const isPrivate = targetUser?.isPublic === false;
    const btn = document.createElement('button');
    btn.className   = 'btn btn-clay btn-sm';
    btn.textContent = prefix + (isPrivate ? 'Request' : 'Follow back');

    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = '…';
      try {
        const result = await window.DB.followUser(window.currentUser.uid, targetUid);
        const newStatus = result?.status || 'following';
        this._renderFollowBackBtn(actEl, targetUid, targetUser, newStatus, prefix);
      } catch (err) {
        console.error('Follow back failed:', err);
        btn.disabled = false;
        btn.textContent = prefix + (isPrivate ? 'Request' : 'Follow back');
      }
    };
    actEl.appendChild(btn);
  },
};
