// js/ui.js  — shared UI helpers

window.UI = {
  // ── Modal ────────────────────────────────────────────────
  openModal({ title, size = 'md', content, onClose }) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay animate-scale-in';

    overlay.innerHTML = `
      <div class="modal modal-${size}">
        <div class="modal-header">
          <h2 class="modal-title">${title || ''}</h2>
          <button class="modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body" id="modal-body-inner"></div>
      </div>`;

    const close = () => { overlay.remove(); onClose && onClose(); };
    overlay.querySelector('.modal-close').onclick = close;
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    root.appendChild(overlay);
    const body = overlay.querySelector('#modal-body-inner');
    if (typeof content === 'string') body.innerHTML = content;
    else if (content instanceof HTMLElement) body.appendChild(content);

    return { overlay, body, close };
  },

  // ── Toast ────────────────────────────────────────────────
  toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:12px;font-family:var(--font-body);font-size:13px;font-weight:500;box-shadow:var(--shadow-lg);animation:fadeIn 0.3s both;`;
    t.style.background = type === 'error' ? 'var(--rose)' : type === 'success' ? 'var(--leaf)' : 'var(--ink)';
    t.style.color = 'var(--cream)';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  // ── Buttons ──────────────────────────────────────────────
  btn(label, variant = 'clay', size = 'md', extra = '') {
    return `<button class="btn btn-${variant} btn-${size}" ${extra}>${label}</button>`;
  },

  // ── Privacy badge ─────────────────────────────────────────
  privacyBadge(value) {
    const map = { public: ['🌍','var(--leaf)','var(--leaf-light)'], friends: ['👥','var(--sky)','var(--sky-light)'], private: ['🔒','var(--ink-60)','var(--ink-10)'] };
    const [icon, color, bg] = map[value] || map.private;
    return `<span class="privacy-badge" style="background:${bg};color:${color}">${icon} ${value}</span>`;
  },

  // ── Board gradient backgrounds ────────────────────────────
  boardGradient(title) {
    const GRADS = [
      'linear-gradient(135deg,#4A6741 0%,#3D6B8A 100%)',
      'linear-gradient(135deg,#C4956A 0%,#B85C6E 100%)',
      'linear-gradient(135deg,#1C2B4A 0%,#3D6B8A 100%)',
      'linear-gradient(135deg,#B85C6E 0%,#7B3D4A 100%)',
      'linear-gradient(135deg,#6B4A7A 0%,#4A3D6E 100%)',
      'linear-gradient(135deg,#A07848 0%,#C4956A 100%)',
    ];
    return GRADS[(title?.charCodeAt(0) || 0) % GRADS.length];
  },

  // ── Collab dot colors ─────────────────────────────────────
  collabColor(i) {
    return ['var(--clay)','var(--sky)','var(--leaf)','var(--rose)','var(--amber)'][i % 5];
  },

  // ── Initials ──────────────────────────────────────────────
  initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  },

  // ── Relative time ─────────────────────────────────────────
  timeAgo(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d) / 1000;
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  },

  // ── Masonry layout renderer ───────────────────────────────
  renderMasonry(items, renderItem, cols = 3) {
    const colEls = Array.from({ length: cols }, () => {
      const el = document.createElement('div');
      el.className = 'masonry-col';
      return el;
    });
    items.forEach((item, i) => colEls[i % cols].appendChild(renderItem(item)));
    const wrap = document.createElement('div');
    wrap.className = 'masonry';
    colEls.forEach(c => wrap.appendChild(c));
    return wrap;
  },

  // ── Privacy select ────────────────────────────────────────
  privacySelect(currentValue, onChange) {
    const opts = [
      { value: 'public',  label: 'Public',      icon: '🌍' },
      { value: 'friends', label: 'Friends only', icon: '👥' },
      { value: 'private', label: 'Private',      icon: '🔒' },
    ];
    const wrap = document.createElement('div');
    wrap.className = 'privacy-select-group';
    let selected = currentValue;
    const render = () => {
      wrap.innerHTML = opts.map(o => `
        <button type="button" class="privacy-opt ${selected === o.value ? 'selected' : ''}" data-val="${o.value}">
          <span style="font-size:20px">${o.icon}</span>
          <span>${o.label}</span>
        </button>`).join('');
      wrap.querySelectorAll('.privacy-opt').forEach(btn => {
        btn.onclick = () => { selected = btn.dataset.val; onChange(selected); render(); };
      });
    };
    render();
    return wrap;
  },
};
