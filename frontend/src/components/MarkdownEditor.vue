<template>
  <div class="markdown-editor">
    <textarea ref="textarea" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import EasyMDE from "easymde";
import "easymde/dist/easymde.min.css";

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
let editor: EasyMDE | null = null;

onMounted(() => {
  /* v8 ignore next -- Vue guarantees the ref is populated before onMounted */
  if (!textarea.value) return;

  editor = new EasyMDE({
    element: textarea.value,
    initialValue: props.modelValue,
    placeholder: props.placeholder,
    spellChecker: false,
    sideBySideFullscreen: false,
  });

  editor.codemirror.on("change", () => {
    if (editor) emit("update:modelValue", editor.value());
  });
});

onUnmounted(() => {
  /* v8 ignore next -- editor is always set when onUnmounted runs after a successful mount */
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

.markdown-editor :deep(.editor-preview),
.markdown-editor :deep(.editor-preview-side) {
  background: var(--surface-0);
  color: var(--ink-primary);
}

/* Restore typography that Tailwind's preflight strips */
.markdown-editor :deep(.editor-preview) h1,
.markdown-editor :deep(.editor-preview-side) h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
}

.markdown-editor :deep(.editor-preview) h2,
.markdown-editor :deep(.editor-preview-side) h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.75em 0;
}

.markdown-editor :deep(.editor-preview) h3,
.markdown-editor :deep(.editor-preview-side) h3 {
  font-size: 1.17em;
  font-weight: bold;
  margin: 0.83em 0;
}

.markdown-editor :deep(.editor-preview) p,
.markdown-editor :deep(.editor-preview-side) p {
  margin: 1em 0;
}

.markdown-editor :deep(.editor-preview) ul,
.markdown-editor :deep(.editor-preview-side) ul {
  list-style: disc;
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-editor :deep(.editor-preview) ol,
.markdown-editor :deep(.editor-preview-side) ol {
  list-style: decimal;
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-editor :deep(.editor-preview) blockquote,
.markdown-editor :deep(.editor-preview-side) blockquote {
  border-left: 4px solid var(--surface-3);
  padding-left: 1em;
  color: var(--ink-secondary);
  margin: 1em 0;
}

.markdown-editor :deep(.editor-preview) code,
.markdown-editor :deep(.editor-preview-side) code {
  background: var(--surface-2);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-editor {
  position: relative;
}

.markdown-editor :deep(.CodeMirror-fullscreen) {
  z-index: 1000;
}

.markdown-editor :deep(.editor-toolbar.fullscreen) {
  z-index: 1001;
}
</style>
