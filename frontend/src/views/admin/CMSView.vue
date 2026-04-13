<template>
  <div class="min-h-screen bg-surface-0">
    <AppNavbar :is-dark="isDark" @toggle-dark="isDark = !isDark" />

    <main class="bg-surface-1 px-6 py-10 lg:px-10">
      <div class="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-black tracking-tight text-ink-primary">
              {{ t("cms.title") }}
            </h1>
            <p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
              {{ t("cms.subtitle") }}
            </p>
          </div>

          <button type="button" class="cms-add-button" @click="openCreateModal">
            {{ t("cms.actions.addProduction") }}
          </button>
        </header>

        <p class="text-xs text-ink-tertiary">
          {{ t("cms.actions.loadedCount", { count: rowData.length }) }}
        </p>

        <div class="cms-toolbar">
          <input
            v-model="quickFilterText"
            type="text"
            class="cms-search-input"
            :placeholder="t('cms.actions.searchPlaceholder')"
            @input="applyQuickFilter"
          />

          <div class="flex items-center gap-2">
            <span class="cms-selected-chip">
              {{ t("cms.actions.selectedCount", { count: selectedCount }) }}
            </span>
          </div>
        </div>

        <div class="cms-grid-actions">
          <button type="button" class="cms-mini-btn" @click="fitGridColumns">Fit columns</button>
          <button type="button" class="cms-mini-btn" @click="autoSizeGridColumns">Auto-size</button>
          <button type="button" class="cms-mini-btn" @click="resetGridFilters">Reset filters</button>
          <button type="button" class="cms-mini-btn" @click="exportGridCsv">Export CSV</button>
          <button type="button" class="cms-mini-btn" @click="resetGridState">Reset state</button>
          <button type="button" class="cms-mini-btn" @click="columnChooserOpen = !columnChooserOpen">
            Columns
          </button>
        </div>

        <div
          v-if="loadError"
          class="rounded-lg border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-700"
        >
          {{ loadError }}
        </div>

        <div v-else class="cms-grid-shell">
          <AgGridVue
            :class="['ag-theme-alpine', 'cms-grid']"
            :style="agThemeVars"
            :column-defs="columnDefs"
            :default-col-def="defaultColDef"
            :row-data="rowData"
            :animate-rows="true"
            :pagination="false"
            :header-height="44"
            :row-height="42"
            :loading="isLoading"
            :row-selection="rowSelection"
            :suppress-row-click-selection="false"
            :column-hover-highlight="true"
            :enable-cell-text-selection="true"
            :ensure-dom-order="true"
            :undo-redo-cell-editing="true"
            :undo-redo-cell-editing-limit="25"
            :value-cache="true"
            :cache-quick-filter="true"
            :get-row-style="getProductionRowStyle"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            @cell-editing-started="onProductionCellEditingStarted"
            @cell-key-down="onProductionCellKeyDown"
            @cell-editing-stopped="onCellEditingStopped"
            @cell-clicked="onCellClicked"
          />
        </div>

        <aside v-if="columnChooserOpen && !loadError" class="cms-column-side-popup">
          <div class="cms-column-popover-header">
            <span class="text-sm font-semibold text-ink-primary">Visible columns</span>
            <button type="button" class="cms-mini-btn" @click="columnChooserOpen = false">Close</button>
          </div>

          <div class="cms-column-chooser">
            <label v-for="column in gridColumnOptions" :key="column.colId" class="cms-column-chooser-item">
              <input
                :checked="columnVisibility[column.colId] !== false"
                type="checkbox"
                @change="setGridColumnVisibility(column.colId, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ column.label }}</span>
            </label>
          </div>
        </aside>

        <aside v-if="selectedEventsProduction" class="cms-events-drawer">
          <div class="cms-events-panel-header">
            <div>
              <h3 class="text-base font-semibold text-ink-primary">Events</h3>
              <p class="text-sm text-ink-secondary">
                {{ selectedEventsProduction.title || selectedEventsProduction.performer }}
              </p>
            </div>
            <button type="button" class="cms-side-close" @click="closeEventsPanel">
              {{ t("cms.panel.close") }}
            </button>
          </div>

          <div class="cms-events-actions">
            <div class="flex justify-end">
              <button type="button" class="cms-side-save" :disabled="eventsPanelLoading" @click="openCreateEventModal">
                + Add Event
              </button>
            </div>
          </div>

          <p v-if="eventsPanelLoading" class="text-sm text-ink-secondary">
            {{ t("cms.panel.saving") }}
          </p>
          <p v-else-if="eventsPanelError" class="text-sm text-red-700">
            {{ eventsPanelError }}
          </p>
          <p v-else-if="selectedEventRows.length === 0" class="text-sm text-ink-secondary">
            {{ t("cms.actions.noRows") }}
          </p>
          <div v-else class="overflow-x-auto">
            <table class="cms-events-table">
              <thead>
                <tr>
                  <th>{{ t("cms.events.date") }}</th>
                  <th>{{ t("cms.events.time") }}</th>
                  <th>{{ t("cms.events.location") }}</th>
                  <th>{{ t("cms.events.price") }}</th>
                  <th>Info (NL)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="eventRow in selectedEventRows"
                  :key="eventRow.id"
                  @focusout="onEventRowFocusOut(eventRow, $event)"
                  @keydown.enter.prevent="onEventRowEnter(eventRow)"
                >
                  <td>
                    <input v-model="eventRow.startsAt" type="datetime-local" class="cms-text-input" />
                  </td>
                  <td>
                    <input v-model="eventRow.endsAt" type="datetime-local" class="cms-text-input" />
                  </td>
                  <td>
                    <select v-model.number="eventRow.hallId" class="cms-text-input">
                      <option v-for="hall in hallsData" :key="`event-${eventRow.id}-hall-${hall.id}`" :value="hall.id">
                        {{ localizeValue(hall.name) || `Hall #${hall.id}` }}
                      </option>
                    </select>
                  </td>
                  <td>{{ eventRow.price }}</td>
                  <td>
                    <input v-model="eventRow.infoNl" type="text" class="cms-text-input" />
                  </td>
                  <td>
                    <div class="cms-events-inline-action">
                      <button type="button" class="cms-side-save" :disabled="eventsPanelLoading" @click="saveLinkedEvent(eventRow)">
                        Save
                      </button>
                      <button type="button" class="cms-side-close" :disabled="eventsPanelLoading" @click="removeLinkedEvent(eventRow)">
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>

        <p
          v-if="!isLoading && !loadError && rowData.length === 0"
          class="rounded-md border border-surface-3 bg-surface-0 px-4 py-3 text-sm text-ink-secondary"
        >
          {{ t("cms.actions.noRows") }}
        </p>
      </div>
    </main>

    <AppFooter />

    <aside v-if="editorPanel" class="cms-side-panel">
      <div class="cms-side-header">
        <h2 class="text-lg font-semibold text-ink-primary">
          {{ editorPanel.label }}
        </h2>
        <button
          type="button"
          class="cms-side-close"
          @click="closeEditorPanel"
        >
          {{ t("cms.panel.close") }}
        </button>
      </div>

      <div class="cms-side-body">
        <p v-if="editorBulkCount > 1" class="text-xs text-ink-secondary">
          {{ t("cms.panel.bulkNotice", { count: editorBulkCount }) }}
        </p>

        <label
          v-for="lang in languages"
          :key="lang"
          class="cms-side-field"
        >
          <span class="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
            {{ lang.toUpperCase() }}
          </span>
          <textarea
            v-model="editorPanel.values[lang]"
            class="cms-side-textarea"
            rows="5"
          />
        </label>

        <p v-if="saveError" class="text-sm text-red-700">
          {{ saveError }}
        </p>
      </div>

      <div class="cms-side-footer">
        <button
          type="button"
          class="cms-side-save"
          :disabled="isSaving"
          @click="saveEditorPanel"
        >
          {{ isSaving ? t("cms.panel.saving") : t("cms.panel.save") }}
        </button>
      </div>
    </aside>

    <div v-if="createModalOpen" class="cms-modal-overlay" @click.self="closeCreateModal">
      <section class="cms-modal" role="dialog" aria-modal="true">
        <header class="cms-modal-header">
          <h2 class="text-xl font-bold text-ink-primary">{{ t("cms.create.title") }}</h2>
          <button type="button" class="cms-side-close" @click="closeCreateModal">
            {{ t("cms.panel.close") }}
          </button>
        </header>

        <div class="cms-modal-body">
          <label class="cms-toggle-row">
            <input v-model="createForm.finalized" type="checkbox" />
            <span>{{ t("cms.create.finalized") }}</span>
          </label>

          <div class="cms-language-toggle-row">
            <span class="text-sm font-semibold text-ink-primary">{{ t("cms.create.languages") }}</span>
            <div class="flex items-center gap-2">
              <span class="cms-language-pill active">NL</span>
              <button
                type="button"
                class="cms-language-pill"
                :class="{ active: createExtraLangs.en }"
                @click="createExtraLangs.en = !createExtraLangs.en"
              >
                EN
              </button>
              <button
                type="button"
                class="cms-language-pill"
                :class="{ active: createExtraLangs.fr }"
                @click="createExtraLangs.fr = !createExtraLangs.fr"
              >
                FR
              </button>
            </div>
          </div>

          <fieldset v-for="field in createFields" :key="field.key" class="cms-form-block">
            <legend class="cms-form-legend">
              {{ t(field.labelKey) }}
              <span v-if="field.required" class="cms-required">*</span>
            </legend>

            <div :class="langGridClass">
              <label v-for="lang in visibleCreateLangs" :key="`${field.key}-${lang}`" class="cms-form-lang-field">
                <span class="cms-lang-label">{{ lang.toUpperCase() }}</span>
                <textarea
                  v-if="field.multiline"
                  v-model="createForm[field.key][lang]"
                  class="cms-side-textarea"
                  rows="3"
                />
                <input
                  v-else
                  v-model="createForm[field.key][lang]"
                  type="text"
                  class="cms-text-input"
                />
              </label>
            </div>
          </fieldset>

          <fieldset class="cms-form-block">
            <legend class="cms-form-legend">{{ t("cms.create.media.title") }}</legend>

            <div class="cms-upload-controls">
              <label class="cms-form-lang-field">
                <span class="cms-lang-label">{{ t("cms.create.media.uploadImage") }}</span>
                <input type="file" accept="image/*" class="cms-text-input" @change="onImageFileChange" />
              </label>

              <label class="cms-form-lang-field">
                <span class="cms-lang-label">{{ t("cms.create.media.uploadVideo") }}</span>
                <input type="file" accept="video/*" class="cms-text-input" @change="onVideoFileChange" />
              </label>
            </div>

            <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="cms-form-lang-field">
                <span class="cms-lang-label">{{ t("cms.create.fields.imagePrimary") }}</span>
                <input v-model="createForm.video_1.nl" type="text" class="cms-text-input" />
              </label>

              <label class="cms-form-lang-field">
                <span class="cms-lang-label">{{ t("cms.create.fields.imageSecondary") }}</span>
                <input v-model="createForm.video_2.nl" type="text" class="cms-text-input" />
              </label>
            </div>

            <p class="mt-2 text-xs text-ink-tertiary">
              {{ t("cms.create.media.hint") }}
            </p>
          </fieldset>

          <p v-if="createError" class="text-sm text-red-700">
            {{ createError }}
          </p>
        </div>

        <footer class="cms-modal-footer">
          <button type="button" class="cms-side-close" @click="closeCreateModal">
            {{ t("cms.create.cancel") }}
          </button>
          <button type="button" class="cms-side-save" :disabled="isCreating" @click="submitCreateProduction">
            {{ isCreating ? t("cms.create.saving") : t("cms.create.submit") }}
          </button>
        </footer>
      </section>
    </div>

    <div
      v-if="createEventModalOpen && selectedEventsProduction"
      class="cms-modal-overlay"
      @click.self="closeCreateEventModal"
    >
      <section class="cms-modal !h-auto !max-w-3xl" role="dialog" aria-modal="true">
        <header class="cms-modal-header">
          <h2 class="text-xl font-bold text-ink-primary">Add Event</h2>
          <button type="button" class="cms-side-close" @click="closeCreateEventModal">
            {{ t("cms.panel.close") }}
          </button>
        </header>

        <div class="cms-modal-body">
          <p class="text-sm text-ink-secondary">
            {{ selectedEventsProduction.title || selectedEventsProduction.performer }}
          </p>

          <div class="cms-events-create-grid">
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">Start</span>
              <input v-model="createLinkedEventForm.startsAt" type="datetime-local" class="cms-text-input" />
            </label>
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">End</span>
              <input v-model="createLinkedEventForm.endsAt" type="datetime-local" class="cms-text-input" />
            </label>
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">Doors</span>
              <input v-model="createLinkedEventForm.doorsAt" type="datetime-local" class="cms-text-input" />
            </label>
            <label class="cms-form-lang-field">
              <span class="cms-lang-label">Hall</span>
              <select v-model.number="createLinkedEventForm.hallId" class="cms-text-input">
                <option v-for="hall in hallsData" :key="`create-event-hall-${hall.id}`" :value="hall.id">
                  {{ localizeValue(hall.name) || `Hall #${hall.id}` }}
                </option>
              </select>
            </label>
            <label class="cms-form-lang-field cms-events-create-info">
              <span class="cms-lang-label">Info (NL)</span>
              <input v-model="createLinkedEventForm.infoNl" type="text" class="cms-text-input" />
            </label>
          </div>

          <p v-if="eventsPanelError" class="text-sm text-red-700">
            {{ eventsPanelError }}
          </p>
        </div>

        <footer class="cms-modal-footer">
          <button type="button" class="cms-side-close" @click="closeCreateEventModal">
            {{ t("cms.create.cancel") }}
          </button>
          <button type="button" class="cms-side-save" :disabled="eventsPanelLoading" @click="submitCreateEvent">
            {{ eventsPanelLoading ? t("cms.panel.saving") : "Create event" }}
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellClickedEvent,
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
  CellKeyDownEvent,
} from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { Event as ArchiveEvent, Hall, ProductionWithBackwardsRefs, Tag } from "@viernulvier/shared";
import AppNavbar from "@/components/AppNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import { useCmsProductionGrid } from "@/composables/useCmsProductionGrid";
import { i18n, SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import {
  createProduction,
  getProductions,
  updateProduction,
} from "@/services/productions";
import { createEvent, deleteEvent, getEvent, updateEvent } from "@/services/events";
import { getHall, getHalls } from "@/services/halls";
import { getAllTags } from "@/services/tags";
import { localizeOrEmpty, type LanguageMap } from "@/utils/i18n";
import {
  buildEventGridRows,
  buildProductionGridRow,
  type CmsCreateLinkedEventForm,
  type CmsEventGridRow,
  type CmsProductionGridRow,
  emptyLangRecord,
  extractEventIds,
  makeEditorValues,
  toIsoStringFromLocalInput,
  toLocalDateTimeInput,
} from "./cms-helpers";

type EventGridRow = CmsEventGridRow;
type ProductionGridRow = CmsProductionGridRow;

type InlineEditableField = "performer" | "title" | "producer" | "teaser";
type LongField = "teaser"|"description" | "description_2" | "video_1";

interface EditorPanelState {
  rowId: number;
  apiField: LongField;
  label: string;
  values: Record<SupportedLang, string>;
}

type CreateFieldKey =
  | "title"
  | "artist"
  | "tagline"
  | "teaser"
  | "supertitle"
  | "description"
  | "description_2"
  | "video_1"
  | "video_2";

interface CreateFormState {
  finalized: boolean;
  title: Record<SupportedLang, string>;
  artist: Record<SupportedLang, string>;
  tagline: Record<SupportedLang, string>;
  teaser: Record<SupportedLang, string>;
  supertitle: Record<SupportedLang, string>;
  description: Record<SupportedLang, string>;
  description_2: Record<SupportedLang, string>;
  video_1: Record<SupportedLang, string>;
  video_2: Record<SupportedLang, string>;
}

const { t } = useI18n();
const isDark = ref(getInitialDark());

const {
  agThemeVars,
  autoSizeGridColumns,
  columnChooserOpen,
  columnDefs,
  columnVisibility,
  defaultColDef,
  exportGridCsv,
  fitGridColumns,
  getProductionRowStyle,
  gridColumnOptions,
  gridApi,
  onGridReady,
  onSelectionChanged,
  quickFilterText,
  resetGridFilters,
  resetGridState,
  rowSelection,
  selectedCount,
  setGridColumnVisibility,
  applyQuickFilter,
  persistGridState,
} = useCmsProductionGrid({
  isDark,
  t,
});

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsProductionGridRow[]>([]);
const editorPanel = ref<EditorPanelState | null>(null);
const createModalOpen = ref(false);
const createEventModalOpen = ref(false);
const languages = SUPPORTED_LANGS as ReadonlyArray<SupportedLang>;
const createExtraLangs = ref({ en: false, fr: false });
const visibleCreateLangs = computed<SupportedLang[]>(() => {
  const result: SupportedLang[] = ["nl"];
  if (createExtraLangs.value.en) result.push("en");
  if (createExtraLangs.value.fr) result.push("fr");
  return result;
});
const langGridClass = computed(() => {
  const count = visibleCreateLangs.value.length;
  if (count <= 1) {
    return "cms-lang-grid cms-lang-grid-single";
  }
  if (count === 2) {
    return "cms-lang-grid cms-lang-grid-double";
  }
  return "cms-lang-grid";
});

const productionsData = ref<ProductionWithBackwardsRefs[]>([]);
const tagsData = ref<Tag[]>([]);
const hallsData = ref<Hall[]>([]);
const eventByIdCache = ref(new Map<number, ArchiveEvent>());
const hallByIdCache = ref(new Map<number, Hall>());
const detailRowsCache = ref(new Map<number, EventGridRow[]>());
const selectedEventsProductionId = ref<number | null>(null);
const selectedEventRows = ref<EventGridRow[]>([]);
const eventsPanelLoading = ref(false);
const eventsPanelError = ref<string | null>(null);
const createLinkedEventForm = ref<CmsCreateLinkedEventForm>({
  startsAt: "",
  endsAt: "",
  doorsAt: "",
  hallId: 0,
  infoNl: "",
});
const eventRowSnapshots = ref(new Map<number, CmsEventGridRow>());
const pendingProductionEnterCommits = ref(new Set<string>());
const activeProductionEditKey = ref<string | null>(null);

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const editorBulkCount = computed(() => {
  if (!editorPanel.value) {
    return 0;
  }
  const row = rowData.value.find((item) => item.id === editorPanel.value?.rowId);
  return row ? getBulkTargetRows(row).length : 0;
});

const selectedEventsProduction = computed(() => {
  if (selectedEventsProductionId.value === null) {
    return null;
  }
  return rowData.value.find((row) => row.id === selectedEventsProductionId.value) ?? null;
});

const createFields: Array<{
  key: CreateFieldKey;
  labelKey: string;
  required: boolean;
  multiline: boolean;
}> = [
  { key: "title", labelKey: "cms.create.fields.title", required: true, multiline: false },
  { key: "artist", labelKey: "cms.create.fields.artist", required: true, multiline: false },
  { key: "tagline", labelKey: "cms.create.fields.tagline", required: true, multiline: true },
  { key: "teaser", labelKey: "cms.create.fields.teaser", required: true, multiline: true },
  { key: "supertitle", labelKey: "cms.create.fields.supertitle", required: false, multiline: false },
  { key: "description", labelKey: "cms.create.fields.description", required: false, multiline: true },
  { key: "description_2", labelKey: "cms.create.fields.descriptionTwo", required: false, multiline: true },
];

const createForm = ref<CreateFormState>({
  finalized: false,
  title: emptyLangRecord(),
  artist: emptyLangRecord(),
  tagline: emptyLangRecord(),
  teaser: emptyLangRecord(),
  supertitle: emptyLangRecord(),
  description: emptyLangRecord(),
  description_2: emptyLangRecord(),
  video_1: emptyLangRecord(),
  video_2: emptyLangRecord(),
});

const inlineFieldToApi: Record<InlineEditableField, keyof ProductionWithBackwardsRefs> = {
  performer: "artist",
  title: "title",
  producer: "supertitle",
  teaser: "teaser",
};

const longGridFieldToApi: Record<"descriptionOne" | "descriptionTwo" | "media", LongField> = {
  descriptionOne: "description",
  descriptionTwo: "description_2",
  media: "video_1",
};

function localizeValue(map: LanguageMap | null | undefined): string {
  if (!map) {
    return "";
  }
  return localizeOrEmpty(map, currentLang.value);
}

function setCurrentLanguageValue(
  map: LanguageMap | null | undefined,
  newValue: string,
): LanguageMap {
  return {
    ...(map ?? {}),
    [currentLang.value]: newValue,
  };
}

function getProductionEditKey(rowId: number, field: string): string {
  return `${rowId}:${field}`;
}

function snapshotEventRows(rows: CmsEventGridRow[]): void {
  eventRowSnapshots.value = new Map(rows.map((row) => [row.id, { ...row }]));
}

function revertEventRow(row: CmsEventGridRow): void {
  const snapshot = eventRowSnapshots.value.get(row.id);
  if (!snapshot) {
    return;
  }

  row.startsAt = snapshot.startsAt;
  row.endsAt = snapshot.endsAt;
  row.doorsAt = snapshot.doorsAt;
  row.hallId = snapshot.hallId;
  row.infoNl = snapshot.infoNl;
}

function toLanguageMapOrNull(values: Record<SupportedLang, string>): LanguageMap | null {
  const next: LanguageMap = {};
  for (const lang of languages) {
    const value = values[lang].trim();
    if (value.length > 0) {
      next[lang] = value;
    }
  }

  return Object.keys(next).length > 0 ? next : null;
}

function toLanguageMap(values: Record<SupportedLang, string>): LanguageMap {
  return toLanguageMapOrNull(values) ?? {};
}

function mediaToLanguageMap(values: Record<SupportedLang, string>): LanguageMap | null {
  const nlValue = values.nl.trim();
  if (nlValue.length === 0) {
    return null;
  }
  return { nl: nlValue };
}

function resetCreateLinkedEventForm(): void {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const halfHourBefore = new Date(now.getTime() - 30 * 60 * 1000);
  createLinkedEventForm.value = {
    startsAt: toLocalDateTimeInput(now),
    endsAt: toLocalDateTimeInput(twoHoursLater),
    doorsAt: toLocalDateTimeInput(halfHourBefore),
    hallId: hallsData.value[0]?.id ?? 0,
    infoNl: "",
  };
}

async function loadEventsForProduction(production: ProductionWithBackwardsRefs): Promise<ArchiveEvent[]> {
  const eventIds = extractEventIds(production.events as unknown[]);
  if (eventIds.length === 0) {
    return [];
  }

  const events = await Promise.all(
    eventIds.map(async (eventId) => {
      const cachedEvent = eventByIdCache.value.get(eventId);
      if (cachedEvent) return cachedEvent;
      const fetched = await getEvent(eventId);
      eventByIdCache.value.set(eventId, fetched);
      return fetched;
    }),
  );

  const hallIds = Array.from(
    new Set(events.map((event) => Number(event.hall)).filter((id) => Number.isFinite(id))),
  );

  await Promise.all(
    hallIds.map(async (hallId) => {
      if (hallByIdCache.value.has(hallId)) return;
      const hall = await getHall(hallId);
      hallByIdCache.value.set(hallId, hall);
    }),
  );

  return events;
}

function buildProductionRows(
  productions: ProductionWithBackwardsRefs[],
  tags: Tag[],
): ProductionGridRow[] {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  return productions.map((production) => {
    return buildProductionGridRow(production, tagById, localizeValue);
  });
}

async function loadDetailRowsForProduction(
  production: ProductionWithBackwardsRefs,
): Promise<EventGridRow[]> {
  const cached = detailRowsCache.value.get(production.id);
  if (cached) {
    return cached;
  }

  const events = await loadEventsForProduction(production);

  const rows = buildEventGridRows(events, hallByIdCache.value, localizeValue, t("cms.events.na"));
  detailRowsCache.value.set(production.id, rows);
  return rows;
}

function closeEditorPanel(): void {
  editorPanel.value = null;
  saveError.value = null;
}

function resetCreateForm(): void {
  createForm.value = {
    finalized: false,
    title: emptyLangRecord(),
    artist: emptyLangRecord(),
    tagline: emptyLangRecord(),
    teaser: emptyLangRecord(),
    supertitle: emptyLangRecord(),
    description: emptyLangRecord(),
    description_2: emptyLangRecord(),
    video_1: emptyLangRecord(),
    video_2: emptyLangRecord(),
  };
  createExtraLangs.value = { en: false, fr: false };
}

function openCreateModal(): void {
  createError.value = null;
  createModalOpen.value = true;
}

function closeCreateModal(): void {
  createModalOpen.value = false;
  createError.value = null;
  resetCreateForm();
}

function hasAnyLanguageValue(values: Record<SupportedLang, string>): boolean {
  return languages.some((lang) => values[lang].trim().length > 0);
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

async function onImageFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  createForm.value.video_1.nl = dataUrl;
  input.value = "";
}

async function onVideoFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const dataUrl = await fileToDataUrl(file);
  createForm.value.video_2.nl = dataUrl;
  input.value = "";
}

function validateCreateForm(): string | null {
  const requiredKeys: CreateFieldKey[] = ["title", "artist", "tagline", "teaser"];
  for (const key of requiredKeys) {
    if (!hasAnyLanguageValue(createForm.value[key])) {
      return t("cms.create.validation.requiredOneLanguage", {
        field: t(`cms.create.fields.${key === "description_2" ? "descriptionTwo" : key}`),
      });
    }
  }

  const hasImageOne = hasAnyLanguageValue(createForm.value.video_1);
  const hasImageTwo = hasAnyLanguageValue(createForm.value.video_2);
  if (!hasImageOne && !hasImageTwo) {
    return t("cms.create.validation.imageRequired");
  }

  return null;
}

async function submitCreateProduction(): Promise<void> {
  const validationError = validateCreateForm();
  if (validationError) {
    createError.value = validationError;
    return;
  }

  isCreating.value = true;
  createError.value = null;

  try {
    await createProduction({
      vendor_id: 0,
      box_office_id: 0,
      finalized: createForm.value.finalized,
      title: toLanguageMap(createForm.value.title),
      artist: toLanguageMap(createForm.value.artist),
      tagline: toLanguageMap(createForm.value.tagline),
      teaser: toLanguageMap(createForm.value.teaser),
      supertitle: toLanguageMapOrNull(createForm.value.supertitle),
      description: toLanguageMapOrNull(createForm.value.description),
      description_2: toLanguageMapOrNull(createForm.value.description_2),
      video_1: mediaToLanguageMap(createForm.value.video_1),
      video_2: mediaToLanguageMap(createForm.value.video_2),
    });

    await loadCmsData();
    closeCreateModal();
  } catch (error) {
    createError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isCreating.value = false;
  }
}

function applyUpdatedProductionToRow(
  row: ProductionGridRow,
  updated: ProductionWithBackwardsRefs,
): void {
  row.source = updated;
  row.performer = localizeValue(updated.artist) || "";
  row.title = localizeValue(updated.title) || "";
  row.producer = localizeValue(updated.supertitle) || "";
  row.teaser = localizeValue(updated.teaser) || "";
  row.descriptionOne = localizeValue(updated.description) || "";
  row.descriptionTwo = localizeValue(updated.description_2) || "";
  row.media = localizeValue(updated.video_1) || "";
}

async function persistProductionPatch(
  row: ProductionGridRow,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const updated = await updateProduction(row.id, patch as never);
    applyUpdatedProductionToRow(row, updated);
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
    throw error;
  }
}

async function saveInlineBulkUpdate(
  primaryRow: ProductionGridRow,
  apiField: keyof ProductionWithBackwardsRefs,
  newValue: string,
): Promise<void> {
  const targetRows = getBulkTargetRows(primaryRow);
  isSaving.value = true;
  saveError.value = null;
  try {
    await Promise.all(
      targetRows.map(async (row) => {
        const currentMap = row.source[apiField] as LanguageMap | null | undefined;
        const nextMap = setCurrentLanguageValue(currentMap, newValue);
        await persistProductionPatch(row, { [apiField]: nextMap });
      }),
    );
  } finally {
    isSaving.value = false;
  }
}

function getBulkTargetRows(primaryRow: ProductionGridRow): ProductionGridRow[] {
  const selectedRows = gridApi.value?.getSelectedRows() ?? [];
  if (
    selectedRows.length > 1
    && selectedRows.some((row) => row.id === primaryRow.id)
  ) {
    return selectedRows;
  }
  return [primaryRow];
}

async function onCellEditingStopped(
  event: CellEditingStoppedEvent<ProductionGridRow>,
): Promise<void> {
  if (!event.data || !event.colDef.field) {
    return;
  }

  const field = event.colDef.field as InlineEditableField;
  if (!(field in inlineFieldToApi)) {
    activeProductionEditKey.value = null;
    return;
  }

  const newValue = String(event.value ?? "").trim();
  const oldValue = String(event.oldValue ?? "").trim();
  const editKey = getProductionEditKey(event.data.id, event.colDef.field);
  const committedWithEnter = pendingProductionEnterCommits.value.has(editKey);
  pendingProductionEnterCommits.value.delete(editKey);
  activeProductionEditKey.value = null;

  if (!committedWithEnter) {
    event.node.setDataValue(field, oldValue);
    return;
  }

  if (newValue === oldValue) {
    return;
  }

  const apiField = inlineFieldToApi[field];

  try {
    await saveInlineBulkUpdate(event.data, apiField, newValue);
  } catch {
    event.node.setDataValue(field, oldValue);
  } finally {
    persistGridState();
  }
}

function onProductionCellKeyDown(event: CellKeyDownEvent<ProductionGridRow>): void {
  const domEvent = event.event as KeyboardEvent | null | undefined;
  if (!event.data || !event.colDef.field || domEvent?.key !== "Enter") {
    return;
  }

  pendingProductionEnterCommits.value.add(getProductionEditKey(event.data.id, event.colDef.field));
}

function onProductionCellEditingStarted(event: CellEditingStartedEvent<ProductionGridRow>): void {
  if (!event.data || !event.colDef.field) {
    return;
  }

  activeProductionEditKey.value = getProductionEditKey(event.data.id, event.colDef.field);
}

function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || !activeProductionEditKey.value) {
    return;
  }

  pendingProductionEnterCommits.value.add(activeProductionEditKey.value);
}

function onCellClicked(event: CellClickedEvent<ProductionGridRow>): void {
  if (!event.data) {
    return;
  }

  if (event.colDef.colId === "eventsAction") {
    void showEventsForProduction(event.data);
    return;
  }

  if (!event.colDef.field) {
    return;
  }

  const gridField = event.colDef.field as "descriptionOne" | "descriptionTwo" | "media";
  if (!(gridField in longGridFieldToApi)) {
    return;
  }

  const apiField = longGridFieldToApi[gridField];
  const currentMap = event.data.source[apiField] as LanguageMap | null | undefined;

  editorPanel.value = {
    rowId: event.data.id,
    apiField,
    label: event.colDef.headerName ?? t("cms.panel.text"),
    values: makeEditorValues(currentMap),
  };
  saveError.value = null;
}

async function saveEditorPanel(): Promise<void> {
  if (!editorPanel.value) {
    return;
  }

  const row = rowData.value.find((item) => item.id === editorPanel.value?.rowId);
  if (!row) {
    return;
  }

  const payload = toLanguageMapOrNull(editorPanel.value.values);
  const targetRows = getBulkTargetRows(row);

  isSaving.value = true;
  saveError.value = null;
  try {
    await Promise.all(
      targetRows.map(async (target) => {
        await persistProductionPatch(target, {
          [editorPanel.value?.apiField as LongField]: payload,
        });
      }),
    );
  } finally {
    isSaving.value = false;
  }

  closeEditorPanel();
}

function rebuildRows(): void {
  rowData.value = buildProductionRows(
    productionsData.value,
    tagsData.value,
  );
}

async function showEventsForProduction(row: ProductionGridRow): Promise<void> {
  selectedEventsProductionId.value = row.id;
  eventsPanelLoading.value = true;
  eventsPanelError.value = null;
  if (!createLinkedEventForm.value.hallId && hallsData.value.length > 0) {
    createLinkedEventForm.value.hallId = hallsData.value[0].id;
  }

  try {
    selectedEventRows.value = await loadDetailRowsForProduction(row.source);
    snapshotEventRows(selectedEventRows.value);
  } catch (error) {
    selectedEventRows.value = [];
    eventsPanelError.value =
      error instanceof Error
        ? t("cms.errors.loadFailed", { message: error.message })
        : t("cms.errors.loadGeneric");
  } finally {
    eventsPanelLoading.value = false;
  }
}

function closeEventsPanel(): void {
  selectedEventsProductionId.value = null;
  selectedEventRows.value = [];
  eventsPanelError.value = null;
  createEventModalOpen.value = false;
}

async function refreshEventsPanelForSelectedProduction(): Promise<void> {
  if (selectedEventsProductionId.value === null) {
    return;
  }
  const row = rowData.value.find((item) => item.id === selectedEventsProductionId.value);
  if (!row) {
    closeEventsPanel();
    return;
  }
  await showEventsForProduction(row);
}

async function saveLinkedEvent(eventRow: EventGridRow): Promise<void> {
  if (selectedEventsProductionId.value === null) return;
  eventsPanelLoading.value = true;
  eventsPanelError.value = null;

  try {
    const updated = await updateEvent(eventRow.id, {
      production: selectedEventsProductionId.value,
      hall: eventRow.hallId,
      starts_at: toIsoStringFromLocalInput(eventRow.startsAt),
      ends_at: toIsoStringFromLocalInput(eventRow.endsAt),
      doors_at: toIsoStringFromLocalInput(eventRow.doorsAt),
      info: { nl: eventRow.infoNl },
    });
    eventByIdCache.value.set(updated.id, updated);
    detailRowsCache.value.delete(selectedEventsProductionId.value);
    await refreshEventsPanelForSelectedProduction();
    snapshotEventRows(selectedEventRows.value);
  } catch (error) {
    eventsPanelError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    eventsPanelLoading.value = false;
  }
}

async function removeLinkedEvent(eventRow: EventGridRow): Promise<void> {
  if (selectedEventsProductionId.value === null) return;
  eventsPanelLoading.value = true;
  eventsPanelError.value = null;

  try {
    await deleteEvent(eventRow.id);
    eventByIdCache.value.delete(eventRow.id);
    detailRowsCache.value.delete(selectedEventsProductionId.value);
    await loadCmsData();
    await refreshEventsPanelForSelectedProduction();
  } catch (error) {
    eventsPanelError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    eventsPanelLoading.value = false;
  }
}

async function createAndLinkEvent(): Promise<void> {
  if (selectedEventsProductionId.value === null) return;
  if (!createLinkedEventForm.value.hallId) {
    eventsPanelError.value = "Select a hall for the new event.";
    return;
  }

  eventsPanelLoading.value = true;
  eventsPanelError.value = null;
  try {
    const created = await createEvent({
      old_id: null,
      vendor_id: 0,
      production: selectedEventsProductionId.value,
      hall: createLinkedEventForm.value.hallId,
      starts_at: toIsoStringFromLocalInput(createLinkedEventForm.value.startsAt),
      ends_at: toIsoStringFromLocalInput(createLinkedEventForm.value.endsAt),
      doors_at: toIsoStringFromLocalInput(createLinkedEventForm.value.doorsAt),
      info: { nl: createLinkedEventForm.value.infoNl || "" },
    });

    eventByIdCache.value.set(created.id, created);
    detailRowsCache.value.delete(selectedEventsProductionId.value);
    resetCreateLinkedEventForm();
    await loadCmsData();
    await refreshEventsPanelForSelectedProduction();
    snapshotEventRows(selectedEventRows.value);
  } catch (error) {
    eventsPanelError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    eventsPanelLoading.value = false;
  }
}

function onEventRowFocusOut(eventRow: CmsEventGridRow, focusEvent: FocusEvent): void {
  const currentTarget = focusEvent.currentTarget as HTMLElement | null;
  const relatedTarget = focusEvent.relatedTarget as Node | null;
  if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
    return;
  }

  revertEventRow(eventRow);
}

function onEventRowEnter(eventRow: CmsEventGridRow): void {
  void saveLinkedEvent(eventRow);
}

function openCreateEventModal(): void {
  eventsPanelError.value = null;
  createEventModalOpen.value = true;
}

function closeCreateEventModal(): void {
  createEventModalOpen.value = false;
  eventsPanelError.value = null;
  resetCreateLinkedEventForm();
}

async function submitCreateEvent(): Promise<void> {
  await createAndLinkEvent();
  if (!eventsPanelError.value) {
    createEventModalOpen.value = false;
  }
}

async function loadCmsData(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    const [productionsPage, tags, halls] = await Promise.all([
      getProductions(),
      getAllTags(),
      getHalls(),
    ]);

    productionsData.value = productionsPage.items;
    tagsData.value = tags;
    hallsData.value = halls;
    hallByIdCache.value = new Map(halls.map((hall) => [hall.id, hall]));
    detailRowsCache.value.clear();
    if (!createLinkedEventForm.value.hallId) {
      resetCreateLinkedEventForm();
    }

    rebuildRows();
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? t("cms.errors.loadFailed", { message: error.message })
        : t("cms.errors.loadGeneric");
  } finally {
    isLoading.value = false;
  }
}

function getInitialDark(): boolean {
  const stored = localStorage.getItem("viernulvier-dark");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

defineExpose({
  __test: {
    rowData,
    createForm,
    createModalOpen,
    createEventModalOpen,
    createError,
    eventsPanelError,
    editorPanel,
    detailRowsCache,
    eventByIdCache,
    createLinkedEventForm,
    selectedEventsProductionId,
    selectedEventRows,
    localizeValue,
    setCurrentLanguageValue,
    toLanguageMapOrNull,
    toLanguageMap,
    mediaToLanguageMap,
    hasAnyLanguageValue,
    resetCreateForm,
    resetCreateLinkedEventForm,
    openCreateModal,
    closeCreateModal,
    validateCreateForm,
    submitCreateProduction,
    showEventsForProduction,
    refreshEventsPanelForSelectedProduction,
    createAndLinkEvent,
    saveLinkedEvent,
    removeLinkedEvent,
    openCreateEventModal,
    closeCreateEventModal,
    submitCreateEvent,
    onEventRowFocusOut,
    onEventRowEnter,
    onCellClicked,
    onProductionCellKeyDown,
    onProductionCellEditingStarted,
    onWindowKeyDown,
    onCellEditingStopped,
    onImageFileChange,
    onVideoFileChange,
    closeEventsPanel,
    closeEditorPanel,
    saveEditorPanel,
    rebuildRows,
    loadCmsData,
    getInitialDark,
  },
});

watchEffect(() => {
  const htmlEl = document.documentElement;
  if (isDark.value) {
    htmlEl.classList.add("dark");
  } else {
    htmlEl.classList.remove("dark");
  }
  localStorage.setItem("viernulvier-dark", String(isDark.value));
});

watch(currentLang, () => {
  rebuildRows();
});

onMounted(() => {
  window.addEventListener("keydown", onWindowKeyDown, true);
  resetCreateLinkedEventForm();
  void loadCmsData();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeyDown, true);
  persistGridState();
});
</script>

<style scoped>
@reference "../../style.css";

.cms-add-button {
  @apply inline-flex w-fit items-center rounded-full border border-transparent bg-surface-inv px-5 py-2.5 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised;
}

.cms-toolbar {
  @apply flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between;
}

.cms-grid-actions {
  @apply flex flex-wrap items-center gap-2;
}

.cms-search-input {
  @apply w-full rounded-md border border-surface-3 bg-surface-0 px-4 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary sm:max-w-md;
}

.cms-selected-chip {
  @apply inline-flex w-fit items-center rounded-full border border-surface-3 bg-surface-0 px-3 py-1 text-xs font-semibold text-ink-secondary;
}

.cms-mini-btn {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-surface-1;
}

.cms-events-drawer {
  @apply fixed right-0 top-0 z-50 flex h-screen w-full max-w-3xl flex-col gap-4 overflow-y-auto border-l border-surface-3 bg-surface-0 p-5 shadow-2xl;
}

.cms-events-panel-header {
  @apply mb-3 flex items-start justify-between gap-3;
}

.cms-events-table {
  @apply min-w-full border-collapse text-sm;
}

.cms-events-actions {
  @apply flex flex-col gap-4;
}

.cms-events-inline-action {
  @apply flex items-center gap-2;
}

.cms-events-create-grid {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-2;
}

.cms-events-create-info {
  @apply md:col-span-2;
}

.cms-events-table th {
  @apply border-b border-surface-3 px-3 py-2 text-left font-semibold text-ink-primary;
}

.cms-events-table td {
  @apply border-b border-surface-3 px-3 py-2 text-ink-secondary;
}

.cms-side-panel {
  @apply fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col border-l border-surface-3 bg-surface-0 p-5 shadow-2xl;
}

.cms-side-header {
  @apply mb-4 flex items-center justify-between;
}

.cms-side-close {
  @apply rounded-md border border-surface-3 px-3 py-1.5 text-sm text-ink-secondary transition hover:bg-surface-1;
}

.cms-side-body {
  @apply flex flex-1 flex-col gap-4 overflow-y-auto;
}

.cms-side-field {
  @apply flex flex-col gap-2;
}

.cms-side-textarea {
  @apply min-h-28 rounded-md border border-surface-3 bg-surface-1 p-3 text-sm text-ink-primary;
}

.cms-side-footer {
  @apply mt-4 flex justify-end;
}

.cms-side-save {
  @apply rounded-md bg-surface-inv px-4 py-2 text-sm font-semibold text-ink-on-inv transition hover:bg-surface-inv-raised disabled:cursor-not-allowed disabled:opacity-60;
}

.cms-modal-overlay {
  @apply fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4;
}

.cms-modal {
  @apply flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-3 bg-surface-0;
}

.cms-modal-header {
  @apply flex items-center justify-between border-b border-surface-3 px-5 py-4;
}

.cms-modal-body {
  @apply flex-1 space-y-5 overflow-y-auto px-5 py-4;
}

.cms-modal-footer {
  @apply flex justify-end gap-2 border-t border-surface-3 px-5 py-4;
}

.cms-form-block {
  @apply rounded-lg border border-surface-3 bg-surface-1 p-4;
}

.cms-form-legend {
  @apply px-1 text-sm font-semibold text-ink-primary;
}

.cms-required {
  @apply ml-1 text-red-600;
}

.cms-lang-grid {
  @apply mt-3 grid grid-cols-1 gap-3 md:grid-cols-3;
}

.cms-lang-grid-single {
  @apply grid-cols-1 md:grid-cols-1;
}

.cms-lang-grid-double {
  @apply grid-cols-1 md:grid-cols-2;
}

.cms-form-lang-field {
  @apply flex flex-col gap-2;
}

.cms-language-toggle-row {
  @apply flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-3 bg-surface-0 px-3 py-2;
}

.cms-language-pill {
  @apply rounded-full border border-surface-3 px-3 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-surface-1;
}

.cms-language-pill.active {
  @apply border-transparent bg-surface-inv text-ink-on-inv;
}

.cms-upload-controls {
  @apply grid grid-cols-1 gap-3 md:grid-cols-3;
}

.cms-lang-label {
  @apply text-xs font-semibold uppercase tracking-wide text-ink-secondary;
}

.cms-text-input {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-sm text-ink-primary;
}

.cms-toggle-row {
  @apply flex items-center gap-2 text-sm text-ink-primary;
}

:deep(.cms-truncate-cell .ag-cell-value) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.cms-events-action-cell .ag-cell-value) {
  @apply cursor-pointer font-semibold text-ink-primary underline decoration-1 underline-offset-2;
}

:deep(.cms-grid .ag-header),
:deep(.cms-grid .ag-header-viewport),
:deep(.cms-grid .ag-pinned-left-header),
:deep(.cms-grid .ag-pinned-right-header),
:deep(.cms-grid .ag-header-cell),
:deep(.cms-grid .ag-header-group-cell) {
  background-color: var(--ag-header-background-color) !important;
  color: var(--ag-header-foreground-color) !important;
}

:deep(.cms-grid .ag-header-cell-text),
:deep(.cms-grid .ag-header-group-text),
:deep(.cms-grid .ag-header-cell-label) {
  color: var(--cms-header-fg) !important;
}

:deep(.cms-grid .ag-header-cell .ag-icon),
:deep(.cms-grid .ag-header-select-all .ag-icon),
:deep(.cms-grid .ag-header-cell-menu-button .ag-icon),
:deep(.cms-grid .ag-header-cell-filter-button .ag-icon) {
  color: var(--cms-header-fg) !important;
}

:deep(.cms-grid .ag-cell-inline-editing),
:deep(.cms-grid .ag-cell-inline-editing .ag-cell-wrapper),
:deep(.cms-grid .ag-cell-inline-editing .ag-cell-edit-wrapper) {
  background-color: inherit !important;
}

:deep(.cms-grid .ag-cell-inline-editing .ag-input-field-input),
:deep(.cms-grid .ag-cell-inline-editing .ag-text-field-input),
:deep(.cms-grid .ag-cell-inline-editing input),
:deep(.cms-grid .ag-cell-inline-editing textarea) {
  background-color: var(--ag-background-color) !important;
  color: var(--ag-foreground-color) !important;
  caret-color: var(--ag-foreground-color) !important;
}

:deep(.cms-grid-dark .ag-cell-inline-editing .ag-input-field-input),
:deep(.cms-grid-dark .ag-cell-inline-editing .ag-text-field-input),
:deep(.cms-grid-dark .ag-cell-inline-editing input),
:deep(.cms-grid-dark .ag-cell-inline-editing textarea) {
  background-color: var(--surface-0) !important;
  color: var(--ink-primary) !important;
  caret-color: var(--ink-primary) !important;
}

:deep(.cms-grid-light .ag-cell-inline-editing .ag-input-field-input),
:deep(.cms-grid-light .ag-cell-inline-editing .ag-text-field-input),
:deep(.cms-grid-light .ag-cell-inline-editing input),
:deep(.cms-grid-light .ag-cell-inline-editing textarea) {
  background-color: var(--surface-0) !important;
  color: var(--ink-primary) !important;
  caret-color: var(--ink-primary) !important;
}

:deep(.cms-grid-dark .ag-header-cell-text),
:deep(.cms-grid-dark .ag-header-group-text),
:deep(.cms-grid-dark .ag-header-cell-label),
:deep(.cms-grid-dark .ag-header-cell .ag-icon),
:deep(.cms-grid-dark .ag-header-select-all .ag-icon),
:deep(.cms-grid-dark .ag-header-cell-menu-button .ag-icon),
:deep(.cms-grid-dark .ag-header-cell-filter-button .ag-icon) {
  color: #ede8df !important;
}

:deep(.cms-grid-light .ag-header-cell-text),
:deep(.cms-grid-light .ag-header-group-text),
:deep(.cms-grid-light .ag-header-cell-label),
:deep(.cms-grid-light .ag-header-cell .ag-icon),
:deep(.cms-grid-light .ag-header-select-all .ag-icon),
:deep(.cms-grid-light .ag-header-cell-menu-button .ag-icon),
:deep(.cms-grid-light .ag-header-cell-filter-button .ag-icon) {
  color: #2b2826 !important;
}

:deep(html.dark .cms-grid .ag-header-cell-text),
:deep(html.dark .cms-grid .ag-header-group-text),
:deep(html.dark .cms-grid .ag-header-cell-label),
:deep(html.dark .cms-grid .ag-header-cell .ag-icon),
:deep(html.dark .cms-grid .ag-header-select-all .ag-icon),
:deep(html.dark .cms-grid .ag-header-cell-menu-button .ag-icon),
:deep(html.dark .cms-grid .ag-header-cell-filter-button .ag-icon) {
  color: #ede8df !important;
}

:deep(html:not(.dark) .cms-grid .ag-header-cell-text),
:deep(html:not(.dark) .cms-grid .ag-header-group-text),
:deep(html:not(.dark) .cms-grid .ag-header-cell-label),
:deep(html:not(.dark) .cms-grid .ag-header-cell .ag-icon),
:deep(html:not(.dark) .cms-grid .ag-header-select-all .ag-icon),
:deep(html:not(.dark) .cms-grid .ag-header-cell-menu-button .ag-icon),
:deep(html:not(.dark) .cms-grid .ag-header-cell-filter-button .ag-icon) {
  color: #2b2826 !important;
}

:deep(.cms-grid .ag-row.ag-row-selected),
:deep(.cms-grid .ag-row.ag-row-selected .ag-cell),
:deep(.cms-grid .ag-cell-range-selected),
:deep(.cms-grid .ag-cell-range-single-cell),
:deep(.cms-grid .ag-cell.ag-cell-focus.ag-cell-range-selected) {
  background-color: var(--cms-selected-row-bg) !important;
}

:deep(.cms-grid .ag-row.ag-row-selected::before) {
  background: transparent !important;
  border: 0 !important;
}

:deep(.cms-grid .ag-checkbox-input-wrapper) {
  color: var(--cms-checkbox-color) !important;
  background-color: transparent !important;
  border-color: color-mix(in srgb, var(--cms-checkbox-color) 90%, transparent) !important;
}

:deep(.cms-grid .ag-checkbox-input-wrapper.ag-checked),
:deep(.cms-grid .ag-checkbox-input-wrapper.ag-indeterminate) {
  color: var(--cms-checkbox-color) !important;
  background-color: color-mix(in srgb, var(--cms-checkbox-color) 34%, transparent) !important;
  border-color: var(--cms-checkbox-color) !important;
}

:deep(.dark .cms-grid .ag-checkbox-input-wrapper) {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ink-on-inv) 45%, transparent) inset;
}
</style>
