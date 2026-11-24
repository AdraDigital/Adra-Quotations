/**
 * Modelo y operaciones CRUD de cotizaciones.
 */
(function (global) {
  function todayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addDaysISO(iso, days) {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function createEmptyLine(partial) {
    return {
      id: AdraStorage.uid("line"),
      serviceId: partial?.serviceId || "",
      name: partial?.name || "",
      description: partial?.description || "",
      quantity: partial?.quantity != null ? partial.quantity : 1,
      unitPrice: partial?.unitPrice != null ? partial.unitPrice : "",
      frequency: partial?.frequency || "once",
      comments: partial?.comments || "",
    };
  }

  function createBlankQuotation() {
    const settings = AdraSettings.get();
    const issuedAt = todayISO();
    const validity = settings.preferences.defaultValidityDays || 15;
    return {
      id: AdraStorage.uid("qt"),
      number: "",
      status: "draft",
      issuedAt,
      validUntil: addDaysISO(issuedAt, validity),
      currency: settings.preferences.defaultCurrency || "GTQ",
      client: {
        name: "",
        company: "",
        phone: "",
        email: "",
      },
      development: [],
      hosting: {
        enabled: false,
        id: AdraStorage.uid("host"),
        provider: "",
        description: "",
        annualPrice: "",
        contractDate: "",
        comments: settings.preferences.hostingDefaultComment || "",
      },
      domain: {
        enabled: false,
        id: AdraStorage.uid("dom"),
        name: "",
        description: "",
        annualPrice: "",
        periodYears: 1,
        comments: "",
      },
      additional: [],
      discount: { type: "amount", value: "" },
      tax: { enabled: false, percent: "" },
      deposit: {
        percent: settings.preferences.defaultDepositPercent ?? 50,
        amount: "",
        lastEdited: "percent",
      },
      terms: settings.preferences.defaultTerms || "",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const Quotations = {
    todayISO,
    addDaysISO,
    createEmptyLine,
    createBlankQuotation,

    list() {
      return AdraStorage.getQuotations().slice().sort((a, b) => {
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
    },

    get(id) {
      return AdraStorage.getQuotation(id);
    },

    save(quotation, { assignNumber = true } = {}) {
      const copy = JSON.parse(JSON.stringify(quotation));
      copy.updatedAt = new Date().toISOString();
      if (assignNumber && !copy.number) {
        copy.number = AdraStorage.nextQuotationNumber();
      }
      if (copy.status === "draft" && assignNumber) {
        copy.status = "saved";
      }
      AdraStorage.upsertQuotation(copy);
      return copy;
    },

    saveDraft(quotation) {
      const copy = JSON.parse(JSON.stringify(quotation));
      copy.status = "draft";
      copy.updatedAt = new Date().toISOString();
      if (!copy.number) copy.number = "BORRADOR";
      AdraStorage.upsertQuotation(copy);
      return copy;
    },

    duplicate(id) {
      const source = this.get(id);
      if (!source) return null;
      const copy = JSON.parse(JSON.stringify(source));
      copy.id = AdraStorage.uid("qt");
      copy.number = "";
      copy.status = "draft";
      copy.issuedAt = todayISO();
      const settings = AdraSettings.get();
      copy.validUntil = addDaysISO(
        copy.issuedAt,
        settings.preferences.defaultValidityDays || 15
      );
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      AdraStorage.upsertQuotation(copy);
      return copy;
    },

    remove(id) {
      return AdraStorage.deleteQuotation(id);
    },

    search(term) {
      const q = String(term || "")
        .toLowerCase()
        .trim();
      const list = this.list();
      if (!q) return list;
      return list.filter((item) => {
        const hay = [
          item.number,
          item.client?.name,
          item.client?.company,
          item.client?.email,
          item.status,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    },

    addServiceFromCatalog(quotation, serviceId) {
      const found = AdraCatalog.findService(serviceId);
      if (!found) return quotation;
      const { service } = found;
      const segment = service.quotationSegment || "additional";
      const line = createEmptyLine({
        serviceId: service.id,
        name: service.name,
        description: service.description,
        frequency: service.defaultFrequency || "once",
        unitPrice: "",
        quantity: 1,
      });

      if (segment === "development") {
        quotation.development = quotation.development || [];
        quotation.development.push(line);
      } else if (segment === "hosting") {
        quotation.hosting = {
          ...quotation.hosting,
          enabled: true,
          provider: quotation.hosting?.provider || "",
          description: service.description,
          annualPrice: "",
          comments:
            quotation.hosting?.comments ||
            AdraSettings.get().preferences.hostingDefaultComment ||
            "",
        };
      } else if (segment === "domain") {
        quotation.domain = {
          ...quotation.domain,
          enabled: true,
          description: service.description,
          annualPrice: "",
        };
      } else {
        quotation.additional = quotation.additional || [];
        quotation.additional.push(line);
      }
      return quotation;
    },
  };

  global.AdraQuotations = Quotations;
})(window);
