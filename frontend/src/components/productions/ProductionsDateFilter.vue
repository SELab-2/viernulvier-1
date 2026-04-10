<template>
  <div ref="dateFilterRoot" class="relative inline-block">
    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-2 rounded-full border border-surface-3 bg-surface-0 px-4 py-2 text-sm font-medium text-ink-primary transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-surface-1"
      :disabled="disabled"
      :aria-expanded="panelOpen"
      aria-haspopup="dialog"
      @click.stop="panelOpen = !panelOpen"
    >
      <svg
        class="h-4 w-4 shrink-0 opacity-80"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      {{ t("productionsPage.selectDates") }}
    </button>

    <div
      v-if="panelOpen"
      class="absolute left-0 z-30 mt-2 w-[min(100vw-2rem,36rem)] max-h-[min(85vh,32rem)] origin-top-left overflow-y-auto rounded-xl border border-surface-3 bg-surface-1 p-4 shadow-lg"
      role="dialog"
      :aria-label="t('productionsPage.selectDates')"
      @click.stop
    >
      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-ink-primary">
            {{ t("productionsPage.filterByYear") }}
          </h3>
          <button
            type="button"
            class="text-sm font-medium disabled:cursor-not-allowed disabled:opacity-100"
            :class="
              yearsMode === null
                ? 'text-ink-secondary'
                : 'cursor-pointer text-accent-outline hover:underline'
            "
            :disabled="disabled || yearsMode === null"
            :aria-label="
              yearsMode === null
                ? t('productionsPage.allYearsSelected')
                : t('productionsPage.selectAllYears')
            "
            @click="selectAllYears"
          >
            {{
              yearsMode === null
                ? t("productionsPage.allYearsSelected")
                : t("productionsPage.selectAllYears")
            }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="y in yearNumbers"
            :key="y"
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition disabled:opacity-40"
            :class="
              isYearSelected(y)
                ? 'border-tag-genre-bg bg-tag-genre-bg text-tag-genre-text'
                : 'border-surface-3 bg-surface-0 text-ink-primary hover:bg-surface-2 dark:bg-surface-0'
            "
            :disabled="disabled"
            @click="toggleYear(y)"
          >
            {{ y }}
          </button>
        </div>
      </section>

      <hr class="my-4 border-surface-3" />

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-ink-primary">
          {{ t("productionsPage.filterByDateRange") }}
        </h3>
        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-secondary">
            <span>{{ t("productionsPage.dateFrom") }}</span>
            <input
              v-model="dateFrom"
              type="date"
              :disabled="disabled"
              class="rounded-md border border-surface-3 bg-surface-0 px-2 py-1.5 text-sm text-ink-primary dark:bg-surface-0"
              @change="onDateInputsChange"
            />
          </label>
          <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-secondary">
            <span>{{ t("productionsPage.dateTo") }}</span>
            <input
              v-model="dateTo"
              type="date"
              :disabled="disabled"
              class="rounded-md border border-surface-3 bg-surface-0 px-2 py-1.5 text-sm text-ink-primary dark:bg-surface-0"
              @change="onDateInputsChange"
            />
          </label>
          <button
            v-if="dateFrom || dateTo"
            type="button"
            class="cursor-pointer rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-2"
            :disabled="disabled"
            @click="clearDates"
          >
            {{ t("productionsPage.clearDateRange") }}
          </button>
        </div>
        <p class="text-center text-xs leading-snug text-ink-secondary">
          {{ t("productionsPage.dateRangeHint") }}
        </p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    minYear: number;
    maxYear: number;
  }>(),
  { disabled: false },
);

const yearsMode = defineModel<number[] | null>("yearsMode", { required: true });
const dateFrom = defineModel<string | null>("dateFrom", { required: true });
const dateTo = defineModel<string | null>("dateTo", { required: true });

const { t } = useI18n();
const dateFilterRoot = ref<HTMLElement | null>(null);
const panelOpen = ref(false);

const yearNumbers = computed(() => {
  const a: number[] = [];
  for (let y = props.minYear; y <= props.maxYear; y++) a.push(y);
  return a;
});

function isYearSelected(y: number): boolean {
  if (yearsMode.value === null) return true;
  return yearsMode.value.includes(y);
}

function toggleYear(y: number): void {
  if (yearsMode.value === null) {
    yearsMode.value = [y];
    return;
  }
  const set = new Set(yearsMode.value);
  if (set.has(y)) set.delete(y);
  else set.add(y);
  const arr = [...set].sort((a, b) => a - b);
  yearsMode.value = arr.length === 0 ? null : arr;
}

function selectAllYears(): void {
  yearsMode.value = null;
}

function clearDates(): void {
  dateFrom.value = null;
  dateTo.value = null;
}

function onDateInputsChange(): void {
  if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
    const swap = dateTo.value;
    dateTo.value = dateFrom.value;
    dateFrom.value = swap;
  }
}

function onDocClick(ev: MouseEvent): void {
  if (!panelOpen.value) return;
  const el = dateFilterRoot.value;
  const target = ev.target;
  if (el && target instanceof Node && !el.contains(target)) panelOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
});
onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
});
</script>
