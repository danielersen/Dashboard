import { appendAuthParams, logout, ensureSessionToken } from "/lib/auth.js";

const NAV_ITEMS = [
  { slug: "home", label: "Home", href: "/pages/home", icon: "home" },
  { slug: "workspace", label: "Workspace", href: "/pages/workspace", icon: "grid" },
  { slug: "AI", label: "AI", href: "/pages/AI", icon: "sparkles" },
  { slug: "files", label: "Files", href: "/pages/files", icon: "database" },
  { slug: "tools", label: "Tools", href: "/pages/tools", icon: "wrench" },
];

// Load SVG files from API endpoint and use URLs directly
async function loadIcons() {
  const iconPaths = {
    home: '/api/icons/home.svg',
    grid: '/api/icons/grid.svg',
    sparkles: '/api/icons/sparkles.svg',
    database: '/api/icons/database.svg',
    wrench: '/api/icons/wrench.svg',
    settings: '/api/icons/settings.svg',
    refresh: '/api/icons/refresh.svg',
    logout: '/api/icons/logout.svg',
    more: '/api/icons/more.svg',
    notes: '/api/icons/notes.svg',
    calendar: '/api/icons/calendar.svg',
    homework: '/api/icons/homework.svg',
    clock: '/api/icons/clock.svg',
  };

  const sessionToken = await ensureSessionToken();
  const icons = {};
  for (const [name, path] of Object.entries(iconPaths)) {
    icons[name] = path + '?nocache=' + Date.now() + '&token=' + (sessionToken || '');
  }
  return icons;
}

let ICONS = loadIcons();

const NAVBAR_STYLE = `
  :host {
    position: fixed;
    inset: 10px 14px auto 14px;
    z-index: 1200;
    display: block;
    color: #edf5f2;
    box-sizing: border-box;
    pointer-events: none;
  }

  .bar {
    min-height: 42px;
    padding: 6px 12px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(10, 16, 17, 0.28);
    backdrop-filter: blur(22px) saturate(1.15);
    -webkit-backdrop-filter: blur(22px) saturate(1.15);
    box-shadow:
      0 10px 40px rgba(0, 0, 0, 0.18),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset,
      0 1px 0 rgba(255, 255, 255, 0.08) inset;
    pointer-events: auto;
    overflow: hidden;
    position: relative;
  }

  .bar::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.03);
    mask-image: radial-gradient(ellipse 120% 100% at 50% 0%, #000 55%, transparent 100%);
  }

  .inner {
    width: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .center {
    min-width: 0;
    overflow: hidden;
  }

  .brand,
  .action,
  .feature,
  .quick {
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-decoration: none;
    transition:
      background 180ms ease,
      border-color 180ms ease,
      transform 180ms ease,
      color 180ms ease;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    padding: 4px 0;
    border-color: transparent;
    background: transparent;
    flex-shrink: 0;
    grid-column: 1;
    justify-self: start;
  }

  .brand:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: transparent;
  }

  .action:hover,
  .feature:hover,
  .quick:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .brand:active,
  .action:active,
  .feature:active,
  .quick:active {
    transform: translateY(1px);
  }

  .brand-icon {
    width: 60px;
    height: 52px;
    border-radius: 0;
    object-fit: contain;
    object-position: center;
    display: block;
    transform: scale(1);
    transform-origin: center;
  }

  .center {
    grid-column: 2;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    justify-self: stretch;
    overflow: hidden;
  }

  .center-scroll {
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    outline: none;
  }

  .center-scroll::-webkit-scrollbar {
    display: none;
  }

  .feature-list {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 8px;
    width: max-content;
    margin: 0;
  }

  .center[data-labels="hidden"] .feature-label,
  .center[data-labels="hidden"] .feature em {
    display: none;
  }

  .feature {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(237, 245, 242, 0.82);
    flex-shrink: 0;
  }

  .feature[data-active="true"] {
    background: rgba(82, 214, 168, 0.14);
    border-color: rgba(82, 214, 168, 0.28);
    color: #f4fbf8;
  }

  .feature-icon,
  .action-icon,
  .brand-icon-wrap {
    width: 32px;
    height: 32px;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    overflow: visible;
  }

  .brand-icon-wrap {
    width: 62px;
    height: 54px;
    display: inline-grid;
    place-items: center;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .feature-icon img,
  .action-icon img {
    width: 20px;
    height: 20px;
  }

  .feature-icon svg,
  .action-icon svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .feature-label,
  .quick span {
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .feature em {
    font-style: normal;
    color: rgba(237, 245, 242, 0.58);
    font-size: 0.74rem;
  }

  .right {
    grid-column: 3;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    justify-self: end;
    gap: 8px;
    flex-shrink: 0;
    padding-right: 2px;
    min-width: 104px;
  }

  .action,
  .quick {
    min-width: 0;
    min-height: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 8px 10px;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(237, 245, 242, 0.82);
  }

  .action[aria-label] {
    position: relative;
  }

  .quick[data-cooldown="true"] {
    opacity: 0.3;
    filter: grayscale(1);
    pointer-events: none;
    cursor: not-allowed;
  }

  @keyframes navbar-refresh-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .quick[data-refreshing="true"] .action-icon svg,
  .quick[data-refreshing="true"] .action-icon img {
    animation: navbar-refresh-spin 1s linear infinite;
  }

  .action-label {
    display: none;
  }

  /* Kebab (three dots) is only used on small screens. */
  .more-toggle {
    display: none;
  }

  .more-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 184px;
    display: none;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(10, 16, 17, 0.55);
    backdrop-filter: blur(22px) saturate(1.15);
    -webkit-backdrop-filter: blur(22px) saturate(1.15);
    box-shadow:
      0 18px 50px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
    visibility: hidden;
    transition:
      opacity 200ms ease,
      transform 200ms ease,
      visibility 200ms ease;
    z-index: 2;
  }

  .more-menu[data-open="true"] {
    opacity: 1;
    transform: translateY(0) scale(1);
    visibility: visible;
  }

  .more-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    color: rgba(237, 245, 242, 0.9);
    cursor: pointer;
    text-decoration: none;
    text-align: left;
    font: inherit;
    transition:
      background 160ms ease,
      border-color 160ms ease;
  }

  .more-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .more-item:active {
    transform: translateY(1px);
  }

  .more-item .action-icon {
    width: 22px;
    height: 22px;
  }

  .more-item .action-icon svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  .more-item-label {
    font-size: 0.9rem;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    :host {
      inset: 8px 10px auto 10px;
    }

    .right .quick:not(.more-toggle) {
      display: none;
    }

    .more-toggle {
      display: inline-flex;
    }

    .more-menu {
      display: flex;
    }

    .bar {
      min-height: 48px;
      padding: 10px 10px;
      border-radius: 16px;
    }

    .feature-label {
      display: none;
    }

    .feature em {
      display: none;
    }

    .feature {
      padding: 8px 12px;
    }

    .brand {
      padding-right: 8px;
      padding-left: 0;
    }
  }
`;

function iconFor(name) {
  // Return placeholder initially, will be replaced after icons load
  return `<span class="icon-placeholder" data-icon="${name}">Loading...</span>`;
}

const NAVBAR_TEMPLATE = `
  <div class="bar">
    <div class="inner">
      <a class="brand" data-home-link href="/pages/home" aria-label="Aller à l'accueil">
        <span class="brand-icon-wrap">
          <img class="brand-icon" src="/assets/logo/square.png" alt="Dashboard">
        </span>
      </a>

      <div class="center" role="navigation" aria-label="Navigation des features">
        <div class="center-scroll" data-center-scroll tabindex="0">
          <div class="feature-list">
            ${NAV_ITEMS.map((item) => `
              <a class="feature" data-route="${item.slug}" href="${item.href}">
                <span class="feature-icon"><img src="${ICONS[item.icon] || ICONS.grid}" alt="" loading="lazy" /></span>
                <span class="feature-label">${item.label}</span>
              </a>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="right">
        <button class="quick" data-kind="refresh" type="button" aria-label="Rafraîchir la page">
          <span class="action-icon"><img src="${ICONS.refresh}" alt="" loading="lazy" /></span>
        </button>

        <a class="quick" data-kind="settings" href="/pages/settings" aria-label="Ouvrir les paramètres">
          <span class="action-icon"><img src="${ICONS.settings}" alt="" loading="lazy" /></span>
        </a>
        <button class="quick" data-kind="logout" type="button" aria-label="Se déconnecter">
          <span class="action-icon"><img src="${ICONS.logout}" alt="" loading="lazy" /></span>
        </button>
        <button class="quick more-toggle" data-kind="more" type="button" aria-label="Plus d'options" aria-expanded="false">
          <span class="action-icon"><img src="${ICONS.more}" alt="" loading="lazy" /></span>
        </button>
      </div>
    </div>
  </div>

  <div class="more-menu" data-more-menu data-open="false" aria-hidden="true">
    <button class="more-item" data-kind="refresh" type="button">
      <span class="action-icon"><img src="${ICONS.refresh}" alt="" loading="lazy" /></span>
      <span class="more-item-label">Refresh</span>
    </button>

    <a class="more-item" data-kind="settings" href="/pages/settings">
      <span class="action-icon"><img src="${ICONS.settings}" alt="" loading="lazy" /></span>
      <span class="more-item-label">Settings</span>
    </a>
    <button class="more-item" data-kind="logout" type="button">
      <span class="action-icon"><img src="${ICONS.logout}" alt="" loading="lazy" /></span>
      <span class="more-item-label">Log out</span>
    </button>
  </div>
`;

class SiteNavbar extends HTMLElement {
  static observedAttributes = ["current"];

  constructor() {
    super();
    this._resizeObserver = null;
    this._centerScrollObserver = null;
    this._centerScrollCleanup = null;
    this._boundUpdateHeight = this._updateHeight.bind(this);
    this._boundAction = this._handleAction.bind(this);
    this._boundDocClick = this._handleDocumentClick.bind(this);
    this._refreshCooldownTimer = null;
  }

  static REFRESH_COOLDOWN_MS = 10000;

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>${NAVBAR_STYLE}</style>${NAVBAR_TEMPLATE}`;
      this.shadowRoot.querySelector("[data-home-link]").addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = appendAuthParams("/pages/home");
      });
      this.shadowRoot.querySelectorAll("[data-route]").forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.href = appendAuthParams(item.getAttribute("href"));
        });
      });
      // One delegated handler for refresh / settings / logout / more, shared by
      // the inline buttons and the kebab menu (matched by data-kind).
      this.shadowRoot.querySelectorAll("[data-kind]").forEach((item) => {
        item.addEventListener("click", this._boundAction);
      });
      document.addEventListener("click", this._boundDocClick);
    }

    this._syncActiveState();
    this._observeHeight();
    this._setupCenterScroll();
    this._updateHeight();
  }

  _handleAction(event) {
    const kind = event.currentTarget?.dataset?.kind;
    if (!kind) return;
    event.preventDefault();
    switch (kind) {
      case "more":
        this._toggleMoreMenu();
        return;
      case "refresh":
        this._closeMoreMenu();
        this._handleRefresh();
        return;
      case "settings":
        this._closeMoreMenu();
        window.location.href = appendAuthParams("/pages/settings");
        return;
      case "chat":
        this._closeMoreMenu();
        window.location.href = appendAuthParams("/pages/chat");
        return;
      case "logout":
        this._closeMoreMenu();
        logout();
        return;
      default:
    }
  }

  _toggleMoreMenu() {
    const menu = this.shadowRoot?.querySelector("[data-more-menu]");
    const toggle = this.shadowRoot?.querySelector(".more-toggle");
    if (!menu) return;
    const open = menu.dataset.open !== "true";
    menu.dataset.open = open ? "true" : "false";
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    toggle?.setAttribute("aria-expanded", open ? "true" : "false");
  }

  _closeMoreMenu() {
    const menu = this.shadowRoot?.querySelector("[data-more-menu]");
    const toggle = this.shadowRoot?.querySelector(".more-toggle");
    if (!menu || menu.dataset.open !== "true") return;
    menu.dataset.open = "false";
    menu.setAttribute("aria-hidden", "true");
    toggle?.setAttribute("aria-expanded", "false");
  }

  // Close the kebab menu when clicking anywhere outside the navbar.
  _handleDocumentClick(event) {
    if (event.composedPath().includes(this)) return;
    this._closeMoreMenu();
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._boundDocClick);
    if (this._refreshCooldownTimer) {
      clearTimeout(this._refreshCooldownTimer);
      this._refreshCooldownTimer = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._centerScrollObserver) {
      this._centerScrollObserver.disconnect();
      this._centerScrollObserver = null;
    }
    if (this._centerScrollCleanup) {
      this._centerScrollCleanup();
      this._centerScrollCleanup = null;
    }
  }

  attributeChangedCallback() {
    this._syncActiveState();
  }

  _syncActiveState() {
    const current = this.getAttribute("current") || "home";
    this.shadowRoot?.querySelectorAll("[data-route]").forEach((item) => {
      item.dataset.active = String(item.dataset.route === current);
    });
  }

  _observeHeight() {
    if (this._resizeObserver) return;
    this._resizeObserver = new ResizeObserver(this._boundUpdateHeight);
    this._resizeObserver.observe(this);
  }

  _setupCenterScroll() {
    const root = this.shadowRoot;
    if (!root || this._centerScrollCleanup) return;

    const center = root.querySelector(".center");
    if (!center) return;

    const LABELS_HIDE_WIDTH = 760;

    const updateLabelsState = () => {
      const availableWidth = this.getBoundingClientRect().width;
      center.dataset.labels = availableWidth <= LABELS_HIDE_WIDTH ? "hidden" : "visible";
      this._updateHeight();
    };

    this._centerScrollObserver = new ResizeObserver(updateLabelsState);
    this._centerScrollObserver.observe(this);

    window.addEventListener("resize", updateLabelsState);
    updateLabelsState();

    this._centerScrollCleanup = () => {
      this._centerScrollObserver?.disconnect();
      this._centerScrollObserver = null;
      window.removeEventListener("resize", updateLabelsState);
    };
  }

  _updateHeight() {
    const height = Math.ceil(this.getBoundingClientRect().height || 72);
    document.documentElement.style.setProperty("--navbar-height", `${height}px`);
    document.body?.style.setProperty("--navbar-height", `${height}px`);
  }

  _handleRefresh() {
    // There can be two refresh controls (inline button + kebab menu item).
    const buttons = Array.from(this.shadowRoot?.querySelectorAll("[data-kind='refresh']") || []);
    const inline = buttons.find((b) => !b.classList.contains("more-item")) || buttons[0];
    if (inline) {
      if (inline.dataset.cooldown === "true") return;
      for (const b of buttons) {
        b.dataset.cooldown = "true";
        b.dataset.refreshing = "true";
        b.disabled = true;
        b.setAttribute("aria-disabled", "true");
      }
      if (this._refreshCooldownTimer) clearTimeout(this._refreshCooldownTimer);
      this._refreshCooldownTimer = setTimeout(() => {
        for (const b of buttons) {
          b.dataset.cooldown = "false";
          b.disabled = false;
          b.removeAttribute("aria-disabled");
        }
        this._refreshCooldownTimer = null;
      }, SiteNavbar.REFRESH_COOLDOWN_MS);
    }

    const pending = [];
    const detail = {
      current: this.getAttribute("current") || "home",
      waitUntil: (promise) => {
        if (promise) pending.push(Promise.resolve(promise));
      },
    };

    window.dispatchEvent(new CustomEvent("site-navbar:refresh", { detail }));
    document.dispatchEvent(new CustomEvent("site-navbar:refresh", { detail }));

    Promise.allSettled(pending).then(() => {
      for (const b of buttons) b.dataset.refreshing = "false";
    });
  }
}

if (!customElements.get("site-navbar")) {
  customElements.define("site-navbar", SiteNavbar);
}

// Load icons and replace placeholders
loadIcons().then(loadedIcons => {
  ICONS = loadedIcons;
  const placeholders = document.querySelectorAll('.icon-placeholder');
  placeholders.forEach(placeholder => {
    const iconName = placeholder.dataset.icon;
    if (ICONS[iconName]) {
      placeholder.innerHTML = `<img src="${ICONS[iconName]}" alt="" loading="lazy" />`;
    }
  });
});

// Load icons via fetch and inject as data URLs
async function loadNavbarIcons() {
  const placeholders = document.querySelectorAll('.icon-placeholder');
  
  for (const placeholder of placeholders) {
    const iconName = placeholder.dataset.icon;
    const iconPath = ICONS[iconName];
    
    if (iconPath) {
      try {
        const response = await fetch(iconPath);
        const svgContent = await response.text();
        const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
        placeholder.innerHTML = `<img src="${dataUrl}" alt="" loading="lazy" />`;
      } catch (error) {
        console.error(`Failed to load icon ${iconName}:`, error);
        placeholder.innerHTML = `<span style="font-size:20px">⚠️</span>`;
      }
    }
  }
}

// Load icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavbarIcons);
} else {
  loadNavbarIcons();
}
