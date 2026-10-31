import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { reminderOut, transitionReminder } from "../server/lib/reminder-store.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("not_found", "invalid_transition", "invalid_message", "nothing_owed", "no_shop");

export default defineAction({
  description:
    "Owner approves a draft reminder (optionally with edited text). Returns a WhatsApp link that opens the message ready to send. Owner-only: hidden from the agent.",
  schema: z.object({
    shopId: shopIdArg,
    id: z.string().min(1).describe("Reminder id"),
    message: z.string().min(10).max(700).optional().describe("Final text, if the owner edited it"),
  }),
  // Only a signed-in person in the app UI can run this: not the agent, MCP, raw HTTP or the CLI.
  uiOnly: true,
  agentTool: false,
  outputSchema: reminderOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    return transitionReminder(shop, args.id, "approve", { message: args.message });
  },
});
