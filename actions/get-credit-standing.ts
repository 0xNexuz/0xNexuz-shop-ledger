import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { creditStandingOut, creditStandings } from "../server/lib/credit.js";
import { loadCustomers, requireShop, resolveCustomer } from "../server/lib/shop.js";

const errors = defineActionErrors("unknown_customer", "ambiguous_customer", "no_shop");

export default defineAction({
  description:
    "How a customer has handled credit: what they owe, how late they are, the most they've owed and paid back, their credit limit (owner-set or suggested) and a status: good, watch or hold. Use it when the owner asks whether to give someone credit. Omit customer for everyone.",
  schema: z.object({
    shopId: shopIdArg,
    customer: z.string().optional().describe("Customer id or name; omit for all customers"),
  }),
  http: { method: "GET" },
  outputSchema: z.object({ standings: z.array(creditStandingOut) }),
  errors,
  run: async (args) => {
    const shop = await requireShop(args.shopId, "read");
    let customerId: string | undefined;
    if (args.customer) {
      const resolved = resolveCustomer(await loadCustomers(shop.id), args.customer, false);
      if ("existing" in resolved) customerId = resolved.existing.id;
    }
    return { standings: await creditStandings(shop, customerId) };
  },
});
