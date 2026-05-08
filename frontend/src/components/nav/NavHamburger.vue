<template>
  <button class="hamburger" :aria-expanded="open" aria-label="Toggle menu" @click="$emit('click')">
    <span /><span /><span />
  </button>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>();
defineEmits<{ click: [] }>();
</script>