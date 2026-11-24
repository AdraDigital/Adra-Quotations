/**
 * Persistencia local — cotizaciones, catálogo y configuración.
 * Claves centralizadas para facilitar respaldo y migración.
 */
(function (global) {
  const KEYS = {
    quotations: "adra.quotations.v2",
    catalog: "adra.catalog.v2",
    settings: "adra.settings.v2",
    sequence: "adra.quotation.sequence.v2",
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.error("ADRA storage read error:", key, error);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("ADRA storage write error:", key, error);
      return false;
    }
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  const Storage = {
    keys: KEYS,
    uid,

    getQuotations() {
      return read(KEYS.quotations, []);
    },

    saveQuotations(list) {
      return write(KEYS.quotations, list);
    },

    getQuotation(id) {
      return this.getQuotations().find((item) => item.id === id) || null;
    },

    upsertQuotation(quotation) {
      const list = this.getQuotations();
      const index = list.findIndex((item) => item.id === quotation.id);
      if (index >= 0) list[index] = quotation;
      else list.unshift(quotation);
      this.saveQuotations(list);
      return quotation;
    },

    deleteQuotation(id) {
      const list = this.getQuotations().filter((item) => item.id !== id);
      this.saveQuotations(list);
      return list;
    },

    nextQuotationNumber() {
      const year = new Date().getFullYear();
      const seq = Number(localStorage.getItem(KEYS.sequence) || 0) + 1;
      localStorage.setItem(KEYS.sequence, String(seq));
      return `ADRA-${year}-${String(seq).padStart(4, "0")}`;
    },

    getCatalog() {
      return read(KEYS.catalog, null);
    },

    saveCatalog(catalog) {
      return write(KEYS.catalog, catalog);
    },

    getSettings() {
      return read(KEYS.settings, null);
    },

    saveSettings(settings) {
      return write(KEYS.settings, settings);
    },

    exportAll() {
      return {
        version: 2,
        exportedAt: new Date().toISOString(),
        quotations: this.getQuotations(),
        catalog: this.getCatalog(),
        settings: this.getSettings(),
        sequence: Number(localStorage.getItem(KEYS.sequence) || 0),
      };
    },

    importAll(payload) {
      if (!payload || typeof payload !== "object") {
        throw new Error("Archivo de respaldo inválido.");
      }
      if (payload.quotations) this.saveQuotations(payload.quotations);
      if (payload.catalog) this.saveCatalog(payload.catalog);
      if (payload.settings) this.saveSettings(payload.settings);
      if (payload.sequence != null) {
        localStorage.setItem(KEYS.sequence, String(payload.sequence));
      }
      return true;
    },
  };

  global.AdraStorage = Storage;
})(window);
