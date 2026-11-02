import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { dismissImport } from "../server/lib/imports.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors("not_found", "no_shop");

export default defineAction({
  description: "Discard an old-balance import that is waiting for review. Nothing in the books changes.",
  schema: z.object({ shopId: shopIdArg, id: z.string().min(1).describe("Import id") }),
  outputSchema: z.object({ ok: z.literal(true) }),
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    await dismissImport(shop, args.id);
    return { ok: true as const };
  },
});
