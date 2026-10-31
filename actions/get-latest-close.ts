import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { closeOut, latestClose } from "../server/lib/close.js";
import { shopIdArg } from "../server/lib/contracts.js";
import { requireShop } from "../server/lib/shop.js";
import { localDay } from "../server/lib/time.js";

export default defineAction({
  description: "The most recent evening close for the shop, and today's date in the shop's timezone.",
  schema: z.object({ shopId: shopIdArg }),
  http: { method: "GET" },
  outputSchema: z.object({ today: z.string(), close: closeOut.nullable() }),
  run: async (args) => {
    const shop = await requireShop(args.shopId, "read");
    return { today: localDay(new Date(), shop.timezone), close: await latestClose(shop) };
  },
});
