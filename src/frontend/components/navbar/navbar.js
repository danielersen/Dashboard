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
      <path d="M7 7h4V3L6 8l5 5V9H7a4 4 0 0 0 0 8h2v2H7a6 6 0 0 1 0-12zm10 0h-2V5h2a6 6 0 0 1 0 12h-4v4l-5-5 5-5v4h4a4 4 0 0 0 0-8z"></path>
    </svg>
  `,
};

const NAVBAR_STYLE = `
  :host {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 1200;
    display: block;
    color: #edf5f2;
  }

  .bar {
    min-height: 80px;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background:
      linear-gradient(135deg, rgba(8, 14, 14, 0.88), rgba(11, 20, 21, 0.82)),
      rgba(8, 14, 14, 0.96);
    backdrop-filter: blur(18px);
    box-shadow: 0 22px 60px rgba(0, 0, 0, 0.28);
  }

  .inner {
    width: min(100%, 1600px);
    margin: 0 auto;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
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
    gap: 12px;
    padding: 10px 14px 10px 10px;
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .brand:hover,
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
    width: 34px;
    height: 34px;
    border-radius: 10px;
    object-fit: cover;
    display: block;
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
    min-width: 0;
    display: flex;
    justify-content: center;
  }

  .feature-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .feature {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(237, 245, 242, 0.82);
  }

  .feature[data-active="true"] {
    background: rgba(82, 214, 168, 0.14);
    border-color: rgba(82, 214, 168, 0.28);
    color: #f4fbf8;
  }

  .feature-icon,
  .action-icon {
    width: 18px;
    height: 18px;
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
  }

  .feature-icon svg,
  .action-icon svg {
    width: 18px;
    height: 18px;
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
  }

  .action,
  .quick {
    min-width: 44px;
    min-height: 44px;
    display: inline-grid;
    place-items: center;
    padding: 0 12px;
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .action[aria-label] {
    position: relative;
  }

  .action-label {
    display: none;
  }

  .quick {
    gap: 10px;
  }

  .quick[data-kind="refresh"] {
    color: #89f0c4;
  }

  @media (max-width: 1180px) {
    .inner {
      grid-template-columns: 1fr;
    }

    .center {
      justify-content: flex-start;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }

    .center::-webkit-scrollbar {
      display: none;
    }

    .feature-list {
      justify-content: flex-start;
      flex-wrap: nowrap;
    }

    .right {
      justify-content: flex-end;
    }
  }

  @media (max-width: 640px) {
    .bar {
      min-height: 74px;
      padding: 12px 12px 13px;
    }

    .brand-text span,
    .feature span {
      display: none;
    }

    .feature em {
      display: none;
    }

    .feature {
      padding: 10px 12px;
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
        <img class="brand-icon" src="/assets/icons/websitelogo.jpeg" alt="">
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
        <a class="quick" data-kind="settings" href="/pages/settings" aria-label="Ouvrir les paramètres">
          <span class="action-icon">${ICONS.settings}</span>
        </a>
        <button class="quick" data-kind="refresh" type="button" aria-label="Rafraîchir la page">
          <span class="action-icon">${ICONS.refresh}</span>
        </button>
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
    const height = Math.ceil(this.getBoundingClientRect().height || 80);
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
