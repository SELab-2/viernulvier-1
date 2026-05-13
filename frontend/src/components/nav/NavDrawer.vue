<template>
  <div class="contents">
    <Transition name="fade">
      <div 
        v-if="open" 
        class="fixed inset-0 z-30 bg-black/50" 
        @click="$emit('close')" 
      />
    </Transition>

    <Transition name="drawer">
      <div v-if="open" class="mobile-drawer">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>(); 
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>