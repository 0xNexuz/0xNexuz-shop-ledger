import { describe, expect, it } from "vitest";

import { lookalikes, matchByName } from "./match";
import { openPromise } from "./promises";
import { CUSTOMER_MATCH, type CustomerRow, resolveCustomer } from "./shop";

function customer(id: string, name: string, aliases: string[] = []): CustomerRow {
  return { id, name, phone: null, balanceKobo: 0, aliases };
}

describe("matchByName: whole words only", () => {
  const people = [customer("c1", "Ada"), customer("c2", "Chukwuemeka Obi"), customer("c3", "Mama Ngozi")];

  it("never treats a longer name as a shorter one inside it", () => {
    expect(matchByName(people, "Adaeze").kind).toBe("none");
    expect(matchByName(people, "Emeka").kind).toBe("none");
  });

  it("still finds a person by one of their words", () => {
    expect(matchByName(people, "ngozi")).toEqual({ kind: "match", item: people[2] });
    expect(matchByName(people, "chukwuemeka")).toEqual({ kind: "match", item: people[1] });
  });

  it("lets a product match from a longer phrase, but not a person", () => {
    const products = [{ id: "p1", name: "Rice" }];
    expect(matchByName(products, "bag of rice")).toEqual({ kind: "match", item: products[0] });
    const result = matchByName(people, "Ada Obi", CUSTOMER_MATCH);
    expect(result.kind).toBe("none");
    if (result.kind === "none") expect(result.suggestions.map((c) => c.id)).toContain("c1");
  });

  it("suggests the person a typo was meant for", () => {
    const result = matchByName(people, "Mama Ngozzi", CUSTOMER_MATCH);
    expect(result.kind).toBe("none");
    if (result.kind === "none") expect(result.suggestions[0]?.id).toBe("c3");
  });
});

describe("lookalikes", () => {
  const people = [customer("c1", "Ada"), customer("c3", "Mama Ngozi", ["Mama Pikin"]), customer("c4", "Chinedu Okafor")];

  it("flags typos, fuller names and nickname typos", () => {
    expect(lookalikes(people, "Mama Ngozzi").map((c) => c.id)).toEqual(["c3"]);
    expect(lookalikes(people, "Ada Obi").map((c) => c.id)).toEqual(["c1"]);
    expect(lookalikes(people, "Chinedu Okafo").map((c) => c.id)).toEqual(["c4"]);
    expect(lookalikes(people, "Mama Pikn").map((c) => c.id)).toEqual(["c3"]);
  });

  it("leaves genuinely different names alone", () => {
    expect(lookalikes(people, "Mama Bose")).toEqual([]);
    expect(lookalikes(people, "Adaeze")).toEqual([]);
    expect(lookalikes(people, "Tunde Bakare")).toEqual([]);
  });
});

describe("resolveCustomer", () => {
  const people = [customer("c1", "Ada"), customer("c3", "Mama Ngozi")];

  it("asks before opening a second account for someone who may exist", () => {
    expect(() => resolveCustomer(people, "Mama Ngozzi", true)).toThrow(/looks like Mama Ngozi/);
    expect(() => resolveCustomer(people, "Ada Obi", true)).toThrow(/looks like Ada/);
    try {
      resolveCustomer(people, "Ada Obi", true);
    } catch (error) {
      expect(error).toMatchObject({ errorCode: "similar_customer" });
    }
  });

  it("creates the customer once the owner says they are new", () => {
    expect(resolveCustomer(people, "Ada Obi", true, { confirmedNew: true })).toEqual({ create: "Ada Obi" });
  });

  it("creates a clearly new name without asking, and reuses an existing one", () => {
    expect(resolveCustomer(people, "Adaeze", true)).toEqual({ create: "Adaeze" });
    expect(resolveCustomer(people, "ngozi", true)).toEqual({ existing: people[1] });
  });
});

describe("openPromise", () => {
  it("forgets promises from a debt that was cleared", () => {
    const moves = [
      { delta: 5_000_000, dueDate: "2026-10-01" },
      { delta: -5_000_000, dueDate: null },
      { delta: 2_000_000, dueDate: null },
    ];
    expect(openPromise(moves)).toBeNull();
  });

  it("uses the new promise after an old debt was cleared", () => {
    const moves = [
      { delta: 5_000_000, dueDate: "2026-11-20" },
      { delta: -5_000_000, dueDate: null },
      { delta: 2_000_000, dueDate: "2026-11-06" },
    ];
    expect(openPromise(moves)).toBe("2026-11-06");
  });

  it("keeps the latest promise while a debt is still open", () => {
    const moves = [
      { delta: 5_000_000, dueDate: "2026-10-30" },
      { delta: -1_000_000, dueDate: null },
      { delta: 2_000_000, dueDate: "2026-11-06" },
      { delta: 1_000_000, dueDate: null },
    ];
    expect(openPromise(moves)).toBe("2026-11-06");
  });

  it("has no promise when nothing is owed", () => {
    expect(openPromise([])).toBeNull();
  });
});
