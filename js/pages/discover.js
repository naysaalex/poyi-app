// js/pages/discover.js
window.DiscoverPage = {
  unsubSave: null,

  render() {
    const el = document.createElement('div');
    el.className = 'discover-page';
    el.innerHTML = `
      <div class="discover-header">
        <h1 class="discover-title">where to next?</h1>
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="discover-search" placeholder="search destinations, food, experiences..." />
        </div>
        <div class="filter-pills" id="discover-cats"></div>
      </div>
      <div class="discover-feed" id="discover-feed"></div>`;

    const CATS = ['all','food','views','nature','architecture','culture','beach','adventure'];
    let activeCat = 'all';
    let searchTimer;

    const catsEl = el.querySelector('#discover-cats');
    const feedEl = el.querySelector('#discover-feed');
    const searchEl = el.querySelector('#discover-search');

    // Build category pills
    CATS.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `pill ${cat === 'all' ? 'active' : ''}`;
      pill.textContent = { all:'All', food:'Food & Drink', views:'Views', nature:'Nature', architecture:'Architecture', culture:'Culture', beach:'Beach', adventure:'Adventure' }[cat];
      pill.onclick = () => {
        activeCat = cat;
        catsEl.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        loadImages();
      };
      catsEl.appendChild(pill);
    });

    // Search debounce
    searchEl.oninput = () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadImages(searchEl.value.trim()), 500);
    };

    const loadImages = async (query = '') => {
      feedEl.innerHTML = `<div class="masonry">${[0,1,2].map(() => `<div class="masonry-col">${Array(6).fill('<div class="skeleton" style="height:160px;margin-bottom:10px"></div>').join('')}</div>`).join('')}</div>`;
      const imgs = query
        ? await window.Unsplash.search(query)
        : await window.Unsplash.getDiscover(activeCat);
      this.renderImages(imgs, feedEl);
    };

    loadImages();
    return el;
  },

  renderImages(imgs, feedEl) {
    feedEl.innerHTML = '';
    if (!imgs.length) {
      feedEl.innerHTML = '<div class="empty-state"><p>No images found</p><span>Try a different search or category</span></div>';
      return;
    }
    const grid = UI.renderMasonry(imgs, img => {
      const ar = Math.min(Math.max(img.ar || 1, 0.5), 1.8);
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.style.aspectRatio = ar;
      card.innerHTML = `
        <img src="${window.Unsplash.thumbUrl(img)}" alt="${img.alt || ''}" loading="lazy" />
        <div class="photo-card-overlay">
          <button class="photo-card-save" title="Save to board">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
          <div>
            ${img.location ? `<div class="photo-card-loc">${img.location}</div>` : ''}
            ${img.alt     ? `<div class="photo-card-alt">${img.alt}</div>` : ''}
          </div>
        </div>`;
      const imgEl = card.querySelector('img');
      imgEl.onload = () => imgEl.classList.add('loaded');
      card.querySelector('.photo-card-save').onclick = (e) => {
        e.stopPropagation();
        this.openSaveModal(img);
      };
      return card;
    });
    feedEl.appendChild(grid);
  },

  openSaveModal(img) {
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '16px';

    content.innerHTML = `
      <div style="width:100%;height:160px;border-radius:12px;overflow:hidden;background:var(--sand-deep);position:relative">
        <img src="${window.Unsplash.thumbUrl(img)}" style="width:100%;height:100%;object-fit:cover" />
        ${img.location ? `<span style="position:absolute;bottom:10px;left:10px;font-size:11px;font-weight:500;color:var(--white);background:rgba(28,24,20,0.5);padding:3px 8px;border-radius:999px">${img.location}</span>` : ''}
      </div>
      <p style="font-size:11px;font-weight:500;color:var(--ink-60);text-transform:uppercase;letter-spacing:0.5px">Choose a trip board</p>
      <div id="stb-list" style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:8px">
        <button class="btn btn-sand btn-md" id="stb-cancel">Cancel</button>
        <button class="btn btn-clay btn-md" id="stb-save" disabled>Save to board</button>
      </div>`;

    const { close } = UI.openModal({ title: 'save to board', size: 'sm', content });
    content.querySelector('#stb-cancel').onclick = close;

    let selectedId = null;
    const saveBtn = content.querySelector('#stb-save');

    // Load user boards
    window.DB.subscribeToUserBoards(window.currentUser.uid, boards => {
      const list = content.querySelector('#stb-list');
      if (!boards.length) {
        list.innerHTML = '<p style="font-size:13px;color:var(--ink-40);text-align:center;padding:20px 0">No boards yet — create a trip first!</p>';
        return;
      }
      list.innerHTML = boards.map(b => `
        <div class="stb-board-item" data-id="${b.id}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;border:1.5px solid var(--ink-10);background:var(--white);cursor:pointer;transition:all 0.15s">
          <div style="width:44px;height:36px;border-radius:8px;flex-shrink:0;background:${UI.boardGradient(b.title)}"></div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--ink)">${b.title}</div>
            <div style="font-size:11px;color:var(--ink-40)">${(b.destinations||[]).slice(0,3).join(', ')}</div>
          </div>
        </div>`).join('');
      list.querySelectorAll('.stb-board-item').forEach(item => {
        item.onclick = () => {
          list.querySelectorAll('.stb-board-item').forEach(i => { i.style.borderColor = 'var(--ink-10)'; i.style.background = 'var(--white)'; });
          item.style.borderColor = 'var(--clay)';
          item.style.background  = 'rgba(196,149,106,0.06)';
          selectedId = item.dataset.id;
          saveBtn.disabled = false;
        };
      });
    });

    saveBtn.onclick = async () => {
      if (!selectedId) return;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      await window.DB.addVisionImage(selectedId, {
        url: img.url || img.thumb, sourceUrl: img.url,
        tags: img.cats || [], addedBy: window.currentUser.uid,
      });
      saveBtn.textContent = '✓ Saved!';
      setTimeout(close, 800);
    };
  },
};
