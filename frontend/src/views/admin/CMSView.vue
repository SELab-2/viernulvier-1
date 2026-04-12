<template>
  <div>
    <AdminNavbar :is-dark="isDark" @toggle-dark="toggleDark" />
    <span>CMS (admin only)</span>
  </div>
</template>

<script setup lang="ts">
import { useDarkMode } from "@/composables/useDarkMode";
import AdminNavbar from "@/components/admin/AdminNavbar.vue";

const { isDark, toggleDark } = useDarkMode();
</script>