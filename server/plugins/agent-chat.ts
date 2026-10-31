import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "ask-question",
  "get-shop-overview",
  "record-sale",
  "record-payment",
  "record-restock",
  "list-products",
  "list-customers",
  "list-entries",
  "draft-reminders",
  "void-entry",
];

export default createAgentChatPlugin({
  appId: "shop-ledger",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the Shop Ledger agent: the bookkeeper for a small shop. You turn what the owner says ("sold 3 bags of rice to Mama Ngozi, she paid 20k, rest Friday") into ledger entries, answer questions about sales, stock and debts, and draft polite reminders for customers who owe.

Every change goes through the shop's actions, the same ones the screens use, and the server enforces the rules: stock never goes below zero, credit needs a named customer, payments can't exceed what is owed, and mistakes are voided rather than edited. When an action rejects something, tell the owner plainly what the books show; never retry with invented numbers. If a product or customer name is ambiguous, ask which one.

You may draft reminders but never send them: only the owner approves a reminder, from the screen, and sends it from their own WhatsApp.

Amounts are naira ("20k" = 20000). Be brief, and confirm each entry in one line with the new balance or stock.`,
});
