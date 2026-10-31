import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { loadReminders, reminderOut } from "../server/lib/reminder-store.js";
import type { ReminderStatus } from "../server/lib/reminders.js";
import { requireShop } from "../server/lib/shop.js";

const FILTERS: Record<string, ReminderStatus[] | undefined> = {
  open: ["draft", "approved"],
  draft: ["draft"],
  approved: ["approved"],
  sent: ["sent"],
  dismissed: ["dismissed"],
  all: undefined,
};

export default defineAction({
  description: "List debtor reminders. Defaults to open ones (drafts waiting for the owner, and approved ones not yet sent).",
  schema: z.object({
    shopId: shopIdArg,
    status: z
      .enum(["open", "draft", "approved", "sent", "dismissed", "all"])
      .default("open")
      .describe('"open" (default), "draft", "approved", "sent", "dismissed" or "all"'),
    customerId: z.string().optional().describe("Only reminders for this customer id"),
  }),
  http: { method: "GET" },
  readOnly: true,
  outputSchema: z.object({ reminders: z.array(reminderOut) }),
  run: async (args) => {
    const shop = await requireShop(args.shopId);
    const reminders = await loadReminders(shop, {
      statuses: FILTERS[args.status],
      customerId: args.customerId,
      limit: 100,
    });
    return { reminders };
  },
});
