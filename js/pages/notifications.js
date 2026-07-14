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

    const list = el.querySelector('#notifs-list');
    const markAllBtn = el.querySelector('#mark-all-btn');

    markAllBtn.onclick = () => window.DB.markAllNotificationsRead(window.currentUser.uid);

    const senders = {};
    const loadSender = async uid => {
      if (!senders[uid]) senders[uid] = await window.DB.getUserProfile(uid);
      return senders[uid];
    };

    this.unsub = window.DB.subscribeToNotifications(window.currentUser.uid, async notifs => {
      const unread = notifs.filter(n => !n.read);
      markAllBtn.style.display = unread.length ? 'block' : 'none';

      if (!notifs.length) {
        list.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <p>You're all caught up!</p></div>`;
        return;
      }

      // Load all senders in parallel
      await Promise.all([...new Set(notifs.map(n => n.fromUid).filter(Boolean))].map(loadSender));

      list.innerHTML = '';
      notifs.forEach(n => {
        const sender = senders[n.fromUid] || {};
        const initials = UI.initials(sender.displayName);
        const colors   = { followRequest:'var(--sky)', followAccepted:'var(--leaf)', friendAccepted:'var(--leaf)', followed:'var(--sky)', boardInvite:'var(--clay)' };
        const color    = colors[n.type] || 'var(--ink-40)';
        const ts       = UI.timeAgo(n.createdAt);

        const msgs = {
          followRequest:  'sent you a follow request',
          followAccepted: 'accepted your follow request',
          friendAccepted: 'is now your friend — you follow each other!',
          followed:       'started following you',
          boardInvite:    'invited you to a trip board',
        };

        const item = document.createElement('div');
        item.className = `notif-item ${!n.read ? 'unread' : ''} animate-fade-in`;
        item.innerHTML = `
          <div class="notif-avatar" style="background:${color}1a;color:${color}">
            ${sender.photoURL ? `<img src="${sender.photoURL}" alt="">` : initials}
          </div>
          <div class="notif-content">
            <p class="notif-text"><strong>${sender.handle || sender.displayName || 'Someone'}</strong> ${msgs[n.type] || ''}</p>
            <div class="notif-actions" id="na-${n.id}"></div>
            <span class="notif-time">${ts}</span>
          </div>
          ${!n.read ? '<div class="notif-dot"></div>' : ''}`;

        // Action buttons for pending items
        const actionsEl = item.querySelector(`#na-${n.id}`);

        if (n.type === 'followRequest' && !n.read) {
          // Someone requested to follow private account — Accept / Decline
          (async () => {
            const req = await window.DB.getPendingFollowRequest(n.fromUid, window.currentUser.uid);
            if (!req) {
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Already handled</span>';
              return;
            }
            actionsEl.innerHTML = `
              <button class="btn btn-clay btn-sm" id="accept-${n.id}">Accept</button>
              <button class="btn btn-sand btn-sm" id="reject-${n.id}">Decline</button>`;
            actionsEl.querySelector(`#accept-${n.id}`).onclick = async () => {
              await window.DB.acceptFollowRequest(req.id, n.fromUid, window.currentUser.uid);
              await window.DB.markNotificationRead(n.id);
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--leaf)">Accepted ✓</span>';
            };
            actionsEl.querySelector(`#reject-${n.id}`).onclick = async () => {
              await window.DB.rejectFollowRequest(req.id);
              await window.DB.markNotificationRead(n.id);
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Declined</span>';
            };
          })();

        } else if (n.type === 'followed' && !n.read) {
          // Public follow — offer to follow back
          (async () => {
            const status = await window.DB.getFollowStatus(window.currentUser.uid, n.fromUid);
            if (status === 'friends') {
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--leaf)">Friends ✓</span>';
            } else if (status === 'following') {
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Following</span>';
            } else {
              const sender = senders[n.fromUid] || {};
              actionsEl.innerHTML = '<button class="btn btn-clay btn-sm">Follow back</button>';
              actionsEl.children[0].onclick = async () => {
                const result = await window.DB.followUser(window.currentUser.uid, n.fromUid);
                await window.DB.markNotificationRead(n.id);
                actionsEl.innerHTML = result?.status === 'friends'
                  ? '<span style="font-size:12px;color:var(--leaf)">Friends ✓</span>'
                  : '<span style="font-size:12px;color:var(--ink-40)">Following</span>';
              };
            }
          })();

        } else if (!n.read && n.type === 'boardInvite') {
          actionsEl.innerHTML = `
            <button class="btn btn-clay btn-sm">Join Board</button>
            <button class="btn btn-sand btn-sm">Dismiss</button>`;
          actionsEl.children[0].onclick = async () => {
            await window.DB.acceptBoardInvite(n.boardId, window.currentUser.uid, n.id);
            actionsEl.innerHTML = '<span style="font-size:12px;color:var(--leaf)">Joined! ✓</span>';
          };
          actionsEl.children[1].onclick = async () => {
            await window.DB.markNotificationRead(n.id);
          };
        }

        if (!n.read) item.onclick = (e) => {
          if (!e.target.closest('button')) window.DB.markNotificationRead(n.id);
        };

        list.appendChild(item);
      });
    });

    return el;
  },
};
