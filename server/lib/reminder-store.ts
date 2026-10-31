import { NoWriteError } from "@agent-native/core/action";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../db/index.js";
import { toNaira } from "./money.js";
import { reminderMachine, type ReminderStatus, whatsappLink } from "./reminders.js";
import { type Actor, type ShopRef, loadCustomers, resolveCustomer } from "./shop.js";

const { reminders, customers } = schema;

export const reminderOut = z.object({
  id: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  phone: z.string().nullable(),
  message: z.string(),
  amount: z.number(),
  currentBalance: z.number(),
  status: z.enum(["draft", "approved", "sent", "dismissed"]),
  draftedBy: z.string(),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  /** Only present once the owner has approved: opens WhatsApp with the text ready. */
  whatsappUrl: z.string().nullable(),
});
export type ReminderView = z.infer<typeof reminderOut>;

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 700;

function checkMessage(message: string): string {
  const text = message.trim();
  if (text.length < MESSAGE_MIN || text.length > MESSAGE_MAX) {
    throw new NoWriteError(`A reminder must be ${MESSAGE_MIN}–${MESSAGE_MAX} characters.`, {
      errorCode: "invalid_message",
      statusCode: 400,
    });
  }
  return text;
}

export async function loadReminders(
  shop: ShopRef,
  filter: { ids?: string[] | undefined; statuses?: ReminderStatus[] | undefined; customerId?: string | undefined; limit: number },
): Promise<ReminderView[]> {
  const rows = await getDb()
    .select({
      id: reminders.id,
      customerId: reminders.customerId,
      customerName: customers.name,
      phone: customers.phone,
      balanceKobo: customers.balanceKobo,
      message: reminders.message,
      amountKobo: reminders.amountKobo,
      status: reminders.status,
      draftedBy: reminders.draftedBy,
      createdAt: reminders.createdAt,
      approvedAt: reminders.approvedAt,
      sentAt: reminders.sentAt,
    })
    .from(reminders)
    .innerJoin(customers, eq(customers.id, reminders.customerId))
    .where(
      and(
        eq(reminders.shopId, shop.id),
        filter.ids ? inArray(reminders.id, filter.ids) : undefined,
        filter.statuses ? inArray(reminders.status, filter.statuses) : undefined,
        filter.customerId ? eq(reminders.customerId, filter.customerId) : undefined,
      ),
    )
    .orderBy(desc(reminders.createdAt), desc(reminders.id))
    .limit(filter.limit);
  return rows.map((r) => {
    const status = reminderMachine.parseState(r.status);
    return {
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerName,
      phone: r.phone,
      message: r.message,
      amount: toNaira(r.amountKobo),
      currentBalance: toNaira(r.balanceKobo),
      status,
      draftedBy: r.draftedBy,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
      sentAt: r.sentAt,
      whatsappUrl: status === "approved" || status === "sent" ? whatsappLink(r.phone, r.message) : null,
    };
  });
}

export async function getReminder(shop: ShopRef, id: string): Promise<ReminderView> {
  const [found] = await loadReminders(shop, { ids: [id], limit: 1 });
  if (!found) throw new NoWriteError("Reminder not found.", { errorCode: "not_found", statusCode: 404 });
  return found;
}

/**
 * Save drafted reminder messages. Each draft is independent: a customer who
 * doesn't owe, or whose reminder is already approved, is skipped with a reason.
 */
export async function draftReminders(
  shop: ShopRef,
  actor: Actor,
  drafts: { customer: string; message: string }[],
): Promise<{ drafted: ReminderView[]; skipped: { customer: string; reason: string }[] }> {
  const roster = await loadCustomers(shop.id);
  const draftedIds: string[] = [];
  const skipped: { customer: string; reason: string }[] = [];
  for (const draft of drafts) {
    let customer;
    try {
      const resolved = resolveCustomer(roster, draft.customer, false);
      if (!("existing" in resolved)) throw new Error("unreachable");
      customer = resolved.existing;
    } catch (error) {
      skipped.push({ customer: draft.customer, reason: error instanceof Error ? error.message : "Not found" });
      continue;
    }
    if (customer.balanceKobo <= 0) {
      skipped.push({ customer: customer.name, reason: `${customer.name} doesn't owe anything.` });
      continue;
    }
    const message = checkMessage(draft.message);
    const [open] = await getDb()
      .select({ id: reminders.id, status: reminders.status })
      .from(reminders)
      .where(and(eq(reminders.customerId, customer.id), inArray(reminders.status, ["draft", "approved"])))
      .limit(1);
    const now = new Date().toISOString();
    if (open?.status === "approved") {
      skipped.push({ customer: customer.name, reason: "A reminder is already approved and waiting to be sent." });
      continue;
    }
    if (open) {
      const [updated] = await getDb()
        .update(reminders)
        .set({ message, amountKobo: customer.balanceKobo, draftedBy: actor.source, updatedAt: now })
        .where(and(eq(reminders.id, open.id), inArray(reminders.status, reminderMachine.fromStates("edit"))))
        .returning({ id: reminders.id });
      if (updated) draftedIds.push(updated.id);
      else skipped.push({ customer: customer.name, reason: "The open reminder changed while saving; try again." });
      continue;
    }
    const id = crypto.randomUUID();
    try {
      await getDb().insert(reminders).values({
        id,
        shopId: shop.id,
        customerId: customer.id,
        message,
        amountKobo: customer.balanceKobo,
        draftedBy: actor.source,
        ownerEmail: actor.email,
        orgId: shop.orgId,
      });
      draftedIds.push(id);
    } catch {
      // The partial unique index allows one open reminder per customer.
      skipped.push({ customer: customer.name, reason: "Another open reminder was created at the same time." });
    }
  }
  const drafted = draftedIds.length ? await loadReminders(shop, { ids: draftedIds, limit: draftedIds.length }) : [];
  return { drafted, skipped };
}

/** Compare-and-set a lifecycle transition; zero rows means an illegal move or a lost race. */
export async function transitionReminder(
  shop: ShopRef,
  id: string,
  event: "approve" | "send" | "dismiss" | "edit",
  patch: { message?: string | undefined } = {},
): Promise<ReminderView> {
  const current = await getReminder(shop, id);
  if (!reminderMachine.can(current.status, event)) {
    throw new NoWriteError(`This reminder is ${current.status}; it can't be ${event === "send" ? "marked sent" : `${event}d`}.`, {
      errorCode: "invalid_transition",
      statusCode: 409,
    });
  }
  const now = new Date().toISOString();
  const set: Partial<typeof reminders.$inferInsert> = {
    status: reminderMachine.transition(current.status, event),
    updatedAt: now,
  };
  if (patch.message !== undefined) set.message = checkMessage(patch.message);
  if (event === "approve") {
    if (current.currentBalance <= 0) {
      throw new NoWriteError(`${current.customerName} has paid since this was drafted. Dismiss it instead.`, {
        errorCode: "nothing_owed",
        statusCode: 409,
      });
    }
    set.approvedAt = now;
    set.amountKobo = Math.round(current.currentBalance * 100);
  }
  if (event === "send") set.sentAt = now;
  const [row] = await getDb()
    .update(reminders)
    .set(set)
    .where(and(eq(reminders.id, id), eq(reminders.shopId, shop.id), inArray(reminders.status, reminderMachine.fromStates(event))))
    .returning({ id: reminders.id });
  if (!row) {
    throw new NoWriteError("The reminder changed while saving; refresh and try again.", { errorCode: "invalid_transition", statusCode: 409 });
  }
  return getReminder(shop, id);
}

