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

const textarea = ref<HTMLTextAreaElement>(null!);
let editor: EasyMDE | null = null;

onMounted(() => {
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
  editor!.toTextArea();
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
.markdown-editor {
  position: relative;
  border: 1px solid var(--surface-3);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.markdown-editor:focus-within {
  border-color: var(--ink-secondary);
  box-shadow: 0 0 0 2px var(--accent-highlight);
}

/* ── Toolbar ─────────────────────────────────────────────────────────── */

.markdown-editor :deep(.editor-toolbar) {
  border: none;
  border-bottom: 1px solid var(--surface-3);
  border-radius: 0;
  background: var(--surface-1);
  padding: 6px 8px;
}

.markdown-editor :deep(.editor-toolbar button) {
  color: var(--ink-secondary);
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.markdown-editor :deep(.editor-toolbar button:hover),
.markdown-editor :deep(.editor-toolbar button.active) {
  background: var(--surface-2);
  border-color: transparent;
  color: var(--ink-primary);
}

.markdown-editor :deep(.editor-toolbar i.separator) {
  border-left-color: var(--surface-3);
  border-right-color: var(--surface-3);
}

/* ── Editor area ─────────────────────────────────────────────────────── */

.markdown-editor :deep(.CodeMirror) {
  border: none;
  border-radius: 0;
  background: var(--surface-0);
  color: var(--ink-primary);
  font-family: "Inter", "Inter Fallback", sans-serif;
  font-size: 0.9375rem;
  line-height: 1.6;
  padding: 4px 8px;
}

.markdown-editor :deep(.CodeMirror-cursor) {
  border-left-color: var(--ink-primary);
}

.markdown-editor :deep(.CodeMirror-selected) {
  background: var(--surface-3);
}

.markdown-editor :deep(.CodeMirror-focused .CodeMirror-selected) {
  background: var(--accent-highlight);
}

.markdown-editor :deep(.CodeMirror .CodeMirror-placeholder) {
  color: var(--ink-tertiary);
}

/* ── Preview panes ───────────────────────────────────────────────────── */

.markdown-editor :deep(.editor-preview),
.markdown-editor :deep(.editor-preview-side) {
  background: var(--surface-0);
  color: var(--ink-primary);
  font-family: "Inter", "Inter Fallback", sans-serif;
  padding: 12px 16px;
}

.markdown-editor :deep(.editor-preview-side) {
  border-left: 1px solid var(--surface-3);
}

/* ── Preview typography (Tailwind preflight strips defaults) ─────────── */

.markdown-editor :deep(.editor-preview) h1,
.markdown-editor :deep(.editor-preview-side) h1 {
  font-size: 1.75em;
  font-weight: 700;
  margin: 0.67em 0;
}

.markdown-editor :deep(.editor-preview) h2,
.markdown-editor :deep(.editor-preview-side) h2 {
  font-size: 1.375em;
  font-weight: 700;
  margin: 0.75em 0;
}

.markdown-editor :deep(.editor-preview) h3,
.markdown-editor :deep(.editor-preview-side) h3 {
  font-size: 1.125em;
  font-weight: 600;
  margin: 0.83em 0;
}

.markdown-editor :deep(.editor-preview) p,
.markdown-editor :deep(.editor-preview-side) p {
  margin: 1em 0;
  line-height: 1.6;
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
  border-left: 3px solid var(--surface-3);
  padding-left: 1em;
  color: var(--ink-secondary);
  margin: 1em 0;
}

.markdown-editor :deep(.editor-preview) code,
.markdown-editor :deep(.editor-preview-side) code {
  background: var(--surface-2);
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.875em;
}

/* ── Fullscreen ──────────────────────────────────────────────────────── */

.markdown-editor :deep(.CodeMirror-fullscreen) {
  z-index: 1000;
}

.markdown-editor :deep(.editor-toolbar.fullscreen) {
  z-index: 1001;
}
</style>
