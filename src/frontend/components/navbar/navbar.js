import { appendAuthParams, logout } from "/lib/auth.js";

const NAV_ITEMS = [
  { slug: "home", label: "Home", href: "/pages/home", icon: "home" },
  { slug: "workspace", label: "Workspace", href: "/pages/workspace", icon: "grid" },
  { slug: "intelligence", label: "Intelligence", href: "/pages/artificial-intelligence", icon: "sparkles" },
  { slug: "files", label: "Files", href: "/pages/files", icon: "database" },
  { slug: "tools", label: "Tools", href: "/pages/tools", icon: "wrench" },
];
 
const ICONS = {
  home: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"></path>
    </svg>
  `,
  grid: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"></path>
    </svg>
  `,
  sparkles: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.7 4.6L18 8.3l-4.3 1.7L12 14l-1.7-4L6 8.3l4.3-1.7zM18.5 14l.9 2.4 2.6 1.1-2.6 1.1-.9 2.4-.9-2.4-2.6-1.1 2.6-1.1z"></path>
    </svg>
  `,
  database: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zm-8 5v4c0 1.7 3.6 3 8 3s8-1.3 8-3V8c-1.7 1.4-4.8 2-8 2s-6.3-.6-8-2zm0 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4c-1.7 1.4-4.8 2-8 2s-6.3-.6-8-2z"></path>
    </svg>
  `,
  wrench: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 7.5a5.8 5.8 0 0 1-7.4 5.6l-7.3 7.3a1 1 0 0 1-1.4 0l-1.3-1.3a1 1 0 0 1 0-1.4l7.3-7.3A5.8 5.8 0 0 1 17.5 3l-2.8 2.8 3.5 3.5L21 7.5z"></path>
    </svg>
  `,
  settings: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 2h4v3l2 .8 2.1-2.1 2.8 2.8-2.1 2.1.8 2H23v4h-3l-.8 2 2.1 2.1-2.8 2.8-2.1-2.1-2 .8V23h-4v-3l-2-.8-2.1 2.1-2.8-2.8 2.1-2.1-.8-2H1v-4h3l.8-2-2.1-2.1 2.8-2.8 2.1 2.1 2-.8zm2 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path>
    </svg>
  `,
  refresh: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08a5.99 5.99 0 0 1-5.65 4c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path>
    </svg>
  `,
  logout: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4v-2H6V5h4zm5.5 3.5-1.4 1.42L16.17 10H9v2h7.17l-2.07 2.08 1.4 1.42L20 11z"></path>
    </svg>
  `,
  more: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="2"></circle>
      <circle cx="12" cy="12" r="2"></circle>
      <circle cx="19" cy="12" r="2"></circle>
    </svg>
  `,
};

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
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
    object-position: center;
    display: block;
    transform: scale(1.2);
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
  }

  .center[data-overflow="true"] {
    gap: 5px;
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
    margin: 0 auto;
  }

  .center[data-overflow="true"] .feature-list {
    margin: 0;
  }

  .center-scrollbar {
    height: 0;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
    padding: 0 6px;
    transition:
      height 160ms ease,
      opacity 160ms ease;
  }

  .center[data-overflow="true"] .center-scrollbar {
    height: 12px;
    opacity: 1;
    pointer-events: auto;
  }

  .center-scrollbar-track {
    height: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    position: relative;
    cursor: pointer;
  }

  .center-scrollbar-thumb {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    min-width: 28px;
    border-radius: inherit;
    background: rgba(237, 245, 242, 0.42);
    cursor: grab;
    touch-action: none;
    transition: background 160ms ease;
  }

  .center-scrollbar-thumb:hover,
  .center-scrollbar-track:hover .center-scrollbar-thumb {
    background: rgba(237, 245, 242, 0.62);
  }

  .center-scrollbar-thumb:active {
    cursor: grabbing;
    background: rgba(237, 245, 242, 0.78);
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
    overflow: hidden;
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

  .center[data-labels="hidden"] .feature-label,
  .center[data-labels="hidden"] .feature em {
    display: none;
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

  .quick[data-refreshing="true"] .action-icon svg {
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

    .feature {
      padding: 8px 12px;
    }

    .brand {
      padding-right: 8px;
      padding-left: 0;
    }
  }
`;

const NAVBAR_TEMPLATE = `
  <div class="bar">
    <div class="inner">
      <a class="brand" data-home-link href="/pages/home" aria-label="Aller à l'accueil">
        <span class="brand-icon-wrap">
          <img class="brand-icon" src="/assets/icons/websitelogo.png" alt="Dashboard">
        </span>
      </a>

      <div class="center" role="navigation" aria-label="Navigation des features">
        <div class="center-scroll" data-center-scroll tabindex="0">
          <div class="feature-list">
            ${NAV_ITEMS.map((item) => `
              <a class="feature" data-route="${item.slug}" href="${item.href}">
                <span class="feature-icon">${iconFor(item.icon)}</span>
                <span class="feature-label">${item.label}</span>
              </a>
            `).join("")}
          </div>
        </div>
        <div class="center-scrollbar" data-center-scrollbar aria-hidden="true">
          <div class="center-scrollbar-track" data-scrollbar-track>
            <div class="center-scrollbar-thumb" data-scrollbar-thumb></div>
          </div>
        </div>
      </div>

      <div class="right">
        <button class="quick" data-kind="refresh" type="button" aria-label="Rafraîchir la page">
          <span class="action-icon">${ICONS.refresh}</span>
        </button>
        <a class="quick" data-kind="settings" href="/pages/settings" aria-label="Ouvrir les paramètres">
          <span class="action-icon">${ICONS.settings}</span>
        </a>
        <button class="quick" data-kind="logout" type="button" aria-label="Se déconnecter">
          <span class="action-icon">${ICONS.logout}</span>
        </button>
        <button class="quick more-toggle" data-kind="more" type="button" aria-label="Plus d'options" aria-expanded="false">
          <span class="action-icon">${ICONS.more}</span>
        </button>
      </div>
    </div>
  </div>

  <div class="more-menu" data-more-menu data-open="false" aria-hidden="true">
    <button class="more-item" data-kind="refresh" type="button">
      <span class="action-icon">${ICONS.refresh}</span>
      <span class="more-item-label">Refresh</span>
    </button>
    <a class="more-item" data-kind="settings" href="/pages/settings">
      <span class="action-icon">${ICONS.settings}</span>
      <span class="more-item-label">Settings</span>
    </a>
    <button class="more-item" data-kind="logout" type="button">
      <span class="action-icon">${ICONS.logout}</span>
      <span class="more-item-label">Log out</span>
    </button>
  </div>
`;

function iconFor(name) {
  return ICONS[name] || ICONS.grid;
}

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
    const scroller = root.querySelector("[data-center-scroll]");
    const scrollbar = root.querySelector("[data-center-scrollbar]");
    const track = root.querySelector("[data-scrollbar-track]");
    const thumb = root.querySelector("[data-scrollbar-thumb]");
    const featureList = scroller?.querySelector(".feature-list");

    if (!center || !scroller || !scrollbar || !track || !thumb || !featureList) return;

    let dragState = null;

    const updateOverflow = () => {
      const overflow = scroller.scrollWidth - scroller.clientWidth > 1;
      center.dataset.overflow = overflow ? "true" : "false";
      center.dataset.labels = overflow ? "hidden" : "visible";
      scrollbar.setAttribute("aria-hidden", overflow ? "false" : "true");

      if (!overflow) {
        scroller.scrollLeft = 0;
      }

      updateThumb();
      this._updateHeight();
    };

    const updateThumb = () => {
      if (center.dataset.overflow !== "true") {
        thumb.style.width = "0px";
        thumb.style.transform = "translateX(0px)";
        return;
      }

      const { scrollWidth, clientWidth, scrollLeft } = scroller;
      const trackWidth = track.clientWidth;
      const ratio = clientWidth / scrollWidth;
      const thumbWidth = Math.max(ratio * trackWidth, 28);
      const maxScroll = scrollWidth - clientWidth;
      const maxThumbOffset = Math.max(trackWidth - thumbWidth, 0);
      const thumbOffset = maxScroll > 0 ? (scrollLeft / maxScroll) * maxThumbOffset : 0;

      thumb.style.width = `${thumbWidth}px`;
      thumb.style.transform = `translateX(${thumbOffset}px)`;
    };

    const scrollFromThumbOffset = (thumbOffset) => {
      const trackWidth = track.clientWidth;
      const thumbWidth = thumb.offsetWidth;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const maxThumbOffset = Math.max(trackWidth - thumbWidth, 0);
      const ratio = maxThumbOffset > 0 ? thumbOffset / maxThumbOffset : 0;
      scroller.scrollLeft = ratio * maxScroll;
    };

    const onScrollerScroll = () => updateThumb();
    const onTrackPointerDown = (event) => {
      if (event.target === thumb) return;
      const rect = track.getBoundingClientRect();
      const clickOffset = event.clientX - rect.left - thumb.offsetWidth / 2;
      scrollFromThumbOffset(Math.max(0, Math.min(clickOffset, rect.width - thumb.offsetWidth)));
    };
    const onThumbPointerDown = (event) => {
      dragState = {
        startX: event.clientX,
        startOffset: thumb.getBoundingClientRect().left - track.getBoundingClientRect().left,
      };
      thumb.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onThumbPointerMove = (event) => {
      if (!dragState) return;
      const delta = event.clientX - dragState.startX;
      const nextOffset = dragState.startOffset + delta;
      const maxOffset = Math.max(track.clientWidth - thumb.offsetWidth, 0);
      scrollFromThumbOffset(Math.max(0, Math.min(nextOffset, maxOffset)));
    };
    const onThumbPointerUp = (event) => {
      if (!dragState) return;
      dragState = null;
      thumb.releasePointerCapture(event.pointerId);
    };

    scroller.addEventListener("scroll", onScrollerScroll, { passive: true });
    track.addEventListener("pointerdown", onTrackPointerDown);
    thumb.addEventListener("pointerdown", onThumbPointerDown);
    thumb.addEventListener("pointermove", onThumbPointerMove);
    thumb.addEventListener("pointerup", onThumbPointerUp);
    thumb.addEventListener("pointercancel", onThumbPointerUp);

    this._centerScrollObserver = new ResizeObserver(updateOverflow);
    this._centerScrollObserver.observe(scroller);
    this._centerScrollObserver.observe(featureList);

    updateOverflow();

    this._centerScrollCleanup = () => {
      scroller.removeEventListener("scroll", onScrollerScroll);
      track.removeEventListener("pointerdown", onTrackPointerDown);
      thumb.removeEventListener("pointerdown", onThumbPointerDown);
      thumb.removeEventListener("pointermove", onThumbPointerMove);
      thumb.removeEventListener("pointerup", onThumbPointerUp);
      thumb.removeEventListener("pointercancel", onThumbPointerUp);
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
