import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg, writeResult, writeResultOut } from "../server/lib/contracts.js";
import { voidEntry } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("not_found", "already_voided", "void_conflict", "no_shop");

export default defineAction({
  description:
    "Reverse a mistaken entry (sale, payment, restock or stock count). Entries are never edited or deleted: voiding restores stock and balances and keeps the entry, marked voided, for the audit trail. Rejects with void_conflict when later activity depends on it.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Entry id from list-entries"),
    reason: z.string().min(2).max(200).describe('Why it is being voided, e.g. "entered twice"'),
  }),
  outputSchema: writeResultOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    await voidEntry(shop, actor, args);
    return writeResult(shop, args.id);
  },
});
