/**
 * Navegación por vistas (SPA) — solo apartados con funcionalidad real.
 */
(function (global) {
  const VIEWS = ["home", "editor", "list", "catalog", "settings"];

  const Navigation = {
    current: "home",

    init() {
      document.querySelectorAll("[data-nav]").forEach((el) => {
        el.addEventListener("click", (event) => {
          event.preventDefault();
          const view = el.getAttribute("data-nav");
          this.go(view);
        });
      });

      const hash = (location.hash || "#home").replace("#", "");
      this.go(VIEWS.includes(hash) ? hash : "home", { silent: true });

      window.addEventListener("hashchange", () => {
        const next = (location.hash || "#home").replace("#", "");
        if (VIEWS.includes(next) && next !== this.current) {
          this.go(next, { silent: true });
        }
      });
    },

    go(view, { silent = false } = {}) {
      if (!VIEWS.includes(view)) view = "home";
      this.current = view;

      document.querySelectorAll("section.view[data-view]").forEach((section) => {
        const active = section.getAttribute("data-view") === view;
        section.classList.toggle("is-active", active);
        section.hidden = !active;
      });

      document.querySelectorAll("[data-nav]").forEach((el) => {
        el.classList.toggle(
          "is-active",
          el.getAttribute("data-nav") === view
        );
      });

      // Solo clase en body (no data-view) para no interferir con section[data-view]
      document.body.dataset.adraView = view;
      document.body.hidden = false;

      if (!silent) {
        const nextHash = `#${view}`;
        if (location.hash !== nextHash) location.hash = nextHash;
      }

      document.dispatchEvent(
        new CustomEvent("adra:navigate", { detail: { view } })
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  };

  global.AdraNav = Navigation;
})(window);
