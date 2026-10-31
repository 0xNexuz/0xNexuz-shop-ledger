import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { draftReminders, reminderOut } from "../server/lib/reminder-store.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("invalid_message", "no_shop");

export default defineAction({
  description:
    "Save reminder messages for customers who owe money, as drafts for the shop owner to review. You write each message; it is NOT sent. Only the owner can approve a draft, which opens WhatsApp for them to send. A customer with no balance, or with a reminder already approved, is skipped with a reason.",
  schema: z.object({
    shopId: shopIdArg,
    drafts: z
      .array(
        z.object({
          customer: z.string().min(1).describe("Customer id or name"),
          message: z
            .string()
            .min(10)
            .max(700)
            .describe("The reminder text, warm and respectful, stating the exact balance and any promised date"),
        }),
      )
      .min(1)
      .max(20)
      .describe("One draft per customer"),
  }),
  outputSchema: z.object({
    drafted: z.array(reminderOut),
    skipped: z.array(z.object({ customer: z.string(), reason: z.string() })),
    message: z.string(),
  }),
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const result = await draftReminders(shop, actor, args.drafts);
    const message =
      `${result.drafted.length} reminder${result.drafted.length === 1 ? "" : "s"} drafted for the owner to review` +
      (result.skipped.length ? `; skipped ${result.skipped.map((s) => s.customer).join(", ")}.` : ".");
    return { ...result, message };
  },
});
