/**
 * @file Composable that provides archive statistics.
 *
 * Currently returns manually-set placeholder values (0).
 * These should be updated after scraping/importing the archive data,
 * using approximate values (e.g. "1 000+", "10k+").
 *
 * For milestone 3, consider replacing this with a server-side
 * endpoint that computes stats via optimised queries.
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
  events: number;
  yearsOfHistory: number;
  genres: number;
}

/**
 * Manually-set archive statistics.
 *
 * TODO: Update with real approximate values after data import.
 * TODO (milestone 3): Replace with server-side stats endpoint.
 */
const MANUAL_STATS: ArchiveStats = {
  productions: 2500,
  events: 4000,
  yearsOfHistory: 20,
  genres: 20,
};

export function useArchiveStats() {
  const stats = ref<ArchiveStats>(MANUAL_STATS);
  const isLoading = ref(false);

  return { stats, isLoading };
}
