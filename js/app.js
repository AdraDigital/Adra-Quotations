/**
 * Orquestación de la aplicación ADRA Quotation System.
 */
(function () {
  const state = {
    quotation: null,
    editingCatalog: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function toast(message, type = "info") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
    el.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-visible"), 2800);
  }

  function syncSummary() {
    if (!state.quotation) return;
    const summary = AdraCalc.summarize(state.quotation);
    state.quotation.deposit.percent = summary.depositPercent;
    state.quotation.deposit.amount = summary.depositAmount;

    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };

    setText("sum-initial-gross", AdraCalc.formatMoney(summary.initialGross, summary.currency));
    setText("sum-discount", AdraCalc.formatMoney(summary.discountAmount, summary.currency));
    setText("sum-tax", AdraCalc.formatMoney(summary.taxAmount, summary.currency));
    setText("sum-initial-total", AdraCalc.formatMoney(summary.initialTotal, summary.currency));
    setText("sum-deposit-percent", `${summary.depositPercent}%`);
    setText("sum-deposit-amount", AdraCalc.formatMoney(summary.depositAmount, summary.currency));
    setText("sum-balance", AdraCalc.formatMoney(summary.balance, summary.currency));
    setText("sum-recurring-annual", AdraCalc.formatMoney(summary.recurringAnnual, summary.currency));
    setText("sum-recurring-monthly", AdraCalc.formatMoney(summary.recurringMonthly, summary.currency));

    const depPercent = $("#deposit-percent");
    const depAmount = $("#deposit-amount");
    if (depPercent && document.activeElement !== depPercent) {
      depPercent.value = summary.depositPercent;
    }
    if (depAmount && document.activeElement !== depAmount) {
      depAmount.value = summary.depositAmount;
    }
  }

  function readFormIntoState() {
    if (!state.quotation) return;
    const q = state.quotation;
    q.issuedAt = $("#q-issued")?.value || q.issuedAt;
    q.validUntil = $("#q-valid")?.value || q.validUntil;
    q.currency = $("#q-currency")?.value || "GTQ";
    q.client.name = $("#client-name")?.value.trim() || "";
    q.client.company = $("#client-company")?.value.trim() || "";
    q.client.phone = $("#client-phone")?.value.trim() || "";
    q.client.email = $("#client-email")?.value.trim() || "";
    q.discount.type = $("#discount-type")?.value || "amount";
    q.discount.value = $("#discount-value")?.value ?? "";
    q.tax.enabled = Boolean($("#tax-enabled")?.checked);
    q.tax.percent = $("#tax-percent")?.value ?? "";
    q.terms = $("#q-terms")?.value || "";
    q.notes = $("#q-notes")?.value || "";

    q.hosting.enabled = Boolean($("#hosting-enabled")?.checked);
    q.hosting.provider = $("#hosting-provider")?.value.trim() || "";
    q.hosting.description = $("#hosting-description")?.value || "";
    q.hosting.annualPrice = $("#hosting-price")?.value ?? "";
    q.hosting.contractDate = $("#hosting-date")?.value || "";
    q.hosting.comments = $("#hosting-comments")?.value || "";

    q.domain.enabled = Boolean($("#domain-enabled")?.checked);
    q.domain.name = $("#domain-name")?.value.trim() || "";
    q.domain.description = $("#domain-description")?.value || "";
    q.domain.annualPrice = $("#domain-price")?.value ?? "";
    q.domain.periodYears = $("#domain-period")?.value || 1;
    q.domain.comments = $("#domain-comments")?.value || "";

    $$("#development-lines .line-item").forEach((row, index) => {
      const line = q.development[index];
      if (!line) return;
      line.name = row.querySelector('[data-field="name"]')?.value || "";
      line.description = row.querySelector('[data-field="description"]')?.value || "";
      line.quantity = row.querySelector('[data-field="quantity"]')?.value ?? 1;
      line.unitPrice = row.querySelector('[data-field="unitPrice"]')?.value ?? "";
      line.frequency = row.querySelector('[data-field="frequency"]')?.value || "once";
      line.comments = row.querySelector('[data-field="comments"]')?.value || "";
    });

    $$("#additional-lines .line-item").forEach((row, index) => {
      const line = q.additional[index];
      if (!line) return;
      line.name = row.querySelector('[data-field="name"]')?.value || "";
      line.description = row.querySelector('[data-field="description"]')?.value || "";
      line.quantity = row.querySelector('[data-field="quantity"]')?.value ?? 1;
      line.unitPrice = row.querySelector('[data-field="unitPrice"]')?.value ?? "";
      line.frequency = row.querySelector('[data-field="frequency"]')?.value || "once";
      line.comments = row.querySelector('[data-field="comments"]')?.value || "";
    });
  }

  function frequencyOptions(selected) {
    return Object.entries(AdraCalc.FREQUENCIES)
      .map(
        ([value, meta]) =>
          `<option value="${value}" ${value === selected ? "selected" : ""}>${meta.label}</option>`
      )
      .join("");
  }

  function renderLine(line, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const el = document.createElement("article");
    el.className = "line-item";
    el.dataset.id = line.id;
    el.innerHTML = `
      <div class="line-item__header">
        <div class="field grow">
          <label>Nombre del servicio</label>
          <input data-field="name" type="text" value="${escapeAttr(line.name)}" />
        </div>
        <button type="button" class="btn-ghost danger" data-remove-line="${containerId}" data-id="${line.id}">Eliminar</button>
      </div>
      <div class="field">
        <label>Descripción</label>
        <textarea data-field="description" rows="2">${escapeHtml(line.description || "")}</textarea>
      </div>
      <div class="form-grid form-grid--4">
        <div class="field">
          <label>Cantidad</label>
          <input data-field="quantity" type="number" min="0" step="1" value="${escapeAttr(line.quantity)}" />
        </div>
        <div class="field">
          <label>Precio unitario</label>
          <input data-field="unitPrice" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Ingresar precio" value="${line.unitPrice === "" || line.unitPrice == null ? "" : escapeAttr(line.unitPrice)}" />
        </div>
        <div class="field">
          <label>Frecuencia</label>
          <select data-field="frequency">${frequencyOptions(line.frequency || "once")}</select>
        </div>
        <div class="field">
          <label>Subtotal</label>
          <input type="text" class="is-readonly" readonly data-subtotal value="" />
        </div>
      </div>
      <div class="field">
        <label>Comentarios <span class="optional">(opcional)</span></label>
        <textarea data-field="comments" rows="2" placeholder="Notas visibles en el PDF si se completan">${escapeHtml(line.comments || "")}</textarea>
      </div>
    `;
    container.appendChild(el);
    updateLineSubtotal(el);
  }

  function updateLineSubtotal(row) {
    const qty = row.querySelector('[data-field="quantity"]')?.value;
    const price = row.querySelector('[data-field="unitPrice"]')?.value;
    const out = row.querySelector("[data-subtotal]");
    if (!out) return;
    if (price === "" || price == null) {
      out.value = "—";
      return;
    }
    const currency = state.quotation?.currency || "GTQ";
    out.value = AdraCalc.formatMoney(
      AdraCalc.lineSubtotal({ quantity: qty, unitPrice: price }),
      currency
    );
  }

  function renderEditor() {
    const q = state.quotation;
    if (!q) return;

    $("#editor-number").textContent = q.number || "Sin número";
    $("#editor-status").textContent = q.status === "draft" ? "BORRADOR" : "GUARDADA";
    $("#q-issued").value = q.issuedAt || "";
    $("#q-valid").value = q.validUntil || "";
    $("#q-currency").value = q.currency || "GTQ";
    $("#client-name").value = q.client.name || "";
    $("#client-company").value = q.client.company || "";
    $("#client-phone").value = q.client.phone || "";
    $("#client-email").value = q.client.email || "";

    $("#hosting-enabled").checked = Boolean(q.hosting?.enabled);
    $("#hosting-fields").hidden = !q.hosting?.enabled;
    $("#hosting-provider").value = q.hosting?.provider || "";
    $("#hosting-description").value = q.hosting?.description || "";
    $("#hosting-price").value =
      q.hosting?.annualPrice === "" || q.hosting?.annualPrice == null
        ? ""
        : q.hosting.annualPrice;
    $("#hosting-date").value = q.hosting?.contractDate || "";
    $("#hosting-comments").value = q.hosting?.comments || "";

    $("#domain-enabled").checked = Boolean(q.domain?.enabled);
    $("#domain-fields").hidden = !q.domain?.enabled;
    $("#domain-name").value = q.domain?.name || "";
    $("#domain-description").value = q.domain?.description || "";
    $("#domain-price").value =
      q.domain?.annualPrice === "" || q.domain?.annualPrice == null
        ? ""
        : q.domain.annualPrice;
    $("#domain-period").value = q.domain?.periodYears || 1;
    $("#domain-comments").value = q.domain?.comments || "";

    $("#discount-type").value = q.discount?.type || "amount";
    $("#discount-value").value = q.discount?.value ?? "";
    $("#tax-enabled").checked = Boolean(q.tax?.enabled);
    $("#tax-percent").value = q.tax?.percent ?? "";
    $("#tax-percent").disabled = !q.tax?.enabled;
    $("#deposit-percent").value = q.deposit?.percent ?? 0;
    $("#deposit-amount").value = q.deposit?.amount ?? "";
    $("#q-terms").value = q.terms || "";
    $("#q-notes").value = q.notes || "";

    const dev = $("#development-lines");
    const add = $("#additional-lines");
    dev.innerHTML = "";
    add.innerHTML = "";
    (q.development || []).forEach((line) => renderLine(line, "development-lines"));
    (q.additional || []).forEach((line) => renderLine(line, "additional-lines"));

    renderServicePicker();
    syncSummary();
  }

  function renderServicePicker() {
    const catalog = AdraCatalog.get();
    const root = $("#service-picker");
    if (!root) return;
    root.innerHTML = catalog.categories
      .map((category) => {
        const services = (category.services || [])
          .map(
            (service) => `
            <button type="button" class="service-option" data-add-service="${service.id}">
              <span class="service-option__name">${escapeHtml(service.name)}</span>
              <span class="service-option__desc">${escapeHtml(service.description || "")}</span>
            </button>`
          )
          .join("");
        return `
          <div class="picker-group">
            <h4>${escapeHtml(category.name)}</h4>
            <div class="picker-list">${services || "<p class='muted'>Sin servicios</p>"}</div>
          </div>`;
      })
      .join("");
  }

  function openNewQuotation() {
    state.quotation = AdraQuotations.createBlankQuotation();
    renderEditor();
    AdraNav.go("editor");
  }

  function openQuotation(id) {
    const found = AdraQuotations.get(id);
    if (!found) {
      toast("No se encontró la cotización.", "error");
      return;
    }
    state.quotation = JSON.parse(JSON.stringify(found));
    renderEditor();
    AdraNav.go("editor");
  }

  function renderHome() {
    const list = AdraQuotations.list();
    $("#stat-count").textContent = String(list.length);
    const initialSum = list.reduce((acc, item) => {
      return acc + AdraCalc.summarize(item).initialTotal;
    }, 0);
    const currency = AdraSettings.get().preferences.defaultCurrency || "GTQ";
    $("#stat-value").textContent = AdraCalc.formatMoney(initialSum, currency);
    $("#stat-drafts").textContent = String(
      list.filter((item) => item.status === "draft").length
    );
  }

  function renderList(term = "") {
    const items = AdraQuotations.search(term);
    const body = $("#quotation-table-body");
    if (!body) return;
    if (!items.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty">No hay cotizaciones guardadas.</td></tr>`;
      return;
    }
    body.innerHTML = items
      .map((item) => {
        const summary = AdraCalc.summarize(item);
        return `
          <tr>
            <td>${escapeHtml(item.number || "BORRADOR")}</td>
            <td>${escapeHtml(item.client?.name || "—")}</td>
            <td>${escapeHtml(item.client?.company || "—")}</td>
            <td>${escapeHtml(item.issuedAt || "—")}</td>
            <td>${AdraCalc.formatMoney(summary.initialTotal, summary.currency)}</td>
            <td class="table-actions">
              <button type="button" data-open-qt="${item.id}">Abrir</button>
              <button type="button" data-dup-qt="${item.id}">Duplicar</button>
              <button type="button" data-pdf-qt="${item.id}">PDF</button>
              <button type="button" class="danger" data-del-qt="${item.id}">Eliminar</button>
            </td>
          </tr>`;
      })
      .join("");
  }

  function renderCatalogAdmin() {
    const catalog = AdraCatalog.get();
    const root = $("#catalog-admin");
    if (!root) return;
    root.innerHTML = catalog.categories
      .map((category) => {
        const services = (category.services || [])
          .map(
            (service) => `
            <li class="catalog-service">
              <div>
                <strong>${escapeHtml(service.name)}</strong>
                <p>${escapeHtml(service.description || "")}</p>
                <span class="meta">${escapeHtml(AdraCalc.frequencyLabel(service.defaultFrequency))} · ${escapeHtml(service.quotationSegment)}</span>
              </div>
              <div class="row-actions">
                <button type="button" data-edit-service="${category.id}:${service.id}">Editar</button>
                <button type="button" class="danger" data-del-service="${category.id}:${service.id}">Eliminar</button>
              </div>
            </li>`
          )
          .join("");
        return `
          <section class="catalog-card">
            <header>
              <div>
                <span class="eyebrow">${escapeHtml(category.code || "")}</span>
                <h3>${escapeHtml(category.name)}</h3>
                <p>${escapeHtml(category.description || "")}</p>
              </div>
              <div class="row-actions">
                <button type="button" data-add-service-cat="${category.id}">+ Servicio</button>
                <button type="button" class="danger" data-del-cat="${category.id}">Eliminar categoría</button>
              </div>
            </header>
            <ul>${services || "<li class='muted'>Sin servicios en esta categoría.</li>"}</ul>
          </section>`;
      })
      .join("");
  }

  function renderSettingsForm() {
    const s = AdraSettings.get();
    $("#set-name").value = s.company.name || "";
    $("#set-email").value = s.company.email || "";
    $("#set-phone").value = s.company.phone || "";
    $("#set-website").value = s.company.website || "";
    $("#set-instagram").value = s.company.instagram || "";
    $("#set-address").value = s.company.address || "";
    $("#set-tagline").value = s.company.tagline || "";
    $("#set-logo").value = s.company.logoPath || "";
    $("#set-favicon-svg").value = s.branding.faviconSvg || "";
    $("#set-favicon-ico").value = s.branding.faviconIco || "";
    $("#set-app-name").value = s.branding.appName || "";
    $("#set-theme").value = s.branding.themeColor || "#000000";
    $("#set-currency").value = s.preferences.defaultCurrency || "GTQ";
    $("#set-validity").value = s.preferences.defaultValidityDays || 15;
    $("#set-deposit").value = s.preferences.defaultDepositPercent ?? 50;
    $("#set-terms").value = s.preferences.defaultTerms || "";
    $("#set-hosting-comment").value = s.preferences.hostingDefaultComment || "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function bindEditorEvents() {
    const form = $("#quotation-form");
    if (!form) return;

    form.addEventListener("input", (event) => {
      const target = event.target;
      if (!state.quotation) return;

      if (target.id === "deposit-percent") {
        state.quotation.deposit.lastEdited = "percent";
        state.quotation.deposit.percent = target.value;
      } else if (target.id === "deposit-amount") {
        state.quotation.deposit.lastEdited = "amount";
        state.quotation.deposit.amount = target.value;
      } else if (target.id === "tax-enabled") {
        $("#tax-percent").disabled = !target.checked;
      } else if (target.id === "hosting-enabled") {
        $("#hosting-fields").hidden = !target.checked;
      } else if (target.id === "domain-enabled") {
        $("#domain-fields").hidden = !target.checked;
      }

      if (target.closest(".line-item")) {
        updateLineSubtotal(target.closest(".line-item"));
      }

      readFormIntoState();
      syncSummary();
    });

    form.addEventListener("click", (event) => {
      const addBtn = event.target.closest("[data-add-service]");
      if (addBtn) {
        readFormIntoState();
        AdraQuotations.addServiceFromCatalog(
          state.quotation,
          addBtn.getAttribute("data-add-service")
        );
        renderEditor();
        toast("Servicio agregado. Completa el precio manualmente.");
        return;
      }

      const removeBtn = event.target.closest("[data-remove-line]");
      if (removeBtn) {
        const containerId = removeBtn.getAttribute("data-remove-line");
        const id = removeBtn.getAttribute("data-id");
        readFormIntoState();
        if (containerId === "development-lines") {
          state.quotation.development = state.quotation.development.filter(
            (line) => line.id !== id
          );
        } else {
          state.quotation.additional = state.quotation.additional.filter(
            (line) => line.id !== id
          );
        }
        renderEditor();
      }
    });

    $("#btn-add-custom-dev")?.addEventListener("click", () => {
      readFormIntoState();
      state.quotation.development.push(
        AdraQuotations.createEmptyLine({ frequency: "once", name: "Desarrollo personalizado" })
      );
      renderEditor();
    });

    $("#btn-add-custom-add")?.addEventListener("click", () => {
      readFormIntoState();
      state.quotation.additional.push(
        AdraQuotations.createEmptyLine({
          frequency: "once",
          name: "Servicio adicional",
        })
      );
      renderEditor();
    });

    $("#btn-save-draft")?.addEventListener("click", () => {
      readFormIntoState();
      state.quotation = AdraQuotations.saveDraft(state.quotation);
      renderEditor();
      renderHome();
      renderList($("#list-search")?.value || "");
      toast("Borrador guardado.", "success");
    });

    $("#btn-save-quotation")?.addEventListener("click", () => {
      readFormIntoState();
      if (!state.quotation.client.name.trim()) {
        toast("Indica el nombre del cliente.", "error");
        return;
      }
      state.quotation = AdraQuotations.save(state.quotation, { assignNumber: true });
      renderEditor();
      renderHome();
      renderList($("#list-search")?.value || "");
      toast("Cotización guardada.", "success");
    });

    $("#btn-export-pdf")?.addEventListener("click", async () => {
      readFormIntoState();
      try {
        await AdraPDF.generateQuotationPDF(state.quotation);
        toast("PDF generado.", "success");
      } catch (error) {
        console.error(error);
        toast("No se pudo generar el PDF.", "error");
      }
    });
  }

  function bindGlobalEvents() {
    $("#btn-new-quotation")?.addEventListener("click", openNewQuotation);
    $("#btn-new-quotation-home")?.addEventListener("click", openNewQuotation);

    $("#list-search")?.addEventListener("input", (event) => {
      renderList(event.target.value);
    });

    $("#quotation-table-body")?.addEventListener("click", async (event) => {
      const openId = event.target.closest("[data-open-qt]")?.getAttribute("data-open-qt");
      const dupId = event.target.closest("[data-dup-qt]")?.getAttribute("data-dup-qt");
      const pdfId = event.target.closest("[data-pdf-qt]")?.getAttribute("data-pdf-qt");
      const delId = event.target.closest("[data-del-qt]")?.getAttribute("data-del-qt");

      if (openId) openQuotation(openId);
      if (dupId) {
        const copy = AdraQuotations.duplicate(dupId);
        if (copy) {
          state.quotation = copy;
          renderEditor();
          AdraNav.go("editor");
          toast("Cotización duplicada.", "success");
        }
      }
      if (pdfId) {
        const item = AdraQuotations.get(pdfId);
        if (!item) return;
        try {
          await AdraPDF.generateQuotationPDF(item);
          toast("PDF generado.", "success");
        } catch (error) {
          console.error(error);
          toast("No se pudo generar el PDF.", "error");
        }
      }
      if (delId) {
        const item = AdraQuotations.get(delId);
        if (!item) return;
        const ok = confirm(`¿Eliminar ${item.number || "este borrador"}?`);
        if (!ok) return;
        AdraQuotations.remove(delId);
        renderList($("#list-search")?.value || "");
        renderHome();
        toast("Cotización eliminada.");
      }
    });

    $("#btn-add-category")?.addEventListener("click", () => {
      const name = prompt("Nombre de la categoría:");
      if (!name) return;
      const code = prompt("Código corto (ej. SEGNO):", "NUEVO") || "NUEVO";
      AdraCatalog.addCategory({ name, code });
      renderCatalogAdmin();
      renderServicePicker();
      toast("Categoría creada.", "success");
    });

    $("#btn-reset-catalog")?.addEventListener("click", () => {
      if (!confirm("¿Restablecer el catálogo predeterminado de ADRA?")) return;
      AdraCatalog.reset();
      renderCatalogAdmin();
      renderServicePicker();
      toast("Catálogo restablecido.", "success");
    });

    $("#catalog-admin")?.addEventListener("click", (event) => {
      const addCat = event.target.closest("[data-add-service-cat]")?.getAttribute("data-add-service-cat");
      const delCat = event.target.closest("[data-del-cat]")?.getAttribute("data-del-cat");
      const editSvc = event.target.closest("[data-edit-service]")?.getAttribute("data-edit-service");
      const delSvc = event.target.closest("[data-del-service]")?.getAttribute("data-del-service");

      if (addCat) {
        const name = prompt("Nombre del servicio:");
        if (!name) return;
        const description = prompt("Descripción:", "") || "";
        const frequency =
          prompt("Frecuencia (once, monthly, annual):", "once") || "once";
        const quotationSegment =
          prompt(
            "Segmento (development, hosting, domain, additional):",
            "additional"
          ) || "additional";
        AdraCatalog.addService(addCat, {
          name,
          description,
          defaultFrequency: frequency,
          quotationSegment,
        });
        renderCatalogAdmin();
        renderServicePicker();
        toast("Servicio agregado.", "success");
      }

      if (delCat) {
        if (!confirm("¿Eliminar esta categoría y sus servicios?")) return;
        AdraCatalog.deleteCategory(delCat);
        renderCatalogAdmin();
        renderServicePicker();
      }

      if (editSvc) {
        const [categoryId, serviceId] = editSvc.split(":");
        const found = AdraCatalog.findService(serviceId);
        if (!found) return;
        const name = prompt("Nombre:", found.service.name);
        if (name == null) return;
        const description = prompt("Descripción:", found.service.description || "");
        if (description == null) return;
        AdraCatalog.updateService(categoryId, serviceId, { name, description });
        renderCatalogAdmin();
        renderServicePicker();
        toast("Servicio actualizado.", "success");
      }

      if (delSvc) {
        const [categoryId, serviceId] = delSvc.split(":");
        if (!confirm("¿Eliminar este servicio del catálogo?")) return;
        AdraCatalog.deleteService(categoryId, serviceId);
        renderCatalogAdmin();
        renderServicePicker();
      }
    });

    $("#settings-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      AdraSettings.update({
        company: {
          name: $("#set-name").value.trim(),
          email: $("#set-email").value.trim(),
          phone: $("#set-phone").value.trim(),
          website: $("#set-website").value.trim(),
          instagram: $("#set-instagram").value.trim(),
          address: $("#set-address").value.trim(),
          tagline: $("#set-tagline").value.trim(),
          logoPath: $("#set-logo").value.trim() || "assets/logo/logo.png",
        },
        branding: {
          faviconSvg: $("#set-favicon-svg").value.trim() || "assets/favicon/favicon.svg",
          faviconIco: $("#set-favicon-ico").value.trim() || "assets/favicon/favicon.ico",
          appName: $("#set-app-name").value.trim() || "ADRA Quotations",
          themeColor: $("#set-theme").value.trim() || "#000000",
        },
        preferences: {
          defaultCurrency: $("#set-currency").value,
          defaultValidityDays: Number($("#set-validity").value) || 15,
          defaultDepositPercent: Number($("#set-deposit").value) || 0,
          defaultTerms: $("#set-terms").value,
          hostingDefaultComment: $("#set-hosting-comment").value,
        },
      });
      toast("Configuración guardada.", "success");
    });

    $("#btn-export-data")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(AdraStorage.exportAll(), null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `adra-quotations-backup-${AdraQuotations.todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $("#btn-import-data")?.addEventListener("click", () => {
      $("#import-file")?.click();
    });

    $("#import-file")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        AdraStorage.importAll(JSON.parse(text));
        AdraCatalog.ensure();
        AdraSettings.ensure();
        renderHome();
        renderList();
        renderCatalogAdmin();
        renderSettingsForm();
        toast("Respaldo importado.", "success");
      } catch (error) {
        console.error(error);
        toast("No se pudo importar el archivo.", "error");
      } finally {
        event.target.value = "";
      }
    });

    document.addEventListener("adra:navigate", (event) => {
      const view = event.detail.view;
      if (view === "home") renderHome();
      if (view === "list") renderList($("#list-search")?.value || "");
      if (view === "catalog") renderCatalogAdmin();
      if (view === "settings") renderSettingsForm();
      if (view === "editor" && !state.quotation) openNewQuotation();
    });
  }

  function boot() {
    AdraCatalog.ensure();
    const settings = AdraSettings.ensure();
    AdraSettings.applyDocumentMeta(settings);
    AdraNav.init();
    bindEditorEvents();
    bindGlobalEvents();
    renderHome();
    renderList();
    renderCatalogAdmin();
    renderSettingsForm();
    renderServicePicker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
