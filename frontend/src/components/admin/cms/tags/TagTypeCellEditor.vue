<template>
  <div class="tag-type-cell-editor">
    <TagTypePicker
      :model-value="value"
      :tag-types="tagTypes"
      :localize="localize"
      :auto-focus="true"
      data-testid="tag-type-cell-editor-picker"
      @update:model-value="onPick"
      @create-request="onCreateRequest"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { TagType } from "@viernulvier/shared";
import type { LanguageMap } from "@/utils/language-utils";
import TagTypePicker from "@/components/admin/cms/tags/TagTypePicker.vue";

interface CellEditorParams {
  value: number | null;
  data: { id: number; tagTypeId: number | null };
  tagTypes: TagType[];
  localize: (map: LanguageMap | null | undefined) => string;
  stopEditing: (cancel?: boolean) => void;
  onCreateRequest: (ctx: { rowId: number; initialName: string }) => void;
}

const props = defineProps<{ params: CellEditorParams }>();

const value = ref<number | null>(props.params.value ?? props.params.data?.tagTypeId ?? null);
const tagTypes = props.params.tagTypes;
const localize = props.params.localize;

function onPick(id: number | null): void {
  value.value = id;
  // Commit immediately — ag-grid will read getValue() then stop editing.
  props.params.stopEditing();
}

function onCreateRequest(initialName: string): void {
  // Cancel inline editing — the modal will handle tag-type creation and
  // persist the new tag-type id to the row.
  props.params.stopEditing(true);
  props.params.onCreateRequest({
    rowId: props.params.data.id,
    initialName,
  });
}

defineExpose({
  getValue: (): number | null => value.value,
  isCancelBeforeStart: (): boolean => false,
  isCancelAfterEnd: (): boolean => false,
});
</script>

<style scoped>
@reference "@/style.css";

.tag-type-cell-editor {
  @apply min-w-[220px] p-1;
}
</style>
