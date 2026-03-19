import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildQueryString,
  debounce,
  groupBy,
  unique,
  uniqueBy,
  sortBy,
  indexById,
} from "@/utils/misc";

// ---------------------------------------------------------------------------
// buildQueryString
// ---------------------------------------------------------------------------

describe("buildQueryString", () => {
  it("encodes a simple key-value pair", () => {
    expect(buildQueryString({ q: "hamlet" })).toBe("q=hamlet");
  });

  it("encodes multiple parameters", () => {
    const qs = buildQueryString({ page: 1, q: "hamlet" });
    expect(qs).toContain("page=1");
    expect(qs).toContain("q=hamlet");
  });

  it("omits keys with null values", () => {
    expect(buildQueryString({ q: "hamlet", lang: null })).not.toContain("lang");
  });

  it("omits keys with undefined values", () => {
    expect(buildQueryString({ q: "hamlet", tag: undefined })).not.toContain("tag");
  });

  it("omits keys with empty string values", () => {
    expect(buildQueryString({ q: "", page: 1 })).toBe("page=1");
  });

  it("returns an empty string when all values are empty", () => {
    expect(buildQueryString({ q: null, tag: undefined, name: "" })).toBe("");
  });

  it("encodes boolean values", () => {
    expect(buildQueryString({ public: true })).toBe("public=true");
    expect(buildQueryString({ public: false })).toBe("public=false");
  });

  it("URL-encodes special characters", () => {
    const qs = buildQueryString({ q: "romeo & juliet" });
    expect(qs).toContain("romeo");
    // URLSearchParams encodes spaces and & correctly
    expect(qs).not.toContain(" ");
  });
});

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not call the function immediately", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    expect(fn).not.toHaveBeenCalled();
  });

  it("calls the function after the delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("resets the timer when called again before the delay", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    vi.advanceTimersByTime(100);
    debounced(); // reset
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("passes the latest arguments to the function", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced("first");
    debounced("second");
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it(".cancel() prevents the pending call from executing", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it(".cancel() is a no-op when no call is pending", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);
    expect(() => debounced.cancel()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------

describe("groupBy", () => {
  const items = [
    { id: 1, type: "drama" },
    { id: 2, type: "comedy" },
    { id: 3, type: "drama" },
  ];

  it("groups items by a key", () => {
    const result = groupBy(items, "type");
    expect(result.get("drama")).toHaveLength(2);
    expect(result.get("comedy")).toHaveLength(1);
  });

  it("returns a Map", () => {
    expect(groupBy(items, "type")).toBeInstanceOf(Map);
  });

  it("includes all items in their groups", () => {
    const result = groupBy(items, "type");
    expect(result.get("drama")).toEqual([
      { id: 1, type: "drama" },
      { id: 3, type: "drama" },
    ]);
  });

  it("returns an empty Map for an empty array", () => {
    expect(groupBy([], "type").size).toBe(0);
  });

  it("handles numeric keys", () => {
    const events = [
      { id: 10, production: 1 },
      { id: 11, production: 2 },
      { id: 12, production: 1 },
    ];
    const result = groupBy(events, "production");
    expect(result.get(1)).toHaveLength(2);
    expect(result.get(2)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// unique
// ---------------------------------------------------------------------------

describe("unique", () => {
  it("removes duplicate primitive values", () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });

  it("preserves the first occurrence of each value", () => {
    expect(unique(["a", "b", "a"])).toEqual(["a", "b"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(unique([])).toEqual([]);
  });

  it("returns the same array when all values are unique", () => {
    expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// uniqueBy
// ---------------------------------------------------------------------------

describe("uniqueBy", () => {
  const items = [
    { id: 1, name: "first" },
    { id: 2, name: "second" },
    { id: 1, name: "duplicate" },
  ];

  it("removes objects with duplicate key values", () => {
    const result = uniqueBy(items, "id");
    expect(result).toHaveLength(2);
  });

  it("keeps the first occurrence", () => {
    const result = uniqueBy(items, "id");
    expect(result[0]?.name).toBe("first");
  });

  it("returns an empty array for empty input", () => {
    expect(uniqueBy([], "id")).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    uniqueBy(items, "id");
    expect(items).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// sortBy
// ---------------------------------------------------------------------------

describe("sortBy", () => {
  it("sorts numbers in ascending order", () => {
    const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
    expect(sortBy(items, "n").map((x) => x.n)).toEqual([1, 2, 3]);
  });

  it("sorts strings alphabetically", () => {
    const items = [{ s: "c" }, { s: "a" }, { s: "b" }];
    expect(sortBy(items, "s").map((x) => x.s)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the original array", () => {
    const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
    sortBy(items, "n");
    expect(items[0]?.n).toBe(3);
  });

  it("returns a new array", () => {
    const items = [{ n: 1 }];
    expect(sortBy(items, "n")).not.toBe(items);
  });

  it("handles an already-sorted array", () => {
    const items = [{ n: 1 }, { n: 2 }, { n: 3 }];
    expect(sortBy(items, "n").map((x) => x.n)).toEqual([1, 2, 3]);
  });

  it("handles an empty array", () => {
    expect(sortBy([], "id" as never)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// indexById
// ---------------------------------------------------------------------------

describe("indexById", () => {
  const items = [
    { id: 1, name: "Hall A" },
    { id: 2, name: "Hall B" },
    { id: 3, name: "Hall C" },
  ];

  it("creates a record keyed by id", () => {
    const result = indexById(items);
    expect(result[1]).toEqual({ id: 1, name: "Hall A" });
    expect(result[2]).toEqual({ id: 2, name: "Hall B" });
  });

  it("allows O(1) access by id", () => {
    const result = indexById(items);
    expect(result[3]?.name).toBe("Hall C");
  });

  it("returns an empty record for an empty array", () => {
    expect(indexById([])).toEqual({});
  });

  it("last entry wins when there are duplicate ids", () => {
    const dups = [
      { id: 1, name: "first" },
      { id: 1, name: "second" },
    ];
    expect(indexById(dups)[1]?.name).toBe("second");
  });
});
