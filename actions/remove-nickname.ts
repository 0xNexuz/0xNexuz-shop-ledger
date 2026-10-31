import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { removeNickname } from "../server/lib/nicknames.js";
import { requireActor, requireShop } from "../server/lib/shop.js";
import { nicknameOut } from "./add-nickname.js";

const errors = defineActionErrors(
  "not_found",
  "unknown_customer",
  "ambiguous_customer",
  "unknown_product",
  "ambiguous_product",
  "no_shop",
);

export default defineAction({
  description: "Forget a nickname so it no longer points at that customer or product.",
  schema: z.object({
    shopId: shopIdArg,
    kind: z.enum(["customer", "product"]),
    ref: z.string().min(1).describe("The customer or product: id or real name"),
    nickname: z.string().min(1).max(40),
  }),
  outputSchema: nicknameOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    return removeNickname(shop, { kind: args.kind, ref: args.ref, nickname: args.nickname });
  },
});
