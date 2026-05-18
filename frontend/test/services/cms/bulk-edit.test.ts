import { describe, it, expect } from "vitest";
import { resolveBulkTargetRows, mapEntitiesById } from "@/services/cms/bulk-edit";

describe("bulk-edit helpers", () => {
  it("returns selectedRows when multiple selected and primary included", () => {
    const selected = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const primary = { id: 2 };
    const result = resolveBulkTargetRows(selected, primary);
    expect(result).toBe(selected);
  });

  it("returns only primary when selection not including primary", () => {
    const selected = [{ id: 1 }, { id: 3 }];
    const primary = { id: 2 };
    const result = resolveBulkTargetRows(selected, primary);
    expect(result).toEqual([primary]);
  });

  it("returns only primary when selection length <= 1", () => {
    const selected: { id: number }[] = [{ id: 1 }];
    const primary = { id: 1 };
    const result = resolveBulkTargetRows(selected, primary);
    expect(result).toEqual([primary]);
  });

  it("mapEntitiesById creates a map keyed by id", () => {
    const items = [{ id: 5, name: "a" }, { id: 9, name: "b" }];
    const map = mapEntitiesById(items);
    expect(map.get(5)).toBe(items[0]);
    expect(map.get(9)).toBe(items[1]);
    expect(map.size).toBe(2);
  });
});
