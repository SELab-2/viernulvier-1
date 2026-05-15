/**
 * @file Composable that provides archive statistics.
 *
 * Fetches the live productions count from the API on mount and exposes
 * it as a reactive ref. The landing page uses this as a subtle
 * "X+ producties doorzoekbaar" line under the hero search bar — no
 * other consumers today.
 *
 * The list endpoint already returns `{ items, total }`; we ask for
 * one item just to read `total` (cheap on the backend, single round
 * trip). When a dedicated stats endpoint exists we can swap the call
 * site without touching consumers.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useArchiveStats } from "@/composables/useArchiveStats";
 * const { stats, isLoading } = useArchiveStats();
 * </script>
 * ```
 */

import { onMounted, ref } from "vue";
import { getProductions } from "@/services/productions";

export interface ArchiveStats {
  productions: number;
}

/**
 * Fallback value used while the request is in flight and after a
 * failure. A non-zero placeholder keeps the hint line laid out so the
 * page doesn't flicker; a real count replaces it as soon as the API
 * responds.
 */
const FALLBACK_STATS: ArchiveStats = {
  productions: 2500,
};

export function useArchiveStats() {
  const stats = ref<ArchiveStats>({ ...FALLBACK_STATS });
  const isLoading = ref(true);

  onMounted(async () => {
    try {
      const { total } = await getProductions({ limit: 1, offset: 0 });
      stats.value = { productions: total };
    } catch {
      // Swallow — the fallback stays in place. Surfacing a network
      // error for a decorative hint line would be more confusing than
      // useful.
    } finally {
      isLoading.value = false;
    }
  });

  return { stats, isLoading };
}
