/**
 * Cálculos económicos: inversión inicial, recurrentes, anticipo y saldo.
 * El anticipo se aplica solo sobre la inversión inicial (pagos únicos).
 */
(function (global) {
  const FREQUENCIES = {
    once: { label: "Pago único", kind: "initial" },
    monthly: { label: "Mensual", kind: "recurring", period: "month" },
    annual: { label: "Anual", kind: "recurring", period: "year" },
  };

  function toNumber(value) {
    if (value === "" || value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function roundMoney(value) {
    return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
  }

  function lineSubtotal(line) {
    const qty = Math.max(0, toNumber(line.quantity));
    const price = toNumber(line.unitPrice);
    return roundMoney(qty * price);
  }

  function collectLines(quotation) {
    const lines = [];

    (quotation.development || []).forEach((item) => {
      lines.push({ ...item, segment: "development" });
    });

    if (quotation.hosting && quotation.hosting.enabled) {
      lines.push({
        id: quotation.hosting.id || "hosting",
        name: quotation.hosting.provider
          ? `Hosting — ${quotation.hosting.provider}`
          : "Hosting",
        description: quotation.hosting.description || "",
        quantity: 1,
        unitPrice: quotation.hosting.annualPrice,
        frequency: "annual",
        comments: quotation.hosting.comments || "",
        segment: "hosting",
        meta: {
          provider: quotation.hosting.provider || "",
          contractDate: quotation.hosting.contractDate || "",
        },
      });
    }

    if (quotation.domain && quotation.domain.enabled) {
      lines.push({
        id: quotation.domain.id || "domain",
        name: quotation.domain.name
          ? `Dominio — ${quotation.domain.name}`
          : "Dominio",
        description: quotation.domain.description || "",
        quantity: 1,
        unitPrice: quotation.domain.annualPrice,
        frequency: "annual",
        comments: quotation.domain.comments || "",
        segment: "domain",
        meta: {
          domainName: quotation.domain.name || "",
          periodYears: Math.max(1, toNumber(quotation.domain.periodYears) || 1),
        },
      });
    }

    (quotation.additional || []).forEach((item) => {
      lines.push({ ...item, segment: "additional" });
    });

    return lines;
  }

  function summarize(quotation) {
    const currency = quotation.currency === "USD" ? "USD" : "GTQ";
    const lines = collectLines(quotation).map((line) => ({
      ...line,
      unitPrice: line.unitPrice === "" || line.unitPrice == null ? "" : toNumber(line.unitPrice),
      quantity: Math.max(0, toNumber(line.quantity) || 0),
      subtotal: lineSubtotal(line),
      frequencyMeta: FREQUENCIES[line.frequency] || FREQUENCIES.once,
    }));

    const initialLines = lines.filter(
      (line) => (line.frequencyMeta.kind || "initial") === "initial"
    );
    const recurringLines = lines.filter(
      (line) => line.frequencyMeta.kind === "recurring"
    );

    const initialGross = roundMoney(
      initialLines.reduce((sum, line) => sum + line.subtotal, 0)
    );

    const discountType = quotation.discount?.type || "amount";
    const discountValue = toNumber(quotation.discount?.value);
    let discountAmount = 0;
    if (discountType === "percent") {
      discountAmount = roundMoney((initialGross * Math.min(100, Math.max(0, discountValue))) / 100);
    } else {
      discountAmount = roundMoney(Math.min(initialGross, Math.max(0, discountValue)));
    }

    const afterDiscount = roundMoney(Math.max(0, initialGross - discountAmount));

    const taxEnabled = Boolean(quotation.tax?.enabled);
    const taxPercent = Math.max(0, toNumber(quotation.tax?.percent));
    const taxAmount = taxEnabled
      ? roundMoney((afterDiscount * taxPercent) / 100)
      : 0;

    const initialTotal = roundMoney(afterDiscount + taxAmount);

    let depositPercent = toNumber(quotation.deposit?.percent);
    let depositAmount = toNumber(quotation.deposit?.amount);

    if (quotation.deposit?.lastEdited === "amount") {
      depositAmount = roundMoney(Math.min(initialTotal, Math.max(0, depositAmount)));
      depositPercent = initialTotal > 0
        ? roundMoney((depositAmount / initialTotal) * 100)
        : 0;
    } else {
      depositPercent = Math.min(100, Math.max(0, depositPercent));
      depositAmount = roundMoney((initialTotal * depositPercent) / 100);
    }

    if (depositAmount > initialTotal) depositAmount = initialTotal;
    if (depositPercent > 100) depositPercent = 100;
    if (depositPercent < 0) depositPercent = 0;

    const balance = roundMoney(Math.max(0, initialTotal - depositAmount));

    const recurringAnnual = roundMoney(
      recurringLines
        .filter((line) => line.frequency === "annual")
        .reduce((sum, line) => sum + line.subtotal, 0)
    );
    const recurringMonthly = roundMoney(
      recurringLines
        .filter((line) => line.frequency === "monthly")
        .reduce((sum, line) => sum + line.subtotal, 0)
    );

    return {
      currency,
      lines,
      initialLines,
      recurringLines,
      initialGross,
      discountAmount,
      afterDiscount,
      taxAmount,
      taxPercent: taxEnabled ? taxPercent : 0,
      initialTotal,
      depositPercent,
      depositAmount,
      balance,
      recurringAnnual,
      recurringMonthly,
      recurringTotalLabel: {
        annual: recurringAnnual,
        monthly: recurringMonthly,
      },
    };
  }

  function formatMoney(value, currency) {
    const code = currency === "USD" ? "USD" : "GTQ";
    const amount = toNumber(value);
    try {
      return amount.toLocaleString("es-GT", {
        style: "currency",
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      const symbol = code === "USD" ? "$" : "Q";
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  function frequencyLabel(frequency) {
    return (FREQUENCIES[frequency] || FREQUENCIES.once).label;
  }

  global.AdraCalc = {
    FREQUENCIES,
    toNumber,
    roundMoney,
    lineSubtotal,
    collectLines,
    summarize,
    formatMoney,
    frequencyLabel,
  };
})(window);
