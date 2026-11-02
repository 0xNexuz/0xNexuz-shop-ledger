import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";

const INITIAL_TOOL_NAMES = [
  "get-shop-overview",
  "record-sale",
  "record-payment",
  "reconcile-ledger",
  "get-credit-standing",
  "close-the-day",
  "propose-notebook-import",
  "add-nickname",
];

// Groq free-tier requests stay within budget when only shop-specific actions are exposed.
const SHOP_TOOL_NAMES = new Set(INITIAL_TOOL_NAMES);

export default createAgentChatPlugin({
  appId: "shop-ledger",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  toolLimits: { maxResultChars: 1800 },
  resolveActionSurface: ({ availableActionNames }) => ({
    allowedActionNames: availableActionNames.filter((name) => SHOP_TOOL_NAMES.has(name)),
  }),
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are Shop Ledger's bookkeeper. Understand English, Nigerian Pidgin, Yoruba, Hausa and Igbo shop language; reply briefly in the owner's language. Amounts are naira; "20k" means 20000.

Use shop actions for facts and changes. For daily sales, cash, credit, debtors or stock questions, call get-shop-overview. For book checks, call reconcile-ledger. Never invent numbers or retry rejected actions with made-up values. Ask one short question when a name, amount, or whether a transaction was a sale or restock is unclear. Confirm entries with the new balance or stock.

Credit sales need a named customer. If record-sale returns credit_check, explain why and ask whether the owner still wants to extend credit. Call it again with confirmCredit: true only after they say yes. Use get-credit-standing for credit questions.

When the owner types old debts or stock counts, call propose-notebook-import. A proposal waits on Today for owner review; you cannot apply it yourself. Closing the day drafts reminders; the owner approves and sends them. Close the day only when explicitly asked. If already closed, report that; refresh only on explicit request. For a restock, direct the owner to the Stock screen.

Use add-nickname only after the owner gives or confirms a nickname. Shop terms: "remain", "balance", "bashi", "gbese", "ugwo" mean debt; "e don pay", "o san", "ya biya", "kwụrụ" mean paid; "paint", "derica", "mudu", "bag", "carton", "tin" are units.`
});
