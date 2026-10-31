import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";

import {
  dayArg,
  flag,
  flagArg,
  methodArg,
  occurredAtArg,
  shopIdArg,
  writeResult,
  writeResultOut,
} from "../server/lib/contracts.js";
import { postSale } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors(
  "insufficient_stock",
  "credit_needs_customer",
  "overpaid",
  "unknown_product",
  "ambiguous_product",
  "ambiguous_customer",
  "price_missing",
  "invalid_amount",
  "invalid_quantity",
  "invalid_due_date",
  "invalid_time",
  "no_shop",
);

export default defineAction({
  description:
    "Record a sale: what was sold, to whom, and how much was paid now. Any unpaid remainder goes on the customer's credit. Rejects with insufficient_stock (409) when stock would go below zero, credit_needs_customer when part is unpaid and no customer is named, and unknown_product/ambiguous_product when a product name doesn't resolve: report these to the user, don't guess.",
  schema: z.object({
    shopId: shopIdArg,
    lines: z
      .array(
        z.object({
          product: z.string().min(1).describe('Product id or the name the shop uses, e.g. "rice" or "semovita"'),
          qty: z.coerce.number().int().positive().describe("Whole units sold"),
          unitPrice: z.coerce
            .number()
            .nonnegative()
            .optional()
            .describe("Selling price per unit in naira; omit to use the product's saved price"),
        }),
      )
      .min(1)
      .max(30)
      .describe("Items sold, one entry per product"),
    customer: z
      .string()
      .optional()
      .describe("Customer id or name. Required when anything is left unpaid; optional for walk-in cash sales."),
    createCustomerIfMissing: flagArg("Create the customer if nobody by that name exists yet; defaults to true"),
    paid: z.coerce
      .number()
      .nonnegative()
      .optional()
      .describe("Naira paid now. Omit when paid in full; 0 when it is all on credit."),
    method: methodArg,
    dueDate: dayArg.optional().describe("Day the customer promised to pay the rest, YYYY-MM-DD (only when something is unpaid)"),
    note: z.string().max(280).optional().describe("Short free-text note"),
    occurredAt: occurredAtArg,
  }),
  outputSchema: writeResultOut,
  errors,
  run: async (args, ctx) => {
    const actor = requireActor(ctx);
    const shop = await requireShop(args.shopId, "write");
    const id = await postSale(shop, actor, {
      lines: args.lines,
      customer: args.customer,
      createCustomerIfMissing: flag(args.createCustomerIfMissing, true),
      paid: args.paid,
      method: args.method,
      dueDate: args.dueDate,
      note: args.note,
      occurredAt: args.occurredAt,
    });
    return writeResult(shop, id);
  },
});
