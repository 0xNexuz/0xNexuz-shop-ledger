import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { methodArg, occurredAtArg, shopIdArg, writeResult, writeResultOut } from "../server/lib/contracts.js";
import { postPayment } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors(
  "overpayment",
  "unknown_customer",
  "ambiguous_customer",
  "invalid_amount",
  "invalid_time",
  "no_shop",
);

export default defineAction({
  description:
    "Record money a customer paid towards what they owe. Rejects with overpayment (409) if it is more than their balance, which usually means a typo: tell the user the real balance.",
  schema: z.object({
    shopId: shopIdArg,
    customer: z.string().min(1).describe("Customer id or name"),
    amount: z.coerce.number().positive().describe("Naira received"),
    method: methodArg,
    note: z.string().max(280).optional().describe("Short free-text note"),
    occurredAt: occurredAtArg,
  }),
  outputSchema: writeResultOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const id = await postPayment(shop, actor, args);
    return writeResult(shop, id);
  },
});
