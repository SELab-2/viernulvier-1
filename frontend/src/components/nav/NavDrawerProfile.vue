<template>
  <div class="drawer-profile">
    <img v-if="profilePicture" :src="profilePicture" class="drawer-avatar-img" alt="" />
    <span v-else class="drawer-avatar-fallback">{{ initials }}</span>
    <span class="drawer-username">{{ username }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ profilePicture?: string | null; username?: string; initials: string }>();
</script>