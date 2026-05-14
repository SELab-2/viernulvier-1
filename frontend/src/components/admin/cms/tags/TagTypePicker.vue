<template>
  <div ref="rootRef" class="tag-type-picker" :class="{ 'is-open': isOpen, 'is-disabled': disabled }">
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      class="tag-type-picker-input"
      :placeholder="placeholder ?? t('cms.tagTypePicker.placeholder')"
      :disabled="disabled"
      :data-testid="dataTestid"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @focus="openMenu"
      @input="openMenu"
      @keydown="onKeyDown"
      @blur="onInputBlur"
    />

    <ul
      v-if="isOpen"
      class="tag-type-picker-list"
      role="listbox"
      :aria-label="t('cms.columns.tagType')"
      @mousedown.prevent
    >
      <li
        v-for="(type, index) in filteredTypes"
        :key="type.id"
        class="tag-type-picker-item"
        :class="{ 'is-active': index === activeIndex, 'is-selected': type.id === modelValue }"
        role="option"
        :aria-selected="type.id === modelValue"
        :data-testid="`tag-type-picker-item-${type.id}`"
        @mouseenter="activeIndex = index"
        @click="selectType(type)"
      >
        {{ localizeName(type) || `#${type.id}` }}
      </li>

      <li
        v-if="filteredTypes.length === 0 && !canCreate"
        class="tag-type-picker-empty"
        role="presentation"
      >
        {{ t("cms.tagTypePicker.noMatch") }}
      </li>

      <li
        v-if="canCreate"
        class="tag-type-picker-create"
        :class="{ 'is-active': activeIndex === filteredTypes.length }"
        role="option"
        :aria-selected="false"
        data-testid="tag-type-picker-create"
        @mouseenter="activeIndex = filteredTypes.length"
        @click="requestCreate"
      >
        {{
          query.trim().length > 0
            ? t("cms.tagTypePicker.createNew", { name: query.trim() })
            : t("cms.tagTypePicker.createNewEmpty")
        }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { TagType } from "@viernulvier/shared";
import type { LanguageMap } from "@/utils/language-utils";

const props = defineProps<{
  modelValue: number | null;
  tagTypes: TagType[];
  localize: (map: LanguageMap | null | undefined) => string;
  disabled?: boolean;
  placeholder?: string;
  dataTestid?: string;
  /** Auto-focus the input on mount (useful when used as a grid cell editor). */
  autoFocus?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", id: number | null): void;
  (e: "create-request", initialName: string): void;
  (e: "open"): void;
  (e: "close"): void;
}>();

const { t } = useI18n();

const rootRef = useTemplateRef<HTMLDivElement>("rootRef");
const inputRef = useTemplateRef<HTMLInputElement>("inputRef");
const isOpen = ref(false);
const query = ref("");
const activeIndex = ref(0);

function localizeName(type: TagType): string {
  return props.localize(type.name);
}

function syncQueryFromSelected(): void {
  if (props.modelValue === null) {
    query.value = "";
    return;
  }
  const selected = props.tagTypes.find((type) => type.id === props.modelValue);
  query.value = selected ? localizeName(selected) || `#${selected.id}` : "";
}

const filteredTypes = computed<TagType[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (q.length === 0) {
    return props.tagTypes;
  }
  return props.tagTypes.filter((type) => {
    const label = (localizeName(type) || `#${type.id}`).toLowerCase();
    return label.includes(q);
  });
});

const exactMatch = computed<TagType | null>(() => {
  const q = query.value.trim().toLowerCase();
  if (q.length === 0) return null;
  return (
    props.tagTypes.find((type) => (localizeName(type) || `#${type.id}`).toLowerCase() === q) ??
    null
  );
});

const canCreate = computed<boolean>(() => {
  if (props.disabled) return false;
  return exactMatch.value === null;
});

function openMenu(): void {
  if (props.disabled) return;
  if (!isOpen.value) {
    isOpen.value = true;
    emit("open");
  }
  activeIndex.value = 0;
}

function closeMenu(): void {
  if (!isOpen.value) return;
  isOpen.value = false;
  emit("close");
}

function selectType(type: TagType): void {
  emit("update:modelValue", type.id);
  query.value = localizeName(type) || `#${type.id}`;
  closeMenu();
}

function requestCreate(): void {
  const initial = query.value.trim();
  emit("create-request", initial);
  closeMenu();
}

function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return;
  const totalItems = filteredTypes.value.length + (canCreate.value ? 1 : 0);

  if (event.key === "ArrowDown") {
    event.preventDefault();
    openMenu();
    activeIndex.value = totalItems === 0 ? 0 : (activeIndex.value + 1) % totalItems;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    openMenu();
    activeIndex.value = totalItems === 0 ? 0 : (activeIndex.value - 1 + totalItems) % totalItems;
  } else if (event.key === "Enter") {
    if (!isOpen.value) return;
    event.preventDefault();
    if (activeIndex.value < filteredTypes.value.length) {
      const type = filteredTypes.value[activeIndex.value];
      if (type) selectType(type);
    } else if (canCreate.value) {
      requestCreate();
    }
  } else if (event.key === "Escape") {
    if (isOpen.value) {
      event.preventDefault();
      syncQueryFromSelected();
      closeMenu();
    }
  }
}

function onInputBlur(): void {
  // Slight delay so click on list items can still register.
  window.setTimeout(() => {
    if (!rootRef.value?.contains(document.activeElement)) {
      syncQueryFromSelected();
      closeMenu();
    }
  }, 120);
}

function onDocumentClick(event: MouseEvent): void {
  if (!rootRef.value) return;
  if (!rootRef.value.contains(event.target as Node)) {
    syncQueryFromSelected();
    closeMenu();
  }
}

watch(
  () => props.modelValue,
  () => {
    syncQueryFromSelected();
  },
);

watch(
  () => props.tagTypes,
  () => {
    syncQueryFromSelected();
  },
  { deep: true },
);

onMounted(() => {
  syncQueryFromSelected();
  document.addEventListener("mousedown", onDocumentClick);
  if (props.autoFocus) {
    void nextTick(() => {
      inputRef.value?.focus();
      inputRef.value?.select();
    });
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocumentClick);
});

defineExpose({
  focus: () => inputRef.value?.focus(),
});
</script>

<style scoped>
@reference "@/style.css";

.tag-type-picker {
  @apply relative w-full;
}

.tag-type-picker-input {
  @apply w-full rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink-primary;
}

.tag-type-picker.is-disabled .tag-type-picker-input {
  @apply cursor-not-allowed opacity-60;
}

.tag-type-picker-list {
  @apply absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-surface-3 bg-surface-0 py-1 shadow-lg;
}

.tag-type-picker-item,
.tag-type-picker-create,
.tag-type-picker-empty {
  @apply cursor-pointer px-3 py-2 text-sm text-ink-primary;
}

.tag-type-picker-empty {
  @apply cursor-default text-ink-secondary;
}

.tag-type-picker-item.is-active,
.tag-type-picker-create.is-active {
  @apply bg-surface-1;
}

.tag-type-picker-item.is-selected {
  @apply font-semibold;
}

.tag-type-picker-create {
  @apply border-t border-surface-3 font-semibold text-ink-primary;
}
</style>
