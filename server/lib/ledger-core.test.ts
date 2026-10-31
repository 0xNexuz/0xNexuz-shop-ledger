import { describe, expect, it } from "vitest";

import { matchByName } from "./match";
import { formatMoney, planSale, toKobo, MoneyError } from "./money";
import { normalizePhone, reminderMachine, whatsappLink } from "./reminders";
import { dayBoundsUtc, daysOverdue, localDay, toUtcIso } from "./time";

describe("money", () => {
  it("converts naira to integer kobo without float drift", () => {
    expect(toKobo(20000)).toBe(2_000_000);
    expect(toKobo(0.1 + 0.2)).toBe(30);
    expect(toKobo(1250.5)).toBe(125_050);
  });

  it("rejects negative, non-finite and over-precise amounts", () => {
    expect(() => toKobo(-1)).toThrow(MoneyError);
    expect(() => toKobo(Number.NaN)).toThrow(MoneyError);
    expect(() => toKobo(1.234)).toThrow(/2 decimal places/);
  });

  it("formats naira the way a shop owner reads it", () => {
    expect(formatMoney(2_000_000)).toBe("₦20,000");
    expect(formatMoney(125_050)).toBe("₦1,250.50");
    expect(formatMoney(-5_000)).toBe("-₦50");
  });
});

describe("planSale", () => {
  const rice = { qty: 3, unitKobo: 7_500_000 }; // 3 bags at ₦75,000

  it("treats an omitted payment as paid in full", () => {
    const plan = planSale({ lines: [rice], hasCustomer: false });
    expect(plan).toMatchObject({ ok: true, totalKobo: 22_500_000, paidKobo: 22_500_000, creditKobo: 0 });
  });

  it("puts the unpaid part on credit for a named customer", () => {
    const plan = planSale({ lines: [rice], paidKobo: 2_000_000, hasCustomer: true });
    expect(plan).toMatchObject({ ok: true, creditKobo: 20_500_000 });
  });

  it("refuses credit without a customer", () => {
    const plan = planSale({ lines: [rice], paidKobo: 0, hasCustomer: false });
    expect(plan).toMatchObject({ ok: false, code: "credit_needs_customer" });
  });

  it("refuses paying more than the total", () => {
    const plan = planSale({ lines: [rice], paidKobo: 30_000_000, hasCustomer: true });
    expect(plan).toMatchObject({ ok: false, code: "overpaid" });
  });

  it("refuses zero, fractional and empty quantities", () => {
    expect(planSale({ lines: [{ qty: 0, unitKobo: 100 }], hasCustomer: true })).toMatchObject({ ok: false, code: "invalid_quantity" });
    expect(planSale({ lines: [{ qty: 1.5, unitKobo: 100 }], hasCustomer: true })).toMatchObject({ ok: false, code: "invalid_quantity" });
    expect(planSale({ lines: [], hasCustomer: true })).toMatchObject({ ok: false, code: "empty_sale" });
  });
});

describe("matchByName", () => {
  const products = [
    { id: "p1", name: "Rice (50kg bag)" },
    { id: "p2", name: "Golden Penny Semovita 1kg" },
    { id: "p3", name: "Indomie Chicken (carton)" },
    { id: "p4", name: "Indomie Onion Chicken (carton)" },
  ];

  it("matches by id, exact name, or a unique fragment", () => {
    expect(matchByName(products, "p2")).toEqual({ kind: "match", item: products[1] });
    expect(matchByName(products, "rice 50kg bag")).toEqual({ kind: "match", item: products[0] });
    expect(matchByName(products, "semovita")).toEqual({ kind: "match", item: products[1] });
  });

  it("understands nicknames the owner taught it", () => {
    const people = [
      { id: "c1", name: "Mama Ngozi", aliases: ["Mama Pikin"] },
      { id: "c2", name: "Chinedu Okafor", aliases: [] },
    ];
    expect(matchByName(people, "mama pikin")).toEqual({ kind: "match", item: people[0] });
    // A real name still wins over somebody else's nickname.
    const clash = [...people, { id: "c3", name: "Mama Pikin", aliases: [] }];
    expect(matchByName(clash, "Mama Pikin")).toEqual({ kind: "match", item: clash[2] });
  });

  it("reports ambiguity instead of guessing", () => {
    const result = matchByName(products, "indomie");
    expect(result.kind).toBe("ambiguous");
  });

  it("suggests near matches when nothing fits", () => {
    const result = matchByName(products, "penny garri");
    expect(result.kind).toBe("none");
    if (result.kind === "none") expect(result.suggestions[0]?.id).toBe("p2");
  });
});

describe("time", () => {
  it("normalizes offset times to UTC and rejects naive times", () => {
    expect(toUtcIso("2026-10-31T09:30:00+01:00")).toBe("2026-10-31T08:30:00.000Z");
    expect(() => toUtcIso("2026-10-31T09:30:00")).toThrow(/offset/);
  });

  it("computes a Lagos business day in UTC", () => {
    expect(dayBoundsUtc("2026-10-31", "Africa/Lagos")).toEqual({
      from: "2026-10-30T23:00:00.000Z",
      to: "2026-10-31T23:00:00.000Z",
    });
  });

  it("handles a DST change day", () => {
    // US clocks fall back on 2026-11-01: that day is 25 hours long.
    const { from, to } = dayBoundsUtc("2026-11-01", "America/New_York");
    expect(from).toBe("2026-11-01T04:00:00.000Z");
    expect(to).toBe("2026-11-02T05:00:00.000Z");
  });

  it("finds the local day of an instant and overdue days", () => {
    expect(localDay(new Date("2026-10-31T23:30:00Z"), "Africa/Lagos")).toBe("2026-11-01");
    expect(daysOverdue("2026-10-28", "2026-10-31")).toBe(3);
    expect(daysOverdue("2026-11-02", "2026-10-31")).toBe(-2);
  });
});

describe("reminders", () => {
  it("only lets a draft be approved and an approved reminder be sent", () => {
    expect(reminderMachine.can("draft", "approve")).toBe(true);
    expect(reminderMachine.can("draft", "send")).toBe(false);
    expect(reminderMachine.can("approved", "send")).toBe(true);
    expect(reminderMachine.can("sent", "dismiss")).toBe(false);
    expect(() => reminderMachine.parseState("deleted")).toThrow();
  });

  it("normalizes Nigerian phone numbers for WhatsApp", () => {
    expect(normalizePhone("0803 123 4567")).toBe("2348031234567");
    expect(normalizePhone("+234 803 123 4567")).toBe("2348031234567");
    expect(normalizePhone("8031234567")).toBe("2348031234567");
    expect(normalizePhone("12")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("builds a wa.me link with the message pre-filled", () => {
    expect(whatsappLink("08031234567", "Hello Mama, ₦5,000 balance")).toBe(
      "https://wa.me/2348031234567?text=Hello%20Mama%2C%20%E2%82%A65%2C000%20balance",
    );
    expect(whatsappLink(null, "Hi")).toBe("https://wa.me/?text=Hi");
  });
});
