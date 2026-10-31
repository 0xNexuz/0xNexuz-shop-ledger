import { NoWriteError, defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { flag, flagArg, shopIdArg } from "../server/lib/contracts.js";
import { reminderOut, transitionReminder } from "../server/lib/reminder-store.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("not_found", "invalid_transition", "invalid_message", "no_change", "no_shop");

export default defineAction({
  description: "Rewrite a draft reminder's message, or dismiss a reminder that is no longer needed.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Reminder id"),
    message: z.string().min(10).max(700).optional().describe("New text for a draft"),
    dismiss: flagArg("Dismiss the reminder instead of editing it"),
  }),
  outputSchema: reminderOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    if (flag(args.dismiss, false)) return transitionReminder(shop, args.id, "dismiss");
    if (args.message === undefined) {
      throw new NoWriteError("Give a new message or set dismiss.", { errorCode: "no_change", statusCode: 400 });
    }
    return transitionReminder(shop, args.id, "edit", { message: args.message });
  },
});
