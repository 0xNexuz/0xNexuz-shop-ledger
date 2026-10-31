import { sendToAgentChat } from "@agent-native/core/client/agent-chat";

const SYMBOLS: Record<string, string> = { NGN: "₦", GHS: "GH₵", KES: "KSh ", USD: "$" };

export function money(naira: number, currency = "NGN"): string {
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  const text = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(Math.abs(naira));
  return `${naira < 0 ? "-" : ""}${symbol}${text}`;
}

export function timeOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function dateOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone }).format(new Date(iso));
}

/** "Sat, 31 Oct" for a YYYY-MM-DD calendar day. */
export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function errorCodeOf(error: unknown): string | undefined {
  if (error && typeof error === "object" && "errorCode" in error && typeof error.errorCode === "string") {
    return error.errorCode;
  }
  return undefined;
}

/** Hand a request to the shop agent in the sidebar and run it. */
export function askAgent(message: string): void {
  sendToAgentChat({ message, submit: true, openSidebar: true });
}

export const SOURCE_LABELS: Record<string, string> = {
  agent: "Agent",
  ui: "You",
  cli: "CLI",
  demo: "Sample",
  automation: "Nightly job",
  external: "Connected app",
};
