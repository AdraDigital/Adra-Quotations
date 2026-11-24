/**
 * Smoke test de cálculos (Node, sin DOM).
 * Replica la lógica esencial de anticipo / inicial / recurrentes.
 */
function toNumber(value) {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function summarize(q) {
  const development = (q.development || []).reduce(
    (s, l) => s + roundMoney(toNumber(l.quantity) * toNumber(l.unitPrice)),
    0
  );
  const additionalOnce = (q.additional || [])
    .filter((l) => (l.frequency || "once") === "once")
    .reduce(
      (s, l) => s + roundMoney(toNumber(l.quantity) * toNumber(l.unitPrice)),
      0
    );
  const initialGross = roundMoney(development + additionalOnce);
  const depositPercent = Math.min(100, Math.max(0, toNumber(q.deposit?.percent)));
  const depositAmount = roundMoney((initialGross * depositPercent) / 100);
  const balance = roundMoney(initialGross - depositAmount);
  const recurringAnnual = roundMoney(
    (q.hosting?.enabled ? toNumber(q.hosting.annualPrice) : 0) +
      (q.domain?.enabled ? toNumber(q.domain.annualPrice) : 0)
  );
  const recurringMonthly = roundMoney(
    (q.additional || [])
      .filter((l) => l.frequency === "monthly")
      .reduce(
        (s, l) => s + roundMoney(toNumber(l.quantity) * toNumber(l.unitPrice)),
        0
      )
  );
  return { initialGross, depositAmount, balance, recurringAnnual, recurringMonthly };
}

const sample = {
  development: [{ quantity: 1, unitPrice: 1500 }],
  additional: [
    { quantity: 1, unitPrice: 200, frequency: "once" },
    { quantity: 1, unitPrice: 100, frequency: "monthly" },
  ],
  hosting: { enabled: true, annualPrice: 400 },
  domain: { enabled: true, annualPrice: 120, periodYears: 1 },
  deposit: { percent: 50 },
};

const result = summarize(sample);
const expected = {
  initialGross: 1700,
  depositAmount: 850,
  balance: 850,
  recurringAnnual: 520,
  recurringMonthly: 100,
};

let failed = 0;
for (const [key, value] of Object.entries(expected)) {
  if (result[key] !== value) {
    console.error(`FAIL ${key}: got ${result[key]}, expected ${value}`);
    failed += 1;
  } else {
    console.log(`OK ${key}=${value}`);
  }
}

// anticipo 0%
const zero = summarize({ ...sample, deposit: { percent: 0 } });
if (zero.depositAmount !== 0 || zero.balance !== 1700) {
  console.error("FAIL 0% deposit", zero);
  failed += 1;
} else {
  console.log("OK deposit 0%");
}

if (failed) {
  process.exit(1);
}
console.log("All calculation smoke tests passed.");
