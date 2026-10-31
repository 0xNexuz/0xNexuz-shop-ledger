import { NoWriteError, defineAction, defineActionErrors } from "@agent-native/core/action";
import { accessFilter } from "@agent-native/core/sharing";
import { z } from "zod";

import { getDb, schema } from "../server/db/index.js";
import { createCustomer, createProduct, createShop, shopHasActivity } from "../server/lib/catalog.js";
import { postPayment, postRestock, postSale } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";
import { dayBoundsUtc, localDay } from "../server/lib/time.js";

const errors = defineActionErrors("demo_not_empty", "unauthenticated");

/** Synthetic sample data: invented names and numbers, no real people. */
const PRODUCTS = [
  { name: "Rice (50kg bag)", unit: "bag", price: 78000, cost: 72000, stock: 12, lowStockAt: 4 },
  { name: "Garri (paint)", unit: "paint", price: 2500, cost: 2000, stock: 30, lowStockAt: 8 },
  { name: "Semovita 1kg", unit: "pack", price: 1700, cost: 1450, stock: 40, lowStockAt: 10 },
  { name: "Indomie Chicken (carton)", unit: "carton", price: 9800, cost: 9200, stock: 6, lowStockAt: 3 },
  { name: "Groundnut oil (5L)", unit: "keg", price: 14500, cost: 13200, stock: 9, lowStockAt: 3 },
  { name: "Sugar 1kg", unit: "pack", price: 1800, cost: 1500, stock: 25, lowStockAt: 8 },
  { name: "Peak milk tin", unit: "tin", price: 450, cost: 380, stock: 48, lowStockAt: 12 },
];

const CUSTOMERS = [
  { name: "Mama Ngozi", phone: "0803 000 1111", note: "Sells food at the junction" },
  { name: "Mr Tunde (tailor)", phone: "0805 000 2222" },
  { name: "Iya Bisi", phone: "0806 000 3333" },
  { name: "Chinedu" },
  { name: "Aunty Kemi", phone: "0809 000 5555" },
];

export default defineAction({
  description: "Fill an empty shop with a week of sample data for a demo. UI-only.",
  schema: z.object({
    shopName: z.string().min(2).max(80).default("Mama Chioma Provisions").describe("Name for a new demo shop"),
  }),
  agentTool: false,
  outputSchema: z.object({ shopId: z.string(), products: z.number(), customers: z.number(), entries: z.number() }),
  errors,
  run: async (args, ctx) => {
    const actor = { ...requireActor(ctx), source: "demo" };
    const [existing] = await getDb()
      .select({ id: schema.shops.id })
      .from(schema.shops)
      .where(accessFilter(schema.shops, schema.shopShares, undefined, "editor"))
      .limit(1);
    const shopId = existing?.id ?? (await createShop(actor, { name: args.shopName, currency: "NGN" }));
    const shop = await requireShop(shopId, "write");
    if (await shopHasActivity(shop.id)) {
      throw new NoWriteError("This shop already has entries; demo data only goes into an empty shop.", {
        errorCode: "demo_not_empty",
        statusCode: 409,
      });
    }
    // Back-dated activity, placed on Lagos days relative to today.
    const today = localDay(new Date(), shop.timezone);
    const dayIso = (daysAgo: number, hour: number) => {
      const base = new Date(`${today}T12:00:00Z`);
      base.setUTCDate(base.getUTCDate() - daysAgo);
      const { from } = dayBoundsUtc(base.toISOString().slice(0, 10), shop.timezone);
      return new Date(Date.parse(from) + hour * 3_600_000).toISOString();
    };
    const dayOnly = (offset: number) => {
      const base = new Date(`${today}T12:00:00Z`);
      base.setUTCDate(base.getUTCDate() + offset);
      return base.toISOString().slice(0, 10);
    };
    for (const product of PRODUCTS) await createProduct(shop, actor, { ...product, openedAt: dayIso(10, 8) });
    for (const customer of CUSTOMERS) await createCustomer(shop, actor, customer);
    let entries = 0;
    const sale = async (input: Parameters<typeof postSale>[2]) => {
      await postSale(shop, actor, input);
      entries += 1;
    };
    await sale({
      customer: "Mr Tunde (tailor)",
      createCustomerIfMissing: false,
      lines: [{ product: "Rice (50kg bag)", qty: 2 }],
      paid: 100000,
      method: "transfer",
      dueDate: dayOnly(-3),
      occurredAt: dayIso(8, 10),
    });
    await sale({
      customer: "Mama Ngozi",
      createCustomerIfMissing: false,
      lines: [
        { product: "Rice (50kg bag)", qty: 1 },
        { product: "Groundnut oil (5L)", qty: 4 },
      ],
      paid: 50000,
      method: "cash",
      dueDate: dayOnly(-1),
      occurredAt: dayIso(6, 9),
    });
    await sale({
      createCustomerIfMissing: false,
      lines: [
        { product: "Semovita 1kg", qty: 5 },
        { product: "Sugar 1kg", qty: 3 },
      ],
      method: "cash",
      occurredAt: dayIso(5, 15),
    });
    await sale({
      customer: "Iya Bisi",
      createCustomerIfMissing: false,
      lines: [{ product: "Indomie Chicken (carton)", qty: 2 }],
      paid: 0,
      method: "cash",
      dueDate: dayOnly(2),
      occurredAt: dayIso(4, 11),
    });
    await postPayment(shop, actor, { customer: "Mr Tunde (tailor)", amount: 30000, method: "transfer", occurredAt: dayIso(3, 13) });
    entries += 1;
    await postRestock(shop, actor, {
      lines: [{ product: "Indomie Chicken (carton)", qty: 4, unitCost: 9200 }],
      note: "From the distributor at Oshodi",
      occurredAt: dayIso(2, 8),
    });
    entries += 1;
    await sale({
      customer: "Chinedu",
      createCustomerIfMissing: false,
      lines: [{ product: "Garri (paint)", qty: 10 }],
      paid: 15000,
      method: "pos",
      occurredAt: dayIso(1, 17),
    });
    await sale({
      createCustomerIfMissing: false,
      lines: [
        { product: "Peak milk tin", qty: 6 },
        { product: "Sugar 1kg", qty: 2 },
      ],
      method: "pos",
      occurredAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    });
    return { shopId: shop.id, products: PRODUCTS.length, customers: CUSTOMERS.length, entries };
  },
});
