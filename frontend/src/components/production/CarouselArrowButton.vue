<template>
  <button
    type="button"
    class="absolute top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-ink-on-inv shadow-lg backdrop-blur-sm transition hover:bg-black/75 md:size-14"
    :class="[positionClass, disabled && 'pointer-events-none opacity-35']"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click="emit('click')"
  >
    <svg
      class="size-6 md:size-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        v-if="direction === 'prev'"
        d="m15 18-6-6 6-6"
      />
      <path
        v-else
        d="m9 18 6-6-6-6"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  /** Previous (left) or next (right) chevron. */
  direction: "prev" | "next";
  disabled: boolean;
  ariaLabel: string;
}>();

const emit = defineEmits<{
  click: [];
}>();

const positionClass = computed(() =>
  props.direction === "prev"
    ? "left-1 md:left-0 -translate-x-1/2"
    : "right-1 md:right-0 translate-x-1/2",
);
</script>
