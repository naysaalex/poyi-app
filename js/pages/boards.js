// js/pages/boards.js
window.BoardsPage = {
  unsub: null,

  destroy() { this.unsub && this.unsub(); },

  render() {
    const el = document.createElement('div');
    el.className = 'boards-page';
    el.innerHTML = `
      <div class="boards-header">
        <div>
          <h1 class="page-title">my boards</h1>
          <p class="boards-sub" id="board-sub">0 trips planned</p>
        </div>
        <button class="btn btn-clay btn-md" id="new-trip-btn">+ New Trip</button>
      </div>
      <div class="boards-list" id="boards-list"></div>`;

    el.querySelector('#new-trip-btn').onclick = () => window.App.openNewTripModal();

    this.unsub = window.DB.subscribeToUserBoards(window.currentUser.uid, boards => {
      const list = el.querySelector('#boards-list');
      el.querySelector('#board-sub').textContent = `${boards.length} trip${boards.length !== 1 ? 's' : ''} planned`;
      list.innerHTML = '';

      if (!boards.length) {
        list.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
          <p>No trips yet</p>
          <span>Start planning your next adventure</span>
          <button class="btn btn-clay btn-md" id="empty-new-btn">Plan a trip</button>
        </div>`;
        list.querySelector('#empty-new-btn').onclick = () => window.App.openNewTripModal();
        return;
      }

      boards.forEach(board => {
        const days = board.startDate && board.endDate
          ? Math.ceil((new Date(board.endDate) - new Date(board.startDate)) / 86400000)
          : null;

        const row = document.createElement('div');
        row.className = 'board-row animate-fade-in';
        row.innerHTML = `
          <div class="board-row-thumb" style="background:${UI.boardGradient(board.title)}"></div>
          <div class="board-row-content">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
              <h2 class="board-row-title">${board.title}</h2>
              ${UI.privacyBadge(board.privacy)}
            </div>
            <p class="board-row-dests">${(board.destinations||[]).join(' · ') || 'No destinations yet'}</p>
            <div class="board-row-meta">
              ${board.startDate ? `<span>${new Date(board.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}${days ? ` · ${days} days` : ''}</span>` : ''}
              <span>${(board.collaborators||[1]).length} collaborator${(board.collaborators||[]).length !== 1 ? 's' : ''}</span>
              ${board.visionBoardOn ? '<span class="vision-tag">Vision board</span>' : ''}
            </div>
          </div>
          <div class="board-row-arrow">→</div>`;
        row.onclick = () => window.App.navigate('board-detail', { boardId: board.id });
        list.appendChild(row);
      });
    });

    return el;
  },
};

// ── New Trip Modal ─────────────────────────────────────────────
window.NewTripModal = {
  open() {
    let step = 0;
    let title = '', privacy = 'friends', destinations = [], destInput = '';
    let startDate = '', endDate = '', visionBoard = true, selectedCollabs = new Set();
    let friends = [];

    const STEPS = ['Details', 'Destinations', 'Settings'];

    const content = document.createElement('div');

    const render = () => {
      content.innerHTML = `
        <!-- Step dots -->
        <div class="step-dots">
          ${STEPS.map((s, i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;position:relative;z-index:1">
              <div class="step-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}">${i < step ? '✓' : i + 1}</div>
              <span class="step-label ${i === step ? 'active' : ''}">${s}</span>
            </div>`).join('')}
        </div>

        ${step === 0 ? `
          <div class="field"><label>Trip name</label>
            <input id="nt-title" placeholder="Japan Fall 2026, Italy Road Trip..." value="${title}" autofocus />
          </div>
          <div class="field"><label>Who can see this?</label>
            <div id="nt-privacy"></div>
          </div>` : ''}

        ${step === 1 ? `
          <div class="field">
            <label>Add destinations</label>
            <p class="hint">Add cities, regions, or countries</p>
            <div class="dest-input-row">
              <div class="dest-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <input id="nt-dest-input" placeholder="Tokyo, Kyoto, Osaka..." value="${destInput}" />
              </div>
              <button class="btn btn-clay btn-sm" id="nt-add-dest">Add</button>
            </div>
            <div class="dest-chips" id="nt-dest-chips"></div>
          </div>
          <div class="field">
            <label>Dates <span class="optional">optional</span></label>
            <div class="dates-row">
              <div class="date-field">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <input type="date" id="nt-start" value="${startDate}" />
              </div>
              <span class="dates-sep">→</span>
              <div class="date-field">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <input type="date" id="nt-end" value="${endDate}" min="${startDate}" />
              </div>
            </div>
          </div>` : ''}

        ${step === 2 ? `
          <div class="field">
            <label>Vision board</label>
            <div class="toggle-wrap" id="nt-vision-toggle">
              <div>
                <p style="font-size:13px;font-weight:500;color:var(--ink)">${visionBoard ? 'Vision board enabled' : 'Vision board hidden'}</p>
                <p class="hint">You can change this any time after creating the board</p>
              </div>
              <button class="toggle ${visionBoard ? 'on' : ''}" id="nt-vision-btn"><span class="toggle-thumb"></span></button>
            </div>
          </div>
          ${privacy !== 'private' ? `
            <div class="field">
              <label>Invite collaborators <span class="optional">optional</span></label>
              <p class="hint">Friends who can edit this board</p>
              <div class="collab-list" id="nt-collab-list"><p style="font-size:12px;color:var(--ink-40);text-align:center;padding:12px">Loading friends...</p></div>
            </div>` : ''}` : ''}

        <div class="modal-actions">
          ${step > 0 ? `<button class="btn btn-sand btn-md" id="nt-back">← Back</button>` : ''}
          ${step < 2
            ? `<button class="btn btn-clay btn-md" id="nt-next" ${step === 0 && !title.trim() ? 'disabled' : ''}>Next →</button>`
            : `<button class="btn btn-clay btn-md" id="nt-create" ${!title.trim() ? 'disabled' : ''}>Create Board ✓</button>`}
        </div>`;

      // Bind privacy select on step 0
      if (step === 0) {
        const privacyEl = content.querySelector('#nt-privacy');
        privacyEl.appendChild(UI.privacySelect(privacy, v => { privacy = v; }));
        content.querySelector('#nt-title').oninput = e => { title = e.target.value; content.querySelector('#nt-next').disabled = !title.trim(); };
      }

      // Bind destination inputs on step 1
      if (step === 1) {
        const renderChips = () => {
          const chips = content.querySelector('#nt-dest-chips');
          chips.innerHTML = destinations.map(d => `<span class="chip">${d}<button class="chip-btn" data-dest="${d}">✕</button></span>`).join('');
          chips.querySelectorAll('.chip-btn').forEach(btn => {
            btn.onclick = () => { destinations = destinations.filter(x => x !== btn.dataset.dest); renderChips(); };
          });
        };
        renderChips();
        const addDest = () => {
          const val = content.querySelector('#nt-dest-input').value.trim();
          if (val && !destinations.includes(val)) { destinations.push(val); content.querySelector('#nt-dest-input').value = ''; renderChips(); }
        };
        content.querySelector('#nt-add-dest').onclick = addDest;
        content.querySelector('#nt-dest-input').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addDest(); } };
        content.querySelector('#nt-start').onchange = e => { startDate = e.target.value; };
        content.querySelector('#nt-end').onchange   = e => { endDate   = e.target.value; };
      }

      // Bind step 2 controls
      if (step === 2) {
        content.querySelector('#nt-vision-toggle').onclick = () => {
          visionBoard = !visionBoard;
          content.querySelector('#nt-vision-btn').classList.toggle('on', visionBoard);
          content.querySelector('#nt-vision-btn').previousElementSibling.querySelector('p').textContent =
            visionBoard ? 'Vision board enabled' : 'Vision board hidden';
        };
        if (privacy !== 'private') {
          window.DB.getFriends(window.currentUser.uid).then(f => {
            friends = f;
            const list = content.querySelector('#nt-collab-list');
            if (!f.length) { list.innerHTML = '<p style="font-size:12px;color:var(--ink-40);text-align:center;padding:12px">No friends yet!</p>'; return; }
            list.innerHTML = '';
            f.forEach(friend => {
              const item = document.createElement('div');
              item.className = `collab-item ${selectedCollabs.has(friend.uid) ? 'selected' : ''}`;
              item.innerHTML = `
                <div class="collab-item-avatar">${friend.photoURL ? `<img src="${friend.photoURL}">` : UI.initials(friend.displayName)}</div>
                <div class="collab-item-info"><span>${friend.displayName}</span><span>@${friend.handle}</span></div>
                <div class="collab-check ${selectedCollabs.has(friend.uid) ? 'on' : ''}">${selectedCollabs.has(friend.uid) ? '✓' : ''}</div>`;
              item.onclick = () => {
                if (selectedCollabs.has(friend.uid)) selectedCollabs.delete(friend.uid);
                else selectedCollabs.add(friend.uid);
                item.classList.toggle('selected', selectedCollabs.has(friend.uid));
                item.querySelector('.collab-check').classList.toggle('on', selectedCollabs.has(friend.uid));
                item.querySelector('.collab-check').textContent = selectedCollabs.has(friend.uid) ? '✓' : '';
              };
              list.appendChild(item);
            });
          });
        }
      }

      // Navigation
      content.querySelector('#nt-back')?.addEventListener('click', () => { step--; render(); });
      content.querySelector('#nt-next')?.addEventListener('click', () => { step++; render(); });
      content.querySelector('#nt-create')?.addEventListener('click', async () => {
        const btn = content.querySelector('#nt-create');
        btn.textContent = 'Creating...'; btn.disabled = true;
        const boardId = await window.DB.createBoard(window.currentUser.uid, {
          title: title.trim(), privacy, destinations, startDate: startDate || null,
          endDate: endDate || null, visionBoardOn: visionBoard,
          tags: destinations.map(d => d.toLowerCase()),
        });
        for (const uid of selectedCollabs) {
          await window.DB.inviteCollaborator(boardId, uid, window.currentUser.uid);
        }
        modal.close();
        window.App.navigate('board-detail', { boardId });
      });
    };

    const modal = UI.openModal({ title: step === 0 ? 'start a new trip' : step === 1 ? 'where are you going?' : 'a few more details', size: 'md', content });
    render();

    return modal;
  },
};
