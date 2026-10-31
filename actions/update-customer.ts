import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { debtorOut, shopIdArg } from "../server/lib/contracts.js";
import { updateCustomer } from "../server/lib/catalog.js";
import { listAccounts } from "../server/lib/ledger.js";
import { loadCustomers, requireActor, requireShop, resolveCustomer } from "../server/lib/shop.js";
import { localDay } from "../server/lib/time.js";

const errors = defineActionErrors(
  "not_found",
  "unknown_customer",
  "ambiguous_customer",
  "customer_exists",
  "invalid_name",
  "invalid_phone",
  "no_change",
  "no_shop",
);

export default defineAction({
  description: "Change a customer's name, phone or note. Balances change only through sales, payments and voids.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Customer id (or their name)"),
    name: z.string().min(2).max(80).optional().describe("New name"),
    phone: z.string().max(20).optional().describe('New phone number; "" clears it'),
    note: z.string().max(280).optional().describe('New note; "" clears it'),
  }),
  outputSchema: debtorOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const resolved = resolveCustomer(await loadCustomers(shop.id), args.id, false);
    if (!("existing" in resolved)) throw new Error("unreachable");
    await updateCustomer(shop, resolved.existing.id, { name: args.name, phone: args.phone, note: args.note });
    const [row] = await listAccounts(shop, {
      owingOnly: false,
      limit: 1,
      today: localDay(new Date(), shop.timezone),
      customerId: resolved.existing.id,
    });
    if (!row) throw new Error("Customer vanished after update");
    return row;
  },
});
