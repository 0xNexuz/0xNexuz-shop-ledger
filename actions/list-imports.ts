import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { importOut, listImports } from "../server/lib/imports.js";
import { requireShop } from "../server/lib/shop.js";

export default defineAction({
  description: "Notebook imports waiting for the owner's review (or all recent ones).",
  schema: z.object({
    shopId: shopIdArg,
    status: z.enum(["draft", "all"]).default("draft"),
  }),
  http: { method: "GET" },
  outputSchema: z.object({ imports: z.array(importOut) }),
  run: async (args) => {
    const shop = await requireShop(args.shopId, "read");
    return { imports: await listImports(shop, args.status) };
  },
});
