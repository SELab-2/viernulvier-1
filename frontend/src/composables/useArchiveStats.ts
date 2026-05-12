/**
 * @file Composable that provides archive statistics.
 *
 * Currently returns a manually-set placeholder value. The landing page
 * uses the productions count as a subtle "X+ producties doorzoekbaar"
 * line under the hero search bar — nothing else is consumed.
 *
 * For milestone 3, replace the manual constant with a server-side
 * endpoint that computes the count via an optimised query.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useArchiveStats } from "@/composables/useArchiveStats";
 * const { stats } = useArchiveStats();
 * </script>
 * ```
 */

import { ref } from "vue";

export interface ArchiveStats {
  productions: number;
}

/**
 * Manually-set archive statistics.
 *
 * TODO: Update with the real approximate value after data import.
 * TODO (milestone 3): Replace with a server-side stats endpoint.
 */
const MANUAL_STATS: ArchiveStats = {
  productions: 2500,
};

export function useArchiveStats() {
  const stats = ref<ArchiveStats>(MANUAL_STATS);
  const isLoading = ref(false);

  return { stats, isLoading };
}
