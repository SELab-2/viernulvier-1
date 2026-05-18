export interface CmsBulkEditableRow {
  id: number;
}

/**
 * Returns bulk-edit targets.
 *
 * If multiple rows are selected and include the clicked row, all selected rows are targeted.
 * Otherwise only the clicked row is targeted.
 */
export function resolveBulkTargetRows<T extends CmsBulkEditableRow>(
  selectedRows: T[],
  primaryRow: T,
): T[] {
  if (
    selectedRows.length > 1
    && selectedRows.some((row) => row.id === primaryRow.id)
  ) {
    return selectedRows;
  }

  return [primaryRow];
}

/**
 * Indexes entities by id for fast lookup when applying bulk-update responses.
 */
export function mapEntitiesById<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map((item) => [item.id, item]));
}
