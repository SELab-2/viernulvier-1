import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCmsRemove } from "@/composables/useCmsRemove";

interface Row {
  id: number;
}

function makeRemove(overrides: Partial<Parameters<typeof useCmsRemove<Row>>[0]> = {}) {
  const selectedCount = ref(2);
  const rows: Row[] = [{ id: 1 }, { id: 2 }];
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  const onSuccess = vi.fn();

  const remove = useCmsRemove<Row>({
    selectedCount,
    getSelectedRows: () => rows,
    rowToId: (row) => row.id,
    deleteFn,
    t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key),
    onSuccess,
    ...overrides,
  });

  return { remove, selectedCount, rows, deleteFn, onSuccess };
}

describe("useCmsRemove", () => {
  describe("openRemoveConfirm", () => {
    it("opens the modal when at least one row is selected", () => {
      const { remove } = makeRemove();

      remove.openRemoveConfirm();

      expect(remove.removeConfirmOpen.value).toBe(true);
      expect(remove.removeConfirmError.value).toBeNull();
    });

    it("is a no-op when nothing is selected", () => {
      const { remove } = makeRemove({ selectedCount: ref(0) });

      remove.openRemoveConfirm();

      expect(remove.removeConfirmOpen.value).toBe(false);
    });

    it("clears any previous error before opening", () => {
      const { remove } = makeRemove();
      remove.removeConfirmError.value = "old error";

      remove.openRemoveConfirm();

      expect(remove.removeConfirmError.value).toBeNull();
    });
  });

  describe("closeRemoveConfirm", () => {
    it("closes the modal and clears the error", () => {
      const { remove } = makeRemove();
      remove.removeConfirmOpen.value = true;
      remove.removeConfirmError.value = "boom";

      remove.closeRemoveConfirm();

      expect(remove.removeConfirmOpen.value).toBe(false);
      expect(remove.removeConfirmError.value).toBeNull();
    });
  });

  describe("confirmRemove", () => {
    it("deletes each selected row in parallel and runs onSuccess", async () => {
      const { remove, deleteFn, onSuccess } = makeRemove();
      remove.openRemoveConfirm();

      await remove.confirmRemove();

      expect(deleteFn).toHaveBeenCalledTimes(2);
      expect(deleteFn).toHaveBeenCalledWith(1);
      expect(deleteFn).toHaveBeenCalledWith(2);
      expect(onSuccess).toHaveBeenCalledOnce();
      expect(remove.removeConfirmOpen.value).toBe(false);
    });

    it("works without an onSuccess callback", async () => {
      const { remove, deleteFn } = makeRemove({ onSuccess: undefined });
      remove.openRemoveConfirm();

      await remove.confirmRemove();

      expect(deleteFn).toHaveBeenCalledTimes(2);
      expect(remove.removeConfirmOpen.value).toBe(false);
    });

    it("closes silently when the selection became empty before confirm", async () => {
      const { remove, deleteFn, onSuccess } = makeRemove({ getSelectedRows: () => [] });
      remove.removeConfirmOpen.value = true;

      await remove.confirmRemove();

      expect(deleteFn).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(remove.removeConfirmOpen.value).toBe(false);
    });

    it("toggles the loading flag for the duration of the call", async () => {
      let resolveDelete!: () => void;
      const deleteFn = vi.fn(() => new Promise<void>((resolve) => { resolveDelete = resolve; }));
      const { remove } = makeRemove({
        deleteFn,
        selectedCount: ref(1),
        getSelectedRows: () => [{ id: 1 }],
      });
      remove.openRemoveConfirm();

      const pending = remove.confirmRemove();

      expect(remove.removeConfirmLoading.value).toBe(true);
      resolveDelete();
      await pending;

      expect(remove.removeConfirmLoading.value).toBe(false);
    });

    it("surfaces an Error rejection via the saveFailed key and keeps the modal open", async () => {
      const deleteFn = vi.fn().mockRejectedValue(new Error("boom"));
      const { remove, onSuccess } = makeRemove({ deleteFn });
      remove.openRemoveConfirm();

      await remove.confirmRemove();

      expect(remove.removeConfirmError.value).toContain("cms.errors.saveFailed");
      expect(remove.removeConfirmError.value).toContain("boom");
      expect(remove.removeConfirmOpen.value).toBe(true);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("uses the generic key for non-Error rejections", async () => {
      const deleteFn = vi.fn().mockRejectedValue("nope");
      const { remove } = makeRemove({ deleteFn });
      remove.openRemoveConfirm();

      await remove.confirmRemove();

      expect(remove.removeConfirmError.value).toBe("cms.errors.saveGeneric");
    });
  });
});
