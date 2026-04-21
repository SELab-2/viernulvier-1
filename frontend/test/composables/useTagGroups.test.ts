import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import { useTagGroups } from "@/composables/useTagGroups";

// ─── Mock services ────────────────────────────────────────────────────────────
const mockGetTags     = vi.fn();
const mockGetTagTypes = vi.fn();

vi.mock("@/services/tags", () => ({
  getTags:     (...a: any[]) => mockGetTags(...a),
  getTagTypes: (...a: any[]) => mockGetTagTypes(...a),
}));

// ─── Mock i18n ────────────────────────────────────────────────────────────────

const { mockLocale } = vi.hoisted(() => {
  const locale = { value: "nl" };
  return { mockLocale: locale };
});

vi.mock("@/i18n", () => ({
  i18n: {
    global: { locale: mockLocale },
  },
}));

vi.mock("@/utils/i18n", () => ({
  localizeOrEmpty: (map: Record<string, string>, lang: string) =>
    map?.[lang] ?? map?.["nl"] ?? Object.values(map ?? {})[0] ?? "",
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mountComposable(productionId = 1) {
  let result: ReturnType<typeof useTagGroups>;

  mount(
    defineComponent({
      setup() {
        result = useTagGroups(productionId);
        return {};
      },
      template: "<div />",
    }),
  );

  return result!;
}

const makeTag = (id: number, typeId: number, name: Record<string, string> = { nl: `Tag ${id}` }) => ({
  id,
  old_id: null,
  name,
  tag_type: typeId,
  public: true,
});

const makeTagType = (id: number, name: Record<string, string> = { nl: `Type ${id}` }) => ({
  id,
  name,
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("useTagGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale.value = "nl";
    mockGetTags.mockResolvedValue([]);
    mockGetTagTypes.mockResolvedValue([]);
  });

  // ── Initial state ────────────────────────────────────────────────────────────
  describe("initial state", () => {
    it("loading starts as false (set to true only during fetch)", () => {
      mockGetTags.mockReturnValue(new Promise(() => {}));
      mockGetTagTypes.mockReturnValue(new Promise(() => {}));

      const { loading } = mountComposable();

      expect(loading.value).toBe(true);
    });

    it("error starts as null", () => {
      mockGetTags.mockReturnValue(new Promise(() => {}));
      mockGetTagTypes.mockReturnValue(new Promise(() => {}));

      const { error } = mountComposable();
      expect(error.value).toBeNull();
    });

    it("tagGroups starts as empty array", () => {
      mockGetTags.mockReturnValue(new Promise(() => {}));
      mockGetTagTypes.mockReturnValue(new Promise(() => {}));

      const { tagGroups } = mountComposable();
      expect(tagGroups.value).toEqual([]);
    });

    it("totalTags starts at 0", () => {
      mockGetTags.mockReturnValue(new Promise(() => {}));
      mockGetTagTypes.mockReturnValue(new Promise(() => {}));

      const { totalTags } = mountComposable();
      expect(totalTags.value).toBe(0);
    });
  });

  // ── After successful fetch ────────────────────────────────────────────────────
  describe("after a successful fetch", () => {
    it("loading becomes false", async () => {
      const { loading } = mountComposable();
      await flushPromises();
      expect(loading.value).toBe(false);
    });

    it("error stays null on success", async () => {
      const { error } = mountComposable();
      await flushPromises();
      expect(error.value).toBeNull();
    });

    it("calls getTags with the correct productionId", async () => {
      mountComposable(99);
      await flushPromises();
      expect(mockGetTags).toHaveBeenCalledWith(99);
    });
  });

  // ── tagGroups computed ────────────────────────────────────────────────────────
  describe("tagGroups computed", () => {
    it("returns empty array when tags list is empty", async () => {
      mockGetTags.mockResolvedValue([]);
      mockGetTagTypes.mockResolvedValue([makeTagType(1)]);

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toEqual([]);
    });

    it("ignores tags with null or empty names", async () => {
      mockGetTags.mockResolvedValue([
        { id: 1, old_id: null, name: null, tag_type: 10, public: true },
        { id: 2, old_id: null, name: { nl: "   " }, tag_type: 10, public: true },
      ]);
      mockGetTagTypes.mockResolvedValue([
        { id: 10, name: { nl: "Genre" } },
      ]);

      const { tagGroups, totalTags } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toHaveLength(0);
      expect(totalTags.value).toBe(0);
    });

    it("returns empty array when types list is empty", async () => {
      mockGetTags.mockResolvedValue([makeTag(1, 1)]);
      mockGetTagTypes.mockResolvedValue([]);

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toEqual([]);
    });

    it("groups tags under their matching type label", async () => {
      mockGetTags.mockResolvedValue([
        makeTag(1, 10, { nl: "Jazz" }),
        makeTag(2, 10, { nl: "Blues" }),
      ]);
      mockGetTagTypes.mockResolvedValue([makeTagType(10, { nl: "Genre" })]);

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toHaveLength(1);
      expect(tagGroups.value[0].label).toBe("Genre");
      expect(tagGroups.value[0].tags).toEqual(["Jazz", "Blues"]);
    });

    it("omits types that have no matching tags", async () => {
      mockGetTags.mockResolvedValue([makeTag(1, 10, { nl: "Jazz" })]);
      mockGetTagTypes.mockResolvedValue([
        makeTagType(10, { nl: "Genre" }),
        makeTagType(20, { nl: "Leeftijd" }), // no tags
      ]);

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toHaveLength(1);
      expect(tagGroups.value[0].label).toBe("Genre");
    });

    it("handles multiple tag types each with their own tags", async () => {
      mockGetTags.mockResolvedValue([
        makeTag(1, 10, { nl: "Jazz" }),
        makeTag(2, 20, { nl: "14+" }),
      ]);
      mockGetTagTypes.mockResolvedValue([
        makeTagType(10, { nl: "Genre" }),
        makeTagType(20, { nl: "Leeftijd" }),
      ]);

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toHaveLength(2);
      expect(tagGroups.value.find(g => g.label === "Genre")?.tags).toEqual(["Jazz"]);
      expect(tagGroups.value.find(g => g.label === "Leeftijd")?.tags).toEqual(["14+"]);
    });

    it("uses the current language for tag name localisation", async () => {
      mockLocale.value = "en";
      mockGetTags.mockResolvedValue([
        makeTag(1, 10, { nl: "Jazz NL", en: "Jazz EN" }),
      ]);
      mockGetTagTypes.mockResolvedValue([makeTagType(10, { nl: "Genre NL", en: "Genre EN" })]);

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value[0].label).toBe("Genre EN");
      expect(tagGroups.value[0].tags[0]).toBe("Jazz EN");
    });
  });

  // ── totalTags computed ────────────────────────────────────────────────────────
  describe("totalTags computed", () => {
    it("is 0 when there are no tags", async () => {
      const { totalTags } = mountComposable();
      await flushPromises();
      expect(totalTags.value).toBe(0);
    });

    it("counts all tags across all groups", async () => {
      mockGetTags.mockResolvedValue([
        makeTag(1, 10),
        makeTag(2, 10),
        makeTag(3, 20),
      ]);
      mockGetTagTypes.mockResolvedValue([
        makeTagType(10),
        makeTagType(20),
      ]);

      const { totalTags } = mountComposable();
      await flushPromises();

      expect(totalTags.value).toBe(3);
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────────
  describe("error handling", () => {
    it("stores the error when getTags rejects", async () => {
      const err = new Error("Tags API down");
      mockGetTags.mockRejectedValue(err);

      const { error } = mountComposable();
      await flushPromises();

      expect(error.value).toBe(err);
    });

    it("stores the error when getTagTypes rejects", async () => {
      const err = new Error("Types API down");
      mockGetTagTypes.mockRejectedValue(err);

      const { error } = mountComposable();
      await flushPromises();

      expect(error.value).toBe(err);
    });

    it("sets loading to false after an error", async () => {
      mockGetTags.mockRejectedValue(new Error("fail"));

      const { loading } = mountComposable();
      await flushPromises();

      expect(loading.value).toBe(false);
    });

    it("leaves tagGroups empty after an error", async () => {
      mockGetTags.mockRejectedValue(new Error("fail"));

      const { tagGroups } = mountComposable();
      await flushPromises();

      expect(tagGroups.value).toEqual([]);
    });
  });

  // ── refetch ───────────────────────────────────────────────────────────────────
  describe("refetch", () => {
    it("re-runs the fetch and updates tagGroups", async () => {
      mockGetTags.mockResolvedValue([]);
      mockGetTagTypes.mockResolvedValue([]);

      const { tagGroups, refetch } = mountComposable();
      await flushPromises();
      expect(tagGroups.value).toEqual([]);

      mockGetTags.mockResolvedValue([makeTag(1, 10, { nl: "Rock" })]);
      mockGetTagTypes.mockResolvedValue([makeTagType(10, { nl: "Genre" })]);

      await refetch();
      await flushPromises();

      expect(tagGroups.value).toHaveLength(1);
      expect(tagGroups.value[0].tags).toEqual(["Rock"]);
    });

    it("resets error to null at the start of a refetch", async () => {
      mockGetTags.mockRejectedValue(new Error("first fail"));

      const { error, refetch } = mountComposable();
      await flushPromises();
      expect(error.value).not.toBeNull();

      mockGetTags.mockResolvedValue([]);
      await refetch();
      await flushPromises();

      expect(error.value).toBeNull();
    });
  });
});