import { ref, computed, onMounted } from "vue";
import type { Tag, TagType } from "@viernulvier/shared";
import { getTags, getTagTypes } from "@/services/tags";
import { localizeOrEmpty, type LanguageMap } from "@/utils/i18n";
import { i18n, type SupportedLang } from "@/i18n";

/**
 * Fetches tags for a production and groups them by their type.
 */
export function useTagGroups(productionId: number) {
  const fetchedTags = ref<Tag[]>([]);
  const fetchedTypes = ref<TagType[]>([]);
  const loading = ref(false);
  const error = ref<unknown>(null);

  // Get current language from global state to translate tag name
  const currentLang = computed(
    () => i18n.global.locale.value as SupportedLang,
  );

  const tProd = (map: LanguageMap | null | undefined) =>
    localizeOrEmpty(map ?? {}, currentLang.value);

  // Fetch API data
  const fetchData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const [tags, types] = await Promise.all([
        getTags(productionId),
        getTagTypes(),
      ]);

      fetchedTags.value = tags;
      fetchedTypes.value = types;
    } catch (err) {
      error.value = err;
    } finally {
      loading.value = false;
    }
  };

  onMounted(fetchData);

  /**
   * Sorts tags into categories (e.g., "Genre").
   * Only returns groups that actually contain tags.
   */
  const tagGroups = computed(() => {
    if (!fetchedTags.value.length || !fetchedTypes.value.length) return [];

    const grouped = new Map<number, string[]>();

    for (const tag of fetchedTags.value) {
      const typeId = tag.tag_type as number;
      const translatedName = tProd(tag.name).trim();

      if (translatedName) {
        if (!grouped.has(typeId)) {
          grouped.set(typeId, []);
        }

        grouped.get(typeId)!.push(translatedName);
      }
    }

    return fetchedTypes.value
      .map((type) => ({
        label: tProd(type.name),
        tags: grouped.get(type.id) ?? [],
      }))
      .filter((g) => g.tags.length > 0);
  });

  // Count of all tags across all groups
  const totalTags = computed(() =>
    tagGroups.value.reduce((acc, g) => acc + g.tags.length, 0),
  );

  return {
    tagGroups,
    totalTags,
    loading,
    error,
    refetch: fetchData,
  };
}