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
        const colors   = { friendRequest:'var(--sky)', friendAccepted:'var(--leaf)', boardInvite:'var(--clay)' };
        const color    = colors[n.type] || 'var(--ink-40)';
        const ts       = UI.timeAgo(n.createdAt);

        const msgs = {
          friendRequest:  'sent you a friend request',
          friendAccepted: 'accepted your friend request',
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
        if (!n.read && n.type === 'friendRequest') {
          actionsEl.innerHTML = `
            <button class="btn btn-clay btn-sm">Accept</button>
            <button class="btn btn-sand btn-sm">Decline</button>`;
          actionsEl.children[0].onclick = async () => {
            const reqs = await window.DB.getFriendRequests(window.currentUser.uid);
            const req  = reqs.find(r => r.from === n.fromUid);
            if (req) {
              await window.DB.acceptFriendRequest(req.id, n.fromUid, window.currentUser.uid);
              await window.DB.markNotificationRead(n.id);
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--leaf)">Now friends! 🎉</span>';
            }
          };
          actionsEl.children[1].onclick = async () => {
            const reqs = await window.DB.getFriendRequests(window.currentUser.uid);
            const req  = reqs.find(r => r.from === n.fromUid);
            if (req) {
              await window.DB.declineFriendRequest(req.id);
              await window.DB.markNotificationRead(n.id);
              actionsEl.innerHTML = '<span style="font-size:12px;color:var(--ink-40)">Declined</span>';
            }
          };
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
