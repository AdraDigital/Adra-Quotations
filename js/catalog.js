/**
 * Catálogo de servicios sin precios predeterminados.
 * SEGNO / LEGAME / STABILE — seleccionables; el precio se define en la cotización.
 */
(function (global) {
  const DEFAULT_CATALOG = {
    version: 2,
    categories: [
      {
        id: "segno",
        code: "SEGNO",
        name: "SEGNO — DESARROLLO WEB",
        segment: "development",
        description: "Desarrollo web y sitios profesionales.",
        services: [
          {
            id: "segno-static",
            name: "Página estática informativa",
            description:
              "Sitio informativo de presentación clara, orientado a comunicar la identidad y la oferta del negocio.",
            defaultFrequency: "once",
            quotationSegment: "development",
          },
          {
            id: "segno-integrations",
            name: "Página estática con integraciones",
            description:
              "Página informativa con formularios, mapas, analítica u otras integraciones necesarias.",
            defaultFrequency: "once",
            quotationSegment: "development",
          },
          {
            id: "segno-interactive",
            name: "Página interactiva personalizada",
            description:
              "Desarrollo web a medida con interacciones, flujos o funciones específicas del proyecto.",
            defaultFrequency: "once",
            quotationSegment: "development",
          },
        ],
      },
      {
        id: "legame",
        code: "LEGAME",
        name: "LEGAME — SOLUCIONES DIGITALES",
        segment: "digital",
        description: "Herramientas digitales para presentar productos y servicios.",
        services: [
          {
            id: "legame-menu-static",
            name: "Menú digital estático",
            description:
              "Carta o menú digital accesible por enlace o código QR, fiel a la identidad del negocio.",
            defaultFrequency: "once",
            quotationSegment: "additional",
          },
          {
            id: "legame-menu-interactive",
            name: "Menú digital interactivo",
            description:
              "Menú con categorías, filtros y detalle de productos para una exploración ágil.",
            defaultFrequency: "once",
            quotationSegment: "additional",
          },
          {
            id: "legame-catalogs",
            name: "Catálogos digitales",
            description:
              "Catálogo en línea organizado, fácil de recorrer y compartir con clientes.",
            defaultFrequency: "once",
            quotationSegment: "additional",
          },
          {
            id: "legame-integrations",
            name: "Integraciones",
            description:
              "Conexión del sitio o herramienta con sistemas y servicios externos.",
            defaultFrequency: "once",
            quotationSegment: "additional",
          },
          {
            id: "legame-custom",
            name: "Funcionalidades personalizadas",
            description:
              "Desarrollo de funciones específicas según la operación del cliente.",
            defaultFrequency: "once",
            quotationSegment: "additional",
          },
        ],
      },
      {
        id: "stabile",
        code: "STABILE",
        name: "STABILE — INFRAESTRUCTURA Y SOPORTE",
        segment: "infrastructure",
        description: "Infraestructura, mantenimiento y soporte continuo.",
        services: [
          {
            id: "stabile-hosting",
            name: "Hosting",
            description: "Alojamiento web anual gestionado con el proveedor seleccionado.",
            defaultFrequency: "annual",
            quotationSegment: "hosting",
          },
          {
            id: "stabile-domain",
            name: "Dominio",
            description: "Registro y gestión anual del nombre de dominio.",
            defaultFrequency: "annual",
            quotationSegment: "domain",
          },
          {
            id: "stabile-maintenance",
            name: "Mantenimiento",
            description:
              "Actualizaciones, correcciones y cambios de contenido según el alcance acordado.",
            defaultFrequency: "monthly",
            quotationSegment: "additional",
          },
          {
            id: "stabile-seo",
            name: "SEO básico",
            description:
              "Configuración inicial de SEO técnico y de contenidos básicos para mejorar la visibilidad.",
            defaultFrequency: "once",
            quotationSegment: "additional",
          },
          {
            id: "stabile-support",
            name: "Soporte y otros servicios",
            description:
              "Soporte técnico u otros servicios complementarios definidos con el cliente.",
            defaultFrequency: "monthly",
            quotationSegment: "additional",
          },
        ],
      },
    ],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const Catalog = {
    defaults: DEFAULT_CATALOG,

    ensure() {
      let catalog = AdraStorage.getCatalog();
      if (!catalog || !Array.isArray(catalog.categories) || !catalog.categories.length) {
        catalog = clone(DEFAULT_CATALOG);
        AdraStorage.saveCatalog(catalog);
      }
      return catalog;
    },

    get() {
      return this.ensure();
    },

    save(catalog) {
      AdraStorage.saveCatalog(catalog);
      return catalog;
    },

    reset() {
      const catalog = clone(DEFAULT_CATALOG);
      AdraStorage.saveCatalog(catalog);
      return catalog;
    },

    findService(serviceId) {
      const catalog = this.get();
      for (const category of catalog.categories) {
        const service = (category.services || []).find((item) => item.id === serviceId);
        if (service) return { category, service };
      }
      return null;
    },

    addCategory(payload) {
      const catalog = this.get();
      const category = {
        id: AdraStorage.uid("cat"),
        code: (payload.code || "NUEVO").toUpperCase(),
        name: payload.name || "Nueva categoría",
        segment: payload.segment || "additional",
        description: payload.description || "",
        services: [],
      };
      catalog.categories.push(category);
      this.save(catalog);
      return category;
    },

    updateCategory(categoryId, patch) {
      const catalog = this.get();
      const category = catalog.categories.find((item) => item.id === categoryId);
      if (!category) return null;
      Object.assign(category, patch);
      this.save(catalog);
      return category;
    },

    deleteCategory(categoryId) {
      const catalog = this.get();
      catalog.categories = catalog.categories.filter((item) => item.id !== categoryId);
      this.save(catalog);
      return catalog;
    },

    addService(categoryId, payload) {
      const catalog = this.get();
      const category = catalog.categories.find((item) => item.id === categoryId);
      if (!category) return null;
      const service = {
        id: AdraStorage.uid("svc"),
        name: payload.name || "Nuevo servicio",
        description: payload.description || "",
        defaultFrequency: payload.defaultFrequency || "once",
        quotationSegment: payload.quotationSegment || category.segment || "additional",
      };
      category.services = category.services || [];
      category.services.push(service);
      this.save(catalog);
      return service;
    },

    updateService(categoryId, serviceId, patch) {
      const catalog = this.get();
      const category = catalog.categories.find((item) => item.id === categoryId);
      if (!category) return null;
      const service = (category.services || []).find((item) => item.id === serviceId);
      if (!service) return null;
      Object.assign(service, patch);
      this.save(catalog);
      return service;
    },

    deleteService(categoryId, serviceId) {
      const catalog = this.get();
      const category = catalog.categories.find((item) => item.id === categoryId);
      if (!category) return null;
      category.services = (category.services || []).filter((item) => item.id !== serviceId);
      this.save(catalog);
      return catalog;
    },
  };

  global.AdraCatalog = Catalog;
})(window);
