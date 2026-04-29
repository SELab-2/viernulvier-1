import { ref, type Ref } from "vue";

type TranslateFunction = (key: string, params?: Record<string, unknown>) => string;

export interface UseCmsRemoveOptions<TRow> {
  selectedCount: Ref<number>;
  getSelectedRows: () => TRow[];
  deleteFn: (id: number) => Promise<void>;
  rowToId: (row: TRow) => number;
  t: TranslateFunction;
  /** Called after all selected rows have been deleted successfully. */
  onSuccess?: () => void | Promise<void>;
}

/**
 * Shared CMS row-removal flow: open/close confirm modal, batch-delete the
 * currently selected rows, surface errors, and notify on success.
 *
 * Selection and grid wiring stay with the caller — pass {@link getSelectedRows}
 * (typically `gridApi.getSelectedRows()`) and any post-delete cleanup
 * (deselect, reload, success toast) via {@link onSuccess}.
 */
export function useCmsRemove<TRow>(options: UseCmsRemoveOptions<TRow>) {
  const removeConfirmOpen = ref(false);
  const removeConfirmLoading = ref(false);
  const removeConfirmError = ref<string | null>(null);

  function openConfirm(): void {
    if (options.selectedCount.value === 0) {
      return;
    }
    removeConfirmError.value = null;
    removeConfirmOpen.value = true;
  }

  function closeConfirm(): void {
    removeConfirmOpen.value = false;
    removeConfirmError.value = null;
  }

  async function confirmRemove(): Promise<void> {
    const selectedRows = options.getSelectedRows();
    if (selectedRows.length === 0) {
      closeConfirm();
      return;
    }

    removeConfirmLoading.value = true;
    removeConfirmError.value = null;

    try {
      await Promise.all(selectedRows.map((row) => options.deleteFn(options.rowToId(row))));
      await options.onSuccess?.();
      closeConfirm();
    } catch (error) {
      removeConfirmError.value =
        error instanceof Error
          ? options.t("cms.errors.saveFailed", { message: error.message })
          : options.t("cms.errors.saveGeneric");
    } finally {
      removeConfirmLoading.value = false;
    }
  }

  return {
    removeConfirmOpen,
    removeConfirmLoading,
    removeConfirmError,
    openConfirm,
    closeConfirm,
    confirmRemove,
  };
}
