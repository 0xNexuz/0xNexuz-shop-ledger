import { NoWriteError } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";

import { getDb, schema } from "../db/index.js";
import { normalizeName } from "./match.js";
import { type ShopRef, loadCustomers, loadProducts, resolveCustomer, resolveProduct } from "./shop.js";

/**
 * "Learns your shop": the owner says "Mama N" or "one bag" and the books know
 * who or what that is. Nicknames only change how names are matched; they
 * never touch money or stock. A nickname can belong to one record only, and
 * it can't be another record's real name.
 */

const MAX_NICKNAMES = 12;

export type NicknameKind = "customer" | "product";

function cleanNickname(value: string): string {
  const nickname = value.trim().replace(/\s+/g, " ");
  if (normalizeName(nickname).length < 2 || nickname.length > 40) {
    throw new NoWriteError("A nickname needs 2 to 40 letters or numbers.", { errorCode: "invalid_nickname", statusCode: 400 });
  }
  return nickname;
}

async function roster(shop: ShopRef, kind: NicknameKind) {
  return kind === "customer" ? loadCustomers(shop.id) : loadProducts(shop.id, true);
}

async function target(shop: ShopRef, kind: NicknameKind, ref: string) {
  if (kind === "customer") {
    const resolved = resolveCustomer(await loadCustomers(shop.id), ref, false);
    if (!("existing" in resolved)) throw new NoWriteError(`No customer called "${ref}".`, { errorCode: "unknown_customer", statusCode: 404 });
    return resolved.existing;
  }
  return resolveProduct(await loadProducts(shop.id, true), ref);
}

async function save(shop: ShopRef, kind: NicknameKind, id: string, aliases: string[]): Promise<void> {
  const table = kind === "customer" ? schema.customers : schema.products;
  await getDb()
    .update(table)
    .set({ aliases: JSON.stringify(aliases) })
    .where(and(eq(table.id, id), eq(table.shopId, shop.id)));
}

export async function addNickname(
  shop: ShopRef,
  input: { kind: NicknameKind; ref: string; nickname: string },
): Promise<{ id: string; name: string; aliases: string[]; message: string }> {
  const nickname = cleanNickname(input.nickname);
  const item = await target(shop, input.kind, input.ref);
  const key = normalizeName(nickname);
  if (normalizeName(item.name) === key || item.aliases.some((a) => normalizeName(a) === key)) {
    return { id: item.id, name: item.name, aliases: item.aliases, message: `${item.name} is already known as "${nickname}".` };
  }
  const clash = (await roster(shop, input.kind)).find(
    (other) => other.id !== item.id && (normalizeName(other.name) === key || other.aliases.some((a) => normalizeName(a) === key)),
  );
  if (clash) {
    throw new NoWriteError(`"${nickname}" already means ${clash.name}. Remove it there first, or pick another nickname.`, {
      errorCode: "nickname_taken",
      statusCode: 409,
      details: { id: clash.id, name: clash.name },
    });
  }
  if (item.aliases.length >= MAX_NICKNAMES) {
    throw new NoWriteError(`${item.name} already has ${MAX_NICKNAMES} nicknames. Remove one first.`, {
      errorCode: "too_many_nicknames",
      statusCode: 409,
    });
  }
  const aliases = [...item.aliases, nickname];
  await save(shop, input.kind, item.id, aliases);
  return { id: item.id, name: item.name, aliases, message: `Got it: "${nickname}" means ${item.name}.` };
}

export async function removeNickname(
  shop: ShopRef,
  input: { kind: NicknameKind; ref: string; nickname: string },
): Promise<{ id: string; name: string; aliases: string[]; message: string }> {
  const item = await target(shop, input.kind, input.ref);
  const key = normalizeName(input.nickname);
  const aliases = item.aliases.filter((a) => normalizeName(a) !== key);
  if (aliases.length === item.aliases.length) {
    throw new NoWriteError(`${item.name} has no nickname "${input.nickname}".`, { errorCode: "not_found", statusCode: 404 });
  }
  await save(shop, input.kind, item.id, aliases);
  return { id: item.id, name: item.name, aliases, message: `"${input.nickname.trim()}" no longer means ${item.name}.` };
}
