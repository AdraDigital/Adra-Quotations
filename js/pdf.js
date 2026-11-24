/**
 * Generación de PDF A4 vertical con identidad ADRA.
 * Usa jsPDF desde CDN (sin procesos de compilación).
 */
(function (global) {
  function ensureJsPdf() {
    if (global.jspdf?.jsPDF) return Promise.resolve(global.jspdf.jsPDF);
    if (global.jsPDF) return Promise.resolve(global.jsPDF);

    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-adra-jspdf]");
      if (existing) {
        const ready = global.jspdf?.jsPDF || global.jsPDF;
        if (ready) {
          resolve(ready);
          return;
        }
        existing.addEventListener("load", () => {
          resolve(global.jspdf?.jsPDF || global.jsPDF);
        });
        existing.addEventListener("error", () =>
          reject(new Error("No se pudo cargar jsPDF."))
        );
        return;
      }
      const candidates = [
        "js/vendor/jspdf.umd.min.js",
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js",
        "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js",
      ];

      const tryLoad = (index) => {
        if (index >= candidates.length) {
          reject(new Error("No se pudo cargar jsPDF."));
          return;
        }
        const script = document.createElement("script");
        script.src = candidates[index];
        script.async = true;
        script.dataset.adraJspdf = "1";
        script.onload = () => {
          const ctor = global.jspdf?.jsPDF || global.jsPDF;
          if (ctor) resolve(ctor);
          else tryLoad(index + 1);
        };
        script.onerror = () => {
          script.remove();
          tryLoad(index + 1);
        };
        document.head.appendChild(script);
      };

      tryLoad(0);
    });
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = Math.min(img.naturalWidth || 512, 512);
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL("image/png"));
        } catch (error) {
          console.warn("No se pudo incrustar el logo en el PDF.", error);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function generateQuotationPDF(quotation) {
    const JsPDF = await ensureJsPdf();
    if (!JsPDF) throw new Error("jsPDF no disponible.");

    const settings = AdraSettings.get();
    const summary = AdraCalc.summarize(quotation);
    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = 210;
    const pageH = 297;
    const margin = 18;
    const contentW = pageW - margin * 2;
    const black = [0, 0, 0];
    const white = [255, 255, 255];
    const gray = [120, 120, 120];
    const line = [220, 220, 220];

    let y = margin;
    const logoData = await loadImage(settings.company.logoPath);

    function ensureSpace(needed) {
      if (y + needed < pageH - 18) return;
      pdf.addPage();
      y = margin;
      drawFooter();
    }

    function hr() {
      pdf.setDrawColor(...line);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;
    }

    function drawFooter() {
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i += 1) {
        pdf.setPage(i);
        pdf.setDrawColor(...line);
        pdf.line(margin, pageH - 14, pageW - margin, pageH - 14);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...gray);
        pdf.text(settings.company.name || "ADRA Digital", margin, pageH - 8);
        pdf.text(
          `Página ${i} · ${quotation.number || "BORRADOR"}`,
          pageW - margin,
          pageH - 8,
          { align: "right" }
        );
      }
      pdf.setPage(pageCount);
    }

    function sectionTitle(number, title) {
      ensureSpace(16);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...gray);
      pdf.text(number, margin, y);
      pdf.setTextColor(...black);
      pdf.setFontSize(11);
      pdf.text(title, margin + 12, y);
      y += 7;
      hr();
    }

    function labeled(label, value, x, width) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...gray);
      pdf.text(String(label).toUpperCase(), x, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      const lines = pdf.splitTextToSize(String(value || "—"), width);
      pdf.text(lines, x, y + 5);
      return lines.length;
    }

    function renderLineItem(item) {
      ensureSpace(28);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text(item.name || "Concepto", margin, y);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(...gray);
      pdf.text(AdraCalc.frequencyLabel(item.frequency), pageW - margin, y, {
        align: "right",
      });
      y += 5;

      if (item.description) {
        const desc = pdf.splitTextToSize(item.description, contentW);
        pdf.setFontSize(9);
        pdf.setTextColor(...black);
        pdf.text(desc, margin, y);
        y += desc.length * 4.2 + 2;
      }

      const qty = AdraCalc.toNumber(item.quantity) || 0;
      const price =
        item.unitPrice === "" || item.unitPrice == null
          ? "—"
          : AdraCalc.formatMoney(item.unitPrice, summary.currency);
      const sub =
        item.unitPrice === "" || item.unitPrice == null
          ? "—"
          : AdraCalc.formatMoney(item.subtotal, summary.currency);

      pdf.setFontSize(8);
      pdf.setTextColor(...gray);
      pdf.text(`Cantidad: ${qty}`, margin, y);
      pdf.text(`P. unitario: ${price}`, margin + 45, y);
      pdf.setTextColor(...black);
      pdf.setFont("helvetica", "bold");
      pdf.text(`Subtotal: ${sub}`, pageW - margin, y, { align: "right" });
      y += 5;

      if (item.comments && String(item.comments).trim()) {
        const comments = pdf.splitTextToSize(
          `Comentario: ${item.comments}`,
          contentW
        );
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8);
        pdf.setTextColor(...gray);
        pdf.text(comments, margin, y);
        y += comments.length * 3.8 + 2;
      }

      y += 3;
      pdf.setDrawColor(...line);
      pdf.line(margin, y, pageW - margin, y);
      y += 6;
    }

    // Header
    pdf.setFillColor(...black);
    pdf.rect(0, 0, pageW, 42, "F");
    pdf.setTextColor(...white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("ADRA", margin, 20);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(180, 180, 180);
    pdf.text(
      (settings.company.tagline || "Digital, con propósito.").toUpperCase(),
      margin,
      27
    );

    if (logoData) {
      try {
        pdf.addImage(logoData, "PNG", pageW - margin - 16, 12, 16, 16);
      } catch (error) {
        /* logo opcional */
      }
    }

    pdf.setTextColor(...white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("COTIZACIÓN", pageW - margin - 20, 18, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(200, 200, 200);
    pdf.text(quotation.number || "BORRADOR", pageW - margin - 20, 24, {
      align: "right",
    });

    y = 52;

    // Company + client
    const leftH = labeled(
      "Emitido por",
      [
        settings.company.name,
        settings.company.email,
        settings.company.phone,
        settings.company.website,
      ]
        .filter(Boolean)
        .join("\n"),
      margin,
      80
    );

    const rightH = labeled(
      "Cliente",
      [
        quotation.client?.name,
        quotation.client?.company,
        quotation.client?.phone,
        quotation.client?.email,
      ]
        .filter(Boolean)
        .join("\n") || "—",
      margin + 95,
      80
    );

    y += Math.max(leftH, rightH) * 5 + 10;
    hr();

    pdf.setFontSize(8);
    pdf.setTextColor(...gray);
    pdf.text(`Emisión: ${quotation.issuedAt || "—"}`, margin, y);
    pdf.text(`Vigencia: ${quotation.validUntil || "—"}`, margin + 70, y);
    pdf.text(`Moneda: ${summary.currency}`, pageW - margin, y, {
      align: "right",
    });
    y += 10;

    // 01 Development
    if ((quotation.development || []).length) {
      sectionTitle("01", "DESARROLLO WEB");
      summary.initialLines
        .filter((line) => line.segment === "development")
        .forEach(renderLineItem);
    }

    // 02 Hosting
    if (quotation.hosting?.enabled) {
      sectionTitle("02", "HOSTING — PAGO ANUAL");
      const hostingLine = summary.recurringLines.find(
        (line) => line.segment === "hosting"
      );
      if (hostingLine) {
        ensureSpace(20);
        if (quotation.hosting.contractDate) {
          pdf.setFontSize(8);
          pdf.setTextColor(...gray);
          pdf.text(
            `Fecha de contratación: ${quotation.hosting.contractDate}`,
            margin,
            y
          );
          y += 5;
        }
        if (quotation.hosting.provider) {
          pdf.setFontSize(8);
          pdf.setTextColor(...gray);
          pdf.text(`Proveedor: ${quotation.hosting.provider}`, margin, y);
          y += 5;
        }
        renderLineItem({
          ...hostingLine,
          comments: quotation.hosting.comments || "",
        });
      }
    }

    // 03 Domain
    if (quotation.domain?.enabled) {
      sectionTitle("03", "DOMINIO — PAGO ANUAL");
      const domainLine = summary.recurringLines.find(
        (line) => line.segment === "domain"
      );
      if (domainLine) {
        ensureSpace(16);
        pdf.setFontSize(8);
        pdf.setTextColor(...gray);
        pdf.text(
          `Periodo: ${quotation.domain.periodYears || 1} año(s)`,
          margin,
          y
        );
        y += 5;
        renderLineItem({
          ...domainLine,
          comments: quotation.domain.comments || "",
        });
      }
    }

    // 04 Additional
    const additional = [
      ...summary.initialLines.filter((line) => line.segment === "additional"),
      ...summary.recurringLines.filter((line) => line.segment === "additional"),
    ];
    if (additional.length) {
      sectionTitle("04", "SERVICIOS ADICIONALES");
      additional.forEach(renderLineItem);
    }

    // Summary
    sectionTitle("05", "RESUMEN ECONÓMICO");
    ensureSpace(70);

    function moneyRow(label, value, bold = false) {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(bold ? 11 : 9);
      pdf.setTextColor(...black);
      pdf.text(label, margin, y);
      pdf.text(AdraCalc.formatMoney(value, summary.currency), pageW - margin, y, {
        align: "right",
      });
      y += bold ? 7 : 5.5;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...gray);
    pdf.text("INVERSIÓN INICIAL", margin, y);
    y += 6;
    moneyRow("Subtotal", summary.initialGross);
    if (summary.discountAmount > 0) {
      moneyRow("Descuentos", -summary.discountAmount);
    }
    if (summary.taxAmount > 0) {
      moneyRow(`Impuestos (${summary.taxPercent}%)`, summary.taxAmount);
    }
    moneyRow("Total inicial", summary.initialTotal, true);
    moneyRow(`Anticipo (${summary.depositPercent}%)`, summary.depositAmount);
    moneyRow("Saldo pendiente", summary.balance, true);

    y += 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...gray);
    pdf.text("COSTOS RECURRENTES", margin, y);
    y += 6;
    moneyRow("Anuales (hosting, dominio, etc.)", summary.recurringAnnual);
    moneyRow("Mensuales (mantenimiento, soporte, etc.)", summary.recurringMonthly);

    y += 4;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(...gray);
    const note = pdf.splitTextToSize(
      "Los costos recurrentes no se suman a la inversión inicial ni al anticipo. Se pagan según su periodicidad.",
      contentW
    );
    pdf.text(note, margin, y);
    y += note.length * 3.6 + 8;

    if (quotation.terms && String(quotation.terms).trim()) {
      sectionTitle("06", "CONDICIONES COMERCIALES");
      const terms = pdf.splitTextToSize(quotation.terms, contentW);
      ensureSpace(terms.length * 4 + 8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...black);
      pdf.text(terms, margin, y);
      y += terms.length * 4.2 + 6;
    }

    ensureSpace(24);
    hr();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...gray);
    pdf.text("Información de contacto", margin, y);
    y += 5;
    pdf.setTextColor(...black);
    pdf.setFontSize(9);
    const contact = [
      settings.company.email,
      settings.company.phone,
      settings.company.instagram,
      settings.company.website,
    ]
      .filter(Boolean)
      .join("  ·  ");
    pdf.text(contact || "ADRA Digital", margin, y);

    drawFooter();

    const filename = `${quotation.number || "cotizacion-adra"}.pdf`;
    pdf.save(filename);
    return filename;
  }

  global.AdraPDF = { generateQuotationPDF };
})(window);
