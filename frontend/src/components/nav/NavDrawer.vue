<template>
  <Transition name="drawer">
    <div v-if="open" class="mobile-drawer">
      <slot />
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>();
</script>