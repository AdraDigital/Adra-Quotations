/**
 * Configuración de ADRA Digital, preferencias y rutas de marca.
 */
(function (global) {
  const DEFAULT_SETTINGS = {
    company: {
      name: "ADRA Digital",
      legalName: "ADRA Digital",
      tagline: "Digital, con propósito.",
      email: "adragcz@gmail.com",
      phone: "",
      website: "https://adradigital.com",
      instagram: "@adra.digital",
      address: "Guatemala",
      logoPath: "assets/logo/logo.png",
    },
    branding: {
      faviconSvg: "assets/favicon/favicon.svg",
      faviconIco: "assets/favicon/favicon.ico",
      appleTouchIcon: "assets/logo/apple-touch-icon.png",
      themeColor: "#000000",
      appName: "ADRA Quotations",
    },
    preferences: {
      defaultCurrency: "GTQ",
      defaultValidityDays: 15,
      defaultDepositPercent: 50,
      defaultTerms:
        "Esta cotización es válida por el periodo indicado. Los precios de desarrollo corresponden a pago único. Hosting y dominio se renuevan de forma anual según las tarifas vigentes del proveedor. El anticipo se calcula sobre la inversión inicial y no incluye renovaciones futuras.",
      hostingDefaultComment:
        "El precio de renovación puede variar a partir del tercer o cuarto año, dependiendo de las tarifas y condiciones vigentes del proveedor.",
    },
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const Settings = {
    defaults: DEFAULT_SETTINGS,

    ensure() {
      let settings = AdraStorage.getSettings();
      if (!settings) {
        settings = clone(DEFAULT_SETTINGS);
        AdraStorage.saveSettings(settings);
      } else {
        settings = {
          company: { ...DEFAULT_SETTINGS.company, ...(settings.company || {}) },
          branding: {
            ...DEFAULT_SETTINGS.branding,
            ...(settings.branding || {}),
          },
          preferences: {
            ...DEFAULT_SETTINGS.preferences,
            ...(settings.preferences || {}),
          },
        };
      }
      return settings;
    },

    get() {
      return this.ensure();
    },

    save(settings) {
      AdraStorage.saveSettings(settings);
      this.applyDocumentMeta(settings);
      return settings;
    },

    update(partial) {
      const current = this.get();
      const next = {
        company: { ...current.company, ...(partial.company || {}) },
        branding: { ...current.branding, ...(partial.branding || {}) },
        preferences: {
          ...current.preferences,
          ...(partial.preferences || {}),
        },
      };
      return this.save(next);
    },

    applyDocumentMeta(settings) {
      const cfg = settings || this.get();
      const appName = cfg.branding.appName || "ADRA Quotations";
      document.title = `${appName} · ADRA Digital`;

      let theme = document.querySelector('meta[name="theme-color"]');
      if (!theme) {
        theme = document.createElement("meta");
        theme.setAttribute("name", "theme-color");
        document.head.appendChild(theme);
      }
      theme.setAttribute("content", cfg.branding.themeColor || "#000000");

      let appMeta = document.querySelector('meta[name="application-name"]');
      if (!appMeta) {
        appMeta = document.createElement("meta");
        appMeta.setAttribute("name", "application-name");
        document.head.appendChild(appMeta);
      }
      appMeta.setAttribute("content", appName);

      const logoEls = document.querySelectorAll("[data-adra-logo]");
      logoEls.forEach((el) => {
        if (el.tagName === "IMG") el.src = cfg.company.logoPath;
      });

      const nameEls = document.querySelectorAll("[data-adra-company-name]");
      nameEls.forEach((el) => {
        el.textContent = cfg.company.name;
      });
    },
  };

  global.AdraSettings = Settings;
})(window);
