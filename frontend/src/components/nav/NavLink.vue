<template>
  <RouterLink
    :to="to"
    active-class=""
    exact-active-class="router-link-active"
    @click="$emit('click')"
  >
    <slot />
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from "vue-router";

defineProps<{ to: RouteLocationRaw }>();
defineEmits<{ click: [] }>();
</script>