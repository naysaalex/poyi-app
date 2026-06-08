// js/pages/board-detail.js
window.BoardDetailPage = {
  unsubs: [],
  activeTab: 'vision',

  destroy() { this.unsubs.forEach(u => u()); this.unsubs = []; },

  render({ boardId }) {
    const el = document.createElement('div');
    el.className = 'bdp';
    el.innerHTML = `
      <div class="bdp-header">
        <div class="bdp-header-top">
          <button class="bdp-back" id="bdp-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="bdp-info">
            <h1 class="bdp-title" id="bdp-title">Loading...</h1>
            <div class="bdp-meta" id="bdp-meta"></div>
          </div>
          <div class="bdp-right" id="bdp-right"></div>
        </div>
        <div class="tab-bar" id="bdp-tabs"></div>
      </div>
      <div class="bdp-body" id="bdp-body"></div>`;

    el.querySelector('#bdp-back').onclick = () => window.App.navigate('boards');

    const unsub = window.DB.subscribeToBoard(boardId, board => {
      if (!board) return;
      window._currentBoard = board;

      el.querySelector('#bdp-title').textContent = board.title;

      const meta = el.querySelector('#bdp-meta');
      meta.innerHTML = '';
      if (board.destinations?.length) {
        const d = document.createElement('span');
        d.className = 'bdp-dests';
        d.textContent = board.destinations.join(' · ');
        meta.appendChild(d);
      }
      if (board.startDate) {
        const s = document.createElement('span');
        // Use T12:00:00 to prevent UTC midnight from shifting the date in local timezones
        const sd = new Date(board.startDate + 'T12:00:00');
        const ed = board.endDate ? new Date(board.endDate + 'T12:00:00') : null;
        const days = ed ? Math.round((ed - sd) / 86400000) : null;
        s.textContent = sd.toLocaleDateString('en-US', { month:'short', day:'numeric' })
          + (ed ? ` – ${ed.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}` : '')
          + (days ? ` · ${days + 1} days` : '');
        meta.appendChild(s);
      }

      const right = el.querySelector('#bdp-right');
      right.innerHTML = UI.privacyBadge(board.privacy);
      const dots = document.createElement('div');
      dots.className = 'collab-dots';
      (board.collaborators || []).slice(0, 5).forEach((uid, i) => {
        const dot = document.createElement('div');
        dot.className = 'collab-dot';
        dot.style.cssText = `background:${UI.collabColor(i)};margin-left:${i > 0 ? '-6px' : '0'};z-index:${5-i}`;
        dots.appendChild(dot);
      });
      right.appendChild(dots);

      const isOwner = board.ownerId === window.currentUser?.uid;
      if (isOwner) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'bdp-back';
        settingsBtn.title = 'Settings';
        settingsBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
        settingsBtn.onclick = () => switchTab('settings', board);
        right.appendChild(settingsBtn);
      }

      const tabsEl = el.querySelector('#bdp-tabs');
      tabsEl.innerHTML = '';
      const tabs = [
        { id:'vision',    label:'Vision Board', icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`, show: board.visionBoardOn },
        { id:'places',    label:'Places & Map',  icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`, show: true },
        { id:'itinerary', label:'Itinerary',     icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, show: true },
        { id:'settings',  label:'Settings',      icon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/></svg>`, show: true },
      ];
      tabs.filter(t => t.show).forEach(t => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${this.activeTab === t.id ? 'active' : ''}`;
        btn.dataset.tab = t.id;
        btn.innerHTML = `${t.icon} ${t.label}`;
        btn.onclick = () => switchTab(t.id, board);
        tabsEl.appendChild(btn);
      });

      renderActiveTab(board);
    });
    this.unsubs.push(unsub);

    const switchTab = (tabId, board) => {
      this.activeTab = tabId;
      el.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
      renderActiveTab(board);
    };

    const renderActiveTab = (board) => {
      const body = el.querySelector('#bdp-body');
      body.innerHTML = '';
      const tab = this.activeTab;
      // FIX: canEdit = owner OR collaborator
      const uid = window.currentUser?.uid;
      const canEdit = board.ownerId === uid || (board.collaborators || []).includes(uid);

      if (tab === 'vision')    body.appendChild(this.renderVisionTab(board, canEdit));
      if (tab === 'places')    body.appendChild(this.renderPlacesTab(board, canEdit));
      if (tab === 'itinerary') body.appendChild(this.renderItineraryTab(board, canEdit));
      if (tab === 'settings')  body.appendChild(this.renderSettingsTab(board));
    };

    return el;
  },

  // ── VISION BOARD ──────────────────────────────────────────
  renderVisionTab(board, canEdit) {
    const el = document.createElement('div');
    el.className = 'vbt';
    el.innerHTML = `
      <div class="vbt-tags" id="vbt-tags">
        <button class="pill active" data-tag="all">All</button>
      </div>
      <div class="vbt-grid" id="vbt-grid"></div>`;

    let images = [], activeTags = new Set();

    const renderGrid = () => {
      const grid = el.querySelector('#vbt-grid');
      const filtered = activeTags.size === 0 ? images
        : images.filter(img => (img.tags||[]).some(t => activeTags.has(t)));
      if (!filtered.length) {
        grid.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <p>No images yet</p><span>Add photos to build your vision board</span>
          ${canEdit ? `<button class="btn btn-clay btn-md" id="vbt-add-empty">+ Add Images</button>` : ''}
        </div>`;
        grid.querySelector('#vbt-add-empty')?.addEventListener('click', () => this.openAddImageModal(board));
        return;
      }
      grid.appendChild(UI.renderMasonry(filtered, img => {
        const wrap = document.createElement('div');
        wrap.className = 'vbt-img';
        wrap.innerHTML = `
          <img src="${img.url}" loading="lazy" alt="" />
          ${(img.tags||[]).length ? `<div class="vbt-img-tags">${img.tags.slice(0,3).map(t=>`<span class="vbt-img-tag">${t}</span>`).join('')}</div>` : ''}
          ${canEdit ? `<button class="vbt-img-delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>` : ''}`;
        const imgEl = wrap.querySelector('img');
        imgEl.onload = () => imgEl.classList.add('loaded');
        wrap.querySelector('.vbt-img-delete')?.addEventListener('click', () => window.DB.deleteVisionImage(board.id, img.id));
        return wrap;
      }));
    };

    const unsub = window.DB.subscribeToVisionImages(board.id, imgs => {
      images = imgs;
      const tagsEl = el.querySelector('#vbt-tags');
      const allTags = [...new Set(imgs.flatMap(i => i.tags||[]))];
      tagsEl.innerHTML = `<button class="pill ${activeTags.size===0?'active':''}" data-tag="all">All</button>`
        + allTags.map(t => `<button class="pill ${activeTags.has(t)?'active':''}" data-tag="${t}">${t}</button>`).join('')
        + (canEdit ? `<button class="pill" id="vbt-add-tag-btn" style="border-style:dashed;color:var(--clay-dark)">+ Add Images</button>` : '');
      tagsEl.querySelectorAll('.pill[data-tag]').forEach(pill => {
        pill.onclick = () => {
          if (pill.dataset.tag === 'all') activeTags.clear();
          else { activeTags.has(pill.dataset.tag) ? activeTags.delete(pill.dataset.tag) : activeTags.add(pill.dataset.tag); }
          tagsEl.querySelectorAll('.pill[data-tag]').forEach(p => p.classList.toggle('active', p.dataset.tag === 'all' ? activeTags.size === 0 : activeTags.has(p.dataset.tag)));
          el.querySelector('#vbt-grid').innerHTML = '';
          renderGrid();
        };
      });
      tagsEl.querySelector('#vbt-add-tag-btn')?.addEventListener('click', () => this.openAddImageModal(board));
      el.querySelector('#vbt-grid').innerHTML = '';
      renderGrid();
    });
    this.unsubs.push(unsub);
    return el;
  },

  openAddImageModal(board) {
    const content = document.createElement('div');
    content.style.cssText = 'display:flex;flex-direction:column;gap:12px';
    content.innerHTML = `
      <div style="display:flex;gap:8px">
        <div class="search-bar" style="flex:1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="aim-q" placeholder="Search travel photos..." />
        </div>
        <button class="btn btn-clay btn-sm" id="aim-search">Search</button>
      </div>
      <div class="field" style="flex-direction:row;align-items:center">
        <label style="white-space:nowrap;margin-right:8px">Tag as:</label>
        <input id="aim-tags" placeholder="food, tokyo... (comma separated)" style="flex:1;padding:7px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:12px;outline:none" />
      </div>
      <div class="aim-grid" id="aim-grid"><p style="text-align:center;color:var(--ink-40);font-size:13px;padding:20px">Search for photos above</p></div>`;

    const { close } = UI.openModal({ title: 'add to vision board', size: 'lg', content });
    const added = new Set();

    const doSearch = async () => {
      const q = content.querySelector('#aim-q').value.trim();
      if (!q) return;
      content.querySelector('#aim-grid').innerHTML = '<p style="text-align:center;color:var(--ink-40);font-size:13px;padding:20px">Searching...</p>';
      const results = await window.Unsplash.search(q);
      const grid = content.querySelector('#aim-grid');
      grid.innerHTML = '';
      results.forEach(img => {
        const item = document.createElement('div');
        item.className = `aim-img ${added.has(img.id) ? 'added' : ''}`;
        item.innerHTML = `<img src="${window.Unsplash.thumbUrl(img)}" loading="lazy" alt="${img.alt||''}" /><div class="aim-overlay">${added.has(img.id) ? '✓ Added' : '+ Add'}</div>`;
        item.onclick = async () => {
          if (added.has(img.id)) return;
          const tags = content.querySelector('#aim-tags').value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
          await window.DB.addVisionImage(board.id, { url: img.url, sourceUrl: img.url, tags, addedBy: window.currentUser.uid });
          added.add(img.id);
          item.classList.add('added');
          item.querySelector('.aim-overlay').textContent = '✓ Added';
        };
        grid.appendChild(item);
      });
    };

    content.querySelector('#aim-search').onclick = doSearch;
    content.querySelector('#aim-q').onkeydown = e => { if (e.key === 'Enter') doSearch(); };
  },

  // ── PLACES ────────────────────────────────────────────────
  renderPlacesTab(board, canEdit) {
    const CAT_COLORS = { food:'#B85C6E', museum:'#3D6B8A', landmark:'#C4956A', nature:'#4A6741', architecture:'#6B4A7A', beach:'#3D6B8A', adventure:'#A07848', general:'#8A7E74' };
    const MAPS_KEY = 'AIzaSyCPFSkgsIeYBGr_lxjabD7n_JTaqdLp0KU';

    const el = document.createElement('div');
    el.className = 'pt';
    el.innerHTML = `
      <div class="pt-bar">
        <div class="filter-pills" id="pt-locs"></div>
        <div class="pt-bar-right">
          <div class="pt-cat-select">
            <select id="pt-cat">
              <option value="all">All categories</option>
              <option value="food">Food</option><option value="museum">Museum</option>
              <option value="landmark">Landmark</option><option value="nature">Nature</option>
              <option value="architecture">Architecture</option><option value="beach">Beach</option>
              <option value="adventure">Adventure</option>
            </select>
          </div>
          <div class="view-toggle">
            <button class="active" id="pt-list-btn" title="List"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></button>
            <button id="pt-map-btn" title="Map"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg></button>
          </div>
          ${canEdit ? `<button class="btn btn-clay btn-sm" id="pt-add-btn">+ Add Place</button>` : ''}
        </div>
      </div>
      <div class="pt-body">
        <div class="pt-list" id="pt-list"></div>
        <div class="pt-map" id="pt-map" style="display:none"></div>
      </div>`;

    let places = [], filterLoc = 'all', filterCat = 'all';

    const renderPlaces = () => {
      const filtered = places.filter(p =>
        (filterLoc === 'all' || p.location === filterLoc) &&
        (filterCat === 'all' || p.category === filterCat)
      );
      const listEl = el.querySelector('#pt-list');
      listEl.innerHTML = '';
      if (!filtered.length) {
        listEl.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <p>No places yet</p><span>Add restaurants, landmarks & more</span>
          ${canEdit ? `<button class="btn btn-clay btn-sm" id="pt-add-empty">+ Add Place</button>` : ''}
        </div>`;
        listEl.querySelector('#pt-add-empty')?.addEventListener('click', openAddPlace);
        return;
      }
      const byLoc = {};
      filtered.forEach(p => { const l = p.location || 'General'; (byLoc[l] = byLoc[l] || []).push(p); });
      Object.entries(byLoc).forEach(([loc, items]) => {
        const group = document.createElement('div');
        group.className = 'loc-group';
        group.innerHTML = `<div class="loc-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${loc}<span class="loc-count">${items.length}</span></div>`;
        items.forEach(place => {
          const color = CAT_COLORS[place.category] || CAT_COLORS.general;
          const row = document.createElement('div');
          row.className = 'place-row';
          row.innerHTML = `
            <div class="place-dot" style="background:${color};margin-top:2px"></div>
            <div class="place-main">
              <div class="place-name">${place.name}</div>
              <div class="place-meta">
                <span class="place-cat" style="color:${color};background:${color}18">${place.category||'general'}</span>
                ${place.address ? `<span class="place-addr">${place.address}</span>` : ''}
              </div>
              ${place.notes ? `<div class="place-notes">${place.notes}</div>` : ''}
            </div>
            ${canEdit ? `
            <div class="place-actions-always">
              <button class="place-edit-btn" title="Edit place">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button class="place-delete-btn" title="Delete place">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
                Delete
              </button>
            </div>` : ''}`;
          row.querySelector('.place-edit-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            openEditPlace(place);
          });
          row.querySelector('.place-delete-btn')?.addEventListener('click', e => {
            e.stopPropagation();
            const btn = e.currentTarget;
            if (btn.dataset.confirm === 'true') {
              window.DB.deletePlace(board.id, place.id);
            } else {
              btn.dataset.confirm = 'true';
              btn.textContent = 'Confirm?';
              btn.style.background = 'var(--rose-light)';
              btn.style.color = 'var(--rose)';
              setTimeout(() => {
                if (btn.dataset.confirm) {
                  delete btn.dataset.confirm;
                  btn.style.background = '';
                  btn.style.color = '';
                  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg> Delete`;
                }
              }, 3000);
            }
          });
          group.appendChild(row);
        });
        listEl.appendChild(group);
      });
    };

    const buildLocPills = () => {
      const locsEl = el.querySelector('#pt-locs');
      locsEl.innerHTML = `<button class="pill ${filterLoc==='all'?'active':''}" data-loc="all">All</button>`
        + (board.destinations||[]).map(d => `<button class="pill ${filterLoc===d?'active':''}" data-loc="${d}">${d}</button>`).join('');
      locsEl.querySelectorAll('.pill').forEach(p => {
        p.onclick = () => { filterLoc = p.dataset.loc; buildLocPills(); renderPlaces(); };
      });
    };
    buildLocPills();
    el.querySelector('#pt-cat').onchange = e => { filterCat = e.target.value; renderPlaces(); };

    el.querySelector('#pt-list-btn').onclick = () => {
      el.querySelector('#pt-list').style.display = '';
      el.querySelector('#pt-map').style.display  = 'none';
      el.querySelector('#pt-list-btn').classList.add('active');
      el.querySelector('#pt-map-btn').classList.remove('active');
    };
    // Track map instance so we don't reinit on every toggle
    let mapInstance = null;
    let mapMarkers  = [];

    // Load Google Maps JS API once, then call cb(err)
    const loadMapsApi = (cb) => {
      if (window.google?.maps) { cb(null); return; }
      if (window._mapsLoading) {
        const prev = window._mapsOnLoad;
        window._mapsOnLoad = (err) => { if (prev) prev(err); cb(err); };
        return;
      }
      window._mapsLoading = true;
      window._mapsOnLoad  = cb;
      window.initPoYiMap  = () => {
        window._mapsLoading = false;
        if (window._mapsOnLoad) window._mapsOnLoad(null);
      };
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initPoYiMap&libraries=places`;
      s.async = true; s.defer = true;
      s.onerror = () => {
        window._mapsLoading = false;
        if (window._mapsOnLoad) window._mapsOnLoad(new Error('script_load_failed'));
      };
      document.head.appendChild(s);
    };

    // Pin colours match CAT_COLORS
    const pinSvg = (color) =>
      `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
          <path d="M14 0C6.27 0 0 6.27 0 14c0 9.27 14 22 14 22S28 23.27 28 14C28 6.27 21.73 0 14 0z" fill="${color}"/>
          <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
        </svg>`
      )}`;

    const initMap = (placesToPin) => {
      const mapEl = el.querySelector('#pt-map');
      if (!mapEl) return;
      mapEl.innerHTML = '<div id="gmap-canvas" style="width:100%;height:100%"></div>';

      // Default center: first destination or world view
      const defaultCenter = { lat: 20, lng: 0 };
      const map = new google.maps.Map(document.getElementById('gmap-canvas'), {
        zoom: placesToPin.length ? 13 : 3,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType:'poi', elementType:'labels', stylers:[{visibility:'off'}] },
          { featureType:'transit', elementType:'labels', stylers:[{visibility:'off'}] },
        ],
      });
      mapInstance = map;
      mapMarkers  = [];

      if (!placesToPin.length) {
        // No places with addresses — show destination search areas
        const geocoder = new google.maps.Geocoder();
        const dests    = board.destinations || [];
        if (dests.length) {
          geocoder.geocode({ address: dests[0] }, (res, status) => {
            if (status === 'OK') map.setCenter(res[0].geometry.location);
          });
        }
        return;
      }

      // Geocode places that don't have lat/lng, then add markers
      const bounds    = new google.maps.LatLngBounds();
      const geocoder  = new google.maps.Geocoder();
      const infoWin   = new google.maps.InfoWindow();
      let   pending   = placesToPin.length;

      const addMarker = (place, latLng) => {
        const color  = CAT_COLORS[place.category] || CAT_COLORS.general;
        const marker = new google.maps.Marker({
          position: latLng,
          map,
          title: place.name,
          icon: { url: pinSvg(color), scaledSize: new google.maps.Size(28, 36), anchor: new google.maps.Point(14, 36) },
          animation: google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
          infoWin.setContent(`
            <div style="font-family:'DM Sans',sans-serif;max-width:200px;padding:4px 2px">
              <div style="font-weight:600;font-size:13px;color:#1C1814;margin-bottom:3px">${place.name}</div>
              ${place.address ? `<div style="font-size:11px;color:#666;margin-bottom:3px">${place.address}</div>` : ''}
              <span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:99px;background:${color}18;color:${color};text-transform:capitalize">${place.category||'general'}</span>
              ${place.notes ? `<div style="font-size:11px;color:#888;margin-top:4px">${place.notes}</div>` : ''}
            </div>`);
          infoWin.open(map, marker);
        });

        mapMarkers.push(marker);
        bounds.extend(latLng);
        pending--;
        if (pending === 0) {
          if (mapMarkers.length === 1) {
            map.setCenter(bounds.getCenter());
            map.setZoom(15);
          } else {
            map.fitBounds(bounds, 60);
          }
        }
      };

      placesToPin.forEach(place => {
        if (place.lat && place.lng) {
          // Already have coordinates
          addMarker(place, { lat: place.lat, lng: place.lng });
        } else if (place.address || place.name) {
          // Geocode by address or name + destination
          const query = place.address
            ? place.address
            : `${place.name}, ${place.location || board.destinations?.[0] || ''}`;
          geocoder.geocode({ address: query }, (res, status) => {
            if (status === 'OK') {
              // Save coords back to Firestore so we don't geocode again
              const { lat, lng } = res[0].geometry.location;
              window.firebaseDb.collection('boards').doc(board.id)
                .collection('places').doc(place.id)
                .update({ lat: lat(), lng: lng() }).catch(() => {});
              addMarker(place, res[0].geometry.location);
            } else {
              pending--;
              if (pending === 0 && mapMarkers.length) map.fitBounds(bounds, 60);
            }
          });
        } else {
          pending--;
        }
      });
    };

    el.querySelector('#pt-map-btn').onclick = () => {
      el.querySelector('#pt-list').style.display = 'none';
      const mapEl = el.querySelector('#pt-map');
      mapEl.style.display = '';
      el.querySelector('#pt-list-btn').classList.remove('active');
      el.querySelector('#pt-map-btn').classList.add('active');

      if (mapInstance) {
        // Map already initialised — just refresh markers for current filter
        google.maps.event.trigger(mapInstance, 'resize');
        return;
      }

      // Show spinner while loading
      mapEl.innerHTML = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--sand)">
        <div style="width:32px;height:32px;border:3px solid var(--clay-light);border-top-color:var(--clay);border-radius:50%;animation:spin 0.7s linear infinite"></div>
        <p style="font-family:var(--font-display);font-style:italic;font-size:18px;font-weight:300;color:var(--ink-60)">Loading map…</p>
      </div>`;

      loadMapsApi((err) => {
        const mapEl2 = el.querySelector('#pt-map');
        if (err || !window.google?.maps) {
          if (mapEl2) mapEl2.innerHTML = `
            <div class="pt-map-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:48px;height:48px;color:var(--ink-20)"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              <p style="font-family:var(--font-display);font-style:italic;font-size:20px;font-weight:300;color:var(--ink-40)">Map couldn't load</p>
              <span style="font-size:12px;color:var(--ink-40);text-align:center;max-width:280px">Enable <strong>Maps JavaScript API</strong> and <strong>Geocoding API</strong> in Google Cloud Console for key ending in <code style="background:var(--sand-deep);padding:2px 6px;border-radius:4px">...0KU</code></span>
              <a href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" target="_blank" class="btn btn-clay btn-sm" style="margin-top:8px;text-decoration:none">Enable in Google Cloud →</a>
            </div>`;
          return;
        }
        initMap(places);
      });
    };

    const placeFormFields = (place = {}) => `
      <div class="field"><label>Name</label><input id="pf-name" placeholder="Senso-ji Temple" value="${place.name||''}" /></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Category</label>
          <select id="pf-cat">
            ${['landmark','food','museum','nature','architecture','beach','adventure','general'].map(c =>
              `<option value="${c}" ${place.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field"><label>Location</label>
          <select id="pf-loc">
            ${(board.destinations||[]).map(d=>`<option value="${d}" ${place.location===d?'selected':''}>${d}</option>`).join('')}
            <option value="" ${!place.location?'selected':''}>General</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Address <span class="optional">optional</span></label><input id="pf-addr" placeholder="2-3-1 Asakusa, Tokyo" value="${place.address||''}" /></div>
      <div class="field"><label>Notes <span class="optional">optional</span></label><textarea id="pf-notes" rows="3" placeholder="Best time to visit, tips...">${place.notes||''}</textarea></div>`;

    const openAddPlace = () => {
      const content = document.createElement('div');
      content.style.cssText = 'display:flex;flex-direction:column;gap:12px';
      content.innerHTML = placeFormFields() + `
        <div class="modal-actions">
          <button class="btn btn-sand btn-md" id="pf-cancel">Cancel</button>
          <button class="btn btn-clay btn-md" id="pf-save">Add Place</button>
        </div>`;
      const { close } = UI.openModal({ title: 'add a place', size: 'sm', content });
      content.querySelector('#pf-cancel').onclick = close;
      content.querySelector('#pf-save').onclick = async () => {
        const name = content.querySelector('#pf-name').value.trim();
        if (!name) return;
        await window.DB.addPlace(board.id, {
          name,
          category: content.querySelector('#pf-cat').value,
          location: content.querySelector('#pf-loc').value,
          address:  content.querySelector('#pf-addr').value,
          notes:    content.querySelector('#pf-notes').value,
        });
        close();
      };
    };

    const openEditPlace = (place) => {
      const content = document.createElement('div');
      content.style.cssText = 'display:flex;flex-direction:column;gap:12px';
      content.innerHTML = placeFormFields(place) + `
        <div class="modal-actions">
          <button class="btn btn-sand btn-md" id="pf-cancel">Cancel</button>
          <button class="btn btn-clay btn-md" id="pf-save">Save Changes</button>
        </div>`;
      const { close } = UI.openModal({ title: 'edit place', size: 'sm', content });
      content.querySelector('#pf-cancel').onclick = close;
      content.querySelector('#pf-save').onclick = async () => {
        const name = content.querySelector('#pf-name').value.trim();
        if (!name) return;
        // compat SDK update for subcollection
        await window.firebaseDb
          .collection('boards').doc(board.id)
          .collection('places').doc(place.id)
          .update({
            name,
            category: content.querySelector('#pf-cat').value,
            location: content.querySelector('#pf-loc').value,
            address:  content.querySelector('#pf-addr').value,
            notes:    content.querySelector('#pf-notes').value,
          });
        close();
      };
    };

    el.querySelector('#pt-add-btn')?.addEventListener('click', openAddPlace);
    const unsub = window.DB.subscribeToBoardPlaces(board.id, p => {
      places = p;
      renderPlaces();
      // If map is visible and already initialised, refresh markers
      if (mapInstance && el.querySelector('#pt-map')?.style.display !== 'none') {
        mapMarkers.forEach(m => m.setMap(null));
        mapMarkers = [];
        initMap(places.filter(p2 =>
          (filterLoc === 'all' || p2.location === filterLoc) &&
          (filterCat === 'all' || p2.category === filterCat)
        ));
      }
    });
    this.unsubs.push(unsub);
    return el;
  },

  // ── ITINERARY ─────────────────────────────────────────────
  renderItineraryTab(board, canEdit) {
    const EVENT_COLORS = {
      breakfast:'#C4956A', lunch:'#B85C6E', dinner:'#B85C6E',
      transport:'#3D6B8A', activity:'#A07848', nature:'#4A6741',
      evening:'#6B4A7A',   general:'#8A7E74'
    };
    let days = board.itinerary ? JSON.parse(JSON.stringify(board.itinerary)) : [];

    const el = document.createElement('div');
    el.className = 'itin';
    el.innerHTML = `
      <div class="itin-toolbar">
        <span class="itin-count" id="itin-count">${days.length} days planned</span>
        <div class="itin-toolbar-right" id="itin-btns"></div>
      </div>
      <div class="itin-list" id="itin-list"></div>`;

    const save = async () => {
      await window.DB.updateBoard(board.id, { itinerary: days });
    };

    const rebuildToolbar = () => {
      const btns = el.querySelector('#itin-btns');
      btns.innerHTML = '';
      if (canEdit) {
        const genBtn = document.createElement('button');
        genBtn.className = 'btn btn-clay btn-sm';
        genBtn.id = 'itin-gen';
        genBtn.textContent = days.length === 0 ? '✦ Generate from Places' : '✦ Regenerate';
        genBtn.title = 'Build itinerary from your saved Places & Maps entries';
        genBtn.onclick = generate;
        btns.appendChild(genBtn);
      }
      if (canEdit) {
        const addDayBtn = document.createElement('button');
        addDayBtn.className = 'btn btn-outline btn-sm';
        addDayBtn.textContent = '+ Add Day';
        addDayBtn.onclick = openAddDay;
        btns.appendChild(addDayBtn);
      }
      if (canEdit && days.length > 0) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-clay btn-sm';
        saveBtn.textContent = 'Save & Publish';
        saveBtn.onclick = async () => { await save(); UI.toast('Itinerary saved!', 'success'); };
        btns.appendChild(saveBtn);
      }
    };

    const renderList = () => {
      const list = el.querySelector('#itin-list');
      el.querySelector('#itin-count').textContent = `${days.length} day${days.length !== 1 ? 's' : ''} planned`;
      list.innerHTML = '';
      rebuildToolbar();

      if (!days.length) {
        list.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No itinerary yet</p><span>Generate a template or add days manually</span>
          ${canEdit ? `<button class="btn btn-clay btn-md" id="itin-gen2">✦ Generate Template</button>` : ''}
        </div>`;
        list.querySelector('#itin-gen2')?.addEventListener('click', generate);
        return;
      }

      days.forEach((day, di) => {
        const card = document.createElement('div');
        card.className = 'day-card animate-fade-in';
        const dateStr = day.date
          ? new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
          : '';

        // Build header
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `
          <div class="day-header-left">
            <span class="day-num">Day ${day.dayNumber}</span>
            ${dateStr ? `<span class="day-date">${dateStr}</span>` : ''}
            ${day.location ? `<span class="day-loc">${day.location}</span>` : ''}
          </div>
          <div class="day-header-right">
            <span class="day-event-count">${(day.events||[]).length} event${(day.events||[]).length !== 1 ? 's' : ''}</span>
            ${canEdit ? `<button class="day-delete" title="Delete day"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg></button>` : ''}
            <span class="day-chevron">▼</span>
          </div>`;

        // Build events container — visible by default
        const eventsEl = document.createElement('div');
        eventsEl.className = 'day-events';
        eventsEl.style.display = 'flex'; // always shown initially

        (day.events||[]).forEach((ev, ei) => {
          const color = EVENT_COLORS[ev.category] || EVENT_COLORS.general;
          const row = document.createElement('div');
          row.className = 'event-row';
          row.innerHTML = `
            <span class="event-time">${ev.time||''}</span>
            <div class="event-dot" style="background:${color}"></div>
            <div class="event-content">
              <div class="event-name">${ev.name}</div>
              ${ev.notes ? `<div class="event-notes">${ev.notes}</div>` : ''}
              <span class="event-cat" style="color:${color};background:${color}18">${ev.category||'general'}</span>
            </div>
            <div class="event-actions">
              ${canEdit ? `
                <button class="event-edit" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="event-delete" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
              ` : ''}
            </div>`;
          row.querySelector('.event-delete')?.addEventListener('click', () => {
            days[di].events.splice(ei, 1);
            save(); renderList();
          });
          row.querySelector('.event-edit')?.addEventListener('click', () => openEditEvent(di, ei, ev));
          eventsEl.appendChild(row);
        });

        if (canEdit) {
          const addBtn = document.createElement('button');
          addBtn.className = 'add-event-btn';
          addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add event`;
          addBtn.onclick = () => openAddEvent(di);
          eventsEl.appendChild(addBtn);
        }

        // Toggle collapse on header click
        let collapsed = false;
        header.addEventListener('click', e => {
          if (e.target.closest('.day-delete')) return;
          collapsed = !collapsed;
          eventsEl.style.display = collapsed ? 'none' : 'flex';
          header.querySelector('.day-chevron').textContent = collapsed ? '▶' : '▼';
        });

        header.querySelector('.day-delete')?.addEventListener('click', e => {
          e.stopPropagation();
          days.splice(di, 1);
          days.forEach((d, i) => d.dayNumber = i + 1);
          save(); renderList();
        });

        card.appendChild(header);
        card.appendChild(eventsEl);
        list.appendChild(card);
      });
    };

    // ── Smart itinerary generator ────────────────────────────
    // Reads saved places, weights days by place count per destination,
    // and schedules real places into real time slots.
    const generate = async () => {
      // Disable the button immediately for visual feedback
      const genBtnEl = el.querySelector('#itin-gen') || el.querySelector('#itin-gen2');
      if (genBtnEl) { genBtnEl.disabled = true; genBtnEl.textContent = 'Loading places…'; }

      // 1. Fetch saved places — no orderBy to avoid Firestore index requirement
      let savedPlaces = [];
      try {
        const snap = await window.firebaseDb
          .collection('boards').doc(board.id)
          .collection('places').get();
        savedPlaces = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        savedPlaces.sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return ta - tb;
        });
      } catch (e) {
        console.warn('Could not load places, using fallback suggestions:', e.message);
      }

      if (genBtnEl) genBtnEl.textContent = 'Building days…';

      const dests = board.destinations?.length ? board.destinations : ['Destination'];

      // 2. Count activity and food places per destination
      const activityCount = {};
      const foodCount     = {};
      dests.forEach(d => { activityCount[d] = 0; foodCount[d] = 0; });
      savedPlaces.forEach(p => {
        const loc = p.location || dests[0];
        if (!activityCount[loc]) activityCount[loc] = 0;
        if (!foodCount[loc])     foodCount[loc]     = 0;
        if (p.category === 'food') foodCount[loc]++;
        else activityCount[loc]++;
      });

      // 3. Date range — pure string/integer approach, zero Date objects for boundary logic

      // Convert any date value to a local YYYY-MM-DD string, safely
      const toLocalDateStr = val => {
        if (!val) return null;
        // Plain string like "2026-06-19" or "2026-06-19T..."
        if (typeof val === 'string') return val.slice(0, 10);
        // Firestore Timestamp — use local year/month/day, NOT toISOString (which is UTC)
        if (val && typeof val.toDate === 'function') {
          const d = val.toDate();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
        if (val instanceof Date) {
          const y = val.getFullYear();
          const m = String(val.getMonth() + 1).padStart(2, '0');
          const day = String(val.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
        return null;
      };

      const startStr = toLocalDateStr(board.startDate);
      const endStr   = toLocalDateStr(board.endDate);

      // Count days purely by splitting the YYYY-MM-DD strings into integers —
      // no Date objects, no timezones, no rounding errors.
      const dateToDayIndex = s => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        // Days since a fixed epoch using integer math only
        // Formula: Julian Day Number (simplified)
        const a = Math.floor((14 - m) / 12);
        const yr = y + 4800 - a;
        const mo = m + 12 * a - 3;
        return d + Math.floor((153 * mo + 2) / 5) + 365 * yr +
               Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
      };

      const startJD     = dateToDayIndex(startStr);
      const endJD       = dateToDayIndex(endStr);
      const rawTotalDays = (startJD && endJD) ? Math.max(1, endJD - startJD + 1) : null;

      // dayOffset counter — 0 = startStr, maxDayOffset = last valid day
      let dayOffset = 0;
      const maxDayOffset = rawTotalDays ? rawTotalDays - 1 : Infinity;

      // Convert an offset integer back to a YYYY-MM-DD string using the
      // same Julian Day arithmetic — no Date objects needed
      const dateForOffset = offset => {
        if (!startJD) return null;
        const jd = startJD + offset;
        // Convert Julian Day back to Gregorian calendar
        const l = jd + 68569;
        const n = Math.floor((4 * l) / 146097);
        const ll = l - Math.floor((146097 * n + 3) / 4);
        const i = Math.floor((4000 * (ll + 1)) / 1461001);
        const lll = ll - Math.floor((1461 * i) / 4) + 31;
        const j = Math.floor((80 * lll) / 2447);
        const day = lll - Math.floor((2447 * j) / 80);
        const k = Math.floor(j / 11);
        const month = j + 2 - 12 * k;
        const year = 100 * (n - 49) + i + k;
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      };

      // 4. Activity budget
      const travelDaysNeeded = Math.max(0, dests.length - 1);
      const activityBudget = rawTotalDays
        ? Math.min(rawTotalDays, Math.max(dests.length, rawTotalDays - travelDaysNeeded))
        : dests.reduce((sum, d) =>
            sum + Math.max(1, Math.ceil((activityCount[d] || 1) * 1.5)), 0);

      const weights = dests.map(d => Math.max(1, activityCount[d] || 0));
      const totalW  = weights.reduce((a, b) => a + b, 0);
      const daysPerDest = [];
      let allocated = 0;
      dests.forEach((d, i) => {
        if (i === dests.length - 1) {
          daysPerDest.push(Math.max(1, activityBudget - allocated));
        } else {
          const share = Math.max(1, Math.round((weights[i] / totalW) * activityBudget));
          daysPerDest.push(share);
          allocated += share;
        }
      });

      // 5. Fallback suggestions for empty slots
      const FALLBACK = {
        morning:   ['Breakfast at a local café',  'Morning market visit',   'Explore the neighbourhood'],
        landmark:  ['Visit main landmark',         'Guided city tour',       'Viewpoint & photos'],
        afternoon: ['Afternoon walking tour',      'Shopping district',      'Local market browse'],
        extra:     ['Coffee & people watching',    'Wander a local neighbourhood', 'Browse a local bookshop',
                    'Visit a viewpoint',           'Explore side streets',   'Local market'],
        evening:   ['Sunset viewpoint',            'Night market',           'Evening riverside walk'],
      };
      const fallback = (pool, i) => pool[i % pool.length];

      // Times for extra activity slots (fills in between the fixed 5)
      const EXTRA_TIMES = ['9:00 AM', '11:30 AM', '2:30 PM', '4:30 PM', '6:00 PM'];

      // Read flight info from board
      const flyInAirport  = board.flyInAirport  || null;
      const flyInTime     = board.flyInTime     || null;
      const flyOutAirport = board.flyOutAirport || null;
      const flyOutTime    = board.flyOutTime    || null;

      // If flying in late (after noon), first day only gets afternoon + dinner
      const flyInHour = flyInTime ? (() => {
        const t = flyInTime.toLowerCase();
        const [hStr, rest] = t.split(':');
        let h = parseInt(hStr, 10);
        if (rest && rest.includes('pm') && h !== 12) h += 12;
        if (rest && rest.includes('am') && h === 12) h = 0;
        return h;
      })() : null;

      // If flying out early (before noon), last day only gets breakfast + morning
      const flyOutHour = flyOutTime ? (() => {
        const t = flyOutTime.toLowerCase();
        const [hStr, rest] = t.split(':');
        let h = parseInt(hStr, 10);
        if (rest && rest.includes('pm') && h !== 12) h += 12;
        if (rest && rest.includes('am') && h === 12) h = 0;
        return h;
      })() : null;

      const totalDaysCount = rawTotalDays || (activityBudget + travelDaysNeeded);

      // 6. Build days using integer day offsets — no Date comparison, no timezone issues
      days = [];
      let dayNum = 1;

      dests.forEach((dest, di) => {
        const numDaysHere = daysPerDest[di];
        if (dayOffset > maxDayOffset) return; // already used all days

        const destPlaces = savedPlaces.filter(p => (p.location || dests[0]) === dest);
        const foodPlaces = destPlaces.filter(p => p.category === 'food');
        const actPlaces  = destPlaces.filter(p => p.category !== 'food');

        let actQueue  = [...actPlaces];
        let foodQueue = [...foodPlaces];
        let fallbackIdx = 0;

        for (let d = 0; d < numDaysHere; d++) {
          if (dayOffset > maxDayOffset) break; // used all available days
          const dayDate = dateForOffset(dayOffset);
          const events  = [];
          let   eid     = 0;

          const isFirstDay = dayNum === 1;
          const isLastDay  = dayOffset === maxDayOffset;

          // ── ARRIVAL DAY (first day, flight info provided) ─────
          if (isFirstDay && flyInAirport) {
            events.push({ id:`e-${dayNum}-${eid++}`,
              time: flyInTime || 'Morning',
              name: `Arrive at ${flyInAirport}`,
              category: 'transport',
              notes: flyInTime ? `Landing ${flyInTime}` : '' });
            // Only add morning activities if landing before noon
            if (!flyInHour || flyInHour < 13) {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'12:00 PM',
                name:`Check in & settle in ${dest}`, category:'transport', notes:'' });
            } else {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'3:00 PM',
                name:`Check in & freshen up`, category:'transport', notes:'' });
            }
            // Welcome dinner
            const dinnerFood2 = foodQueue.find(p =>
              ['dinner','bar','izakaya','bistro','restaurant'].some(kw =>
                p.name.toLowerCase().includes(kw) || (p.notes||'').toLowerCase().includes(kw)));
            if (dinnerFood2) {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM', name:dinnerFood2.name,
                category:'dinner', notes:dinnerFood2.address || dinnerFood2.notes || '' });
              foodQueue = foodQueue.filter(p => p.id !== dinnerFood2.id);
            } else {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM',
                name:`Welcome dinner in ${dest}`, category:'dinner', notes:'' });
            }

          // ── DEPARTURE DAY (last day, flight info provided) ────
          } else if (isLastDay && flyOutAirport) {
            // Only schedule morning activities if flight is after noon
            if (!flyOutHour || flyOutHour >= 12) {
              const bfFoodDep = foodQueue.find(p =>
                ['breakfast','café','cafe','coffee','brunch','bakery'].some(kw =>
                  p.name.toLowerCase().includes(kw) || (p.notes||'').toLowerCase().includes(kw)));
              if (bfFoodDep) {
                events.push({ id:`e-${dayNum}-${eid++}`, time:'8:00 AM', name:bfFoodDep.name,
                  category:'breakfast', notes:bfFoodDep.address || bfFoodDep.notes || '' });
                foodQueue = foodQueue.filter(p => p.id !== bfFoodDep.id);
              } else {
                events.push({ id:`e-${dayNum}-${eid++}`, time:'8:00 AM',
                  name:'Last breakfast in ' + dest, category:'breakfast', notes:'' });
              }
              if (!flyOutHour || flyOutHour >= 14) {
                const actDep = actQueue.shift();
                events.push({ id:`e-${dayNum}-${eid++}`, time:'10:00 AM',
                  name: actDep ? actDep.name : `Morning stroll in ${dest}`,
                  category: actDep ? actDep.category : 'activity',
                  notes: actDep ? (actDep.address || actDep.notes || '') : '' });
              }
            } else {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'6:00 AM',
                name:'Early breakfast & pack up', category:'breakfast', notes:'' });
            }
            events.push({ id:`e-${dayNum}-${eid++}`,
              time: flyOutHour ? (flyOutHour >= 12 ? '12:00 PM' : '8:00 AM') : '11:00 AM',
              name: `Head to ${flyOutAirport} airport`,
              category: 'transport', notes: flyOutTime ? `Flight at ${flyOutTime}` : '' });
            events.push({ id:`e-${dayNum}-${eid++}`,
              time: flyOutTime || 'Afternoon',
              name: `Depart ${flyOutAirport}`,
              category: 'transport',
              notes: `Safe travels! ✈` });

          // ── REGULAR DAY ───────────────────────────────────────
          } else {
            // Breakfast
            const bfFood = foodQueue.find(p =>
              ['breakfast','café','cafe','coffee','brunch','bakery'].some(kw =>
                p.name.toLowerCase().includes(kw) || (p.notes||'').toLowerCase().includes(kw)));
            if (bfFood) {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'8:00 AM', name:bfFood.name,
                category:'breakfast', notes:bfFood.address || bfFood.notes || '' });
              foodQueue = foodQueue.filter(p => p.id !== bfFood.id);
            } else {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'8:00 AM',
                name:fallback(FALLBACK.morning, fallbackIdx), category:'breakfast', notes:'' });
            }

            // Morning activity
            const act1 = actQueue.shift();
            events.push({ id:`e-${dayNum}-${eid++}`, time:'10:00 AM',
              name: act1 ? act1.name : fallback(FALLBACK.landmark, fallbackIdx),
              category: act1 ? act1.category : 'activity',
              notes: act1 ? (act1.address || act1.notes || '') : '' });

            // Lunch
            const lunchFood = foodQueue.find(p =>
              ['lunch','restaurant','ramen','sushi','noodle','bistro','brasserie','diner'].some(kw =>
                p.name.toLowerCase().includes(kw) || (p.notes||'').toLowerCase().includes(kw)));
            if (lunchFood) {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'1:00 PM', name:lunchFood.name,
                category:'lunch', notes:lunchFood.address || lunchFood.notes || '' });
              foodQueue = foodQueue.filter(p => p.id !== lunchFood.id);
            } else if (foodQueue.length) {
              const f = foodQueue.shift();
              events.push({ id:`e-${dayNum}-${eid++}`, time:'1:00 PM', name:f.name,
                category:'lunch', notes:f.address || f.notes || '' });
            } else {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'1:00 PM',
                name:`Lunch in ${dest}`, category:'lunch', notes:'' });
            }

            // Afternoon activity
            const act2 = actQueue.shift();
            events.push({ id:`e-${dayNum}-${eid++}`, time:'3:00 PM',
              name: act2 ? act2.name : fallback(FALLBACK.afternoon, fallbackIdx),
              category: act2 ? act2.category : 'activity',
              notes: act2 ? (act2.address || act2.notes || '') : '' });

            // Extra activity places — no limit
            let extraTimeIdx = 0;
            while (actQueue.length > 0 && extraTimeIdx < EXTRA_TIMES.length) {
              const extra = actQueue.shift();
              events.push({ id:`e-${dayNum}-${eid++}`, time:EXTRA_TIMES[extraTimeIdx++],
                name:extra.name, category:extra.category,
                notes:extra.address || extra.notes || '' });
            }

            // Dinner
            const dinnerFood = foodQueue.find(p =>
              ['dinner','bar','izakaya','bistro','tavern','steakhouse','grill'].some(kw =>
                p.name.toLowerCase().includes(kw) || (p.notes||'').toLowerCase().includes(kw)));
            if (dinnerFood) {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM', name:dinnerFood.name,
                category:'dinner', notes:dinnerFood.address || dinnerFood.notes || '' });
              foodQueue = foodQueue.filter(p => p.id !== dinnerFood.id);
            } else if (foodQueue.length) {
              const f = foodQueue.shift();
              events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM', name:f.name,
                category:'dinner', notes:f.address || f.notes || '' });
            } else {
              events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM',
                name:fallback(FALLBACK.evening, fallbackIdx++), category:'dinner', notes:'' });
            }
          } // end regular day

          days.push({ id:`day-${dayNum}`, dayNumber:dayNum, date:dayDate, location:dest, events });
          dayNum++;
          dayOffset++;
        }

        // ── Travel day between destinations ───────────────────
        if (di < dests.length - 1 && dayOffset <= maxDayOffset) {
          const travelDate = dateForOffset(dayOffset);
          days.push({
            id:`day-${dayNum}`, dayNumber:dayNum, date:travelDate,
            location:`${dest} → ${dests[di+1]}`,
            events: [
              { id:'te-0', time:'9:00 AM',  name:`Check out in ${dest}`,                category:'transport', notes:'' },
              { id:'te-1', time:'11:00 AM', name:`Travel to ${dests[di+1]}`,             category:'transport', notes:'' },
              { id:'te-2', time:'2:00 PM',  name:`Arrive & check in at ${dests[di+1]}`,  category:'transport', notes:'' },
              { id:'te-3', time:'7:00 PM',  name:`Welcome dinner in ${dests[di+1]}`,     category:'dinner',    notes:'' },
            ],
          });
          dayNum++;
          dayOffset++;
        }
      });

      // Render immediately — user sees the itinerary right away
      renderList();

      // Save to Firestore in the background — don't await so UI never hangs
      save().catch(err => {
        console.warn('Itinerary auto-save failed (will retry on next Save & Publish):', err.message);
      });
    };

    const eventFormFields = (ev = {}) => `
      <div class="field"><label>Event name</label>
        <input id="ef-name" placeholder="Breakfast at Blue Bottle" value="${ev.name||''}" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="field"><label>Time</label>
          <input type="text" id="ef-time" placeholder="8:00 AM" value="${ev.time||''}" />
        </div>
        <div class="field"><label>Type</label>
          <select id="ef-cat">
            ${['activity','breakfast','lunch','dinner','transport','evening','general'].map(c =>
              `<option value="${c}" ${ev.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="field"><label>Notes <span class="optional">optional</span></label>
        <input id="ef-notes" placeholder="Tips, reservations..." value="${ev.notes||''}" />
      </div>`;

    const openAddEvent = (dayIndex) => {
      const content = document.createElement('div');
      content.style.cssText = 'display:flex;flex-direction:column;gap:12px';
      content.innerHTML = eventFormFields() + `
        <div class="modal-actions">
          <button class="btn btn-sand btn-md" id="ef-cancel">Cancel</button>
          <button class="btn btn-clay btn-md" id="ef-add">Add Event</button>
        </div>`;
      const { close } = UI.openModal({ title: 'add event', size: 'sm', content });
      content.querySelector('#ef-cancel').onclick = close;
      content.querySelector('#ef-add').onclick = () => {
        const name = content.querySelector('#ef-name').value.trim();
        if (!name) return;
        if (!days[dayIndex].events) days[dayIndex].events = [];
        days[dayIndex].events.push({
          id: `e-${Date.now()}`,
          name,
          time:     content.querySelector('#ef-time').value.trim(),
          category: content.querySelector('#ef-cat').value,
          notes:    content.querySelector('#ef-notes').value.trim(),
        });
        save(); renderList(); close();
      };
    };

    const openEditEvent = (dayIndex, evIndex, ev) => {
      const content = document.createElement('div');
      content.style.cssText = 'display:flex;flex-direction:column;gap:12px';
      content.innerHTML = eventFormFields(ev) + `
        <div class="modal-actions">
          <button class="btn btn-sand btn-md" id="ef-cancel">Cancel</button>
          <button class="btn btn-clay btn-md" id="ef-save">Save Changes</button>
        </div>`;
      const { close } = UI.openModal({ title: 'edit event', size: 'sm', content });
      content.querySelector('#ef-cancel').onclick = close;
      content.querySelector('#ef-save').onclick = () => {
        const name = content.querySelector('#ef-name').value.trim();
        if (!name) return;
        days[dayIndex].events[evIndex] = {
          ...days[dayIndex].events[evIndex],
          name,
          time:     content.querySelector('#ef-time').value.trim(),
          category: content.querySelector('#ef-cat').value,
          notes:    content.querySelector('#ef-notes').value.trim(),
        };
        save(); renderList(); close();
      };
    };

    const openAddDay = () => {
      const content = document.createElement('div');
      content.style.cssText = 'display:flex;flex-direction:column;gap:12px';
      content.innerHTML = `
        <div class="field"><label>Location</label>
          <select id="ad-loc">
            ${(board.destinations||[]).map(d=>`<option value="${d}">${d}</option>`).join('')}
            <option value="">General</option>
          </select>
        </div>
        <div class="field"><label>Date <span class="optional">optional</span></label>
          <input type="date" id="ad-date" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-sand btn-md" id="ad-cancel">Cancel</button>
          <button class="btn btn-clay btn-md" id="ad-add">Add Day</button>
        </div>`;
      const { close } = UI.openModal({ title: 'add a day', size: 'sm', content });
      content.querySelector('#ad-cancel').onclick = close;
      content.querySelector('#ad-add').onclick = () => {
        days.push({
          id: `day-${Date.now()}`,
          dayNumber: days.length + 1,
          location:  content.querySelector('#ad-loc').value,
          date:      content.querySelector('#ad-date').value,
          events:    [],
        });
        save(); renderList(); close();
      };
    };

    renderList();
    return el;
  },

  // ── SETTINGS ──────────────────────────────────────────────
  renderSettingsTab(board) {
    const isOwner = board.ownerId === window.currentUser?.uid;
    let title = board.title, privacy = board.privacy, vision = board.visionBoardOn ?? true;
    let confirmDelete = false;

    const el = document.createElement('div');
    el.className = 'bst';
    el.innerHTML = `
      <div class="bst-section">
        <div class="bst-section-title">Board Details</div>
        <div class="field"><label>Board name</label><input id="bst-title" value="${title}" ${!isOwner?'disabled':''} /></div>
        <div class="field">
          <label>Trip dates <span style="font-size:10px;color:var(--ink-40);font-weight:400;text-transform:none">optional</span></label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="date" id="bst-start" value="${board.startDate||''}" ${!isOwner?'disabled':''} style="flex:1;padding:9px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--ink);background:${!isOwner?'var(--sand)':'var(--white)'};outline:none" />
            <span style="color:var(--ink-40);font-size:14px">→</span>
            <input type="date" id="bst-end" value="${board.endDate||''}" ${!isOwner?'disabled':''} style="flex:1;padding:9px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--ink);background:${!isOwner?'var(--sand)':'var(--white)'};outline:none" />
          </div>
        </div>
        <div class="field"><label>Privacy</label><div id="bst-privacy"></div></div>
        <div class="field">
          <label>Fly in <span style="font-size:10px;color:var(--ink-40);font-weight:400;text-transform:none">optional</span></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="bst-fly-in-airport" placeholder="MAD, JFK…" value="${board.flyInAirport||''}" ${!isOwner?'disabled':''} style="padding:9px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--ink);outline:none;background:${!isOwner?'var(--sand)':'var(--white)'}" />
            <input id="bst-fly-in-time"    placeholder="2:30 PM"    value="${board.flyInTime||''}"    ${!isOwner?'disabled':''} style="padding:9px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--ink);outline:none;background:${!isOwner?'var(--sand)':'var(--white)'}" />
          </div>
          <p style="font-size:11px;color:var(--ink-40);margin-top:4px">Arrival airport code and landing time</p>
        </div>
        <div class="field">
          <label>Fly out <span style="font-size:10px;color:var(--ink-40);font-weight:400;text-transform:none">optional</span></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="bst-fly-out-airport" placeholder="BCN, LHR…" value="${board.flyOutAirport||''}" ${!isOwner?'disabled':''} style="padding:9px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--ink);outline:none;background:${!isOwner?'var(--sand)':'var(--white)'}" />
            <input id="bst-fly-out-time"    placeholder="10:00 AM"    value="${board.flyOutTime||''}"    ${!isOwner?'disabled':''} style="padding:9px 12px;border:1px solid var(--ink-20);border-radius:12px;font-family:var(--font-body);font-size:13px;color:var(--ink);outline:none;background:${!isOwner?'var(--sand)':'var(--white)'}" />
          </div>
          <p style="font-size:11px;color:var(--ink-40);margin-top:4px">Departure airport code and flight time</p>
        </div>
        <div class="field">
          <label>Vision Board</label>
          <div class="toggle-wrap" id="bst-vis-wrap" style="${!isOwner?'opacity:0.6;pointer-events:none':''}">
            <span id="bst-vis-label" style="font-size:13px;color:var(--ink-60)">${vision ? 'Enabled' : 'Hidden'}</span>
            <button class="toggle ${vision?'on':''}" id="bst-vis-btn"><span class="toggle-thumb"></span></button>
          </div>
        </div>
        ${isOwner ? `<button class="btn btn-clay btn-md btn-full" id="bst-save">Save Changes</button>` : ''}
      </div>
      <div class="bst-section">
        <div class="bst-section-title">Share</div>
        <div class="bst-share-row">
          <input class="bst-share-url" value="${window.location.href}" readonly />
          <button class="btn btn-sand btn-sm" id="bst-copy">Copy</button>
        </div>
        <p class="bst-hint">${{public:'Anyone with this link can view.',friends:'Only your friends can view.',private:'Only collaborators can view.'}[board.privacy]}</p>
      </div>
      <div class="bst-section">
        <div class="bst-section-title">Collaborators</div>
        ${(board.collaborators||[]).map((uid,i) => `
          <div class="collab-row">
            <div class="collab-avatar" style="background:${UI.collabColor(i)}"></div>
            <span class="collab-uid">${uid === board.ownerId ? 'Owner' : uid === window.currentUser?.uid ? 'You' : `Collaborator ${i+1}`}</span>
          </div>`).join('')}
      </div>
      ${isOwner ? `
      <div class="bst-section bst-danger">
        <div class="bst-section-title">Danger Zone</div>
        <p class="bst-danger-desc">Deleting this board permanently removes all places, images, and itinerary data.</p>
        <button class="btn btn-danger btn-md" id="bst-delete">Delete Board</button>
      </div>` : ''}`;

    if (isOwner) {
      el.querySelector('#bst-privacy').appendChild(UI.privacySelect(privacy, v => { privacy = v; }));
      el.querySelector('#bst-vis-wrap').onclick = () => {
        vision = !vision;
        el.querySelector('#bst-vis-btn').classList.toggle('on', vision);
        el.querySelector('#bst-vis-label').textContent = vision ? 'Enabled' : 'Hidden';
      };
      el.querySelector('#bst-save').onclick = async () => {
        const btn = el.querySelector('#bst-save');
        btn.textContent = 'Saving...'; btn.disabled = true;
        await window.DB.updateBoard(board.id, {
          title:          el.querySelector('#bst-title').value.trim(),
          privacy,
          visionBoardOn:  vision,
          startDate:      el.querySelector('#bst-start').value || null,
          endDate:        el.querySelector('#bst-end').value   || null,
          flyInAirport:   el.querySelector('#bst-fly-in-airport').value.trim().toUpperCase()  || null,
          flyInTime:      el.querySelector('#bst-fly-in-time').value.trim()                   || null,
          flyOutAirport:  el.querySelector('#bst-fly-out-airport').value.trim().toUpperCase() || null,
          flyOutTime:     el.querySelector('#bst-fly-out-time').value.trim()                  || null,
        });
        btn.textContent = '✓ Saved!';
        setTimeout(() => { btn.textContent = 'Save Changes'; btn.disabled = false; }, 2000);
      };
      el.querySelector('#bst-delete').onclick = async () => {
        if (!confirmDelete) {
          confirmDelete = true;
          el.querySelector('#bst-delete').textContent = 'Click again to confirm';
          return;
        }
        await window.DB.deleteBoard(board.id, window.currentUser.uid);
        window.App.navigate('boards');
      };
    }

    el.querySelector('#bst-copy').onclick = () => {
      navigator.clipboard.writeText(window.location.href);
      const btn = el.querySelector('#bst-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    };

    return el;
  },
};
