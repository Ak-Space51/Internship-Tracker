export type Comp = {
  min: number;
  max: number;
  currency: string;
  period: string; // year | month | week | day | hour
  estimated: boolean;
};

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  SGD: "S$",
  GBP: "£",
  HKD: "HK$",
  USD: "$",
  EUR: "€",
};

const PERIOD_SUFFIX: Record<string, string> = {
  year: "/yr",
  month: "/mo",
  week: "/wk",
  day: "/day",
  hour: "/hr",
};

function compact(n: number, currency: string): string {
  if (currency === "INR") {
    if (n >= 100_000) {
      const l = n / 100_000;
      return `${Number.isInteger(l) ? l : l.toFixed(1)}L`;
    }
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(n);
}

export function formatComp(c: Comp): string {
  const sym = SYMBOLS[c.currency] ?? `${c.currency} `;
  const suffix = PERIOD_SUFFIX[c.period] ?? "";
  const range =
    c.min === c.max
      ? compact(c.min, c.currency)
      : `${compact(c.min, c.currency)}–${compact(c.max, c.currency)}`;
  return `${sym}${range}${suffix}${c.estimated ? " est." : ""}`;
}

/** Rough market monthly stipend ranges by role category × country, shown only
 * when the posting itself lists nothing. Always labeled "est." in the UI. */
const ESTIMATES: Record<string, Record<string, [number, number, string]>> = {
  India: {
    Quant: [150_000, 300_000, "INR"],
    "AI/ML": [60_000, 120_000, "INR"],
    SWE: [50_000, 100_000, "INR"],
    Data: [40_000, 80_000, "INR"],
    Hardware: [40_000, 80_000, "INR"],
    Product: [40_000, 80_000, "INR"],
    Other: [30_000, 60_000, "INR"],
  },
  Singapore: {
    Quant: [8_000, 16_000, "SGD"],
    "AI/ML": [4_500, 7_000, "SGD"],
    SWE: [4_000, 6_500, "SGD"],
    Data: [3_500, 5_500, "SGD"],
    Hardware: [3_500, 5_500, "SGD"],
    Product: [3_500, 5_500, "SGD"],
    Other: [3_000, 5_000, "SGD"],
  },
  "United Kingdom": {
    Quant: [6_000, 12_000, "GBP"],
    "AI/ML": [3_000, 5_000, "GBP"],
    SWE: [2_500, 4_000, "GBP"],
    Data: [2_500, 3_500, "GBP"],
    Hardware: [2_500, 3_500, "GBP"],
    Product: [2_500, 3_500, "GBP"],
    Other: [2_000, 3_000, "GBP"],
  },
  "Hong Kong": {
    Quant: [50_000, 100_000, "HKD"],
    "AI/ML": [20_000, 35_000, "HKD"],
    SWE: [18_000, 30_000, "HKD"],
    Data: [15_000, 25_000, "HKD"],
    Hardware: [15_000, 25_000, "HKD"],
    Product: [15_000, 25_000, "HKD"],
    Other: [14_000, 22_000, "HKD"],
  },
};

export function jobComp(job: {
  comp_min: number | null;
  comp_max: number | null;
  comp_currency: string | null;
  comp_period: string | null;
  country: string | null;
  role_category: string;
}): Comp | null {
  if (job.comp_min != null && job.comp_currency && job.comp_period) {
    return {
      min: Number(job.comp_min),
      max: Number(job.comp_max ?? job.comp_min),
      currency: job.comp_currency,
      period: job.comp_period,
      estimated: false,
    };
  }
  const est = job.country && ESTIMATES[job.country]?.[job.role_category];
  if (est) {
    return { min: est[0], max: est[1], currency: est[2], period: "month", estimated: true };
  }
  return null;
}
