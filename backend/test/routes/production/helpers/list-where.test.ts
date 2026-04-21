import { describe, expect, test } from "vitest";
import {
  buildProductionListWhere,
  parsePositiveIdList,
} from "@/routes/production/helpers/list-where.js";

describe("parsePositiveIdList", () => {
  test("returns [] for undefined, empty, or whitespace", () => {
    expect(parsePositiveIdList(undefined)).toEqual([]);
    expect(parsePositiveIdList("")).toEqual([]);
    expect(parsePositiveIdList("  \t ")).toEqual([]);
  });

  test("parses positive ints, dedupes, preserves order, caps at 30", () => {
    expect(parsePositiveIdList("3,1,2")).toEqual([3, 1, 2]);
    expect(parsePositiveIdList("1,1,2")).toEqual([1, 2]);
    const many = Array.from({ length: 40 }, (_, i) => i + 1).join(",");
    expect(parsePositiveIdList(many)).toHaveLength(30);
    expect(parsePositiveIdList(many)[29]).toBe(30);
  });

  test("drops non-finite, non-positive, or out-of-range ids", () => {
    expect(parsePositiveIdList("0,-1,3.5,3,2147483648")).toEqual([3]);
  });
});

describe("buildProductionListWhere", () => {
  test("short-circuits to legacy old_id only", () => {
    const r = buildProductionListWhere(["x"], [9], { from: 1, to: 2 }, "a", "b", 42);
    expect(r.whereSql).toBe(" WHERE p.old_id = $1");
    expect(r.params).toEqual([42]);
  });

  test("empty filters yields empty SQL", () => {
    expect(buildProductionListWhere([], [], undefined, undefined, undefined)).toEqual({
      whereSql: "",
      params: [],
    });
  });

  test("search param escapes ILIKE specials and wraps with wildcards", () => {
    const r = buildProductionListWhere(["a%b_c\\"], [], undefined, undefined, undefined);
    // term ends with one backslash → escaped as \\ inside the pattern
    expect(r.params[0]).toBe("%a\\%b\\_c\\\\%");
    expect(r.whereSql).toContain("ILIKE $1");
  });

  test("AND-merges search, tags, year span, and date span", () => {
    const r = buildProductionListWhere(
      ["ham"],
      [5, 7],
      { from: 2015, to: 2020 },
      "2024-01-01",
      "2024-12-31",
    );
    expect(r.params).toEqual([
      "%ham%",
      5,
      7,
      2015,
      2020,
      "2024-01-01",
      "2024-12-31",
    ]);
    expect(r.whereSql.startsWith(" WHERE ")).toBe(true);
    // Inner EXISTS clauses also use "AND"; do not split naïvely on " AND ".
    expect(r.whereSql).toContain("production_tag pt");
    expect(r.whereSql).toContain("EXTRACT(YEAR FROM");
    expect(r.whereSql).toContain("::date >=");
  });
});
