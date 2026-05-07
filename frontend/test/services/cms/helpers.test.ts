import { describe, expect, it } from "vitest";
import { emptyLangRecord, extractEventIds, makeEditorValues } from "@/services/cms";

describe("cms helpers", () => {
  it("returns an empty language record", () => {
    expect(emptyLangRecord()).toEqual({ nl: "", fr: "", en: "" });
  });

  it("extracts event ids from mixed references", () => {
    const ids = extractEventIds([1, "2", { id: 3 }, { id: "4" }, null, { id: "x" }]);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("maps editor values with defaults", () => {
    expect(makeEditorValues(undefined)).toEqual({ nl: "", fr: "", en: "" });
    expect(makeEditorValues({ nl: "x" })).toEqual({ nl: "x", fr: "", en: "" });
  });
});
