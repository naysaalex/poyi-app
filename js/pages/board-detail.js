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
        const days = board.endDate ? Math.ceil((new Date(board.endDate) - new Date(board.startDate)) / 86400000) : null;
        s.textContent = new Date(board.startDate).toLocaleDateString('en-US', { month:'short', day:'numeric' })
          + (board.endDate ? ` – ${new Date(board.endDate).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}` : '')
          + (days ? ` · ${days} days` : '');
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
    const MAPS_KEY = '';

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
            <div class="place-dot" style="background:${color}"></div>
            <div class="place-main">
              <div class="place-name">${place.name}</div>
              <div class="place-meta">
                <span class="place-cat" style="color:${color};background:${color}18">${place.category||'general'}</span>
                ${place.address ? `<span class="place-addr">${place.address}</span>` : ''}
              </div>
              ${place.notes ? `<div class="place-notes">${place.notes}</div>` : ''}
            </div>
            <div class="place-actions">
              ${canEdit ? `
                <button class="place-edit" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="place-delete" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg></button>
              ` : ''}
            </div>`;
          row.querySelector('.place-delete')?.addEventListener('click', e => {
            e.stopPropagation();
            window.DB.deletePlace(board.id, place.id);
          });
          row.querySelector('.place-edit')?.addEventListener('click', e => {
            e.stopPropagation();
            openEditPlace(place);
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
    el.querySelector('#pt-map-btn').onclick = () => {
      el.querySelector('#pt-list').style.display = 'none';
      const mapEl = el.querySelector('#pt-map');
      mapEl.style.display = '';
      el.querySelector('#pt-list-btn').classList.remove('active');
      el.querySelector('#pt-map-btn').classList.add('active');
      if (!mapEl.innerHTML) {
        const query = board.destinations?.join('+') || board.title;
        mapEl.innerHTML = MAPS_KEY
          ? `<iframe src="https://www.google.com/maps/embed/v1/search?key=${MAPS_KEY}&q=${encodeURIComponent(query)}" allowfullscreen loading="lazy" style="width:100%;height:100%;border:none"></iframe>`
          : `<div class="pt-map-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
              <p>Map view</p><span>Add a Google Maps API key in board-detail.js to enable this</span>
            </div>`;
      }
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
    const unsub = window.DB.subscribeToBoardPlaces(board.id, p => { places = p; renderPlaces(); });
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
      // Show a loading overlay so the user gets instant feedback
      const loadingEl = document.createElement('div');
      loadingEl.style.cssText = 'position:absolute;inset:0;background:rgba(250,248,244,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10;border-radius:inherit';
      loadingEl.innerHTML = `
        <div style="width:32px;height:32px;border:2px solid var(--clay-light);border-top-color:var(--clay);border-radius:50%;animation:spin 0.7s linear infinite"></div>
        <p style="font-family:var(--font-display);font-style:italic;font-size:18px;font-weight:300;color:var(--ink-60)">Building your itinerary…</p>`;
      el.style.position = 'relative';
      el.appendChild(loadingEl);

      // Wrap everything in try/finally so the overlay ALWAYS gets removed
      try {
        // 1. Fetch saved places — no orderBy to avoid index requirement
        let savedPlaces = [];
        try {
          const snap = await window.firebaseDb
            .collection('boards').doc(board.id)
            .collection('places').get();
          savedPlaces = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Sort client-side by createdAt
          savedPlaces.sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return ta - tb;
          });
        } catch (e) {
          console.warn('Could not load places for itinerary generation:', e);
          // Continue with empty places — will use fallback suggestions
        }

      const dests = board.destinations?.length ? board.destinations : ['Destination'];

      // 2. Count non-food places per destination (food places become meals separately)
      //    Places with no location go into the first destination.
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

      // 3. Work out total days available
      const totalDays = board.startDate && board.endDate
        ? Math.max(1, Math.ceil((new Date(board.endDate) - new Date(board.startDate)) / 86400000))
        : null;

      // 4. Allocate days per destination
      //    Formula: weight = max(1, activityCount) so destinations with more
      //    saved places get proportionally more days.
      //    Minimum 1 day per destination always guaranteed.
      const weights  = dests.map(d => Math.max(1, activityCount[d] || 0));
      const totalW   = weights.reduce((a, b) => a + b, 0);
      let   daysLeft = totalDays ?? Math.max(dests.length, weights.reduce((a, b) => a + Math.max(1, Math.ceil(b * 1.5)), 0));
      daysLeft = Math.min(daysLeft, 21); // cap at 3 weeks

      // Allocate days — build incrementally to avoid self-reference issues
      const daysPerDest = [];
      let allocated = 0;
      dests.forEach((d, i) => {
        if (i === dests.length - 1) {
          // Give remaining days to last destination (minimum 1)
          daysPerDest.push(Math.max(1, daysLeft - allocated));
        } else {
          const share = Math.max(1, Math.round((weights[i] / totalW) * daysLeft));
          daysPerDest.push(share);
          allocated += share;
        }
      });

      // 5. Generic fallback suggestions (used when no saved places fill a slot)
      const FALLBACK = {
        morning:   ['Breakfast at a local café',    'Morning market visit',  'Explore the neighbourhood'],
        museum:    ['Museum visit',                  'Art gallery',           'Historical site tour'],
        landmark:  ['Visit main landmark',           'Guided city tour',      'Viewpoint & photos'],
        afternoon: ['Afternoon walking tour',        'Shopping district',     'Local market browse'],
        evening:   ['Sunset viewpoint',              'Night market',          'Evening riverside walk'],
      };
      const fallback = (pool, i) => pool[i % pool.length];

      // 6. Build days
      days = [];
      let dayNum  = 1;
      let datePtr = board.startDate ? new Date(board.startDate + 'T12:00:00') : null;

      dests.forEach((dest, di) => {
        const numDaysHere = daysPerDest[di];

        // Places for this destination, split by category
        const destPlaces    = savedPlaces.filter(p => (p.location || dests[0]) === dest);
        const foodPlaces    = destPlaces.filter(p => p.category === 'food');
        const actPlaces     = destPlaces.filter(p => p.category !== 'food');

        // Spread activity places across days (2–3 per day max to keep it realistic)
        const ACTS_PER_DAY = 2;
        let   actQueue = [...actPlaces];
        let   foodQueue = [...foodPlaces];
        let   fallbackMorningIdx = 0, fallbackAfternoonIdx = 0, fallbackEveningIdx = 0;

        for (let d = 0; d < numDaysHere; d++) {
          const dayDate = datePtr ? datePtr.toISOString().split('T')[0] : null;
          const events  = [];
          let   eid     = 0;

          // ── Breakfast (8:00 AM) ──
          const bfFood = foodQueue.find(p => p.notes?.toLowerCase().includes('breakfast')
            || p.name.toLowerCase().includes('breakfast')
            || p.name.toLowerCase().includes('café')
            || p.name.toLowerCase().includes('cafe')
            || p.name.toLowerCase().includes('coffee'));
          if (bfFood) {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'8:00 AM',
              name: bfFood.name, category:'breakfast',
              notes: bfFood.address || bfFood.notes || '' });
            foodQueue = foodQueue.filter(p => p.id !== bfFood.id);
          } else {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'8:00 AM',
              name: fallback(FALLBACK.morning, fallbackMorningIdx++),
              category:'breakfast', notes:'' });
          }

          // ── Morning activity (10:00 AM) ──
          const act1 = actQueue.shift();
          if (act1) {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'10:00 AM',
              name: act1.name, category: act1.category === 'museum' ? 'activity' : act1.category,
              notes: act1.address || act1.notes || '' });
          } else {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'10:00 AM',
              name: fallback(FALLBACK.landmark, fallbackMorningIdx),
              category:'activity', notes:'' });
          }

          // ── Lunch (1:00 PM) ──
          const lunchFood = foodQueue.find(p =>
            p.notes?.toLowerCase().includes('lunch') ||
            p.name.toLowerCase().includes('restaurant') ||
            p.name.toLowerCase().includes('lunch') ||
            p.name.toLowerCase().includes('ramen') ||
            p.name.toLowerCase().includes('sushi') ||
            p.name.toLowerCase().includes('noodle'));
          if (lunchFood) {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'1:00 PM',
              name: lunchFood.name, category:'lunch',
              notes: lunchFood.address || lunchFood.notes || '' });
            foodQueue = foodQueue.filter(p => p.id !== lunchFood.id);
          } else if (foodQueue.length) {
            const anyFood = foodQueue.shift();
            events.push({ id:`e-${dayNum}-${eid++}`, time:'1:00 PM',
              name: anyFood.name, category:'lunch',
              notes: anyFood.address || anyFood.notes || '' });
          } else {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'1:00 PM',
              name: `Lunch in ${dest}`, category:'lunch', notes:'' });
          }

          // ── Afternoon activity (3:00 PM) ──
          const act2 = actQueue.shift();
          if (act2) {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'3:00 PM',
              name: act2.name, category: act2.category,
              notes: act2.address || act2.notes || '' });
          } else {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'3:00 PM',
              name: fallback(FALLBACK.afternoon, fallbackAfternoonIdx++),
              category:'activity', notes:'' });
          }

          // ── Dinner (7:00 PM) ──
          const dinnerFood = foodQueue.find(p =>
            p.notes?.toLowerCase().includes('dinner') ||
            p.name.toLowerCase().includes('dinner') ||
            p.name.toLowerCase().includes('bar') ||
            p.name.toLowerCase().includes('izakaya') ||
            p.name.toLowerCase().includes('bistro'));
          if (dinnerFood) {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM',
              name: dinnerFood.name, category:'dinner',
              notes: dinnerFood.address || dinnerFood.notes || '' });
            foodQueue = foodQueue.filter(p => p.id !== dinnerFood.id);
          } else if (foodQueue.length) {
            const anyFood = foodQueue.shift();
            events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM',
              name: anyFood.name, category:'dinner',
              notes: anyFood.address || anyFood.notes || '' });
          } else {
            events.push({ id:`e-${dayNum}-${eid++}`, time:'7:00 PM',
              name: fallback(FALLBACK.evening, fallbackEveningIdx++),
              category:'dinner', notes:'' });
          }

          days.push({ id:`day-${dayNum}`, dayNumber: dayNum, date: dayDate, location: dest, events });
          dayNum++;
          if (datePtr) datePtr = new Date(datePtr.getTime() + 86400000);
        }

        // Travel day between destinations (if not the last destination)
        if (di < dests.length - 1) {
          const travelDate = datePtr ? datePtr.toISOString().split('T')[0] : null;
          days.push({
            id: `day-${dayNum}`, dayNumber: dayNum, date: travelDate,
            location: `${dest} → ${dests[di+1]}`,
            events: [
              { id:`te-0`, time:'9:00 AM',  name:`Check out of accommodation in ${dest}`,  category:'transport', notes:'' },
              { id:`te-1`, time:'11:00 AM', name:`Travel to ${dests[di+1]}`,               category:'transport', notes:'' },
              { id:`te-2`, time:'2:00 PM',  name:`Arrive & check in at ${dests[di+1]}`,    category:'transport', notes:'' },
              { id:`te-3`, time:'7:00 PM',  name:`Welcome dinner in ${dests[di+1]}`,       category:'dinner',    notes:'' },
            ],
          });
          dayNum++;
          if (datePtr) datePtr = new Date(datePtr.getTime() + 86400000);
        }
      });

        await save();
        renderList();

      } catch (err) {
        console.error('Itinerary generation failed:', err);
        UI.toast('Could not build itinerary — please try again', 'error');
      } finally {
        // Always remove the loading overlay, even if something threw
        loadingEl.remove();
        el.style.position = '';
      }
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
        <div class="field"><label>Privacy</label><div id="bst-privacy"></div></div>
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
          title:         el.querySelector('#bst-title').value.trim(),
          privacy,
          visionBoardOn: vision,
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
