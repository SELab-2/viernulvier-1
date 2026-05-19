<template>
  <div v-if="panel" class="cms-side-overlay" @click.self="emit('close')">
    <aside class="cms-side-panel">
      <div class="cms-side-header">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-ink-primary">
            {{ panel.label }}
          </h2>
        </div>

        <button
          type="button"
          class="cms-side-close"
          @click="emit('close')"
        >
          {{ t("cms.panel.close") }}
        </button>
      </div>

      <div class="cms-side-body">
        <label class="cms-list-create">
          <form
            class="cms-list-entry"
            @submit.prevent="addSingle"
          >
            <input
              ref="singleInputEl"
              v-model="singleDraft"
              type="text"
              inputmode="numeric"
              class="cms-text-input"
              data-testid="edit-list-panel-single-input"
            />

            <button
              type="submit"
              class="cms-list-add"
            >
              +
            </button>
          </form>

          <p v-if="singleError" class="text-sm text-red-700">
            {{ singleError }}
          </p>
        </label>

        <div class="cms-side-field">
          <div
            v-if="localItems.length > 0"
            class="cms-list-flairs"
          >
            <div class="flex flex-wrap gap-2">
              <span
                v-for="id in localItems"
                :key="id"
                class="cms-list-flair"
                data-testid="edit-list-panel-tag"
              >
                <a
                  v-if="panel.urlBase"
                  :href="`${panel.urlBase}/${id}`"
                  class="cms-list-flair-link"
                  target="blank"
                >
                  {{ id }}
                </a>
                <span v-else>{{ id }}</span>

                <button
                  type="button"
                  class="cms-list-flair-remove"
                  @click="remove(id)"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
        </div>

        <p v-if="saveError" class="text-sm text-red-700">
          {{ saveError }}
        </p>
      </div>

      <div class="cms-side-footer">
        <button
          type="button"
          class="cms-side-save"
          :disabled="isSaving"
          data-testid="edit-list-panel-save"
          @click="emit('save')"
        >
          {{ isSaving ? t("general.saving") : t("cms.panel.save") }}
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

export type EditListPanelState = {
  rowId: number;
  label: string;
  items: number[];
  urlBase?: string;
};

const props = defineProps<{
  panel: EditListPanelState | null;
  saveError?: string | null;
  isSaving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  "update:panel": [value: EditListPanelState | null];
}>();

const { t } = useI18n();

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

const singleDraft = ref("");
const singleError = ref<string | null>(null);
const listFilter = ref("");

const singleInputEl = useTemplateRef<HTMLInputElement>("singleInputEl");

const localItems = ref<number[]>([]);

// ---------------------------------------------------------------------------
// Sync from panel
// ---------------------------------------------------------------------------

watch(
  () => props.panel?.rowId,
  () => {
    localItems.value = [...(props.panel?.items ?? [])];
    singleDraft.value = "";
    singleError.value = null;
    listFilter.value = "";
  },
  { immediate: true },
);

// ---------------------------------------------------------------------------
// Sync to parent
// ---------------------------------------------------------------------------

watch(
  localItems,
  (items) => {
    if (!props.panel) return;

    const changed =
      items.length !== props.panel.items.length ||
      items.some((id, index) => id !== props.panel?.items[index]);

    if (!changed) return;

    emit("update:panel", {
      ...props.panel,
      items: [...items],
    });
  },
  { deep: true },
);

// ---------------------------------------------------------------------------
// Add / remove
// ---------------------------------------------------------------------------

function addSingle(): void {
  const normalized = singleDraft.value.trim();

  if (!/^\d+$/.test(normalized)) {
    singleError.value = t("cms.create.validation.invalidId");
    return;
  }

  const parsed = Number.parseInt(normalized, 10);

  if (parsed < 1) {
    singleError.value = t("cms.create.validation.invalidId");
    return;
  }

  singleError.value = "";

  if (!localItems.value.includes(parsed)) {
    localItems.value = [...localItems.value, parsed];
  }

  sort();

  singleDraft.value = "";

  void nextTick(() => {
    singleInputEl.value?.focus();
  });
}

function remove(id: number): void {
  localItems.value = localItems.value.filter((x) => x !== id);
}

function sort(): void {
  localItems.value = localItems.value.sort((x, y) => x - y);
}
</script>