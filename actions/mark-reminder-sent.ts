import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { reminderOut, transitionReminder } from "../server/lib/reminder-store.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("not_found", "invalid_transition", "no_shop");

export default defineAction({
  description: "Owner marks an approved reminder as sent after sending it on WhatsApp. Owner-only: hidden from the agent.",
  schema: z.object({ shopId: shopIdArg, id: z.string().min(1).describe("Reminder id") }),
  agentTool: false,
  outputSchema: reminderOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    return transitionReminder(shop, args.id, "send");
  },
});
