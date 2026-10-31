import { createGetDb } from "@agent-native/core/db";
import { registerShareableResource } from "@agent-native/core/sharing";

import * as schema from "./schema.js";

export const getDb = createGetDb(schema);
export { schema };

registerShareableResource({
  type: "shop",
  resourceTable: schema.shops,
  sharesTable: schema.shopShares,
  displayName: "Shop",
  titleColumn: "name",
  getResourcePath: () => "/shop",
  getDb,
});
