<template>
  <CmsTabShell
    v-model:quick-filter-text="quickFilterText"
    v-model:column-chooser-open="columnChooserOpen"
    :row-count="rowData.length"
    loaded-count-key="cms.actions.loadedCount"
    :is-loading="isLoading"
    :load-error="loadError"
    :selected-count="selectedCount"
    :column-options="gridColumnOptions"
    :column-visibility="columnVisibility"
    @apply-quick-filter="applyQuickFilter"
    @fit-columns="fitGridColumns"
    @auto-size-columns="autoSizeGridColumns"
    @reset-filters="resetGridFilters"
    @export-csv="exportGridCsv"
    @reset-state="resetGridState"
    @set-column-visibility="setGridColumnVisibility"
  >
    <template #header-actions>
      <div class="flex flex-col gap-2">
        <button type="button" class="cms-add-button" @click="openCreateModal">
          {{ t("cms.actions.addProduction") }}
        </button>
        <button
          type="button"
          class="cms-remove-button"
          :disabled="selectedCount === 0"
          @click="openRemoveConfirm"
        >
          {{ t("cms.actions.removeProduction") }}
        </button>
      </div>
    </template>

    <template #status-banner>
      <div class="cms-status-slot" :class="{ 'is-open': !!saveSuccess }">
        <Transition name="fade" appear>
          <div
            v-if="saveSuccess"
            class="rounded-lg border border-green-400/40 bg-green-400/10 p-4 text-sm text-green-700"
          >
            ✓ {{ saveSuccess }}
          </div>
        </Transition>
      </div>
    </template>

    <template #grid>
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
        :suppress-row-click-selection="true"
        :column-hover-highlight="true"
        :enable-cell-text-selection="true"
        :ensure-dom-order="true"
        :undo-redo-cell-editing="true"
        :undo-redo-cell-editing-limit="25"
        :value-cache="true"
        :cache-quick-filter="true"
        :get-row-style="getProductionRowStyle"
        :get-row-id="getRowId"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-editing-started="onProductionCellEditingStarted"
        @cell-key-down="onProductionCellKeyDown"
        @cell-editing-stopped="onCellEditingStopped"
        @cell-clicked="onCellClicked"
      />
    </template>

    <template #modals>
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

      <CmsEditorPanel
        v-model:panel="editorPanel"
        :bulk-count="editorBulkCount"
        :save-error="saveError"
        :is-saving="isSaving"
        @close="closeEditorPanel"
        @save="saveEditorPanel"
      />

      <CmsTagDrawer
        :show="tagEditorPanel !== null"
        :panel="tagEditorPanel"
        :additional-tag-groups="additionalTagGroups"
        :bulk-count="tagEditorBulkCount"
        :save-error="saveError"
        :is-saving="isSaving"
        @close="closeTagEditorPanel"
        @save="saveTagEditorPanel"
        @toggle-tag="toggleTagEditorTag"
      />

      <CmsCreateProductionModal
        :open="createModalOpen"
        :create-form="createForm"
        :create-extra-langs="createExtraLangs"
        :visible-create-langs="visibleCreateLangs"
        :lang-grid-class="langGridClass"
        :create-fields="createFields"
        :tag-groups="createTagGroups"
        :selected-primary-tag-id="selectedPrimaryTagId"
        :selected-tag-ids="selectedTagIds"
        :create-error="createError"
        :is-creating="isCreating"
        @update-finalized="createForm.finalized = $event"
        @update-extra-lang="setCreateExtraLang"
        @update-form-field="setCreateFormField"
        @update-primary-tag="setSelectedPrimaryTag"
        @toggle-tag="toggleCreateTag"
        @add-media="addMedia"
        @remove-media="removeMedia"
        @media-file-change="onMediaFileChange"
        @update-media-url="updateMediaUrl"
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

      <CmsRemoveConfirmModal
        v-if="removeConfirmOpen"
        :is-loading="removeConfirmLoading"
        :error="removeConfirmError"
        :count="selectedCount"
        title-key="cms.actions.production.confirmRemoveDialogTitle"
        body-key="cms.actions.production.confirmRemoveBody"
        @close="closeRemoveConfirm"
        @confirm="confirmRemove"
      />

      <div v-if="bulkEditConfirmOpen" class="cms-modal-overlay" @click.self="closeBulkEditConfirm">
        <section class="cms-modal cms-remove-modal" role="dialog" aria-modal="true">
          <header class="cms-modal-header">
            <h2 class="text-xl font-bold text-ink-primary">
              {{ t("cms.actions.confirmBulkEditDialogTitle") }}
            </h2>
            <button type="button" class="cms-side-close" @click="closeBulkEditConfirm">
              {{ t("cms.panel.close") }}
            </button>
          </header>

          <div class="cms-modal-body">
            <p class="text-sm text-ink-secondary">
              {{ t("cms.actions.confirmBulkEditBody", { count: bulkEditConfirmCount }) }}
            </p>
            <p class="text-xs text-ink-secondary/70 mt-3">
              {{ t("cms.actions.confirmBulkEditCancelInfo") }}
            </p>
          </div>

          <footer class="cms-modal-footer">
            <button type="button" class="cms-side-close" :disabled="bulkEditConfirmLoading" @click="closeBulkEditConfirm">
              {{ t("general.cancel") }}
            </button>
            <button type="button" class="cms-side-save" :disabled="bulkEditConfirmLoading" @click="confirmBulkEdit">
              {{ bulkEditConfirmLoading ? t("cms.panel.saving") : t("cms.actions.confirmBulkEditSubmit") }}
            </button>
          </footer>
        </section>
      </div>

      <div v-if="secondaryTagBulkModeOpen" class="cms-modal-overlay" @click.self="closeSecondaryTagBulkMode">
        <section class="cms-modal cms-remove-modal" role="dialog" aria-modal="true">
          <header class="cms-modal-header">
            <h2 class="text-xl font-bold text-ink-primary">
              {{ t("cms.actions.bulkEditTagsModeTitle") }}
            </h2>
            <button type="button" class="cms-side-close" :disabled="secondaryTagBulkModeLoading" @click="closeSecondaryTagBulkMode">
              {{ t("cms.panel.close") }}
            </button>
          </header>

          <div class="cms-modal-body">
            <p class="text-sm text-ink-secondary">
              {{ t("cms.actions.bulkEditTagsModeBody", { count: secondaryTagBulkModeCount }) }}
            </p>

            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                class="cms-choice-card"
                :disabled="secondaryTagBulkModeLoading"
                @click="confirmSecondaryTagBulkReplace"
              >
                <div class="cms-choice-card-header">
                  <div>
                    <div class="font-semibold text-ink-primary">
                      {{ t("cms.actions.bulkEditTagsModeReplace") }}
                    </div>
                    <div class="mt-1 text-sm text-ink-secondary">
                      {{ t("cms.actions.bulkEditTagsModeReplaceDescription") }}
                    </div>
                  </div>
                  <span class="cms-choice-card-badge">1</span>
                </div>

                <div v-if="secondaryTagBulkModeTagsPreview" class="mt-3 text-sm">
                  <div class="font-medium text-ink-primary">{{ t('cms.actions.bulkEditTagsPreviewTags') }}</div>
                  <div class="mt-1 whitespace-pre-line text-ink-primary">{{ secondaryTagBulkModeTagsPreview }}</div>
                </div>
              </button>

              <button
                type="button"
                class="cms-choice-card"
                :disabled="secondaryTagBulkModeLoading"
                @click="confirmSecondaryTagBulkDiff"
              >
                <div class="cms-choice-card-header">
                  <div>
                    <div class="font-semibold text-ink-primary">
                      {{ t("cms.actions.bulkEditTagsModeDiff") }}
                    </div>
                    <div class="mt-1 text-sm text-ink-secondary">
                      {{ t("cms.actions.bulkEditTagsModeDiffDescription") }}
                    </div>
                  </div>
                  <span class="cms-choice-card-badge">2</span>
                </div>

                <div class="mt-3 space-y-2 text-sm">
                  <div v-if="secondaryTagBulkModeAddedPreview">
                    <div class="font-medium text-ink-primary">{{ t('cms.actions.bulkEditTagsPreviewAdd') }}</div>
                    <div class="mt-1 whitespace-pre-line text-ink-primary">{{ secondaryTagBulkModeAddedPreview }}</div>
                  </div>
                  <div v-if="secondaryTagBulkModeRemovedPreview">
                    <div class="font-medium text-ink-primary">{{ t('cms.actions.bulkEditTagsPreviewRemove') }}</div>
                    <div class="mt-1 whitespace-pre-line text-ink-primary">{{ secondaryTagBulkModeRemovedPreview }}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <footer class="cms-modal-footer">
            <button type="button" class="cms-side-close" :disabled="secondaryTagBulkModeLoading" @click="closeSecondaryTagBulkMode">
              {{ t("general.cancel") }}
            </button>
          </footer>
        </section>
      </div>

      <div v-if="mediaPreview" class="cms-modal-overlay" @click.self="closeMediaPreview">
        <section class="cms-modal cms-media-modal" role="dialog" aria-modal="true">
          <header class="cms-modal-header">
            <h2 class="text-xl font-bold text-ink-primary">
              {{ t("cms.actions.confirmBulkEditDialogTitle") }}
            </h2>
            <button type="button" class="cms-side-close" @click="closeBulkEditConfirm">
              {{ t("cms.panel.close") }}
            </button>
          </header>

          <div class="cms-modal-body">
            <p class="text-sm text-ink-secondary">
              {{ t("cms.actions.confirmBulkEditBody", { count: bulkEditConfirmCount }) }}
            </p>
            <p class="text-xs text-ink-secondary/70 mt-3">
              {{ t("cms.actions.confirmBulkEditCancelInfo") }}
            </p>
          </div>

          <footer class="cms-modal-footer">
            <button type="button" class="cms-side-close" :disabled="bulkEditConfirmLoading" @click="closeBulkEditConfirm">
              {{ t("cms.panel.close") }}
            </button>
            <button type="button" class="cms-side-save" :disabled="bulkEditConfirmLoading" @click="confirmBulkEdit">
              {{ bulkEditConfirmLoading ? t("general.saving") : t("cms.actions.confirmBulkEditSubmit") }}
            </button>
          </footer>
        </section>
      </div>

      <div v-if="secondaryTagBulkModeOpen" class="cms-modal-overlay" @click.self="closeSecondaryTagBulkMode">
        <section class="cms-modal cms-remove-modal" role="dialog" aria-modal="true">
          <header class="cms-modal-header">
            <h2 class="text-xl font-bold text-ink-primary">
              {{ t("cms.actions.bulkEditTagsModeTitle") }}
            </h2>
            <button type="button" class="cms-side-close" :disabled="secondaryTagBulkModeLoading" @click="closeSecondaryTagBulkMode">
              {{ t("cms.panel.close") }}
            </button>
          </header>

          <div class="cms-modal-body">
            <p class="text-sm text-ink-secondary">
              {{ t("cms.actions.bulkEditTagsModeBody", { count: secondaryTagBulkModeCount }) }}
            </p>

            <div class="mt-3 text-sm">
              <div v-if="secondaryTagBulkModeTagsPreview">
                <div class="font-medium text-ink-primary">{{ t('cms.actions.bulkEditTagsPreviewTags') }}</div>
                <div class="ml-2 mt-1 whitespace-pre-line text-ink-primary">{{ secondaryTagBulkModeTagsPreview }}</div>
              </div>

              <div v-if="secondaryTagBulkModeAddedPreview || secondaryTagBulkModeRemovedPreview" class="mt-2">
                <div v-if="secondaryTagBulkModeAddedPreview">
                  <div class="font-medium text-ink-primary">{{ t('cms.actions.bulkEditTagsPreviewAdd') }}</div>
                  <div class="ml-2 mt-1 whitespace-pre-line text-ink-primary">{{ secondaryTagBulkModeAddedPreview }}</div>
                </div>
                <div v-if="secondaryTagBulkModeRemovedPreview" class="mt-1">
                  <div class="font-medium text-ink-primary">{{ t('cms.actions.bulkEditTagsPreviewRemove') }}</div>
                  <div class="ml-2 mt-1 whitespace-pre-line text-ink-primary">{{ secondaryTagBulkModeRemovedPreview }}</div>
                </div>
              </div>
            </div>
          </div>

          <footer class="cms-modal-footer">
            <button type="button" class="cms-side-close" :disabled="secondaryTagBulkModeLoading" @click="closeSecondaryTagBulkMode">
              {{ t("general.cancel") }}
            </button>
            <button type="button" class="cms-side-close" :disabled="secondaryTagBulkModeLoading" @click="confirmSecondaryTagBulkReplace">
              {{ t("cms.actions.bulkEditTagsModeReplace") }}
            </button>
            <button type="button" class="cms-side-save" :disabled="secondaryTagBulkModeLoading" @click="confirmSecondaryTagBulkDiff">
              {{ t("cms.actions.bulkEditTagsModeDiff") }}
            </button>
          </footer>
        </section>
      </div>

      <CmsMediaPreviewModal
        :media-preview="mediaPreview"
        :media-preview-edit-url="mediaPreviewEditUrl"
        :is-saving="isSaving"
        @close="closeMediaPreview"
        @image-selected="onMediaPreviewImageSelected"
        @remove-image="removeMediaImage"
        @remove-video="removeMediaVideo"
        @save-video-url="saveMediaVideoUrl"
        @sync-gallery-preview="syncGalleryPreview"
        @update:media-preview-edit-url="mediaPreviewEditUrl = $event"
      />
    </template>
  </CmsTabShell>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellClickedEvent,
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
  CellKeyDownEvent,
} from "ag-grid-community";
import { useI18n } from "vue-i18n";
import type { Event as ArchiveEvent, Hall, ProductionWithBackwardsRefs, Tag, TagType } from "@viernulvier/shared";
import CmsRemoveConfirmModal from "@/components/admin/cms/CmsRemoveConfirmModal.vue";
import CmsMediaPreviewModal from "@/components/admin/cms/productions/CmsMediaPreviewModal.vue";
import CmsTabShell from "@/components/admin/cms/CmsTabShell.vue";
import CmsCreateEventModal from "@/components/admin/cms/productions/CmsCreateEventModal.vue";
import CmsEventsDrawer from "@/components/admin/cms/productions/CmsEventsDrawer.vue";
import CmsTagDrawer from "@/components/admin/cms/CmsTagDrawer.vue";
import CmsEditorPanel from "@/components/admin/cms/CmsEditorPanel.vue";
import CmsCreateProductionModal from "@/components/admin/cms/productions/CmsCreateProductionModal.vue";
import { useCmsProductionGrid } from "@/composables/useCmsProductionGrid";
import { useCmsRemove } from "@/composables/useCmsRemove";
import { useDarkMode } from "@/composables/useDarkMode";
import { i18n, type SupportedLang } from "@/i18n";
import {
  bulkUpdateProductions,
  createProduction,
  deleteProduction,
  extractProductionTagIds,
  getProductions,
  updateProduction,
} from "@/services/productions";
import { createEvent, deleteEvent, getEvent, updateEvent } from "@/services/events";
import { getHall, getHalls } from "@/services/halls";
import { getAllTags, getTagTypes } from "@/services/tags";
import { getImagesByProduction, deleteImage as deleteImageService } from "@/services/images";
import { localizeOrEmpty, type LanguageMap } from "@/utils/language-utils";
import {
  buildEventGridRows,
  buildProductionGridRows,
  buildCmsTagGroups,
  createProductionFields,
  buildEmptyCreateForm,
  createMediaItem,
  fileToDataUrl,
  toLanguageMap,
  toLanguageMapOrNull,
  validateCreateProductionForm,
  getBulkTargetRows,
  applyUpdatedProductionToRow,
  type CmsCreateLinkedEventForm,
  type CmsEventGridRow,
  type CreateFieldKey,
  type CreateFormState,
  type EditorPanelState,
  type InlineEditableField,
  type ProductionLongField,
  type CmsProductionGridRow,
  extractEventIds,
  makeEditorValues,
  toIsoStringFromLocalInput,
  toLocalDateTimeInput,
} from "@/services/cms";
import {
  isImagePreviewUrl,
  isVideoPreviewUrl,
  resolvePreferredCropUrl,
  type CmsMediaPreview,
} from "@/services/cms/media-preview";
import { uploadImageWithCrops } from "@/services/cms/media-upload";

const { t } = useI18n();
const { isDark } = useDarkMode();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

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
  getRowId,
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
  getGenreOptions: () =>
    createTagGroups.value
      .filter((group) => group.isGenre)
      .flatMap((group) => group.tags),
  currentLang,
});

const isLoading = ref(false);
const isSaving = ref(false);
const isCreating = ref(false);
const loadError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const saveSuccess = ref<string | null>(null);
const createError = ref<string | null>(null);
const rowData = ref<CmsProductionGridRow[]>([]);
const editorPanel = ref<EditorPanelState | null>(null);
const createModalOpen = ref(false);
const createEventModalOpen = ref(false);
const bulkEditConfirmOpen = ref(false);
const bulkEditConfirmLoading = ref(false);
const bulkEditConfirmCount = ref(0);
const pendingBulkEditAction = ref<(() => Promise<void>) | null>(null);
const mediaPreview = ref<CmsMediaPreview | null>(null);
const mediaPreviewEditUrl = ref("");
const imagesByProductionId = ref(new Map<number, Array<{ id: number; url: string }>>());
const imageLoadRequestToken = ref(0);
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
const tagTypesData = ref<TagType[]>([]);
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

const {
  removeConfirmOpen,
  removeConfirmLoading,
  removeConfirmError,
  openRemoveConfirm,
  closeRemoveConfirm,
  confirmRemove,
} = useCmsRemove<CmsProductionGridRow>({
  selectedCount,
  getSelectedRows: () => gridApi.value?.getSelectedRows() ?? [],
  rowToId: (row) => row.id,
  deleteFn: deleteProduction,
  t,
  onSuccess: async () => {
    selectedCount.value = 0;
    gridApi.value?.deselectAll();
    await loadCmsData();
    showSaveSuccess(t("cms.feedback.removeSuccess"));
  },
});

const createFields = createProductionFields;

const createForm = ref<CreateFormState>(buildEmptyCreateForm());
const selectedPrimaryTagId = ref<number | null>(null);
const selectedTagIds = ref<number[]>([]);
const createTagGroups = computed(() => buildCmsTagGroups(tagsData.value, tagTypesData.value, localizeValue));
const additionalTagGroups = computed(() => createTagGroups.value.filter((group) => !group.isGenre));
const tagEditorPanel = ref<{
  rowId: number;
  label: string;
  selectedTagIds: number[];
  initialSelectedTagIds: number[];
} | null>(null);

const tagEditorBulkCount = computed(() => {
  if (!tagEditorPanel.value) {
    return 0;
  }

  const row = rowData.value.find((item) => item.id === tagEditorPanel.value?.rowId);
  if (!row) {
    return 0;
  }

  return getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], row).length;
});

const secondaryTagBulkModeOpen = ref(false);
const secondaryTagBulkModeLoading = ref(false);
const secondaryTagBulkModeCount = ref(0);
const secondaryTagBulkModeTagsPreview = ref("");
const secondaryTagBulkModeAddedPreview = ref("");
const secondaryTagBulkModeRemovedPreview = ref("");
const pendingSecondaryTagBulkRows = ref<CmsProductionGridRow[]>([]);

const inlineFieldToApi: Record<InlineEditableField, InlineEditableField> = {
  teaser: "teaser",
}

type longGridFieldIds = "descriptionOne" | "descriptionTwo" | "media" | "performer" | "artist" | "title" | "producer";

const longGridFieldToApi: Record<longGridFieldIds, ProductionLongField> = {
  descriptionOne: "description",
  descriptionTwo: "description_2",
  media: "video_1",
  performer: "artist",
  title: "title",
  artist: "artist",
  producer: "supertitle",
};

const genreTagTypeIds = computed(
  () => new Set(createTagGroups.value.filter((group) => group.isGenre).map((group) => group.tagTypeId)),
);

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

function toEditableLanguageMap(values: Record<SupportedLang, string>): LanguageMap {
  return {
    nl: values.nl.trim(),
    en: values.en.trim(),
    fr: values.fr.trim(),
  };
}

function getProductionEditKey(rowId: number, field: string): string {
  return `${rowId}:${field}`;
}

function formatTagNames(tagIds: number[], maxCount: number = 5): string {
  const tags = tagIds
    .slice(0, maxCount)
    .map((tagId) => tagsData.value.find((t) => t.id === tagId)?.name[currentLang.value] || `Tag ${tagId}`)
    .filter(Boolean);
  const result = tags.join(", ");
  if (tagIds.length > maxCount) {
    return `${result} +${tagIds.length - maxCount}`;
  }
  return result;
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

function setSelectedPrimaryTag(value: number | null): void {
  selectedPrimaryTagId.value = value;
}

function toggleCreateTag(tagId: number, selected: boolean): void {
  const next = new Set(selectedTagIds.value);
  if (selected) {
    next.add(tagId);
  } else {
    next.delete(tagId);
  }
  selectedTagIds.value = [...next];
}

function closeTagEditorPanel(): void {
  tagEditorPanel.value = null;
  saveError.value = null;
  closeSecondaryTagBulkMode();
}

function openTagEditorPanel(row: CmsProductionGridRow): void {
  const genreTypeIds = genreTagTypeIds.value;
  const currentTagIds = extractProductionTagIds(row.source);
  const selectedAdditionalTagIds = currentTagIds.filter((tagId) => {
    const tag = tagsData.value.find((item) => item.id === tagId);
    return tag ? !genreTypeIds.has(Number(tag.tag_type)) : false;
  });

  tagEditorPanel.value = {
    rowId: row.id,
    label: row.title || t("cms.columns.tags"),
    selectedTagIds: selectedAdditionalTagIds,
    initialSelectedTagIds: selectedAdditionalTagIds,
  };
  saveError.value = null;
}

function toggleTagEditorTag(tagId: number, selected: boolean): void {
  if (!tagEditorPanel.value) {
    return;
  }

  const next = new Set(tagEditorPanel.value.selectedTagIds);
  if (selected) {
    next.add(tagId);
  } else {
    next.delete(tagId);
  }

  tagEditorPanel.value = {
    ...tagEditorPanel.value,
    selectedTagIds: [...next],
  };
}

async function saveTagEditorPanel(): Promise<void> {
  if (!tagEditorPanel.value) {
    return;
  }

  const row = rowData.value.find((item) => item.id === tagEditorPanel.value?.rowId);
  if (!row) {
    return;
  }

  const targetRows = getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], row);

  if (targetRows.length > 1) {
    openBulkEditConfirm(targetRows.length, async () => {
      // Compute tag previews for the modal
      const desiredTagIds = [...new Set(tagEditorPanel.value!.selectedTagIds)];
      const initialTagIds = [...new Set(tagEditorPanel.value!.initialSelectedTagIds)];
      const addedTagIds = desiredTagIds.filter((tagId) => !initialTagIds.includes(tagId));
      const removedTagIds = initialTagIds.filter((tagId) => !desiredTagIds.includes(tagId));

      secondaryTagBulkModeTagsPreview.value = formatTagNames(desiredTagIds);
      secondaryTagBulkModeAddedPreview.value = formatTagNames(addedTagIds);
      secondaryTagBulkModeRemovedPreview.value = formatTagNames(removedTagIds);

      pendingSecondaryTagBulkRows.value = targetRows;
      secondaryTagBulkModeCount.value = targetRows.length;
      secondaryTagBulkModeOpen.value = true;
    });
    return;
  }

  const genreTypeIds = genreTagTypeIds.value;
  const currentTagIds = extractProductionTagIds(row.source);
  const existingGenreTagIds = currentTagIds.filter((tagId) => {
    const tag = tagsData.value.find((item) => item.id === tagId);
    return tag ? genreTypeIds.has(Number(tag.tag_type)) : false;
  });

  isSaving.value = true;
  saveError.value = null;
  try {
    await updateProduction(row.id, {
      tags: [...existingGenreTagIds, ...tagEditorPanel.value.selectedTagIds],
    });
    await loadCmsData();
    closeTagEditorPanel();
    showSaveSuccess(t("cms.feedback.saveSuccess"));
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isSaving.value = false;
  }
}

function closeSecondaryTagBulkMode(): void {
  secondaryTagBulkModeOpen.value = false;
  secondaryTagBulkModeLoading.value = false;
  secondaryTagBulkModeCount.value = 0;
  secondaryTagBulkModeTagsPreview.value = "";
  secondaryTagBulkModeAddedPreview.value = "";
  secondaryTagBulkModeRemovedPreview.value = "";
  pendingSecondaryTagBulkRows.value = [];
}

async function applySecondaryTagBulkEdit(mode: "replace" | "diff"): Promise<void> {
  if (!tagEditorPanel.value) {
    closeSecondaryTagBulkMode();
    return;
  }

  const targetRows = pendingSecondaryTagBulkRows.value;
  if (targetRows.length === 0) {
    closeSecondaryTagBulkMode();
    return;
  }

  const desiredAdditionalTagIds = [...new Set(tagEditorPanel.value.selectedTagIds)];
  const initialAdditionalTagIds = [...new Set(tagEditorPanel.value.initialSelectedTagIds)];
  const addedTagIds = desiredAdditionalTagIds.filter((tagId) => !initialAdditionalTagIds.includes(tagId));
  const removedTagIds = initialAdditionalTagIds.filter((tagId) => !desiredAdditionalTagIds.includes(tagId));
  const genreTypeIds = genreTagTypeIds.value;

  secondaryTagBulkModeLoading.value = true;
  isSaving.value = true;
  saveError.value = null;

  try {
    for (const targetRow of targetRows) {
      const currentTagIds = extractProductionTagIds(targetRow.source);
      const existingGenreTagIds = currentTagIds.filter((tagId) => {
        const tag = tagsData.value.find((item) => item.id === tagId);
        return tag ? genreTypeIds.has(Number(tag.tag_type)) : false;
      });

      const existingAdditionalTagIds = currentTagIds.filter((tagId) => {
        const tag = tagsData.value.find((item) => item.id === tagId);
        return tag ? !genreTypeIds.has(Number(tag.tag_type)) : false;
      });

      const nextAdditionalTagIds =
        mode === "replace"
          ? desiredAdditionalTagIds
          : Array.from(
            new Set(
              existingAdditionalTagIds
                .filter((tagId) => !removedTagIds.includes(tagId))
                .concat(addedTagIds),
            ),
          );

      await updateProduction(targetRow.id, {
        tags: [...existingGenreTagIds, ...nextAdditionalTagIds],
      });
    }
    await Promise.all(
      targetRows.map(async (targetRow) => {
        const currentTagIds = extractProductionTagIds(targetRow.source);
        const existingGenreTagIds = currentTagIds.filter((tagId) => {
          const tag = tagsData.value.find((item) => item.id === tagId);
          return tag ? genreTypeIds.has(Number(tag.tag_type)) : false;
        });

        const existingAdditionalTagIds = currentTagIds.filter((tagId) => {
          const tag = tagsData.value.find((item) => item.id === tagId);
          return tag ? !genreTypeIds.has(Number(tag.tag_type)) : false;
        });

        const nextAdditionalTagIds =
          mode === "replace"
            ? desiredAdditionalTagIds
            : Array.from(
              new Set(
                existingAdditionalTagIds
                  .filter((tagId) => !removedTagIds.includes(tagId))
                  .concat(addedTagIds),
              ),
            );

        await updateProduction(targetRow.id, {
          tags: [...existingGenreTagIds, ...nextAdditionalTagIds],
        });
      }),
    );

    await loadCmsData();
    closeSecondaryTagBulkMode();
    closeTagEditorPanel();
    showSaveSuccess(t("cms.feedback.saveSuccess"));
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
    throw error;
  } finally {
    secondaryTagBulkModeLoading.value = false;
    isSaving.value = false;
  }
}

async function confirmSecondaryTagBulkReplace(): Promise<void> {
  await applySecondaryTagBulkEdit("replace");
}

async function confirmSecondaryTagBulkDiff(): Promise<void> {
  await applySecondaryTagBulkEdit("diff");
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

function openBulkEditConfirm(count: number, action: () => Promise<void>): void {
  bulkEditConfirmCount.value = count;
  pendingBulkEditAction.value = action;
  bulkEditConfirmOpen.value = true;
}

function closeBulkEditConfirm(): void {
  bulkEditConfirmOpen.value = false;
  bulkEditConfirmLoading.value = false;
  pendingBulkEditAction.value = null;
}

async function confirmBulkEdit(): Promise<void> {
  if (!pendingBulkEditAction.value) {
    closeBulkEditConfirm();
    return;
  }

  bulkEditConfirmLoading.value = true;
  try {
    await pendingBulkEditAction.value();
    closeBulkEditConfirm();
  } catch {
    // Error is already handled in the action
    bulkEditConfirmLoading.value = false;
  }
}

function showSaveSuccess(message: string): void {
  saveSuccess.value = message;
  setTimeout(() => {
    saveSuccess.value = null;
  }, 3000);
}

function openMediaPreview(
  url: string,
  label: string,
  options: { imageId?: number; productionId?: number; mediaField?: "video_1" | "video_2" } = {},
): void {
  const trimmed = url.trim();
  // If there's no URL, open a placeholder so the user can add media.
  if (!trimmed) {
    const placeholder = createPlaceholderImageDataUrl(t("cms.panel.noMedia"));
    if (options.mediaField) {
      // For video fields, show the iframe view (blank) but keep mediaField so the input appears.
      mediaPreview.value = { url: "about:blank", kind: "iframe", label, productionId: options.productionId, mediaField: options.mediaField };
      mediaPreviewEditUrl.value = "";
      return;
    }

    mediaPreview.value = { url: placeholder, kind: "image", label, imageId: options.imageId, productionId: options.productionId };
    mediaPreviewEditUrl.value = "";
    return;
  }

  if (isImagePreviewUrl(trimmed)) {
    mediaPreview.value = { url: trimmed, kind: "image", label, imageId: options.imageId, productionId: options.productionId };
    mediaPreviewEditUrl.value = "";
    return;
  }

  // Handle YouTube
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    let videoId = "";
    // Try youtube.com/watch?v=xxxxx format
    const watchMatch = trimmed.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/);
    if (watchMatch) {
      videoId = watchMatch[1];
    } else {
      // Try youtu.be/xxxxx format
      const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
      if (shortMatch) {
        videoId = shortMatch[1];
      }
    }
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      mediaPreview.value = { url: embedUrl, kind: "iframe", label, productionId: options.productionId, mediaField: options.mediaField };
      mediaPreviewEditUrl.value = trimmed;
      return;
    }
  }

  // Handle Vimeo
  if (trimmed.includes("vimeo.com")) {
    let videoId = "";
    // Try player.vimeo.com/video/xxxxx format first
    const playerMatch = trimmed.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (playerMatch) {
      videoId = playerMatch[1];
    } else {
      // Try regular vimeo.com/xxxxx format
      const regularMatch = trimmed.match(/vimeo\.com\/(\d+)/);
      if (regularMatch) {
        videoId = regularMatch[1];
      }
    }
    if (videoId) {
      const embedUrl = `https://player.vimeo.com/video/${videoId}`;
      mediaPreview.value = { url: embedUrl, kind: "iframe", label, productionId: options.productionId, mediaField: options.mediaField };
      mediaPreviewEditUrl.value = trimmed;
      return;
    }
  }

  // Generic iframe for other providers or direct video URLs
  mediaPreview.value = { url: trimmed, kind: "iframe", label, productionId: options.productionId, mediaField: options.mediaField };
  mediaPreviewEditUrl.value = trimmed;
}

function openImageGalleryPreview(
  images: Array<{ id: number; url: string }>,
  label: string,
  productionId: number,
): void {
  const normalized = images.filter((image) => image.url.trim().length > 0);
  if (normalized.length === 0) {
    // Show placeholder image so the user can add one
    const placeholder = createPlaceholderImageDataUrl(t("cms.panel.noMedia"));
    mediaPreview.value = {
      url: placeholder,
      kind: "image",
      label,
      productionId,
      images: [],
    };
    mediaPreviewEditUrl.value = "";
    return;
  }

  mediaPreview.value = {
    url: normalized[0]!.url,
    kind: normalized.length > 1 ? "gallery" : "image",
    label,
    imageId: normalized[0]!.id,
    productionId,
    images: normalized,
    currentImageIndex: 0,
  };
  mediaPreviewEditUrl.value = "";
}

function createPlaceholderImageDataUrl(text: string, width = 800, height = 450): string {
  const bg = "#f3f4f6";
  const fg = "#374151";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><rect width='100%' height='100%' fill='${bg}'/><text x='50%' y='50%' fill='${fg}' font-family='Arial, Helvetica, sans-serif' font-size='24' dominant-baseline='middle' text-anchor='middle'>${escapeXml(text)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[&<>\"']/g, (c) => {
    switch (c) {
    case "&":
      return "&amp;";
    case "<":
      return "&lt;";
    case ">":
      return "&gt;";
    case '"':
      return "&quot;";
    case "'":
      return "&apos;";
    default:
      return c;
    }
  });
}

function syncGalleryPreview(nextIndex: number): void {
  const preview = mediaPreview.value;
  if (!preview || preview.kind !== "gallery" || !preview.images || preview.images.length === 0) {
    return;
  }

  const normalizedIndex = ((nextIndex % preview.images.length) + preview.images.length) % preview.images.length;
  const nextImage = preview.images[normalizedIndex];
  if (!nextImage) {
    return;
  }

  mediaPreview.value = {
    ...preview,
    url: nextImage.url,
    imageId: nextImage.id,
    currentImageIndex: normalizedIndex,
  };
}

function closeMediaPreview(): void {
  mediaPreview.value = null;
  mediaPreviewEditUrl.value = "";
}

async function onMediaPreviewImageSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const productionId = mediaPreview.value?.productionId;
  if (!file || productionId === undefined) {
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  try {
    const dataUrl = await fileToDataUrl(file);
    const uploadedImage = await uploadImageWithCrops(productionId, dataUrl);
    await loadCmsData();
    const previewUrl =
      resolvePreferredCropUrl(uploadedImage.crops, window.location.origin) ?? mediaPreview.value?.url;
    if (previewUrl) {
      openMediaPreview(previewUrl, mediaPreview.value?.label ?? t("cms.columns.imageMedia"), {
        imageId: uploadedImage.id,
        productionId,
      });
    }
    showSaveSuccess(t("cms.feedback.mediaAddSuccess"));
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    input.value = "";
    isSaving.value = false;
  }
}

async function saveMediaVideoUrl(): Promise<void> {
  const preview = mediaPreview.value;
  const nextUrl = mediaPreviewEditUrl.value.trim();
  if (!preview?.productionId || !preview.mediaField || !nextUrl) {
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  try {
    await updateProduction(preview.productionId, {
      [preview.mediaField]: { nl: nextUrl },
    } as Parameters<typeof updateProduction>[1]);
    await loadCmsData();
    openMediaPreview(nextUrl, preview.label, {
      productionId: preview.productionId,
      mediaField: preview.mediaField,
    });
    showSaveSuccess(t("cms.feedback.mediaUpdateSuccess"));
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isSaving.value = false;
  }
}

async function removeMediaImage(): Promise<void> {
  if (!mediaPreview.value?.imageId) {
    return;
  }

  if (!confirm(t("cms.create.media.confirmDelete"))) {
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  try {
    await deleteImageService(mediaPreview.value.imageId);
    closeMediaPreview();
    await loadCmsData();
    showSaveSuccess(t("cms.feedback.mediaRemoveSuccess"));
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isSaving.value = false;
  }
}

async function removeMediaVideo(): Promise<void> {
  const preview = mediaPreview.value;
  if (!preview?.productionId || !preview.mediaField) {
    return;
  }

  if (!confirm(t("cms.create.media.confirmDeleteVideo"))) {
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  try {
    await updateProduction(preview.productionId, {
      [preview.mediaField]: null,
    } as Parameters<typeof updateProduction>[1]);
    closeMediaPreview();
    await loadCmsData();
    showSaveSuccess(t("cms.feedback.mediaRemoveVideoSuccess"));
  } catch (error) {
    saveError.value =
      error instanceof Error
        ? t("cms.errors.saveFailed", { message: error.message })
        : t("cms.errors.saveGeneric");
  } finally {
    isSaving.value = false;
  }
}

function resetCreateForm(): void {
  createForm.value = buildEmptyCreateForm();
  createExtraLangs.value = { en: false, fr: false };
  selectedPrimaryTagId.value = null;
  selectedTagIds.value = [];
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

function addMedia(type: "image" | "video"): void {
  createForm.value.media.push(createMediaItem(type));
}

function removeMedia(mediaId: string): void {
  createForm.value.media = createForm.value.media.filter((m) => m.id !== mediaId);
}

async function onMediaFileChange(mediaId: string, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const dataUrl = await fileToDataUrl(file);
  const mediaIndex = createForm.value.media.findIndex((m) => m.id === mediaId);
  if (mediaIndex >= 0) {
    createForm.value.media[mediaIndex]!.url = dataUrl;
  }
  input.value = "";
}

function updateMediaUrl(mediaId: string, url: string): void {
  const mediaIndex = createForm.value.media.findIndex((m) => m.id === mediaId);
  if (mediaIndex >= 0) {
    createForm.value.media[mediaIndex]!.url = url;
  }
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
    // Extract media items for API submission
    const videoMedia = createForm.value.media.find((m) => m.type === "video");

    // Create production first
    const production = await createProduction({
      vendor_id: 0,
      box_office_id: 0,
      finalized: createForm.value.finalized,
      tags: [
        ...(selectedPrimaryTagId.value !== null ? [selectedPrimaryTagId.value] : []),
        ...selectedTagIds.value,
      ],
      title: toLanguageMap(createForm.value.title),
      artist: toLanguageMap(createForm.value.artist),
      tagline: toLanguageMap(createForm.value.tagline),
      teaser: toLanguageMap(createForm.value.teaser),
      supertitle: toLanguageMapOrNull(createForm.value.supertitle),
      description: toLanguageMapOrNull(createForm.value.description),
      description_2: toLanguageMapOrNull(createForm.value.description_2),
      video_1: null,
      video_2: videoMedia?.url?.trim() ? { nl: videoMedia.url } : null,
    });

    // Upload image media items with auto-generated crops
    for (const mediaItem of createForm.value.media) {
      if (mediaItem.type === "image" && mediaItem.url && !mediaItem.imageId) {
        try {
          // Check if it's a data URL (file upload) or external URL
          if (mediaItem.url.startsWith("data:")) {
            const uploadedImage = await uploadImageWithCrops(production.id, mediaItem.url);
            mediaItem.imageId = uploadedImage.id;
            mediaItem.isUploaded = true;
          }
          // If it's an external URL, it's already stored in video_1 and doesn't need crops
        } catch (error) {
          console.error(
            `Failed to upload image for production ${production.id}:`,
            error,
          );
          // Continue with other images, but log the error
        }
      }
    }

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

async function persistBulkProductionPatch(
  targetRows: CmsProductionGridRow[],
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    const updatedRows = await bulkUpdateProductions({
      ids: targetRows.map((row) => row.id),
      data: patch as never,
    });

    // Sync the source-of-truth array so that rebuildRows() (triggered by a
    // language switch) reproduces rows from the just-saved LanguageMaps, not
    // from the pre-edit ones.
    for (const updated of updatedRows) {
      const idx = productionsData.value.findIndex((p) => p.id === updated.id);
      if (idx !== -1) {
        productionsData.value[idx] = updated;
      }
    }

    const refreshedNodes = [];
    for (const row of targetRows) {
      const updated = updatedRows.find((item) => item.id === row.id);
      if (!updated) continue;
      applyUpdatedProductionToRow(row, updated, localizeValue);
      const node = gridApi.value?.getRowNode?.(String(row.id));
      if (node) refreshedNodes.push(node);
    }

    if (refreshedNodes.length > 0) {
      gridApi.value?.refreshCells?.({ rowNodes: refreshedNodes, force: true });
    }
    gridApi.value?.applyTransactionAsync({ update: targetRows });
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
  const nextMap = { [currentLang.value]: newValue };

  // Show confirmation if editing multiple rows
  if (targetRows.length > 1) {
    openBulkEditConfirm(targetRows.length, async () => {
      isSaving.value = true;
      saveError.value = null;
      try {
        await persistBulkProductionPatch(targetRows, { [apiField]: nextMap });
        showSaveSuccess(t("cms.feedback.saveSuccess"));
      } finally {
        isSaving.value = false;
      }
    });
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  try {
    await persistBulkProductionPatch(targetRows, { [apiField]: nextMap });
    showSaveSuccess(t("cms.feedback.saveSuccess"));
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
  if (event.colDef.field === "genres") {
    const newGenreId = Number(event.value ?? 0);
    const oldGenreId = Number(event.oldValue ?? 0);
    const editKey = getProductionEditKey(event.data.id, event.colDef.field);
    pendingProductionEnterCommits.value.delete(editKey);
    activeProductionEditKey.value = null;

    if (newGenreId === oldGenreId) {
      return;
    }

    if (!Number.isFinite(newGenreId)) {
      event.node.setDataValue("genres", oldGenreId);
      return;
    }

    const selectedGenreTagId = newGenreId === 0 ? null : newGenreId;
    const genreTypeIds = genreTagTypeIds.value;

    const persistPrimaryTagForRow = async (row: CmsProductionGridRow): Promise<void> => {
      const currentTagIds = extractProductionTagIds(row.source);
      const nonGenreTagIds = currentTagIds.filter((tagId) => {
        const tag = tagsData.value.find((item) => item.id === tagId);
        return !tag || !genreTypeIds.has(Number(tag.tag_type));
      });

      await updateProduction(row.id, {
        tags: [...(selectedGenreTagId ? [selectedGenreTagId] : []), ...nonGenreTagIds],
      });
    };

    const targetRows = getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], event.data);
    if (targetRows.length > 1) {
      openBulkEditConfirm(targetRows.length, async () => {
        isSaving.value = true;
        saveError.value = null;
        try {
          for (const row of targetRows) {
            await persistPrimaryTagForRow(row);
          }
          await loadCmsData();
          showSaveSuccess(t("cms.feedback.saveSuccess"));
        } catch (error) {
          saveError.value =
            error instanceof Error
              ? t("cms.errors.saveFailed", { message: error.message })
              : t("cms.errors.saveGeneric");
          throw error;
        } finally {
          isSaving.value = false;
        }
      });
      return;
    }

    isSaving.value = true;
    saveError.value = null;
    try {
      await persistPrimaryTagForRow(event.data);
      await loadCmsData();
      showSaveSuccess(t("cms.feedback.saveSuccess"));
    } catch {
      event.node.setDataValue("genres", oldGenreId);
    } finally {
      isSaving.value = false;
      persistGridState();
    }
    return;
  }

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
    showSaveSuccess(t("cms.feedback.saveSuccess"));
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

  if (event.colDef.field === "tags") {
    openTagEditorPanel(event.data);
    return;
  }

  if (event.colDef.field === "imageMedia") {
    const images = imagesByProductionId.value.get(event.data.id) ?? [];
    if (images.length > 0) {
      openImageGalleryPreview(images, event.colDef.headerName ?? t("cms.columns.imageMedia"), event.data.id);
      return;
    }
    // Open placeholder preview so users can add an image for productions with no images yet
    openImageGalleryPreview([], event.colDef.headerName ?? t("cms.columns.imageMedia"), event.data.id);
    return;
  }
  
  const gridField = event.colDef.field as longGridFieldIds;
  if (!(gridField in longGridFieldToApi)) {
    return;
  }

  if (event.colDef.field === "media") {
    const value = String(event.data.media ?? "").trim();
    if (value && (isImagePreviewUrl(value) || isVideoPreviewUrl(value))) {
      const video1 = localizeValue(event.data.source.video_1);
      const video2 = localizeValue(event.data.source.video_2);
      const mediaField = value === video1 && video1 ? "video_1" : value === video2 && video2 ? "video_2" : undefined;
      openMediaPreview(value, event.colDef.headerName ?? t("cms.columns.media"), {
        productionId: event.data.id,
        mediaField,
      });
      return;
    }
    // No media present: open placeholder preview and prefer editing video_1 (fall back to video_2 if present)
    const video1 = localizeValue(event.data.source.video_1);
    const video2 = localizeValue(event.data.source.video_2);
    const preferredField = video1 ? "video_1" : video2 ? "video_2" : "video_1";
    openMediaPreview("", event.colDef.headerName ?? t("cms.columns.media"), {
      productionId: event.data.id,
      mediaField: preferredField as "video_1" | "video_2",
    });
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

  const payload = toEditableLanguageMap(editorPanel.value.values);
  const targetRows = getBulkTargetRows(gridApi.value?.getSelectedRows() ?? [], row);

  // Show confirmation if editing multiple rows
  if (targetRows.length > 1) {
    openBulkEditConfirm(targetRows.length, async () => {
      isSaving.value = true;
      saveError.value = null;
      try {
        await persistBulkProductionPatch(targetRows, {
          [editorPanel.value?.apiField as ProductionLongField]: payload,
        });
        closeEditorPanel();
        showSaveSuccess(t("cms.feedback.saveSuccess"));
      } finally {
        isSaving.value = false;
      }
    });
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  try {
    await persistBulkProductionPatch(targetRows, {
      [editorPanel.value?.apiField as ProductionLongField]: payload,
    });
  } finally {
    isSaving.value = false;
  }

  closeEditorPanel();
  showSaveSuccess(t("cms.feedback.saveSuccess"));
}

function rebuildRows(): void {
  rowData.value = buildProductionGridRows(
    productionsData.value,
    tagsData.value,
    tagTypesData.value,
    localizeValue,
    imagesByProductionId.value,
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
    const [productionsPage, tags, tagTypes, halls] = await Promise.all([
      getProductions({ lang: currentLang.value }),
      getAllTags(),
      getTagTypes(),
      getHalls(),
    ]);

    productionsData.value = productionsPage.items;
    tagsData.value = tags;
    tagTypesData.value = tagTypes;
    hallsData.value = halls;
    hallByIdCache.value = new Map(halls.map((hall) => [hall.id, hall]));
    detailRowsCache.value.clear();
    if (!createLinkedEventForm.value.hallId) {
      resetCreateLinkedEventForm();
    }

    imagesByProductionId.value = new Map();
    rebuildRows();

    if (import.meta.env.MODE === "test") {
      return;
    }

    // Lazy-load images after the main CMS data has rendered.
    const requestToken = Date.now();
    imageLoadRequestToken.value = requestToken;
    void (async () => {
      const imagesMap = new Map<number, Array<{ id: number; url: string }>>();

      await Promise.all(
        productionsData.value.map(async (production) => {
          try {
            const images = await getImagesByProduction(production.id);
            if (!images || images.length === 0) {
              return;
            }

            const imageUrls = images
              .map((img) => {
                const preferredUrl = resolvePreferredCropUrl(img.crops, window.location.origin);
                return preferredUrl ? { id: img.id, url: preferredUrl } : null;
              })
              .filter((img): img is { id: number; url: string } => img !== null);

            if (imageUrls.length > 0) {
              imagesMap.set(production.id, imageUrls);
            }
          } catch (error) {
            // Silently fail for individual image loads
            console.error(`Failed to load images for production ${production.id}:`, error);
          }
        }),
      );

      if (imageLoadRequestToken.value !== requestToken) {
        return;
      }

      imagesByProductionId.value = imagesMap;
      rebuildRows();
    })();
  } catch (error) {
    loadError.value =
      error instanceof Error
        ? t("cms.errors.loadFailed", { message: error.message })
        : t("cms.errors.loadGeneric");
  } finally {
    isLoading.value = false;
  }
}

defineExpose({
  __test: {
    rowData,
    productionsData,
    tagsData,
    tagTypesData,
    hallsData,
    createTagGroups,
    genreTagTypeIds,
    quickFilterText,
    columnChooserOpen,
    gridColumnOptions,
    columnDefs,
    selectedCount,
    gridApi,
    createForm,
    createExtraLangs,
    visibleCreateLangs,
    langGridClass,
    createModalOpen,
    createEventModalOpen,
    removeConfirmOpen,
    removeConfirmLoading,
    removeConfirmError,
    mediaPreview,
    imagesByProductionId,
    imageLoadRequestToken,
    tagEditorPanel,
    tagEditorBulkCount,
    secondaryTagBulkModeOpen,
    secondaryTagBulkModeLoading,
    secondaryTagBulkModeCount,
    secondaryTagBulkModeTagsPreview,
    secondaryTagBulkModeAddedPreview,
    secondaryTagBulkModeRemovedPreview,
    additionalTagGroups,
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
    getProductionEditKey,
    formatTagNames,
    snapshotEventRows,
    revertEventRow,
    resetCreateForm,
    resetCreateLinkedEventForm,
    openCreateModal,
    closeCreateModal,
    addMedia,
    removeMedia,
    onMediaFileChange,
    updateMediaUrl,
    openRemoveConfirm,
    closeRemoveConfirm,
    confirmRemove,
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
    openMediaPreview,
    closeMediaPreview,
    openTagEditorPanel,
    closeTagEditorPanel,
    toggleTagEditorTag,
    saveTagEditorPanel,
    closeSecondaryTagBulkMode,
    confirmSecondaryTagBulkReplace,
    confirmSecondaryTagBulkDiff,
    closeEventsPanel,
    closeEditorPanel,
    saveEditorPanel,
    persistBulkProductionPatch,
    rebuildRows,
    loadCmsData,
    bulkEditConfirmOpen,
    bulkEditConfirmCount,
    bulkEditConfirmLoading,
    openBulkEditConfirm,
    closeBulkEditConfirm,
    confirmBulkEdit,
  },
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
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform, filter;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.985);
  filter: blur(2px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

.cms-status-slot {
  max-height: 0;
  overflow: hidden;
  transition: max-height 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cms-status-slot.is-open {
  max-height: 88px;
}

.cms-media-preview-body {
  min-width: 600px;
  min-height: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cms-media-preview-large {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: auto;
  object-fit: contain;
}

img.cms-media-preview-large {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

iframe.cms-media-preview-large {
  height: 100%;
  aspect-ratio: 16 / 9;
}

.cms-choice-card {
  border: 1px solid var(--surface-3);
  border-radius: 0.75rem;
  background: var(--surface-0);
  padding: 1rem;
  text-align: left;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease,
    opacity 180ms ease;
}

.cms-choice-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.cms-choice-card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  padding: 0 0.5rem;
  background: var(--surface-2);
  color: var(--ink-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

.cms-choice-card:hover:not(:disabled) {
  border-color: var(--accent-outline);
  background: var(--surface-1);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.08);
}

.cms-choice-card:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
