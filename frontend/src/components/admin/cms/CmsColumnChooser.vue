<template>
  <div v-if="show" class="cms-column-popup-overlay" @click.self="$emit('close')">
    <aside class="cms-column-side-popup">
      <div class="cms-column-popover-header">
        <span class="text-sm font-semibold text-ink-primary">Visible columns</span>
        <button type="button" class="cms-mini-btn" @click="$emit('close')">Close</button>
      </div>

      <div class="cms-column-chooser">
        <label v-for="column in columnOptions" :key="column.colId" class="cms-column-chooser-item">
          <input
            :checked="columnVisibility[column.colId] !== false"
            type="checkbox"
            @change="
              $emit(
                'set-column-visibility',
                column.colId,
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span>{{ column.label }}</span>
        </label>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  columnOptions: ReadonlyArray<{ colId: string; label: string }>;
  columnVisibility: Record<string, boolean>;
}>();

defineEmits<{
  close: [];
  "set-column-visibility": [colId: string, isVisible: boolean];
}>();
</script>

<style scoped>
@reference "@/style.css";

.cms-column-popup-overlay {
  @apply fixed inset-0 z-40;
}

.cms-mini-btn {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-surface-1;
}
</style>
