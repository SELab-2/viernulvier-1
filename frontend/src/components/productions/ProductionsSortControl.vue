<template>
  <div
    id="productions-sort"
    ref="sortRoot"
    class="productions-sort-control inline-flex h-10 shrink-0 items-stretch rounded-md border border-surface-3 bg-surface-0 text-sm dark:bg-surface-1"
    role="group"
    :aria-label="t('productionsPage.sortByLabel')"
  >
    <div class="relative">
      <button
        id="productions-sort-dimension"
        type="button"
        class="inline-flex h-full w-[7rem] cursor-pointer items-center justify-between gap-1 rounded-l-md border-r border-surface-3 pl-3 pr-2 py-0 text-left text-sm font-medium text-ink-primary transition hover:bg-surface-2 focus-visible:z-10 focus-visible:border-accent-outline focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-100"        :disabled="disabled"
        :aria-expanded="menuOpen"
        aria-haspopup="listbox"
        :aria-controls="menuOpen ? sortListboxId : undefined"
        @click.stop="toggleMenu"
      >
        <span class="inline-flex items-center gap-2 min-w-0 flex-1">
          <svg class="size-3.5 shrink-0 text-ink-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M7 12h10M11 18h6" />
          </svg>
          <span class="min-w-0 truncate">{{ dimensionLabel }}</span>
        </span>
        <svg
          class="size-3.5 shrink-0 text-ink-secondary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <ul
        v-show="menuOpen"
        :id="sortListboxId"
        class="absolute left-0 top-full z-20 mt-1 min-w-[9rem] rounded-md border border-surface-3 bg-surface-1 py-0.5 text-sm dark:bg-surface-0"
        role="listbox"
        :aria-label="t('productionsPage.sortMetricMenuAria')"
        tabindex="-1"
        @click.stop
        @keydown.escape.prevent="closeMenu"
      >
        <li role="presentation">
          <button
            type="button"
            role="option"
            data-sort-metric="name"
            class="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-2"
            :class="sortBy === 'name' ? 'bg-surface-2/80 font-medium' : ''"
            :aria-selected="sortBy === 'name'"
            @click="pickDimension('name')"
          >
            {{ t("productionsPage.sortNameShort") }}
          </button>
        </li>
        <li role="presentation">
          <button
            type="button"
            role="option"
            data-sort-metric="date"
            class="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm text-ink-primary hover:bg-surface-2"
            :class="sortBy === 'date' ? 'bg-surface-2/80 font-medium' : ''"
            :aria-selected="sortBy === 'date'"
            @click="pickDimension('date')"
          >
            {{ t("productionsPage.sortDateShort") }}
          </button>
        </li>
      </ul>
    </div>

    <button
      id="productions-sort-direction"
      type="button"
      class="flex w-8 shrink-0 cursor-pointer items-center justify-center rounded-r-md text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-100"
      :disabled="disabled"
      :aria-label="t('productionsPage.toggleSortDirectionAria')"
      @click="toggleDirection"
    >
      <svg
        v-if="sortDir === 'asc'"
        class="size-[1.2rem]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V6m0 0l-4 4m4-4l4 4" />
      </svg>
      <svg
        v-else
        class="size-[1.2rem]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v13m0 0l-4-4m4 4l4-4" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import type { ProductionSortBy, ProductionSortDir } from "@/services/productions";

const props = defineProps<{
  sortBy: ProductionSortBy;
  sortDir: ProductionSortDir;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  sortChange: [{ sortBy: ProductionSortBy; sortDir: ProductionSortDir }];
}>();

const { t } = useI18n();
const menuOpen = ref(false);
const sortRoot = useTemplateRef<HTMLElement>("sortRoot");
const sortListboxId = useId();

const dimensionLabel = computed(() =>
  props.sortBy === "date"
    ? t("productionsPage.sortDateShort")
    : t("productionsPage.sortNameShort"),
);

function emitIfChanged(sortBy: ProductionSortBy, sortDir: ProductionSortDir) {
  if (sortBy === props.sortBy && sortDir === props.sortDir) return;
  emit("sortChange", { sortBy, sortDir });
}

function closeMenu(): void {
  menuOpen.value = false;
}

function toggleMenu(): void {
  if (props.disabled) return;
  menuOpen.value = !menuOpen.value;
}

function pickDimension(by: ProductionSortBy): void {
  closeMenu();
  emitIfChanged(by, props.sortDir);
}

function toggleDirection(): void {
  const next: ProductionSortDir = props.sortDir === "asc" ? "desc" : "asc";
  emitIfChanged(props.sortBy, next);
}

function onDocClick(ev: MouseEvent): void {
  if (!menuOpen.value) return;
  const el = sortRoot.value;
  const target = ev.target;
  if (el && target instanceof Node && !el.contains(target)) closeMenu();
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
});
onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
});
</script>
