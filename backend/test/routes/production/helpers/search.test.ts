import { describe, expect, test } from "vitest";
import {
  MAX_SEARCH_TERMS,
  productionListSearchClause,
  SearchParamSchema,
} from "@/routes/production/helpers/search.js";

describe("SearchParamSchema", () => {
  test("splits comma-separated strings and trims", () => {
    expect(SearchParamSchema.parse(["  a , b "])).toEqual(["a", "b"]);
  });

  test("dedupes case-insensitively keeping first spelling", () => {
    expect(SearchParamSchema.parse(["Foo", "foo", "Bar"])).toEqual(["Foo", "Bar"]);
  });

  test("returns undefined for empty / whitespace-only input", () => {
    expect(SearchParamSchema.parse(undefined)).toBeUndefined();
    expect(SearchParamSchema.parse(["", "  "])).toBeUndefined();
  });

  test("enforces max term count", () => {
    const terms = Array.from({ length: MAX_SEARCH_TERMS + 1 }, (_, i) => `t${i}`);
    expect(() => SearchParamSchema.parse(terms)).toThrow();
  });
});

describe("productionListSearchClause", () => {
  test("empty search and no old_id yields empty clause", () => {
    expect(productionListSearchClause({})).toEqual({ sql: "", params: [] });
  });

  test("old_id short-circuits search terms", () => {
    expect(productionListSearchClause({ search: ["x"], old_id: 99 })).toEqual({
      sql: " WHERE p.old_id = $1",
      params: [99],
    });
  });

  test("builds ILIKE clause with escaped specials in params", () => {
    const r = productionListSearchClause({ search: ["100%_a\\"] });
    expect(r.params[0]).toBe("%100\\%\\_a\\\\%");
    expect(r.sql).toContain("ILIKE $1");
    expect(r.sql).toContain(" AND ");
  });

  test("AND-combines multiple terms", () => {
    const r = productionListSearchClause({ search: ["a", "b"] });
    expect(r.params).toEqual(["%a%", "%b%"]);
    expect(r.sql).toMatch(/^ WHERE /);
    expect(r.sql.includes("ILIKE $1")).toBe(true);
    expect(r.sql.includes("ILIKE $2")).toBe(true);
  });
});
