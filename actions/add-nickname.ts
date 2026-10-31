import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import { shopIdArg } from "../server/lib/contracts.js";
import { addNickname } from "../server/lib/nicknames.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors(
  "invalid_nickname",
  "nickname_taken",
  "too_many_nicknames",
  "unknown_customer",
  "ambiguous_customer",
  "unknown_product",
  "ambiguous_product",
  "no_shop",
);

export const nicknameOut = z.object({ id: z.string(), name: z.string(), aliases: z.array(z.string()), message: z.string() });

export default defineAction({
  description:
    'Teach the shop a nickname: "Mama N" is Mama Ngozi, "one bag" is Rice 50kg bag. After this, every action that takes a name understands the nickname. Use it when the owner tells you who or what a name means, or after they pick the right one from an ambiguous match and agree you should remember it. Changes no money or stock.',
  schema: z.object({
    shopId: shopIdArg,
    kind: z.enum(["customer", "product"]).describe("What the nickname is for"),
    ref: z.string().min(1).describe("The customer or product: id or real name"),
    nickname: z.string().min(2).max(40).describe("The other name the owner uses"),
  }),
  outputSchema: nicknameOut,
  errors,
  run: async (args, ctx) => {
    requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    return addNickname(shop, { kind: args.kind, ref: args.ref, nickname: args.nickname });
  },
});
