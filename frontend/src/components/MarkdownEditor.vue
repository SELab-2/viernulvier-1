<template>
  <div class="markdown-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import SimpleMDE from "simplemde";
import "simplemde/dist/simplemde.min.css";

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
let editor: SimpleMDE | null = null;

onMounted(() => {
  if (!textarea.value) return;

  editor = new SimpleMDE({
    element: textarea.value,
    initialValue: props.modelValue,
    placeholder: props.placeholder,
    spellChecker: false,
  });

  editor.codemirror.on("change", () => {
    if (editor) emit("update:modelValue", editor.value());
  });
});

onUnmounted(() => {
  editor?.toTextArea();
  editor = null;
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (editor && editor.value() !== newVal) {
      editor.value(newVal);
    }
  },
);
</script>

<style scoped>
.markdown-editor :deep(.CodeMirror) {
  border: 1px solid var(--surface-3);
  border-radius: 0 0 4px 4px;
  background: var(--surface-0);
  color: var(--ink-primary);
  font-family: inherit;
}

.markdown-editor :deep(.editor-toolbar) {
  border: 1px solid var(--surface-3);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: var(--surface-1);
}

.markdown-editor :deep(.editor-toolbar button) {
  color: var(--ink-secondary);
}

.markdown-editor :deep(.editor-toolbar button:hover),
.markdown-editor :deep(.editor-toolbar button.active) {
  background: var(--surface-2);
  border-color: var(--surface-3);
  color: var(--ink-primary);
}

.markdown-editor :deep(.editor-preview) {
  background: var(--surface-0);
  color: var(--ink-primary);
}
</style>
