/**
 * Money is stored as integer kobo (1 naira = 100 kobo) so sums never drift.
 * Actions accept and return naira amounts; only this module converts.
 */

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Convert a naira amount (at most 2 decimal places) to integer kobo. */
export function toKobo(naira: number, field = "amount"): number {
  if (typeof naira !== "number" || !Number.isFinite(naira)) {
    throw new MoneyError(`${field} must be a number.`);
  }
  if (naira < 0) throw new MoneyError(`${field} cannot be negative.`);
  const scaled = naira * 100;
  const kobo = Math.round(scaled);
  if (Math.abs(scaled - kobo) > 1e-6) {
    throw new MoneyError(`${field} can have at most 2 decimal places.`);
  }
  if (!Number.isSafeInteger(kobo)) {
    throw new MoneyError(`${field} is too large.`);
  }
  return kobo;
}

export function toNaira(kobo: number): number {
  return kobo / 100;
}

const SYMBOLS: Record<string, string> = { NGN: "₦", GHS: "GH₵", KES: "KSh ", USD: "$" };

/** "₦20,000" or "₦1,250.50" — whole amounts drop the decimals. */
export function formatMoney(kobo: number, currency = "NGN"): string {
  const negative = kobo < 0;
  const abs = Math.abs(kobo);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const wholeText = whole.toLocaleString("en-US");
  const text = fraction
    ? `${wholeText}.${String(fraction).padStart(2, "0")}`
    : wholeText;
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  return `${negative ? "-" : ""}${symbol}${text}`;
}

export interface SaleLineInput {
  qty: number;
  unitKobo: number;
}

export type SalePlan =
  | {
      ok: true;
      totalKobo: number;
      paidKobo: number;
      creditKobo: number;
      lineTotals: number[];
    }
  | {
      ok: false;
      code: "invalid_quantity" | "overpaid" | "credit_needs_customer" | "empty_sale";
      message: string;
    };

/**
 * Work out what a sale costs and how much goes on credit.
 * `paidKobo` undefined means "paid in full".
 */
export function planSale(input: {
  lines: SaleLineInput[];
  paidKobo?: number | undefined;
  hasCustomer: boolean;
}): SalePlan {
  if (input.lines.length === 0) {
    return { ok: false, code: "empty_sale", message: "A sale needs at least one item." };
  }
  const lineTotals: number[] = [];
  for (const line of input.lines) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      return {
        ok: false,
        code: "invalid_quantity",
        message: "Each quantity must be a whole number above zero.",
      };
    }
    lineTotals.push(line.qty * line.unitKobo);
  }
  const totalKobo = lineTotals.reduce((sum, value) => sum + value, 0);
  const paidKobo = input.paidKobo ?? totalKobo;
  if (paidKobo > totalKobo) {
    return {
      ok: false,
      code: "overpaid",
      message: `Amount paid (${formatMoney(paidKobo)}) is more than the sale total (${formatMoney(totalKobo)}).`,
    };
  }
  const creditKobo = totalKobo - paidKobo;
  if (creditKobo > 0 && !input.hasCustomer) {
    return {
      ok: false,
      code: "credit_needs_customer",
      message: `${formatMoney(creditKobo)} is unpaid. Say which customer owes it.`,
    };
  }
  return { ok: true, totalKobo, paidKobo, creditKobo, lineTotals };
}
