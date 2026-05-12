// js/app.js  — main application controller
window.App = {
  currentPage:   null,
  currentPageEl: null,
  currentPageId: null,
  _profileUnsub: null,

  // Called by Firebase onAuthStateChanged once user is signed in
  async onSignedIn(user) {
    // Fetch or create user profile
    let profile = await window.DB.getUserProfile(user.uid);
    if (!profile) {
      const base = (user.displayName || user.email || 'user')
        .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18);
      await window.DB.createUserProfile(user.uid, {
        displayName: user.displayName || '',
        handle:      base + Math.floor(Math.random() * 99),
        email:       user.email || '',
        photoURL:    user.photoURL || '',
      });
      profile = await window.DB.getUserProfile(user.uid);
    }
    window.currentProfile = profile;

    // Update sidebar avatar
    this._updateSidebarAvatar(user, profile);

    // Wire sidebar nav
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(item.dataset.page);
      });
    });
    document.getElementById('sidebar-avatar').addEventListener('click', () => this.navigate('profile'));
    document.getElementById('signout-btn').addEventListener('click', () => window.firebaseSignOut());

    // Live notification badge
    window.DB.subscribeToNotifications(user.uid, notifs => {
      const count = notifs.filter(n => !n.read).length;
      const badge = document.getElementById('notif-badge');
      badge.style.display = count > 0 ? 'flex' : 'none';
      badge.textContent   = count > 9 ? '9+' : count;
    });

    // Live profile updates
    this._profileUnsub = window.DB.subscribeToUser(user.uid, prof => {
      if (prof) window.currentProfile = prof;
    });

    // Navigate to discover on sign-in
    this.navigate('discover');
  },

  navigate(pageId, params = {}) {
    // Destroy current page if it has cleanup
    if (this.currentPage?.destroy) this.currentPage.destroy();

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });

    // Clear main content
    const main = document.getElementById('app-main');
    main.innerHTML = '';

    // Load CSS for pages on first render
    this._ensurePagesCSS();

    let el, pageObj;

    switch (pageId) {
      case 'discover':
        pageObj = window.DiscoverPage;
        el = pageObj.render();
        break;

      case 'notifications':
        pageObj = window.NotificationsPage;
        el = pageObj.render();
        break;

      case 'profile':
        pageObj = window.ProfilePage;
        el = pageObj.render();
        break;

      case 'boards':
        pageObj = window.BoardsPage;
        el = pageObj.render();
        break;

      case 'board-detail':
        pageObj = window.BoardDetailPage;
        pageObj.activeTab = 'vision';
        el = pageObj.render(params);
        break;

      default:
        el = document.createElement('div');
        el.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-style:italic;font-size:22px;color:var(--ink-40)';
        el.textContent = 'Page not found';
    }

    if (el) {
      el.classList.add('animate-fade-in');
      main.appendChild(el);
    }

    this.currentPage   = pageObj;
    this.currentPageEl = el;
    this.currentPageId = pageId;
  },

  openNewTripModal() {
    window.NewTripModal.open();
  },

  _ensurePagesCSS() {
    if (document.querySelector('link[data-pages-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'css/pages.css'; link.dataset.pagesCss = '1';
    document.head.appendChild(link);
  },

  _updateSidebarAvatar(user, profile) {
    const avatar = document.getElementById('sidebar-avatar');
    if (user.photoURL) {
      avatar.innerHTML = `<img src="${user.photoURL}" alt="" />`;
    } else {
      avatar.textContent = UI.initials(profile?.displayName || user.email);
    }
  },
};
