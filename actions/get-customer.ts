import { NoWriteError, defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { debtorOut, entryOut, shopIdArg } from "../server/lib/contracts.js";
import { listAccounts, listEntries } from "../server/lib/ledger.js";
import { loadReminders, reminderOut } from "../server/lib/reminder-store.js";
import { loadCustomers, requireShop, resolveCustomer } from "../server/lib/shop.js";
import { localDay } from "../server/lib/time.js";

export default defineAction({
  description: "One customer's account: balance, promised date, their statement of sales and payments, and reminders.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Customer id (or their name)"),
  }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({
    customer: debtorOut,
    entries: z.array(entryOut),
    reminders: z.array(reminderOut),
  }),
  run: async (args) => {
    const shop = await requireShop(args.shopId);
    const resolved = resolveCustomer(await loadCustomers(shop.id), args.id, false);
    if (!("existing" in resolved)) throw new Error("unreachable");
    const [customer] = await listAccounts(shop, {
      owingOnly: false,
      limit: 1,
      today: localDay(new Date(), shop.timezone),
      customerId: resolved.existing.id,
    });
    if (!customer) throw new NoWriteError("Customer not found.", { errorCode: "not_found", statusCode: 404 });
    const entries = await listEntries(shop, { customerId: customer.id, limit: 100 });
    const reminders = await loadReminders(shop, { customerId: customer.id, limit: 10 });
    return { customer, entries, reminders };
  },
});
