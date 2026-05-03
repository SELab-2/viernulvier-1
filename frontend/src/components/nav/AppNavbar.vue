<template>
  <nav class="navbar">
    <div class="nav-left">
      <NavHamburger :open="menuOpen" @click="menuOpen = !menuOpen" />
      <div class="nav-links">
        <RouterLink :to="{ name: RouteNames.HOME, params: { lang: currentLang } }" class="nav-link">
          {{ t("nav.home") }}
        </RouterLink>
        <RouterLink :to="{ name: RouteNames.PRODUCTIONS, params: { lang: currentLang } }" class="nav-link">
          {{ t("nav.productions") }}
        </RouterLink>
      </div>
    </div>

    <RouterLink :to="{ name: RouteNames.HOME, params: { lang: currentLang } }" class="navbar-center">
      <img src="@/assets/images/logo.svg" alt="VierNulVier" width="102" height="32" class="logo" />
    </RouterLink>

    <div class="hidden sm:block">
      <NavControls :is-dark="isDark" @toggle-dark="$emit('toggle-dark')" />
    </div>
  </nav>

  <NavDrawer :open="menuOpen">
    <RouterLink
      :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
      class="drawer-link"
      @click="menuOpen = false"
    >{{ t("nav.home") }}</RouterLink>
    <RouterLink
      :to="{ name: RouteNames.PRODUCTIONS, params: { lang: currentLang } }"
      class="drawer-link"
      @click="menuOpen = false"
    >{{ t("nav.productions") }}</RouterLink>
    <div class="drawer-divider" />
    <NavControls :is-dark="isDark" @toggle-dark="$emit('toggle-dark')" />
  </NavDrawer>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import NavControls from "@/components/nav/NavControls.vue";
import NavHamburger from "@/components/nav/NavHamburger.vue";
import NavDrawer from "@/components/nav/NavDrawer.vue";
import "@/assets/stylesheets/navbar.css";

defineProps<{ isDark: boolean }>();
defineEmits<{ "toggle-dark": [] }>();

const { t } = useI18n();
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const menuOpen = ref(false);
</script>