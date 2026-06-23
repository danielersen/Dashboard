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
    width: min(100%, 1600px);
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
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
    gap: 10px;
    padding: 4px 8px;
    border-color: transparent;
    background: transparent;
    flex-shrink: 0;
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
    width: 30px;
    height: 30px;
    border-radius: 4px;
    object-fit: cover;
    object-position: center;
    display: block;
    transform: scale(1.18);
    transform-origin: center;
  }

  .brand-text {
    display: grid;
    gap: 2px;
    line-height: 1.05;
  }

  .brand-text strong {
    font-size: 0.95rem;
    letter-spacing: 0;
  }

  .brand-text span {
    color: rgba(237, 245, 242, 0.65);
    font-size: 0.74rem;
  }

  .center {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .center::-webkit-scrollbar {
    display: none;
  }

  .feature-list {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    gap: 8px;
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
    width: 20px;
    height: 20px;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    overflow: hidden;
  }

  .feature-icon svg,
  .action-icon svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  .feature span,
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
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .action,
  .quick {
    min-width: 0;
    min-height: 0;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(237, 245, 242, 0.82);
  }

  .action[aria-label] {
    position: relative;
  }

  .action-label {
    display: none;
  }

  @media (max-width: 640px) {
    :host {
      inset: 8px 10px auto 10px;
    }

    .bar {
      min-height: 48px;
      padding: 6px 10px;
      border-radius: 16px;
    }

    .brand-text span,
    .feature span {
      display: none;
    }

    .feature em {
      display: none;
    }

    .feature {
      padding: 8px 12px;
    }

    .brand {
      padding-right: 12px;
    }
  }
`;

const NAVBAR_TEMPLATE = `
  <div class="bar">
    <div class="inner">
      <a class="brand" data-home-link href="/pages/home" aria-label="Aller à l'accueil">
        <span class="brand-icon-wrap">
          <img class="brand-icon" src="/assets/icons/websitelogo.jpeg" alt="">
        </span>
        <span class="brand-text">
          <span>Dashboard</span>
        </span>
      </a>

      <div class="center" role="navigation" aria-label="Navigation des features">
        <div class="feature-list">
          ${NAV_ITEMS.map((item) => `
            <a class="feature" data-route="${item.slug}" href="${item.href}">
              <span class="feature-icon">${iconFor(item.icon)}</span>
              <span>${item.label}</span>
            </a>
          `).join("")}
        </div>
      </div>

      <div class="right">
        <button class="quick" data-kind="refresh" type="button" aria-label="Rafraîchir la page">
          <span class="action-icon">${ICONS.refresh}</span>
        </button>
        <a class="quick" data-kind="settings" href="/pages/settings" aria-label="Ouvrir les paramètres">
          <span class="action-icon">${ICONS.settings}</span>
        </a>
      </div>
    </div>
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
    this._boundRefresh = this._handleRefresh.bind(this);
    this._boundUpdateHeight = this._updateHeight.bind(this);
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>${NAVBAR_STYLE}</style>${NAVBAR_TEMPLATE}`;
      this.shadowRoot.querySelector("[data-kind='refresh']").addEventListener("click", this._boundRefresh);
      this.shadowRoot.querySelector("[data-home-link]").addEventListener("click", (event) => {
        event.preventDefault();
        window.location.href = "/pages/home";
      });
      this.shadowRoot.querySelectorAll("[data-route]").forEach((item) => {
        item.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.href = item.getAttribute("href");
        });
      });
    }

    this._syncActiveState();
    this._observeHeight();
    this._updateHeight();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
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

  _updateHeight() {
    const height = Math.ceil(this.getBoundingClientRect().height || 72);
    document.documentElement.style.setProperty("--navbar-height", `${height}px`);
    document.body?.style.setProperty("--navbar-height", `${height}px`);
  }

  _handleRefresh() {
    window.dispatchEvent(new CustomEvent("site-navbar:refresh", {
      detail: { current: this.getAttribute("current") || "home" },
    }));
    document.dispatchEvent(new CustomEvent("site-navbar:refresh", {
      detail: { current: this.getAttribute("current") || "home" },
    }));
  }
}

if (!customElements.get("site-navbar")) {
  customElements.define("site-navbar", SiteNavbar);
}
