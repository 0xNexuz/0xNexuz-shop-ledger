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
import { assertCreditOk } from "../server/lib/credit.js";
import { postSale } from "../server/lib/ledger.js";
import { requireActor, requireShop } from "../server/lib/shop.js";

const errors = defineActionErrors(
  "insufficient_stock",
  "credit_needs_customer",
  "overpaid",
  "unknown_product",
  "ambiguous_product",
  "ambiguous_customer",
  "similar_customer",
  "price_missing",
  "invalid_amount",
  "invalid_quantity",
  "invalid_due_date",
  "invalid_time",
  "credit_check",
  "no_shop",
);

export default defineAction({
  description:
    "Record a sale: what was sold, to whom, and how much was paid now. Any unpaid remainder goes on the customer's credit. Rejects with credit_check (409) when more credit would go to someone well past their promised date or over their limit: tell the owner the reason in one line and ask; only if they agree, call again with confirmCredit: true. Rejects with insufficient_stock (409) when stock would go below zero, credit_needs_customer when part is unpaid and no customer is named, and unknown_product/ambiguous_product when a product name doesn't resolve: report these to the user, don't guess. Rejects with similar_customer (409) when a new name looks like an existing customer (a typo, or a fuller name): ask the owner which one; use the existing name, or only if they say it is someone new, call again with newCustomer: true.",
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
    newCustomer: flagArg("Only after a similar_customer warning, when the owner says this name is a new customer"),
    paid: z.coerce
      .number()
      .nonnegative()
      .optional()
      .describe("Naira paid now. Omit when paid in full; 0 when it is all on credit."),
    method: methodArg,
    dueDate: dayArg.optional().describe("Day the customer promised to pay the rest, YYYY-MM-DD (only when something is unpaid)"),
    note: z.string().max(280).optional().describe("Short free-text note"),
    occurredAt: occurredAtArg,
    confirmCredit: flagArg("Only after the owner has seen a credit_check warning and said to go ahead"),
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
      newCustomer: flag(args.newCustomer, false),
      paid: args.paid,
      method: args.method,
      dueDate: args.dueDate,
      note: args.note,
      occurredAt: args.occurredAt,
      creditCheck: flag(args.confirmCredit, false)
        ? undefined
        : (customerId, creditKobo) => assertCreditOk(shop, customerId, creditKobo),
    });
    return writeResult(shop, id);
  },
});
