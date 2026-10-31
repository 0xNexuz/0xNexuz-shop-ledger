import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { closeDay, closeOut } from "../server/lib/close.js";
import { flag, flagArg, shopIdArg } from "../server/lib/contracts.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("no_shop");

export default defineAction({
  description:
    "Close the shop's day: totals for today (sales, cash in, credit given, debts paid, what's owed), who is past their promised date, what's running low, and a reminder DRAFT for each overdue customer without one. Runs by itself every evening at 7 pm Lagos; call it when the owner says 'close the day' or asks how the day went. Drafts only: the owner approves and sends each reminder.",
  schema: z.object({
    shopId: shopIdArg,
    refresh: flagArg("Recompute today's close even if it already ran"),
  }),
  outputSchema: closeOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    return closeDay(shop, actor, { refresh: flag(args.refresh, false) });
  },
});
