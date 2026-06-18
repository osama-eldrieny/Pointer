(function() {
  if (window.__HCT_LOADED__) return;
  window.__HCT_LOADED__ = true;

  const HCT = {
  author: null,
  pageUrl: window.location.href,
  comments: [],
  pickMode: false,
  sidebarOpen: false,
  pendingElement: null,
  pendingSelector: null,
  pendingSnapshot: null,
  pendingPinX: null,
  pendingPinY: null
};

  window.HCT = HCT;

  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIU_9jZkued8MPl6pgFDl7K71jlm48HQLuiFWGH06LUwiyMJsLkufoQePm5NQ68pZS/exec';

  const getBackendUrl = () => {
    const origin = window.location.origin;
    if (origin === 'http://localhost:8000' || origin.startsWith('http://localhost:8')) {
      return 'http://localhost:3001';
    }
    if (origin.startsWith('file://')) {
      return 'http://localhost:3001';
    }
    return origin;
  };

  const initAuthor = () => {
    const stored = localStorage.getItem('hct_author');
    if (stored) {
      HCT.author = stored;
      init();
    } else {
      showAuthorModal();
    }
  };

  const showAuthorModal = () => {
    injectAuthorModalStyles();
    const modal = document.createElement('div');
    modal.id = 'hct-author-modal-overlay';
    modal.innerHTML = `
      <div id="hct-author-modal">
        <div id="hct-author-modal-content">
          <h2>Welcome to 🐕 Pointer</h2>
          <p>Who's pointing? Tell us your name.</p>
          <input
            id="hct-author-input"
            type="text"
            placeholder="Enter your name..."
            autofocus
          />
          <div id="hct-author-modal-actions">
            <button id="hct-author-cancel" class="hct-author-btn secondary">Cancel</button>
            <button id="hct-author-submit" class="hct-author-btn primary">Continue</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const input = document.getElementById('hct-author-input');
    const submitBtn = document.getElementById('hct-author-submit');
    const cancelBtn = document.getElementById('hct-author-cancel');

    const handleSubmit = () => {
      const name = input.value.trim();
      if (name) {
        HCT.author = name;
        localStorage.setItem('hct_author', HCT.author);
        modal.remove();
        init();
      } else {
        input.focus();
        input.style.borderColor = '#dc2626';
        setTimeout(() => {
          input.style.borderColor = '#e2e8f0';
        }, 2000);
      }
    };

    const handleCancel = () => {
      modal.remove();
    };

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });

    submitBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', handleCancel);

    setTimeout(() => input.focus(), 100);
  };

  const injectAuthorModalStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      #hct-author-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483649;
        animation: hct-fade-in 0.3s ease;
        overflow: hidden;
      }

      @keyframes hct-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      
    /* Emoji decorations around modal */
    .hct-emoji-bg {
      position: absolute;
      font-size: 48px;
      opacity: 0.35;
      animation: hct-float 3s ease-in-out infinite;
      user-select: none;
      pointer-events: none;
    }
    
    .hct-emoji-bg.emoji-1 { top: -15px; left: 15px; font-size: 32px; animation-delay: 0s; }
    .hct-emoji-bg.emoji-2 { top: 5px; right: 10px; font-size: 48px; animation-delay: 0.5s; }
    .hct-emoji-bg.emoji-3 { bottom: 15px; left: 20px; font-size: 40px; animation-delay: 1s; }
    .hct-emoji-bg.emoji-4 { bottom: 5px; right: 8px; font-size: 36px; animation-delay: 1.5s; }
    .hct-emoji-bg.emoji-5 { top: 45%; left: -8px; font-size: 44px; animation-delay: 0.3s; }
    .hct-emoji-bg.emoji-6 { top: 35%; right: -8px; font-size: 38px; animation-delay: 0.8s; }

    @keyframes hct-float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    @keyframes hct-slide-up {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      #hct-author-modal {
        background: rgba(255, 255, 255, 0.5);
        border-radius: 20px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.18), inset 0 0px 0 rgba(255, 255, 255, 0.8), inset 0 1px 2px rgba(255, 255, 255, 0.6);
        animation: hct-slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width: 420px;
        width: 90%;
        backdrop-filter: blur(12px) saturate(164%);
        border: 1px solid rgba(255, 255, 255, 0.9);
        position: relative;
        z-index: 1;
      }

      #hct-author-modal-content {
        padding: 40px 32px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      }

      #hct-author-modal h2 {
        margin: 0 0 12px 0;
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.5px;
      }

      #hct-author-modal p {
        margin: 0 0 24px 0;
        font-size: 14px;
        color: #64748b;
        line-height: 1.6;
      }

      #hct-author-input {
        width: 100%;
        padding: 12px 14px;
        font-size: 14px;
        border: 2px solid #e2e8f0;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #0f172a;
        margin-bottom: 24px;
        transition: all 0.2s ease;
        box-sizing: border-box;
        background: #ffffff00;
      }

      #hct-author-input:focus {
        outline: none;
        border-color: #e2e8f0;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        background-color: rgba(0, 0, 0, 0.02);
      }

      #hct-author-input::placeholder {
        color: #64748b;
      }

      #hct-author-modal-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .hct-author-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }

      .hct-author-btn.primary {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
      }

      .hct-author-btn.primary:hover {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
        transform: translateY(-1px);
      }

      .hct-author-btn.primary:active {
        transform: translateY(0);
      }

      .hct-author-btn.secondary {
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }

      .hct-author-btn.secondary:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
    `;
    document.head.appendChild(style);
  };

  
const fetchGlobalCounter = async () => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/global-counter`);
    const data = await response.json();
    if (data.success) {
      const counterEl = document.getElementById('hct-counter-number');
      if (counterEl) {
        counterEl.textContent = data.count.toLocaleString();
      } else {
        // If counter doesn't exist, recreate it
        initGlobalCounter();
      }
    }
  } catch (e) {
    console.log('Error fetching global counter:', e.message);
  }
};

const initGlobalCounter = () => {
  console.log('🐕 Pointer counter initialized');
  // Fetch initial count
  fetchGlobalCounter();
  // Update counter every 5 seconds
  setInterval(fetchGlobalCounter, 5000);
};

const init = () => {
    injectStyles();
    renderToolbar();
    fetchComments();
    startAutoRefreshCheck();
    initGlobalCounter();
  };

  const injectStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
    @import url('https://cdn.tailwindcss.com');

    * { box-sizing: border-box; }

    /* TOOLBAR - Professional & Modern */
    #hct-toolbar {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      display: flex;
      gap: 8px;
      backdrop-filter: blur(8px);
      transition: gap 0.3s ease, padding 0.3s ease;
    }

    #hct-toolbar.hct-toolbar-collapsed {
      padding: 10px 8px;
    }

    #hct-toolbar:not(.hct-toolbar-collapsed) {
      width: 302px;
      display: flex;
      justify-content: space-between;
      box-shadow: none;
    }

    .hct-toolbar-hidden {
      display: none !important;
    }

    .hct-toolbar-toggle {
      padding: 10px 8px !important;
      background: transparent !important;
      color: #64748b !important;
      border: none !important;
      box-shadow: none !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .hct-toolbar-toggle:hover {
      background: #f1f5f9 !important;
      color: #1e293b !important;
      box-shadow: none !important;
      transform: none !important;
    }

    #hct-toolbar button {
      padding: 10px 16px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    #hct-toolbar button:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
      transform: none;
    }

    #hct-toolbar button:active {
      transform: none;
    }

    #hct-toolbar #hct-btn-sidebar {
      background: white !important;
      color: #2563eb !important;
      border: 1.5px solid #2563eb !important;
      box-shadow: none !important;
    }

    #hct-toolbar #hct-btn-sidebar:hover {
      background: #eff6ff !important;
      border-color: #1d4ed8 !important;
      color: #1d4ed8 !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15) !important;
    }

    /* SIDEBAR - Professional Layout */
    #hct-sidebar {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 335px;
      background: #ffffff;
      border-left: 1px solid #e2e8f0;
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      box-shadow: -20px 0 40px rgba(0, 0, 0, 0.08);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    #hct-sidebar.open {
      transform: translateX(0);
    }

    /* SIDEBAR HEADER */
    #hct-sidebar-header {
      padding: 24px;
      padding-top: 95px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      position: sticky;
      top: 0;
    }

    #hct-sidebar-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.5px;
    }



    #hct-sidebar-header button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      transition: all 0.2s;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
    }

    #hct-sidebar-header button:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* SIDEBAR CONTENT */
    #hct-sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px 24px 24px;
      background: white;
    }

    #hct-sidebar-content::-webkit-scrollbar {
      width: 6px;
    }

    #hct-sidebar-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #hct-sidebar-content::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    #hct-sidebar-content::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* EMPTY STATE */
    .hct-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: #64748b;
    }

    .hct-empty-state svg {
      width: 48px;
      height: 48px;
      opacity: 0.4;
      margin-bottom: 16px;
    }

    .hct-empty-state p {
      font-size: 14px;
      line-height: 1.5;
    }

    /* COMMENT CARD - Professional Design */
    .hct-comment-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      font-size: 13px;
      transition: all 0.2s ease;
      position: relative;
    }

    .hct-comment-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }

    /* STATUS BADGE - Professional Colors */
    .hct-comment-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .hct-comment-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }

    .hct-comment-meta {
      flex: 1;
      min-width: 0;
    }

    .hct-comment-author {
      font-weight: 700;
      color: #0f172a;
      font-size: 14px;
    }

    .hct-comment-time {
      font-size: 12px;
      color: #94a3b8;
    }

    .hct-comment-status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .hct-status-open {
      background: #dbeafe;
      color: #1e40af;
    }

    .hct-status-pending-apply {
      background: #fed7aa;
      color: #92400e;
      animation: pulse-badge 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse-badge {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .hct-status-applied {
      background: #dcfce7;
      color: #166534;
    }

    /* COMMENT TEXT */
    .hct-comment-text {
      color: #475569;
      line-height: 1.5;
      margin-bottom: 12px;
      font-size: 13px;
      word-wrap: break-word;
    }

    /* COLLAPSE BUTTON */
    .hct-collapse-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 4px;
      transition: all 0.2s;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hct-collapse-btn:hover {
      color: #475569;
    }

    .hct-collapse-icon {
      transition: transform 0.2s;
    }

    .hct-collapse-btn.collapsed .hct-collapse-icon {
      transform: rotate(-90deg);
    }

    /* COLLAPSED CONTENT */
    .hct-comment-content {
      max-height: 1000px;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .hct-comment-content.collapsed {
      max-height: 0;
    }

    .hct-comment-collapsed {
      padding-bottom: 8px;
    }

    .hct-comment-time {
      transition: opacity 0.3s ease, max-height 0.3s ease;
      max-height: 100%;
      opacity: 1;
    }

    /* REPLY COLLAPSE */
    .hct-reply-collapse-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 2px;
      transition: all 0.2s;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .hct-reply-collapse-btn:hover {
      color: #475569;
    }

    .hct-reply-collapse-icon {
      transition: transform 0.2s;
    }

    .hct-reply-collapse-btn.collapsed .hct-reply-collapse-icon {
      transform: rotate(-90deg);
    }

    .hct-reply {
      overflow: hidden;
      transition: height 0.3s ease;
    }

    .hct-reply.collapsed {
      height: 45px;
    }

    .hct-reply-time {
      transition: opacity 0.3s ease, max-height 0.3s ease;
      max-height: 100%;
      opacity: 1;
    }

    .hct-reply.collapsed .hct-reply-time {
      max-height: 0;
      opacity: 0;
      pointer-events: none;
    }

    .hct-reply-content {
      max-height: 1000px;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .hct-reply-content.collapsed {
      max-height: 0;
    }

    /* COMMENT ACTIONS */
    .hct-comment-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
      padding-top: 0;
    }

    .hct-comment-btn {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #e2e8f0;
      background: white;
      color: #1e293b;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .hct-comment-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    .hct-comment-btn.primary {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .hct-comment-btn.primary:hover {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }

    /* REPLIES */
    .hct-reply {
      margin-top: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 3px solid #2563eb;
      font-size: 12px;
    }

    .hct-reply-author {
      font-weight: 700;
      color: #0f172a;
      font-size: 13px;
    }

    .hct-reply-text {
      color: #475569;
      line-height: 1.5;
    }

    /* PIN OVERLAY & PINS */
    .hct-pin-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483645;
    }

    .hct-pin {
      position: absolute;
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3), 0 0 0 3px rgba(37, 99, 235, 0.1);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      border: 2px solid white;
    }

    .hct-pin:hover {
      transform: scale(1.2) translateY(-2px);
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4), 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .hct-pin.applied {
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3), 0 0 0 3px rgba(22, 163, 74, 0.1);
    }

    .hct-pin.applied:hover {
      box-shadow: 0 8px 20px rgba(22, 163, 74, 0.4), 0 0 0 3px rgba(22, 163, 74, 0.15);
    }

    .hct-pin.pending {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3), 0 0 0 3px rgba(220, 38, 38, 0.1);
      animation: pulse-pin 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .hct-pin.pending:hover {
      box-shadow: 0 8px 20px rgba(220, 38, 38, 0.4), 0 0 0 3px rgba(220, 38, 38, 0.15);
    }

    @keyframes pulse-pin {
      0%, 100% { box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3), 0 0 0 3px rgba(220, 38, 38, 0.1); }
      50% { box-shadow: 0 4px 12px rgba(220, 38, 38, 0.15), 0 0 0 3px rgba(220, 38, 38, 0.05); }
    }

    /* ELEMENT HIGHLIGHT */
    .hct-highlight {
      outline: 3px dashed #2563eb !important;
      outline-offset: 3px !important;
      background-color: rgba(37, 99, 235, 0.08) !important;
      box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.2) !important;
    }

    /* COMMENT POPOVER */
    #hct-popover {
      position: fixed;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
      z-index: 2147483647;
      min-width: 320px;
      max-width: 420px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: popoverSlideIn 0.2s ease;
    }

    @keyframes popoverSlideIn {
      from { opacity: 0; transform: scale(0.95) translateY(-8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    #hct-popover textarea {
      width: 100%;
      min-height: 100px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      margin-bottom: 12px;
      resize: vertical;
      color: #1e293b;
      transition: all 0.2s;
    }

    #hct-popover textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    #hct-popover button {
      padding: 10px 14px;
      margin-right: 8px;
      font-size: 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    #hct-popover .hct-submit {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
    }

    #hct-popover .hct-submit:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      transform: translateY(-1px);
    }

    #hct-popover .hct-cancel {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    #hct-popover .hct-cancel:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    /* TOAST NOTIFICATIONS */
    .hct-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      color: #1f2937;
      padding: 14px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      z-index: 2147483648;
      animation: toastFadeIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      background: #f5f5f5;
    }

    @keyframes toastFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes toastFadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    .hct-toast.success {
      background: #dcfce7 !important;
      color: #166534 !important;
    }

    .hct-toast.error {
      background: #fee2e2;
      color: #991b1b;
    }

    .hct-toast.info {
      background: #e0e7ff;
      color: #3730a3;
    }

    .hct-toast.pending {
      background: #fef3c7;
      color: #92400e;
    }
    
    .hct-toast.applied {
      background: #dcfce7;
      color: #166534;
    }

    /* Global Counter Footer */
    #hct-global-counter {
      padding: 12px 16px;
      text-align: center;
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      margin-top: 8px;
    }

    #hct-counter-number {
      font-weight: 700;
      color: #2563eb;
    }

    #hct-counter-credits {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 6px;
    }

    #hct-global-counter a {
      color: white;
      text-decoration: none;
      opacity: 0.9;
      transition: opacity 0.2s;
    }

    #hct-global-counter a:hover {
      opacity: 1;
      text-decoration: underline;
    }

    #hct-counter-number {
      font-weight: 700;
      font-size: 14px;
      margin: 0 4px;
    }

    body.hct-sidebar-open {
      margin-bottom: 0;
    }

    /* Body adjustment for sidebar animation */
    body {
      transition: margin-right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    body.hct-sidebar-open {
      margin-right: 335px;
    }

    body.hct-sidebar-open #root {
      width: calc(100vw - 335px);
      transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 0.2);
    }

    #root {
      transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 0.2);
    }

    /* Footer */
    #hct-sidebar-footer {
      border-top: 1px solid #e2e8f0;
      padding: 12px 16px;
      text-align: center;
      background: #fafafa;
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.4;
    }
  `;
  document.head.appendChild(style);
};

const renderToolbar = () => {
  const toolbar = document.createElement('div');
  toolbar.id = 'hct-toolbar';
  const isCollapsed = localStorage.getItem('hct_toolbar_collapsed') !== 'false';
  toolbar.innerHTML = `
    <button id="hct-btn-comment"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h8"/><path d="M12 8v8"/></svg><span id="hct-btn-comment-text" class="${isCollapsed ? 'hct-toolbar-hidden' : ''}">Add Comment</span></button>
    <button id="hct-btn-toggle-toolbar" class="hct-toolbar-toggle"><svg id="hct-toggle-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${isCollapsed ? '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>' : '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>'}</svg></button>
  `;
  document.body.appendChild(toolbar);
  if (isCollapsed) {
    toolbar.classList.add('hct-toolbar-collapsed');
  }

  document.getElementById('hct-btn-comment').addEventListener('click', togglePickMode);
  document.getElementById('hct-btn-toggle-toolbar').addEventListener('click', toggleToolbarCollapse);

  // Restore sidebar state if toolbar is expanded
  if (!isCollapsed) {
    HCT.sidebarOpen = true;
  }
};

const toggleToolbarCollapse = () => {
  const toolbar = document.getElementById('hct-toolbar');
  const commentText = document.getElementById('hct-btn-comment-text');
  const toggleIcon = document.getElementById('hct-toggle-icon');
  const isCollapsed = toolbar.classList.contains('hct-toolbar-collapsed');

  if (isCollapsed) {
    // Expand and open sidebar
    toolbar.classList.remove('hct-toolbar-collapsed');
    commentText.classList.remove('hct-toolbar-hidden');
    toggleIcon.innerHTML = '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>';
    localStorage.setItem('hct_toolbar_collapsed', 'false');
    localStorage.setItem('hct_sidebar_open', 'true');
    toggleSidebar(true);
  } else {
    // Collapse and close sidebar
    toolbar.classList.add('hct-toolbar-collapsed');
    commentText.classList.add('hct-toolbar-hidden');
    toggleIcon.innerHTML = '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>';
    localStorage.setItem('hct_toolbar_collapsed', 'true');
    localStorage.setItem('hct_sidebar_open', 'false');
    closeSidebar(true);
  }
};

const renderSidebar = () => {
  let sidebar = document.getElementById('hct-sidebar');
  const isNewSidebar = !sidebar;
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'hct-sidebar';
    document.body.appendChild(sidebar);
  }

  const pageUrl = window.location.href;
  const pageComments = HCT.comments.filter(c => c.page_url === pageUrl);

  let html = `
    <div id="hct-sidebar-header">
      <h3>Comments (${pageComments.length})</h3>
      <button onclick="HCT.toggleSidebar(false)" title="Close sidebar" style="width: 32px; height: 32px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M9 3v18"/>
          <path d="m16 15-3-3 3-3"/>
        </svg>
      </button>
    </div>
    <div id="hct-sidebar-content">
  `;

  if (pageComments.length === 0) {
    html += `
      <div class="hct-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
          <path d="M12 16v-4M12 10v-.01"/>
        </svg>
        <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">No comments yet</p>
        <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">Click "<strong>+ Add Comment</strong>" to add your first comment</p>
      </div>
    `;
  } else {
    pageComments.forEach((comment, idx) => {
      const statusClass = `hct-status-${comment.status.replace(/_/g, '-')}`;
      const statusText = comment.status === 'pending-apply' ? 'Pending Apply' : comment.status.charAt(0).toUpperCase() + comment.status.slice(1);

      html += `
        <div class="hct-comment-card" data-comment-id="${comment.id}" style="cursor: default;">
          <div class="hct-comment-header" onclick="HCT.highlightCommentElement('${comment.id}')" style="cursor: pointer; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; gap: 6px; flex: 1;">
              <span class="hct-comment-badge">${idx + 1}</span>
              <div style="display: flex; flex-direction: column; margin-top: -3px;">
                <span class="hct-comment-author">${escapeHtml(comment.author)}</span>
                <span class="hct-comment-time" style="font-size: 11px;">${getRelativeTime(comment.created_at)}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="hct-comment-status ${statusClass}" style="font-size: 11px; padding: 2px 6px;">${statusText}</div>
              <button class="hct-collapse-btn" onclick="event.stopPropagation(); HCT.toggleCommentCollapse('${comment.id}')" title="Collapse/Expand"><svg class="hct-collapse-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
            </div>
          </div>
          <div class="hct-comment-content" data-collapsed="${comment.id}">
            <div class="hct-comment-text">${escapeHtml(comment.text)}</div>
            <div class="hct-comment-actions">
              <button class="hct-comment-btn" onclick="HCT.toggleReply('${comment.id}')">Reply</button>
              <button class="hct-comment-btn" onclick="HCT.toggleApply('${comment.id}')">${comment.status === 'pending-apply' ? 'Cancel' : 'Ready to Apply'}</button>
              <button class="hct-comment-btn" onclick="HCT.deleteComment('${comment.id}')">Delete</button>
            </div>
      `;

      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => {
          const replyStatus = reply.status || 'open';
          const isAIReply = reply.author === 'AI';
          const statusClass = `hct-status-${replyStatus.replace(/_/g, '-')}`;
          const statusText = replyStatus === 'pending-apply' ? 'Pending Apply' : replyStatus.charAt(0).toUpperCase() + replyStatus.slice(1);

          html += `
            <div class="hct-reply" data-reply-id="${reply.id}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div style="display: flex; flex-direction: column; flex: 1;">
                  <span class="hct-reply-author" style="font-weight: 500;">${escapeHtml(reply.author)}</span>
                  <span class="hct-reply-time" style="font-size: 11px; color: #999;">${getRelativeTime(reply.created_at)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${isAIReply ? '' : `<div class="hct-comment-status ${statusClass}" style="font-size: 11px; padding: 2px 6px;">${statusText}</div>`}
                  <button class="hct-reply-collapse-btn" onclick="event.stopPropagation(); HCT.toggleReplyCollapse('${comment.id}', '${reply.id}')" title="Collapse/Expand"><svg class="hct-reply-collapse-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                </div>
              </div>
              <div class="hct-reply-content" data-reply-collapsed="${reply.id}">
                <div class="hct-reply-text">${escapeHtml(reply.text)}</div>
                <div style="margin-top: 8px; display: flex; gap: 6px;">
                  ${isAIReply ? '' : `<button class="hct-comment-btn" onclick="HCT.toggleReplyApply('${comment.id}', '${reply.id}')" style="font-size: 11px; padding: 4px 8px;">Ready to Apply</button>`}
                  ${isAIReply ? '' : `<button class="hct-comment-btn" onclick="HCT.deleteReply('${comment.id}', '${reply.id}')" style="font-size: 11px; padding: 4px 8px;">Delete</button>`}
                </div>
              </div>
            </div>
          `;
        });
      }

      html += `</div></div>`;
    });
  }

  html += '</div>';

  html += `
    <div id="hct-global-counter">
      🌍 <span id="hct-counter-number">0</span> comments worldwide
      <div id="hct-counter-credits">
        Made with ❤️ by Osama Eldrieny
      </div>
    </div>
  `;

  // Save state before re-rendering
  const sidebarContent = document.getElementById('hct-sidebar-content');
  let collapsedStates = {};
  let replyCollapsedStates = {};
  let scrollPosition = 0;

  if (sidebarContent) {
    scrollPosition = sidebarContent.scrollTop;
    // Save comment collapsed states
    document.querySelectorAll('[data-comment-id]').forEach(card => {
      const commentId = card.getAttribute('data-comment-id');
      const content = card.querySelector('[data-collapsed]');
      const isCollapsed = content && content.classList.contains('collapsed');
      if (isCollapsed) {
        collapsedStates[commentId] = true;
      }
    });
    // Save reply collapsed states
    document.querySelectorAll('[data-reply-id]').forEach(reply => {
      const replyId = reply.getAttribute('data-reply-id');
      const content = reply.querySelector('[data-reply-collapsed]');
      if (content) {
        const isCollapsed = content.classList.contains('collapsed');
        replyCollapsedStates[replyId] = isCollapsed;
      }
    });
  }

  sidebar.innerHTML = html;

  // Restore collapsed states using requestAnimationFrame for better timing
  requestAnimationFrame(() => {
    // Restore comment collapsed states
    Object.entries(collapsedStates).forEach(([commentId, wasCollapsed]) => {
      if (wasCollapsed) {
        const content = document.querySelector(`[data-collapsed="${commentId}"]`);
        const btn = document.querySelector(`[data-comment-id="${commentId}"] .hct-collapse-btn`);
        const card = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (content && btn && card) {
          content.classList.add('collapsed');
          btn.classList.add('collapsed');
          card.classList.add('hct-comment-collapsed');
        }
      }
    });

    // Restore reply collapsed states
    Object.entries(replyCollapsedStates).forEach(([replyId, wasCollapsed]) => {
      if (wasCollapsed) {
        const reply = document.querySelector(`[data-reply-id="${replyId}"]`);
        const content = document.querySelector(`[data-reply-collapsed="${replyId}"]`);
        const btn = document.querySelector(`[data-reply-id="${replyId}"] .hct-reply-collapse-btn`);
        if (content && btn && reply) {
          content.classList.add('collapsed');
          btn.classList.add('collapsed');
          reply.classList.add('collapsed');
        }
      }
    });

    // Restore scroll position
    const newSidebarContent = document.getElementById('hct-sidebar-content');
    if (newSidebarContent) {
      newSidebarContent.scrollTop = scrollPosition;
    }
  });

  window.HCT.toggleReply = (commentId) => {
    const textarea = document.querySelector(`[data-reply-id="${commentId}"]`);
    if (textarea) {
      textarea.remove();
    } else {
      const container = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (container) {
        const replyForm = document.createElement('div');
        replyForm.setAttribute('data-reply-id', commentId);
        replyForm.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;';
        replyForm.innerHTML = `
          <textarea style="width: 100%; min-height: 70px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; margin-bottom: 8px; color: #1e293b; resize: vertical; transition: all 0.2s;" placeholder="Write a reply..." onFocus="this.style.borderColor='#2563eb'; this.style.boxShadow='0 0 0 3px rgba(37, 99, 235, 0.1)'" onBlur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"></textarea>
          <button class="hct-comment-btn primary" onclick="HCT.submitReply('${commentId}', this)" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);">Submit</button>
          <button class="hct-comment-btn" onclick="this.parentElement.remove()" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">Cancel</button>
        `;
        container.appendChild(replyForm);
        // Auto-focus the textarea
        const textarea = replyForm.querySelector('textarea');
        if (textarea) {
          setTimeout(() => textarea.focus(), 0);
        }
      }
    }
  };

  window.HCT.submitReply = (commentId, btn) => {
    const textarea = document.querySelector(`[data-reply-id="${commentId}"] textarea`);
    if (!textarea || !textarea.value.trim()) {
      showToast('Reply cannot be empty', 'error');
      return;
    }

    const comment = HCT.comments.find(c => c.id === commentId);
    if (!comment) return;

    const reply = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      author: HCT.author,
      text: textarea.value.trim(),
      status: 'open',
      created_at: new Date().toISOString()
    };

    fetch(`${getBackendUrl()}/api/comments/${commentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: HCT.author, text: reply.text })
    })
      .then(() => {
        comment.replies.push(reply);
        renderSidebar();
        fetchGlobalCounter();
        showToast('💬 Reply added', 'info');
      })
      .catch(() => showToast('Error adding reply', 'error'));
  };

  window.HCT.updateCommentStatusInDOM = (commentId, newStatus) => {
    const statusClass = `hct-status-${newStatus.replace(/_/g, '-')}`;
    const statusText = newStatus === 'pending-apply' ? 'Pending Apply' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    const statusElement = document.querySelector(`[data-comment-id="${commentId}"] .hct-comment-status`);
    if (statusElement) {
      statusElement.className = `hct-comment-status ${statusClass}`;
      statusElement.textContent = statusText;
    }
    const button = document.querySelector(`[data-comment-id="${commentId}"] .hct-comment-actions .hct-comment-btn:nth-child(2)`);
    if (button) {
      button.textContent = newStatus === 'pending-apply' ? 'Cancel' : 'Ready to Apply';
    }
  };

  window.HCT.updateReplyStatusInDOM = (replyId, newStatus) => {
    const statusClass = `hct-status-${newStatus.replace(/_/g, '-')}`;
    const statusText = newStatus === 'pending-apply' ? 'Pending Apply' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
    const statusElement = document.querySelector(`[data-reply-id="${replyId}"] .hct-comment-status`);
    if (statusElement) {
      statusElement.className = `hct-comment-status ${statusClass}`;
      statusElement.textContent = statusText;
    }
  };

  window.HCT.toggleApply = (commentId) => {
    const comment = HCT.comments.find(c => c.id === commentId);
    if (!comment) return;

    const newStatus = comment.status === 'pending-apply' ? 'open' : 'pending-apply';

    fetch(`${getBackendUrl()}/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(() => {
        comment.status = newStatus;
        HCT.updateCommentStatusInDOM(commentId, newStatus);
        renderPins();
        showToast(newStatus === 'pending-apply' ? '⏳ Ready to apply' : '❌ Not ready to apply', newStatus === 'pending-apply' ? 'pending' : 'error');
      })
      .catch(() => showToast('Error updating comment', 'error'));
  };

  window.HCT.toggleReplyApply = (commentId, replyId) => {
    const comment = HCT.comments.find(c => c.id === commentId);
    if (!comment || !comment.replies) return;

    const reply = comment.replies.find(r => r.id === replyId);
    if (!reply) return;

    const newStatus = (reply.status || 'open') === 'pending-apply' ? 'open' : 'pending-apply';

    fetch(`${getBackendUrl()}/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replyId: replyId,
        replies: comment.replies.map(r =>
          r.id === replyId ? { ...r, status: newStatus } : { ...r, status: r.status || 'open' }
        )
      })
    })
      .then(() => {
        reply.status = newStatus;
        HCT.updateReplyStatusInDOM(replyId, newStatus);
        showToast(newStatus === 'pending-apply' ? '⏳ Reply ready to apply' : '❌ Reply not ready to apply', newStatus === 'pending-apply' ? 'pending' : 'error');
      })
      .catch(() => showToast('Error updating reply', 'error'));
  };

  window.HCT.deleteComment = (commentId) => {
    fetch(`${getBackendUrl()}/api/comments/${commentId}`, { method: 'DELETE' })
      .then(() => {
        HCT.comments = HCT.comments.filter(c => c.id !== commentId);
        renderSidebar();
        renderPins();
        showToast('🗑️ Comment deleted', 'error');
      })
      .catch(() => showToast('Error deleting comment', 'error'));
  };

  window.HCT.deleteReply = (commentId, replyId) => {
    const comment = HCT.comments.find(c => c.id === commentId);
    if (!comment || !comment.replies) return;

    const replyIndex = comment.replies.findIndex(r => r.id === replyId);
    if (replyIndex === -1) return;

    comment.replies.splice(replyIndex, 1);

    const replyElement = document.querySelector(`[data-reply-id="${replyId}"]`);
    if (replyElement) {
      replyElement.style.opacity = '0';
      replyElement.style.transition = 'opacity 0.2s ease';
      setTimeout(() => {
        replyElement.remove();
        showToast('🗑️ Reply deleted', 'error');
      }, 200);
    } else {
      showToast('🗑️ Reply deleted', 'error');
    }
  };

  window.HCT.toggleCommentCollapse = (commentId) => {
    const content = document.querySelector(`[data-collapsed="${commentId}"]`);
    const btn = document.querySelector(`[data-comment-id="${commentId}"] .hct-collapse-btn`);
    const card = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (content && btn && card) {
      content.classList.toggle('collapsed');
      btn.classList.toggle('collapsed');
      card.classList.toggle('hct-comment-collapsed');
    }
  };

  window.HCT.toggleReplyCollapse = (commentId, replyId) => {
    const reply = document.querySelector(`[data-reply-id="${replyId}"]`);
    const content = document.querySelector(`[data-reply-collapsed="${replyId}"]`);
    const btn = document.querySelector(`[data-reply-id="${replyId}"] .hct-reply-collapse-btn`);
    if (content && btn && reply) {
      content.classList.toggle('collapsed');
      btn.classList.toggle('collapsed');
      reply.classList.toggle('collapsed');
    }
  };

  window.HCT.highlightCommentElement = highlightCommentElement;
  window.HCT.removeElementHighlight = removeElementHighlight;
  window.HCT.closeSidebar = closeSidebar;

  // Apply saved sidebar state on first render if toolbar is expanded
  if (isNewSidebar) {
    const toolbarCollapsed = localStorage.getItem('hct_toolbar_collapsed') !== 'false';
    if (!toolbarCollapsed) {
      // Toolbar is expanded, so sidebar should be open
      sidebar.classList.add('open');
      HCT.sidebarOpen = true;
      document.body.classList.add('hct-sidebar-open');
    }
  }
};

const togglePickMode = () => {
  HCT.pickMode = !HCT.pickMode;
  const btn = document.getElementById('hct-btn-comment');

  if (HCT.pickMode) {
    btn.style.background = '#dc3545';
    document.addEventListener('mouseover', handlePickModeMouseOver);
    // showToast('Click any element to comment', 'success');
  } else {
    btn.style.background = '#007bff';
    document.removeEventListener('mouseover', handlePickModeMouseOver);
    removeHighlight();
  }
};

const handlePickModeMouseOver = (e) => {
  removeHighlight();

  const el = e.target;
  if (!el || !el.id || !el.id.startsWith('hct-')) {
    el.classList.add('hct-highlight');
    HCT.pendingElement = el;

    const selector = generateSelector(el);
    console.log('🔍 Element selected:', {
      tagName: el.tagName,
      classes: el.className,
      selector: selector,
      element: el
    });
  }
};

const removeHighlight = () => {
  document.querySelectorAll('.hct-highlight').forEach(el => el.classList.remove('hct-highlight'));
};

const closeSidebar = (persistState = false) => {
  const sidebar = document.getElementById('hct-sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
    document.body.classList.remove('hct-sidebar-open');
    HCT.sidebarOpen = false;
    removeElementHighlight();
    if (persistState) {
      localStorage.setItem('hct_sidebar_open', 'false');
    }
  }
};

const toggleSidebar = (forceOpen = null) => {
  const sidebar = document.getElementById('hct-sidebar');
  if (!sidebar) renderSidebar();
  const sb = document.getElementById('hct-sidebar');

  if (forceOpen !== null) {
    // Force open or closed state
    if (forceOpen) {
      sb.classList.add('open');
      HCT.sidebarOpen = true;
      document.body.classList.add('hct-sidebar-open');
    } else {
      sb.classList.remove('open');
      HCT.sidebarOpen = false;
      document.body.classList.remove('hct-sidebar-open');
      removeElementHighlight();
    }
  } else {
    // Toggle state
    sb.classList.toggle('open');
    HCT.sidebarOpen = sb.classList.contains('open');

    // Add/remove margin from body to avoid content overlap
    if (HCT.sidebarOpen) {
      document.body.classList.add('hct-sidebar-open');
    } else {
      document.body.classList.remove('hct-sidebar-open');
      removeElementHighlight();
    }
  }
};

const fetchComments = () => {
  const params = new URLSearchParams({ page_url: window.location.href });
  fetch(`${getBackendUrl()}/api/comments?${params}`)
    .then(r => r.json())
    .then(comments => {
      HCT.comments = comments;
      renderSidebar();
      renderPins();
    })
    .catch(err => {
      console.error('Error fetching comments:', err);
      showToast('Cannot connect to comments server', 'error');
    });
};

const startAutoRefreshCheck = () => {
  let lastModified = {};
  let lastPendingCount = 0;

  const checkForChanges = () => {
    const pageUrl = window.location.href;
    const pageComments = HCT.comments.filter(c => c.page_url === pageUrl);

    if (pageComments.length === 0) return;

    // Get unique html_file_paths from all comments on this page
    const filePaths = [...new Set(pageComments.map(c => c.html_file_path).filter(Boolean))];

    // Check each file for modifications (skip invalid paths)
    filePaths.forEach(filePath => {
      // Skip invalid paths (file:// URLs, paths with "file:", paths with "http:", etc.)
      if (!filePath || filePath.includes('file:') || filePath.includes('file%3A') || filePath.includes('http')) {
        return;
      }

      const params = new URLSearchParams({ html_file_path: filePath });
      fetch(`${getBackendUrl()}/api/check-changes?${params}`)
        .then(r => r.json())
        .then(data => {
          if (!lastModified[filePath]) {
            lastModified[filePath] = data.lastModified;
          } else if (data.lastModified > lastModified[filePath]) {
            lastModified[filePath] = data.lastModified;
            showToast('✨ HTML updated! Refreshing page...', 'success');
            setTimeout(() => window.location.reload(), 1500);
          }
        })
        .catch(err => {
          // Silently ignore errors - server might be down or file doesn't exist yet
        });
    });
  };

  setInterval(checkForChanges, 2000);
};

  // Pin click handler - attached to each pin
  const removeElementHighlight = () => {
    const highlighted = document.querySelector('.hct-highlight');
    if (highlighted) {
      highlighted.classList.remove('hct-highlight');
    }
  };

  const highlightCommentElement = (commentId) => {
    removeElementHighlight();
    const comment = HCT.comments.find(c => c.id === commentId);
    if (comment) {
      const el = matchCommentToElement(comment);
      if (el) {
        el.classList.add('hct-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handlePinClick = (commentId) => {
    const sidebar = document.getElementById('hct-sidebar');
    if (!sidebar) {
      renderSidebar();
    }
    const sb = document.getElementById('hct-sidebar');
    if (sb) {
      sb.classList.add('open');
      HCT.sidebarOpen = true;
      document.body.classList.add('hct-sidebar-open');

      // Highlight the element
      highlightCommentElement(commentId);

      setTimeout(() => {
        const commentCard = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (commentCard) {
          const sidebarContent = document.getElementById('hct-sidebar-content');
          if (sidebarContent) {
            const cardTop = commentCard.offsetTop;
            const cardHeight = commentCard.offsetHeight;
            const containerHeight = sidebarContent.clientHeight;
            const targetScroll = cardTop - (containerHeight / 2) + (cardHeight / 2);
            sidebarContent.scrollTop = targetScroll;
          }

          commentCard.style.background = '#fff8dc';
          commentCard.style.transition = 'background 0.3s ease';
          setTimeout(() => {
            commentCard.style.background = '';
            commentCard.style.transition = '';
          }, 2000);
        }
      }, 300);
    }
  };

  const renderPins = () => {
    let overlay = document.getElementById('hct-pin-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'hct-pin-overlay';
      overlay.className = 'hct-pin-overlay';
      document.body.appendChild(overlay);
    }

    const pageUrl = window.location.href;
    const pageComments = HCT.comments.filter(c => c.page_url === pageUrl);

    const existingPins = new Map();
    overlay.querySelectorAll('.hct-pin').forEach(pin => {
      existingPins.set(pin.getAttribute('data-comment-id'), pin);
    });

    const seenIds = new Set();

    pageComments.forEach((comment, idx) => {
      seenIds.add(comment.id);
      const el = matchCommentToElement(comment);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const pinLeft = rect.left + (rect.width * comment.pin_x / 100);
      const pinTop = rect.top + (rect.height * comment.pin_y / 100);

      let pin = existingPins.get(comment.id);

      if (pin) {
        // Update existing pin position and status
        pin.style.left = (pinLeft - 14) + 'px';
        pin.style.top = (pinTop - 14) + 'px';
        pin.className = 'hct-pin ' + (comment.status === 'applied' ? 'applied' : comment.status === 'pending-apply' ? 'pending' : '');
        pin.textContent = idx + 1;
      } else {
        // Create new pin only if it doesn't exist
        pin = document.createElement('div');
        pin.className = 'hct-pin ' + (comment.status === 'applied' ? 'applied' : comment.status === 'pending-apply' ? 'pending' : '');
        pin.textContent = idx + 1;
        pin.style.left = (pinLeft - 14) + 'px';
        pin.style.top = (pinTop - 14) + 'px';
        pin.setAttribute('data-comment-id', comment.id);
        pin.style.cursor = 'pointer';
        pin.style.pointerEvents = 'auto';

        pin.addEventListener('click', () => {
          handlePinClick(comment.id);
        });

        overlay.appendChild(pin);
      }
    });

    // Remove pins for deleted comments
    existingPins.forEach((pin, commentId) => {
      if (!seenIds.has(commentId)) {
        pin.remove();
      }
    });
  };

const matchCommentToElement = (comment) => {
  if (!comment.element_selector) return null;

  // Handle special selectors
  if (comment.element_selector === 'html') {
    return document.documentElement;
  }
  if (comment.element_selector === 'body') {
    return document.body;
  }

  try {
    const el = document.querySelector(comment.element_selector);
    if (el) return el;
  } catch (e) {}

  if (comment.element_snapshot) {
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.outerHTML === comment.element_snapshot) return el;
    }

    for (const el of allEls) {
      if (el.textContent.trim() === comment.element_snapshot.replace(/<[^>]*>/g, '').trim()) {
        return el;
      }
    }
  }

  return null;
};

const generateSelector = (el) => {
  // Handle special cases: html and body tags
  if (el === document.documentElement) {
    return 'html';
  }
  if (el === document.body) {
    return 'body';
  }

  if (el.id) {
    try {
      if (document.querySelector('#' + el.id) === el) {
        return '#' + el.id;
      }
    } catch (e) {}
  }

  const parts = [];
  let currentEl = el;

  while (currentEl && currentEl !== document.body && currentEl !== document.documentElement) {
    let selector = currentEl.tagName.toLowerCase();

    if (currentEl.id) {
      selector += '#' + currentEl.id;
      parts.unshift(selector);
      break;
    }

    let nth = 1;
    let sibling = currentEl.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === currentEl.tagName.toLowerCase()) nth++;
      sibling = sibling.previousElementSibling;
    }

    if (nth > 1) {
      selector += `:nth-of-type(${nth})`;
    }

    parts.unshift(selector);
    currentEl = currentEl.parentElement;
  }

  // If we stopped at body or html, add them to the path
  if (currentEl === document.body) {
    parts.unshift('body');
  } else if (currentEl === document.documentElement) {
    parts.unshift('html');
  }

  return parts.join(' > ');
};

const showToast = (msg, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = 'hct-toast ' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  console.log('Toast created with class:', toast.className, 'Text:', msg);
  setTimeout(() => toast.remove(), 3000);
};

const getRelativeTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';

  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';

  const days = Math.floor(hours / 24);
  return days + 'd ago';
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

document.addEventListener('click', (e) => {
  if (!HCT.pickMode) return;

  // Ignore clicks on HCT elements
  if (e.target?.id?.startsWith('hct-')) return;

  e.preventDefault();
  e.stopPropagation();

  let el = e.target;

  // If clicked on nothing or document, target the body
  if (!el || el === document || el === document.documentElement) {
    el = document.body;
  }

  HCT.pickMode = false;
  document.getElementById('hct-btn-comment').style.background = '#007bff';
  document.removeEventListener('mouseover', handlePickModeMouseOver);
  removeHighlight();

  const rect = el.getBoundingClientRect();
  const pinX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100));
  const pinY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100));

  HCT.pendingSelector = generateSelector(el);
  HCT.pendingSnapshot = el.outerHTML;
  HCT.pendingPinX = pinX;
  HCT.pendingPinY = pinY;
  HCT.pendingElement = el;

  // Keep the highlight on the element
  el.classList.add('hct-highlight');

  showCommentPopover(el);
}, true);

const showCommentPopover = (el) => {
  let popover = document.getElementById('hct-popover');
  if (popover) popover.remove();

  popover = document.createElement('div');
  popover.id = 'hct-popover';

  const rect = el.getBoundingClientRect();
  const selector = HCT.pendingSelector || generateSelector(el);

  popover.innerHTML = `
    <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">Add your comment</div>
    <textarea id="hct-popover-text" placeholder="Write your comment..."></textarea>
    <button class="hct-submit" onclick="HCT.submitComment()">Submit</button>
    <button class="hct-cancel" onclick="HCT.cancelComment()">Cancel</button>
  `;

  document.body.appendChild(popover);

  // Get popover dimensions
  const popoverRect = popover.getBoundingClientRect();
  const popoverWidth = popoverRect.width || 320;
  const popoverHeight = popoverRect.height || 300;
  const padding = 20;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };

  // Calculate initial position
  let left, top;

  if (el === document.body || el === document.documentElement) {
    left = viewport.width / 2 - popoverWidth / 2;
    top = viewport.scrollY + Math.max(100, 50);
  } else {
    left = rect.left + viewport.scrollX + rect.width / 2 - popoverWidth / 2;
    top = rect.bottom + viewport.scrollY + 10;
  }

  // Adjust horizontal position to keep popover visible
  if (left < padding) {
    left = padding;
  } else if (left + popoverWidth > viewport.width - padding) {
    left = viewport.width - popoverWidth - padding;
  }

  // Adjust vertical position to keep popover visible
  // If popover would go off bottom of screen, position it above the element
  if (top + popoverHeight > viewport.height + viewport.scrollY - padding) {
    if (el !== document.body && el !== document.documentElement) {
      top = rect.top + viewport.scrollY - popoverHeight - 10;
    } else {
      top = viewport.scrollY + padding;
    }
  }

  // Ensure top doesn't go too high
  if (top < viewport.scrollY + padding) {
    top = viewport.scrollY + padding;
  }

  popover.style.left = left + 'px';
  popover.style.top = top + 'px';

  document.getElementById('hct-popover-text').focus();
  document.getElementById('hct-popover-text').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.HCT.submitComment = () => {
  const textarea = document.getElementById('hct-popover-text');
  if (!textarea || !textarea.value.trim()) {
    showToast('Comment cannot be empty', 'error');
    return;
  }

  // Capture element and its styling
  const el = matchCommentToElement({ element_selector: HCT.pendingSelector, element_snapshot: HCT.pendingSnapshot });
  const elementClasses = el ? el.className.split(/\s+/).filter(c => c) : [];

  // Capture computed styles applied to this specific element
  let computedStyles = {};
  let appliedCSSRules = [];
  if (el) {
    const styles = window.getComputedStyle(el);
    // Capture key style properties
    const keyProps = ['color', 'background-color', 'font-size', 'font-weight', 'margin', 'padding', 'border', 'text-align', 'display', 'flex-direction'];
    keyProps.forEach(prop => {
      const value = styles.getPropertyValue(prop);
      if (value) computedStyles[prop] = value.trim();
    });

    // Get inline styles if any
    if (el.style.cssText) {
      computedStyles['inline-style'] = el.style.cssText;
    }

    // Analyze which CSS rules apply to this element (simplified)
    const styleSheets = document.styleSheets;
    for (let sheet of styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (let rule of rules) {
          if (rule.selectorText) {
            try {
              if (el.matches(rule.selectorText)) {
                appliedCSSRules.push({
                  selector: rule.selectorText,
                  styles: rule.style.cssText
                });
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
  }

  let parentElementInfo = {};
  if (el && el.parentElement) {
    const parent = el.parentElement;
    parentElementInfo = {
      tag: parent.tagName.toLowerCase(),
      classes: parent.className.split(/\s+/).filter(c => c),
      id: parent.id || null
    };
  }

  const data = {
    page_url: window.location.href,
    element_selector: HCT.pendingSelector,
    element_snapshot: HCT.pendingSnapshot,
    element_tag: el ? el.tagName.toLowerCase() : 'unknown',
    element_classes: elementClasses,
    element_id: el ? el.id : null,
    computed_styles: computedStyles,
    applied_css_rules: appliedCSSRules,
    parent_element_info: parentElementInfo,
    pin_x: HCT.pendingPinX,
    pin_y: HCT.pendingPinY,
    author: HCT.author,
    text: textarea.value.trim()
  };

  fetch(`${getBackendUrl()}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(r => r.json())
    .then(comment => {
      HCT.comments.push(comment);
      renderSidebar();
      renderPins();
      fetchGlobalCounter();
      if (HCT.pendingElement) HCT.pendingElement.classList.remove('hct-highlight');
      document.getElementById('hct-popover').remove();
      showToast('🐕 Pointed! Comment added', 'success');
    })
    .catch(() => showToast('Error submitting comment', 'error'));
};

window.HCT.cancelComment = () => {
  // Remove highlight from the element
  if (HCT.pendingElement) {
    HCT.pendingElement.classList.remove('hct-highlight');
  }
  // Remove the popover
  const popover = document.getElementById('hct-popover');
  if (popover) {
    popover.remove();
  }
  // Clear pending data
  HCT.pendingElement = null;
  HCT.pendingSelector = null;
  HCT.pendingSnapshot = null;
};

  // Debounced pin update to avoid blocking main thread
  let updateTimeout;
  let rafId;

  // Real-time update using requestAnimationFrame (smooth during scroll/zoom)
  const updatePinsRealtime = () => {
    if (rafId) return; // Already scheduled
    rafId = requestAnimationFrame(() => {
      if (document.getElementById('hct-pin-overlay')) {
        renderPins();
      }
      rafId = null;
    });
  };

  // Debounced update for DOM/mutation changes
  const updatePinsDebounced = () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      if (document.getElementById('hct-pin-overlay')) {
        renderPins();
      }
    }, 50);
  };

  // Real-time updates for scroll and zoom (smooth, non-blocking)
  window.addEventListener('scroll', updatePinsRealtime, { passive: true });
  window.addEventListener('resize', updatePinsRealtime, { passive: true });
  document.addEventListener('fullscreenchange', updatePinsRealtime);
  window.addEventListener('orientationchange', updatePinsRealtime);

  // Zoom detection using visual viewport (real-time)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updatePinsRealtime, { passive: true });
    window.visualViewport.addEventListener('scroll', updatePinsRealtime, { passive: true });
  }

  // Debounced updates for DOM changes (avoid thrashing)
  const observer = new MutationObserver(updatePinsDebounced);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  initAuthor();
})();
