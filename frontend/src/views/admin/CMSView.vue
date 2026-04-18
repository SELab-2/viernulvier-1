
<template>
  <div class="min-h-screen bg-surface-0">
    <AdminNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

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

        <CmsGridControls
          :quick-filter-text="quickFilterText"
          :selected-count="selectedCount"
          :column-chooser-open="columnChooserOpen"
          @update:quick-filter-text="quickFilterText = $event"
          @apply-quick-filter="applyQuickFilter"
          @fit-columns="fitGridColumns"
          @auto-size-columns="autoSizeGridColumns"
          @reset-filters="resetGridFilters"
          @export-csv="exportGridCsv"
          @reset-state="resetGridState"
          @toggle-columns="columnChooserOpen = !columnChooserOpen"
        />

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

        <CmsColumnChooser
          :show="columnChooserOpen && !loadError"
          :column-options="gridColumnOptions"
          :column-visibility="columnVisibility"
          @close="columnChooserOpen = false"
          @set-column-visibility="setGridColumnVisibility"
        />

        <CmsEventsDrawer
          :show="selectedEventsProduction !== null"
          :selected-production="selectedEventsProduction"
          :selected-event-rows="selectedEventRows"
          :halls-data="hallsData"
          :events-panel-loading="eventsPanelLoading"
          :events-panel-error="eventsPanelError"
          :localize-value="localizeValue"
          @close="closeEventsPanel"
          @open-create-event="openCreateEventModal"
          @save-linked-event="saveLinkedEvent"
          @remove-linked-event="removeLinkedEvent"
          @event-row-focus-out="onEventRowFocusOut"
          @event-row-enter="onEventRowEnter"
        />

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

    <CmsCreateProductionModal
      :open="createModalOpen"
      :create-form="createForm"
      :create-extra-langs="createExtraLangs"
      :visible-create-langs="visibleCreateLangs"
      :lang-grid-class="langGridClass"
      :create-fields="createFields"
      :create-error="createError"
      :is-creating="isCreating"
      @update-finalized="createForm.finalized = $event"
      @update-extra-lang="setCreateExtraLang"
      @update-form-field="setCreateFormField"
      @image-file-change="onImageFileChange"
      @video-file-change="onVideoFileChange"
      @close="closeCreateModal"
      @submit="submitCreateProduction"
    />

    <CmsCreateEventModal
      :open="createEventModalOpen"
      :selected-production="selectedEventsProduction"
      :create-linked-event-form="createLinkedEventForm"
      :halls-data="hallsData"
      :events-panel-loading="eventsPanelLoading"
      :events-panel-error="eventsPanelError"
      :localize-value="localizeValue"
      @update-form-field="setCreateLinkedEventField"
      @close="closeCreateEventModal"
      @submit="submitCreateEvent"
    />
  </div>
</template>

<script setup lang="ts">

import { useDarkMode } from "@/composables/useDarkMode";
import AdminNavbar from "@/components/admin/AdminNavbar.vue";

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
import AppFooter from "@/components/AppFooter.vue";
import CmsColumnChooser from "@/components/admin/cms/CmsColumnChooser.vue";
import CmsCreateEventModal from "@/components/admin/cms/CmsCreateEventModal.vue";
import CmsEventsDrawer from "@/components/admin/cms/CmsEventsDrawer.vue";
import CmsGridControls from "@/components/admin/cms/CmsGridControls.vue";
import CmsCreateProductionModal from "@/components/admin/cms/CmsCreateProductionModal.vue";
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
  buildProductionGridRows,
  applyUpdatedProductionToRow,
  createProductionFields,
  buildEmptyCreateForm,
  fileToDataUrl,
  mediaToLanguageMap,
  toLanguageMap,
  toLanguageMapOrNull,
  validateCreateProductionForm,
  getBulkTargetRows,
  type CmsCreateLinkedEventForm,
  type CmsEventGridRow,
  type CreateFieldKey,
  type CreateFormState,
  type EditorPanelState,
  type InlineEditableField,
  type LongField,
  type CmsProductionGridRow,
  extractEventIds,
  makeEditorValues,
  toIsoStringFromLocalInput,
  toLocalDateTimeInput,
} from "@/services/cms";

const { t } = useI18n();
const { isDark, toggleDark } = useDarkMode();

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
const detailRowsCache = ref(new Map<number, CmsEventGridRow[]>());
const selectedEventsProductionId = ref<number | null>(null);
const selectedEventRows = ref<CmsEventGridRow[]>([]);
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
  return row ? getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], row).length : 0;
});

const selectedEventsProduction = computed(() => {
  if (selectedEventsProductionId.value === null) {
    return null;
  }
  return rowData.value.find((row) => row.id === selectedEventsProductionId.value) ?? null;
});

const createFields = createProductionFields;

const createForm = ref<CreateFormState>(buildEmptyCreateForm());

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

function setCreateLinkedEventField(
  field: keyof CmsCreateLinkedEventForm,
  value: CmsCreateLinkedEventForm[keyof CmsCreateLinkedEventForm],
): void {
  createLinkedEventForm.value = {
    ...createLinkedEventForm.value,
    [field]: value,
  };
}

function setCreateFormField(
  field: CreateFieldKey,
  lang: SupportedLang,
  value: string,
): void {
  createForm.value = {
    ...createForm.value,
    [field]: {
      ...createForm.value[field],
      [lang]: value,
    },
  };
}

function setCreateExtraLang(lang: "en" | "fr", value: boolean): void {
  createExtraLangs.value = {
    ...createExtraLangs.value,
    [lang]: value,
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

async function loadDetailRowsForProduction(
  production: ProductionWithBackwardsRefs,
): Promise<CmsEventGridRow[]> {
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
  createForm.value = buildEmptyCreateForm();
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

async function submitCreateProduction(): Promise<void> {
  const validationError = validateCreateProductionForm(createForm.value, t);
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

async function persistProductionPatch(
  row: CmsProductionGridRow,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const updated = await updateProduction(row.id, patch as never);
    applyUpdatedProductionToRow(row, updated, localizeValue);
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
    throw error;
  }
}

async function saveInlineBulkUpdate(
  primaryRow: CmsProductionGridRow,
  apiField: keyof ProductionWithBackwardsRefs,
  newValue: string,
): Promise<void> {
  const targetRows = getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], primaryRow);
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

async function onCellEditingStopped(
  event: CellEditingStoppedEvent<CmsProductionGridRow>,
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

function onProductionCellKeyDown(event: CellKeyDownEvent<CmsProductionGridRow>): void {
  const domEvent = event.event as KeyboardEvent | null | undefined;
  if (!event.data || !event.colDef.field || domEvent?.key !== "Enter") {
    return;
  }

  pendingProductionEnterCommits.value.add(getProductionEditKey(event.data.id, event.colDef.field));
}

function onProductionCellEditingStarted(event: CellEditingStartedEvent<CmsProductionGridRow>): void {
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

function onCellClicked(event: CellClickedEvent<CmsProductionGridRow>): void {
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
  const targetRows = getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], row);

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
  rowData.value = buildProductionGridRows(
    productionsData.value,
    tagsData.value,
    localizeValue,
  );
}

async function showEventsForProduction(row: CmsProductionGridRow): Promise<void> {
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

async function saveLinkedEvent(eventRow: CmsEventGridRow): Promise<void> {
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

async function removeLinkedEvent(eventRow: CmsEventGridRow): Promise<void> {
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
    resetCreateForm,
    resetCreateLinkedEventForm,
    openCreateModal,
    closeCreateModal,
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
