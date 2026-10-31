import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { debtorOut, shopIdArg } from "../server/lib/contracts.js";
import { createCustomer } from "../server/lib/catalog.js";
import { listAccounts } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";
import { localDay } from "../server/lib/time.js";

const errors = defineActionErrors("customer_exists", "invalid_name", "invalid_phone", "no_shop");

export default defineAction({
  description: "Add a customer. A credit sale to a new name also creates the customer automatically.",
  schema: z.object({
    shopId: shopIdArg,
    name: z.string().min(2).max(80).describe('How the shop refers to them, e.g. "Mama Ngozi"'),
    phone: z.string().max(20).optional().describe("Phone number for WhatsApp reminders, e.g. 0803 123 4567"),
    note: z.string().max(280).optional().describe("Short note, e.g. where they sell"),
  }),
  outputSchema: debtorOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const id = await createCustomer(shop, actor, args);
    const [row] = await listAccounts(shop, { owingOnly: false, limit: 1, today: localDay(new Date(), shop.timezone), customerId: id });
    if (!row) throw new Error("Customer vanished after insert");
    return row;
  },
});
