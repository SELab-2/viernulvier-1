import { describe, expect, it } from "vitest";
import { indexLanguageMapValues } from "@/legacy-import/jsonb-name-match.js";

describe("indexLanguageMapValues", () => {
  it("indexes every non-empty string value with keyFn", () => {
    const map = new Map<string, number>();
    indexLanguageMapValues(map, 3, { nl: "A", en: "B", fr: "" }, (s) => s.toLowerCase());
    expect(map.get("a")).toBe(3);
    expect(map.get("b")).toBe(3);
    expect(map.size).toBe(2);
  });
});
