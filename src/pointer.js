/**
 * Pointer — <pointer-feedback> web component
 *
 * Drop-in element-level feedback for any app. Single install — scripts in <head>,
 * element in <body>:
 *
 *   <head>
 *     <script>
 *       window.POINTER_CONFIG = {
 *         project:     "checkout-app",  // required: which project this feedback belongs to
 *         environment: "prod",           // optional: tester/pm/client/staging/prod/... (default "local")
 *         enabled:     true,             // optional: set false to keep the snippet but show nothing
 *         // server is optional — defaults to the origin of the pointer.js script below, so you
 *         // set the URL once. Only set server here if pointer.js loads from a different origin.
 *       };
 *     </script>
 *     <script src="https://YOUR_POINTER_SERVER/pointer.js" defer></script>
 *   </head>
 *   <body>
 *     <pointer-feedback></pointer-feedback>
 *   </body>
 *
 *   // Equivalent attribute form (attributes override window.POINTER_CONFIG):
 *   //   <pointer-feedback project="checkout-app" server="https://YOUR_POINTER_SERVER"></pointer-feedback>
 *
 * The UI lives inside a Shadow DOM so it never collides with the host app's CSS.
 * Comments are sent to the Pointer server, partitioned by project, and later
 * handed to any AI tool to apply (see CLAUDE_CODE_INTEGRATION.md).
 */
(() => {
  if (window.customElements && window.customElements.get('pointer-feedback')) return;

  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  const ROLES = ['Client', 'PM', 'Tester', 'Developer'];
  const HL_CLASS = 'pointer-feedback-hl';

  // One global style for the host-page hover highlight (lives in light DOM by
  // necessity — it decorates the host app's own elements, not our shadow UI).
  const ensureHighlightStyle = () => {
    if (document.getElementById('pointer-feedback-hl-style')) return;
    const s = document.createElement('style');
    s.id = 'pointer-feedback-hl-style';
    s.textContent = `.${HL_CLASS}{outline:2px dashed #2563eb!important;outline-offset:1px!important;cursor:crosshair!important;}`;
    document.head.appendChild(s);
  };

  // --- Element selector (ported from the original inject.js) ----------------
  const generateSelector = (el) => {
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';

    if (el.id) {
      try {
        if (document.querySelector('#' + CSS.escape(el.id)) === el) return '#' + el.id;
      } catch (e) {}
    }

    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      let selector = cur.tagName.toLowerCase();
      if (cur.id) {
        selector += '#' + cur.id;
        parts.unshift(selector);
        cur = null;
        break;
      }
      let nth = 1;
      let sib = cur.previousElementSibling;
      while (sib) {
        if (sib.tagName.toLowerCase() === cur.tagName.toLowerCase()) nth++;
        sib = sib.previousElementSibling;
      }
      if (nth > 1) selector += `:nth-of-type(${nth})`;
      parts.unshift(selector);
      cur = cur.parentElement;
    }
    if (cur === document.body) parts.unshift('body');
    else if (cur === document.documentElement) parts.unshift('html');
    return parts.join(' > ');
  };

  // Re-find an element from a stored comment (selector first, snapshot fallback).
  const matchElement = (comment) => {
    if (comment.element_selector) {
      try {
        const el = document.querySelector(comment.element_selector);
        if (el) return el;
      } catch (e) {}
    }
    if (comment.element_snapshot) {
      const all = document.querySelectorAll(comment.element_tag || '*');
      for (const el of all) {
        if (el.outerHTML === comment.element_snapshot) return el;
      }
    }
    return null;
  };

  const escapeHtml = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Tolerant route identity: same route regardless of origin / trailing slash /
  // query / hash, so comments (incl. applied ones) survive reloads, SPA URL
  // normalization, AND being viewed through a different host (localhost, tunnel,
  // deployed URL). Matching is on the pathname only — e.g. localhost:3000/moamen-ui/pointer-api
  // and https://github.com/moamen-ui/pointer-api share the key "/moamen-ui/pointer-api".
  const pageKey = (href) => {
    const route = (p) => (p.split(/[?#]/)[0].replace(/\/+$/, '') || '/');
    const raw = String(href == null ? '' : href).trim();
    try {
      // Properly-schemed URL (http/https/file/…): pathname is already domain-free.
      return route(new URL(raw).pathname);
    } catch (e) {
      // No scheme — strip a leading domain/authority (host[:port]) if the part
      // before the first "/" looks like a host, so matching stays route-only.
      let s = raw.replace(/^\/\//, '');                 // protocol-relative //host/path
      const slash = s.indexOf('/');
      const authority = slash === -1 ? s : s.slice(0, slash);
      if (/[.:]/.test(authority)) s = slash === -1 ? '/' : s.slice(slash);
      return route(s);
    }
  };

  // Single source of truth for statuses in the browser component (order here is
  // the filter-chip display order). Keep the keys in sync with core.js STATUSES.
  // `label` is the chip text; `chip` is the CSS class suffix (chip-<chip>).
  const STATUSES = [
    { key: 'open', label: 'Open', chip: 'open' },
    { key: 'pending-apply', label: 'Pending', chip: 'pending' },
    { key: 'applied', label: 'Completed', chip: 'completed' },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.chip]));
  const FILTERS = [{ key: 'all', label: 'All' }, ...STATUSES.map((s) => ({ key: s.key, label: s.label }))];

  const STYLES = `
    :host{ all: initial; }
    *{ box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .pf-toolbar{ position: fixed; top: 16px; right: 16px; z-index: 2147483646; display: flex; gap: 8px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px;
      box-shadow: 0 6px 24px rgba(0,0,0,.12); pointer-events: auto; }
    .pf-btn{ display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 8px;
      padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; background: #f1f5f9; color: #0f172a; }
    .pf-btn:hover{ background: #e2e8f0; }
    .pf-btn.primary{ background: #2563eb; color: #fff; }
    .pf-btn.primary:hover{ background: #1d4ed8; }
    .pf-btn.active{ background: #1d4ed8; color: #fff; }
    .pf-badge{ background: #2563eb; color:#fff; border-radius: 999px; padding: 1px 7px; font-size: 11px; }

    .pf-sidebar{ position: fixed; top: 0; right: 0; height: 100vh; width: 360px; max-width: 92vw; z-index: 2147483646;
      background: #fff; border-left: 1px solid #e2e8f0; box-shadow: -8px 0 24px rgba(0,0,0,.08);
      transform: translateX(100%); transition: transform .2s ease; display: flex; flex-direction: column; pointer-events: auto; }
    .pf-sidebar.open{ transform: translateX(0); }
    .pf-sidebar-head{ padding: 16px; border-bottom: 1px solid #eef2f7; display:flex; align-items:center; justify-content: space-between; }
    .pf-sidebar-head h2{ margin:0; font-size: 16px; color:#0f172a; }
    .pf-filters{ display:flex; gap:6px; flex-wrap:wrap; padding: 10px 12px; border-bottom: 1px solid #eef2f7; }
    .pf-chip{ border:1px solid #e2e8f0; background:#fff; color:#475569; border-radius:999px; padding:4px 10px;
      font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
    .pf-chip:hover{ background:#f8fafc; }
    .pf-chip-n{ background:#eef2f7; color:#475569; border-radius:999px; padding:0 6px; font-size:11px; }
    .pf-chip.active{ background:#0f172a; color:#fff; border-color:#0f172a; }
    .pf-chip.active .pf-chip-n{ background:rgba(255,255,255,.25); color:#fff; }
    .pf-chip.chip-pending.active{ background:#92400e; border-color:#92400e; }
    .pf-chip.chip-completed.active{ background:#166534; border-color:#166534; }
    .pf-sidebar-body{ overflow-y: auto; padding: 12px; flex: 1; }
    .pf-empty{ color:#64748b; font-size: 13px; text-align:center; padding: 32px 12px; }

    .pf-card{ border: 1px solid #eef2f7; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
    .pf-card.pending{ border-color: #f59e0b; background: #fffbeb; }
    .pf-card.applied{ border-color: #16a34a; background: #f0fdf4; }
    .pf-meta{ display:flex; gap:6px; align-items:center; flex-wrap: wrap; margin-bottom: 6px; }
    .pf-pill{ font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing:.03em; padding: 2px 6px; border-radius: 6px; background:#eef2f7; color:#475569; }
    .pf-pill.role{ background:#dbeafe; color:#1e40af; }
    .pf-pill.env{ background:#f3e8ff; color:#7c3aed; }
    .pf-pill.status-applied{ background:#dcfce7; color:#166534; }
    .pf-pill.status-pending{ background:#fef3c7; color:#92400e; }
    .pf-text{ font-size: 14px; color:#0f172a; margin: 4px 0 8px; white-space: pre-wrap; }
    .pf-sub{ font-size: 11px; color:#94a3b8; }
    .pf-src{ font-size: 11px; color:#0369a1; font-family: ui-monospace, monospace; word-break: break-all; }
    .pf-actions{ display:flex; gap:6px; flex-wrap: wrap; margin-top: 8px; }
    .pf-mini{ border:none; background:#f1f5f9; color:#0f172a; border-radius:6px; padding:5px 9px; font-size:12px; cursor:pointer; }
    .pf-mini:hover{ background:#e2e8f0; }
    .pf-mini.apply{ background:#fef3c7; color:#92400e; }
    .pf-mini.applied{ background:#dcfce7; color:#166534; }
    .pf-mini.danger:hover{ background:#fee2e2; color:#b91c1c; }
    .pf-replies{ margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
    .pf-reply{ font-size: 13px; color:#334155; padding: 4px 0; }
    .pf-reply.ai{ color:#166534; }
    .pf-reply-row{ display:flex; gap:6px; margin-top: 6px; }
    .pf-input, .pf-textarea{ width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:8px; font-size:13px; }
    .pf-textarea{ resize: vertical; min-height: 64px; }

    .pf-pin{ position: fixed; z-index: 2147483645; width: 24px; height: 24px; border-radius: 50% 50% 50% 0;
      background:#2563eb; color:#fff; font-size: 12px; font-weight: 700; display:flex; align-items:center; justify-content:center;
      transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,.3); cursor: pointer; pointer-events: auto; }
    .pf-pin span{ transform: rotate(45deg); }
    .pf-pin.pending{ background:#f59e0b; }
    .pf-pin.applied{ background:#16a34a; }

    .pf-popover{ position: fixed; z-index: 2147483647; width: 280px; background:#fff; border:1px solid #e2e8f0;
      border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.18); padding: 12px; pointer-events: auto; }
    .pf-popover h3{ margin:0 0 8px; font-size: 13px; color:#0f172a; }
    .pf-snippet{ font-size: 11px; font-family: ui-monospace, monospace; color:#475569; background:#f8fafc; border-radius:6px; padding:6px; margin-bottom:8px; max-height: 60px; overflow:auto; }

    .pf-modal-overlay{ position: fixed; inset: 0; z-index: 2147483647; background: rgba(15,23,42,.5);
      display:flex; align-items:center; justify-content:center; pointer-events: auto; }
    .pf-modal{ background:#fff; border-radius: 14px; padding: 24px; width: 340px; max-width: 92vw; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
    .pf-modal h2{ margin:0 0 6px; font-size: 18px; color:#0f172a; }
    .pf-modal p{ margin:0 0 14px; font-size: 13px; color:#64748b; }
    .pf-roles{ display:grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0 16px; }
    .pf-role{ border:1px solid #cbd5e1; border-radius:8px; padding:8px; font-size:13px; cursor:pointer; text-align:center; background:#fff; }
    .pf-role.sel{ border-color:#2563eb; background:#eff6ff; color:#1e40af; font-weight:600; }

    .pf-toast{ position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 2147483647;
      background:#0f172a; color:#fff; padding: 10px 16px; border-radius: 8px; font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,.3); pointer-events: none; }
    .pf-toast.error{ background:#b91c1c; }
    .pf-toast.success{ background:#16a34a; }
  `;

  class PointerFeedback extends HTMLElement {
    connectedCallback() {
      if (this._mounted) return;
      this._mounted = true;

      // Config precedence per value: HTML attribute → window.POINTER_CONFIG → default.
      // POINTER_CONFIG lets static sites / file:// pages configure without build-time
      // env substitution (no framework coupling).
      const cfg = window.POINTER_CONFIG || {};

      // Master on/off switch. Defaults to enabled; set `enabled: false` (or the
      // attribute enabled="false") to keep the snippet in place but render nothing —
      // e.g. to turn feedback off in production. Bail before any DOM work.
      const enabledAttr = this.getAttribute('enabled');
      const enabled = enabledAttr != null ? enabledAttr !== 'false' : cfg.enabled !== false;
      if (!enabled) return;

      this.project = this.getAttribute('project') || cfg.project;
      this.environment = this.getAttribute('environment') || cfg.environment || 'local';
      this.sourceAttr = this.getAttribute('source-attr') || cfg.sourceAttr || 'data-component-source';
      this.server = (this.getAttribute('server') || cfg.server ||
        (SCRIPT_SRC ? new URL(SCRIPT_SRC).origin : window.location.origin)).replace(/\/$/, '');

      this.comments = [];
      this.statusFilter = 'all';
      this.picking = false;
      this.sidebarOpen = false;
      this.hovered = null;
      this.author = localStorage.getItem('pointer_author') || '';
      this.role = localStorage.getItem('pointer_role') || '';

      // Host element must not block page clicks; only inner panels are interactive.
      this.style.position = 'fixed';
      this.style.zIndex = '2147483647';
      this.style.top = '0';
      this.style.left = '0';
      this.style.pointerEvents = 'none';

      this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = STYLES;
      this.shadowRoot.appendChild(style);
      this.root = document.createElement('div');
      this.shadowRoot.appendChild(this.root);

      ensureHighlightStyle();

      if (!this.project) {
        console.error('[pointer-feedback] Missing required `project` attribute. Component disabled.');
        return;
      }

      this._onHover = this.onHover.bind(this);
      this._onPick = this.onPick.bind(this);
      this._reposition = () => this.renderPins();
      window.addEventListener('scroll', this._reposition, true);
      window.addEventListener('resize', this._reposition);

      if (!this.author || !this.role) this.showIdentityModal();
      else this.init();
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this._reposition, true);
      window.removeEventListener('resize', this._reposition);
      this.stopPicking();
    }

    async init() {
      this.renderChrome();
      await this.fetchComments();
      this.renderSidebar();
      this.renderPins();
    }

    // --- API ----------------------------------------------------------------
    // GET/DELETE carry `project` in the query string; POST/PATCH carry it in the
    // JSON body (the caller includes it). The server validates either way.
    api(path, opts = {}) {
      const method = opts.method || 'GET';
      const needsQueryProject = method === 'GET' || method === 'DELETE';
      const url = needsQueryProject
        ? `${this.server}/api${path}${path.includes('?') ? '&' : '?'}project=${encodeURIComponent(this.project)}`
        : `${this.server}/api${path}`;
      return fetch(url, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
      });
    }

    async fetchComments() {
      try {
        // Fetch all of the project's comments; scope to this page client-side via
        // pageKey() so exact-URL differences (trailing slash / query / hash) never
        // drop comments — including applied ("completed") ones — after a reload.
        const r = await this.api('/comments');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        this.comments = await r.json();
      } catch (e) {
        this.toast('Could not reach Pointer server', 'error');
        this.comments = [];
      }
    }

    // Comments belonging to the current page (tolerant match).
    pageComments() {
      const key = pageKey(window.location.href);
      return this.comments.filter((c) => pageKey(c.page_url) === key);
    }

    // --- Identity ------------------------------------------------------------
    showIdentityModal() {
      let selectedRole = this.role || '';
      this.root.innerHTML = `
        <div class="pf-modal-overlay">
          <div class="pf-modal">
            <h2>🐕 Pointer</h2>
            <p>Tell us who's giving feedback on <b>${escapeHtml(this.project)}</b>.</p>
            <input class="pf-input" id="pf-name" placeholder="Your name" value="${escapeHtml(this.author)}" />
            <div class="pf-roles">
              ${ROLES.map(r => `<div class="pf-role${r === selectedRole ? ' sel' : ''}" data-role="${r}">${r}</div>`).join('')}
            </div>
            <button class="pf-btn primary" id="pf-save" style="width:100%; justify-content:center;">Start</button>
          </div>
        </div>`;
      this.root.querySelectorAll('.pf-role').forEach(el => {
        el.addEventListener('click', () => {
          selectedRole = el.dataset.role;
          this.root.querySelectorAll('.pf-role').forEach(x => x.classList.remove('sel'));
          el.classList.add('sel');
        });
      });
      this.root.querySelector('#pf-save').addEventListener('click', () => {
        const name = this.root.querySelector('#pf-name').value.trim();
        if (!name) return this.toast('Please enter your name', 'error');
        if (!selectedRole) return this.toast('Please pick a role', 'error');
        this.author = name;
        this.role = selectedRole;
        localStorage.setItem('pointer_author', name);
        localStorage.setItem('pointer_role', selectedRole);
        this.root.innerHTML = '';
        this.init();
      });
    }

    // --- Chrome (toolbar + sidebar shell) -----------------------------------
    renderChrome() {
      this.root.innerHTML = `
        <div class="pf-toolbar">
          <button class="pf-btn primary" id="pf-add">➕ Comment</button>
          <button class="pf-btn" id="pf-toggle">💬 <span class="pf-badge" id="pf-count">0</span></button>
          <button class="pf-btn" id="pf-refresh" title="Refresh comments">↻</button>
        </div>
        <div class="pf-sidebar" id="pf-sidebar">
          <div class="pf-sidebar-head">
            <h2>Comments</h2>
            <button class="pf-mini" id="pf-close">✕</button>
          </div>
          <div class="pf-filters" id="pf-filters"></div>
          <div class="pf-sidebar-body" id="pf-list"></div>
        </div>
        <div id="pf-pins"></div>
        <div id="pf-popover-host"></div>`;

      this.root.querySelector('#pf-add').addEventListener('click', () => this.togglePicking());
      this.root.querySelector('#pf-toggle').addEventListener('click', () => this.toggleSidebar());
      this.root.querySelector('#pf-refresh').addEventListener('click', async () => {
        await this.fetchComments(); this.renderSidebar(); this.renderPins(); this.toast('Refreshed');
      });
      this.root.querySelector('#pf-close').addEventListener('click', () => this.toggleSidebar(false));
    }

    toggleSidebar(force) {
      this.sidebarOpen = force === undefined ? !this.sidebarOpen : force;
      this.root.querySelector('#pf-sidebar').classList.toggle('open', this.sidebarOpen);
      // Opening → pull fresh server state so applied/"completed" comments show
      // even if they were applied by the AI while this page was open.
      if (this.sidebarOpen) {
        this.fetchComments().then(() => { this.renderSidebar(); this.renderPins(); });
      }
    }

    // --- Element picking -----------------------------------------------------
    togglePicking() {
      this.picking ? this.stopPicking() : this.startPicking();
    }
    startPicking() {
      this.picking = true;
      this.root.querySelector('#pf-add').classList.add('active');
      this.root.querySelector('#pf-add').textContent = '✕ Cancel';
      document.addEventListener('mousemove', this._onHover, true);
      document.addEventListener('click', this._onPick, true);
      this.toast('Click any element to comment on it');
    }
    stopPicking() {
      this.picking = false;
      const addBtn = this.root && this.root.querySelector('#pf-add');
      if (addBtn) { addBtn.classList.remove('active'); addBtn.textContent = '➕ Comment'; }
      document.removeEventListener('mousemove', this._onHover, true);
      document.removeEventListener('click', this._onPick, true);
      this.clearHover();
    }
    clearHover() {
      if (this.hovered) { this.hovered.classList.remove(HL_CLASS); this.hovered = null; }
    }
    isOwnElement(el) { return el === this || (el && el.tagName === 'POINTER-FEEDBACK'); }

    onHover(e) {
      const el = e.target;
      if (this.isOwnElement(el)) return;
      if (el === this.hovered) return;
      this.clearHover();
      this.hovered = el;
      el.classList.add(HL_CLASS);
    }
    onPick(e) {
      if (this.isOwnElement(e.target)) return; // clicks on our own UI pass through
      e.preventDefault();
      e.stopPropagation();
      const el = e.target;
      this.clearHover();
      this.stopPicking();
      this.showPopover(e.clientX, e.clientY, el);
    }

    // --- Metadata capture (ported from inject.js) ---------------------------
    captureMetadata(el) {
      const selector = generateSelector(el);
      const snapshot = el.outerHTML.length > 2000 ? el.outerHTML.slice(0, 2000) : el.outerHTML;
      const classes = (el.className && typeof el.className === 'string')
        ? el.className.split(/\s+/).filter(Boolean) : [];

      const computed = {};
      const applied = [];
      const cs = window.getComputedStyle(el);
      ['color', 'background-color', 'font-size', 'font-weight', 'margin', 'padding', 'border', 'text-align', 'display', 'flex-direction']
        .forEach(p => { const v = cs.getPropertyValue(p); if (v) computed[p] = v.trim(); });
      if (el.style && el.style.cssText) computed['inline-style'] = el.style.cssText;

      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try { rules = sheet.cssRules || sheet.rules; } catch (e) { continue; } // cross-origin
        if (!rules) continue;
        for (const rule of Array.from(rules)) {
          if (!rule.selectorText) continue;
          try { if (el.matches(rule.selectorText)) applied.push({ selector: rule.selectorText, styles: rule.style.cssText }); } catch (e) {}
        }
      }

      let parent = {};
      if (el.parentElement) {
        const p = el.parentElement;
        parent = {
          tag: p.tagName.toLowerCase(),
          classes: (p.className && typeof p.className === 'string') ? p.className.split(/\s+/).filter(Boolean) : [],
          id: p.id || null
        };
      }

      // Source path: nearest ancestor carrying the configured attribute (e.g. data-component-source).
      let sourcePath = null;
      let node = el;
      while (node && node.getAttribute) {
        const v = node.getAttribute(this.sourceAttr);
        if (v) { sourcePath = v; break; }
        node = node.parentElement;
      }

      return {
        element_selector: selector,
        element_snapshot: snapshot,
        element_tag: el.tagName.toLowerCase(),
        element_classes: classes,
        element_id: el.id || null,
        computed_styles: computed,
        applied_css_rules: applied,
        parent_element_info: parent,
        source_path: sourcePath
      };
    }

    // --- Comment popover -----------------------------------------------------
    showPopover(x, y, el) {
      const meta = this.captureMetadata(el);
      const host = this.root.querySelector('#pf-popover-host');
      const left = Math.min(x, window.innerWidth - 300);
      const top = Math.min(y, window.innerHeight - 220);
      host.innerHTML = `
        <div class="pf-popover" style="left:${left}px; top:${top}px;">
          <h3>Comment on &lt;${escapeHtml(meta.element_tag)}&gt;</h3>
          <div class="pf-snippet">${escapeHtml(meta.element_snapshot.slice(0, 200))}</div>
          ${meta.source_path ? `<div class="pf-src">⛬ ${escapeHtml(meta.source_path)}</div>` : ''}
          <textarea class="pf-textarea" id="pf-comment-text" placeholder="What should change here?"></textarea>
          <div class="pf-reply-row">
            <button class="pf-btn primary" id="pf-submit" style="flex:1; justify-content:center;">Add</button>
            <button class="pf-mini" id="pf-cancel">Cancel</button>
          </div>
        </div>`;
      const ta = host.querySelector('#pf-comment-text');
      ta.focus();
      host.querySelector('#pf-cancel').addEventListener('click', () => { host.innerHTML = ''; });
      host.querySelector('#pf-submit').addEventListener('click', async () => {
        const text = ta.value.trim();
        if (!text) return this.toast('Comment cannot be empty', 'error');
        host.innerHTML = '';
        await this.createComment({ ...meta, text, x, y });
      });
    }

    async createComment(data) {
      const body = {
        project: this.project,
        environment: this.environment,
        stakeholder: this.role,
        author: this.author,
        page_url: window.location.href,
        text: data.text,
        element_selector: data.element_selector,
        element_snapshot: data.element_snapshot,
        element_tag: data.element_tag,
        element_classes: data.element_classes,
        element_id: data.element_id,
        computed_styles: data.computed_styles,
        applied_css_rules: data.applied_css_rules,
        parent_element_info: data.parent_element_info,
        source_path: data.source_path,
        pin_x: data.x,
        pin_y: data.y
      };
      try {
        const r = await this.api('/comments', { method: 'POST', body: JSON.stringify(body) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const comment = await r.json();
        this.comments.push(comment);
        this.renderSidebar();
        this.renderPins();
        this.toast('🐕 Pointed! Comment added', 'success');
      } catch (e) {
        this.toast('Failed to save comment', 'error');
      }
    }

    // --- Mutations -----------------------------------------------------------
    async addReply(id, text) {
      try {
        const r = await this.api(`/comments/${id}/reply`, { method: 'POST', body: JSON.stringify({ project: this.project, author: this.author, text }) });
        if (!r.ok) throw new Error();
        await this.fetchComments(); this.renderSidebar(); this.renderPins();
      } catch (e) { this.toast('Failed to reply', 'error'); }
    }
    async toggleApply(comment) {
      const next = comment.status === 'pending-apply' ? 'open' : 'pending-apply';
      try {
        const r = await this.api(`/comments/${comment.id}`, { method: 'PATCH', body: JSON.stringify({ project: this.project, status: next }) });
        if (!r.ok) throw new Error();
        comment.status = next;
        this.renderSidebar(); this.renderPins();
        this.toast(next === 'pending-apply' ? 'Marked for apply' : 'Unmarked');
      } catch (e) { this.toast('Update failed', 'error'); }
    }
    async deleteComment(id) {
      try {
        const r = await this.api(`/comments/${id}`, { method: 'DELETE' });
        if (!r.ok && r.status !== 204) throw new Error();
        this.comments = this.comments.filter(c => c.id !== id);
        this.renderSidebar(); this.renderPins();
        this.toast('Deleted');
      } catch (e) { this.toast('Delete failed', 'error'); }
    }

    // --- Sidebar render ------------------------------------------------------
    renderSidebar() {
      const all = this.pageComments();
      const counts = { all: all.length };
      for (const s of STATUSES) counts[s.key] = all.filter((c) => c.status === s.key).length;

      const countEl = this.root.querySelector('#pf-count');
      if (countEl) countEl.textContent = all.length;

      // Status filter chips — the user shows whatever statuses they want.
      const filtersEl = this.root.querySelector('#pf-filters');
      if (filtersEl) {
        filtersEl.innerHTML = FILTERS.map((f) =>
          `<button class="pf-chip ${this.statusFilter === f.key ? 'active' : ''} chip-${STATUS_LABEL[f.key] || 'all'}" data-filter="${f.key}">
             ${f.label} <span class="pf-chip-n">${counts[f.key]}</span>
           </button>`).join('');
        filtersEl.querySelectorAll('[data-filter]').forEach((b) =>
          b.addEventListener('click', () => { this.statusFilter = b.dataset.filter; this.renderSidebar(); }));
      }

      const list = this.root.querySelector('#pf-list');
      if (!list) return;

      const shown = this.statusFilter === 'all' ? all : all.filter((c) => c.status === this.statusFilter);
      if (!all.length) {
        list.innerHTML = `<div class="pf-empty">No comments on this page yet.<br/>Click “➕ Comment”, then click an element.</div>`;
        return;
      }
      if (!shown.length) {
        list.innerHTML = `<div class="pf-empty">No ${FILTERS.find((f) => f.key === this.statusFilter).label.toLowerCase()} comments.</div>`;
        return;
      }

      list.innerHTML = shown.map((c, i) => {
        const cls = c.status === 'pending-apply' ? 'pending' : c.status === 'applied' ? 'applied' : '';
        const statusPill = c.status === 'applied'
          ? '<span class="pf-pill status-applied">✓ completed</span>'
          : c.status === 'pending-apply' ? '<span class="pf-pill status-pending">pending</span>' : '';
        const replies = (c.replies || []).map(r =>
          `<div class="pf-reply ${r.author === 'AI' ? 'ai' : ''}"><b>${escapeHtml(r.author)}:</b> ${escapeHtml(r.text)}</div>`).join('');
        return `
          <div class="pf-card ${cls}" data-id="${c.id}">
            <div class="pf-meta">
              <span class="pf-badge">${i + 1}</span>
              ${c.stakeholder ? `<span class="pf-pill role">${escapeHtml(c.stakeholder)}</span>` : ''}
              ${c.environment ? `<span class="pf-pill env">${escapeHtml(c.environment)}</span>` : ''}
              ${statusPill}
            </div>
            <div class="pf-text">${escapeHtml(c.text)}</div>
            <div class="pf-sub">${escapeHtml(c.author)} · &lt;${escapeHtml(c.element_tag || '?')}&gt;</div>
            ${c.source_path ? `<div class="pf-src">⛬ ${escapeHtml(c.source_path)}</div>` : ''}
            ${replies ? `<div class="pf-replies">${replies}</div>` : ''}
            <div class="pf-reply-row">
              <input class="pf-input pf-reply-input" placeholder="Reply…" data-id="${c.id}" />
            </div>
            <div class="pf-actions">
              <button class="pf-mini ${c.status === 'pending-apply' ? 'apply' : c.status === 'applied' ? 'applied' : ''}" data-act="apply" data-id="${c.id}">
                ${c.status === 'applied' ? '✓ Completed' : c.status === 'pending-apply' ? '⏳ Pending — unmark' : 'Ready to Apply'}
              </button>
              <button class="pf-mini danger" data-act="delete" data-id="${c.id}">Delete</button>
            </div>
          </div>`;
      }).join('');

      list.querySelectorAll('[data-act="apply"]').forEach(b => b.addEventListener('click', () => {
        const c = this.comments.find(x => x.id === b.dataset.id); if (c && c.status !== 'applied') this.toggleApply(c);
      }));
      list.querySelectorAll('[data-act="delete"]').forEach(b => b.addEventListener('click', () => this.deleteComment(b.dataset.id)));
      list.querySelectorAll('.pf-reply-input').forEach(inp => inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && inp.value.trim()) { this.addReply(inp.dataset.id, inp.value.trim()); inp.value = ''; }
      }));
    }

    // --- Pins ----------------------------------------------------------------
    renderPins() {
      const wrap = this.root && this.root.querySelector('#pf-pins');
      if (!wrap) return;
      const here = this.pageComments();
      wrap.innerHTML = here.map((c, i) => {
        const el = matchElement(c);
        if (!el) return '';
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return '';
        const cls = c.status === 'pending-apply' ? 'pending' : c.status === 'applied' ? 'applied' : '';
        return `<div class="pf-pin ${cls}" data-id="${c.id}" style="left:${rect.left}px; top:${rect.top}px;"><span>${i + 1}</span></div>`;
      }).join('');
      wrap.querySelectorAll('.pf-pin').forEach(p => p.addEventListener('click', () => {
        this.toggleSidebar(true);
        const card = this.root.querySelector(`.pf-card[data-id="${p.dataset.id}"]`);
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
    }

    // --- Toast ---------------------------------------------------------------
    toast(msg, type = '') {
      const t = document.createElement('div');
      t.className = `pf-toast ${type}`;
      t.textContent = msg;
      this.root.appendChild(t);
      setTimeout(() => t.remove(), 2200);
    }
  }

  customElements.define('pointer-feedback', PointerFeedback);
})();
