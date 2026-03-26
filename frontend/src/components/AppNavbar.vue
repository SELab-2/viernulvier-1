<template>
  <nav
    class="sticky top-0 z-50 flex h-16 w-full items-center justify-between bg-surface-inv px-6 lg:px-10"
  >
    <!-- Left: nav links -->
    <div class="flex items-center gap-6">
      <RouterLink
        :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
        class="nav-link"
      >
        {{ t("nav.home") }}
      </RouterLink>
      <RouterLink
        :to="{ name: RouteNames.PRODUCTIONS, params: { lang: currentLang } }"
        class="nav-link"
      >
        {{ t("nav.productions") }}
      </RouterLink>
    </div>

    <!-- Center: logo -->
    <RouterLink
      :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
      class="absolute left-1/2 -translate-x-1/2"
    >
      <img
        src="../assets/logo.svg"
        alt="VierNulVier"
        class="h-8 brightness-0 invert"
      />
    </RouterLink>

    <!-- Right: actions -->
    <div class="flex items-center gap-3">
      <!-- Search -->
      <button class="icon-btn" :aria-label="t('nav.search')">
        <span class="material-symbols-outlined text-xl">search</span>
      </button>

      <!-- Language switcher -->
      <div ref="langWrapper" class="relative">
        <button class="icon-btn" @click="toggleLangMenu">
          <span class="material-symbols-outlined text-xl">language</span>
        </button>
        <div v-if="langMenuOpen" class="lang-dropdown">
          <button
            v-for="lang in languages"
            :key="lang.code"
            class="lang-option"
            :class="{ active: currentLang === lang.code }"
            @click="setLang(lang.code)"
          >
            {{ lang.label }}
          </button>
        </div>
      </div>

      <!-- Dark mode -->
      <button
        class="icon-btn"
        :aria-label="'Toggle dark mode'"
        @click="$emit('toggle-dark')"
      >
        <span class="material-symbols-outlined text-xl">{{
          isDark ? "light_mode" : "dark_mode"
        }}</span>
      </button>

      <!-- Admin -->
      <RouterLink
        :to="{ name: RouteNames.CMS, params: { lang: currentLang } }"
        class="ml-2 rounded-md bg-ink-on-inv px-3 py-1.5 text-sm font-semibold text-surface-inv transition hover:bg-ink-on-inv-secondary"
      >
        {{ t("nav.admin") }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, SUPPORTED_LANGS, type SupportedLang } from "../i18n";
import { useLocale } from "../composables/useLocale";
import { RouteNames } from "../router/routeNames";

defineProps<{ isDark: boolean }>();
defineEmits<{ "toggle-dark": [] }>();

const { t } = useI18n();
const { setLocale } = useLocale();

const langMenuOpen = ref(false);
const langWrapper = useTemplateRef<HTMLElement>("langWrapper");

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);

const languages = SUPPORTED_LANGS.map((code) => ({
  code,
  label: code.toUpperCase(),
}));

function toggleLangMenu() {
  langMenuOpen.value = !langMenuOpen.value;
}

function setLang(lang: SupportedLang) {
  langMenuOpen.value = false;
  setLocale(lang);
}

function handleClickOutside(e: MouseEvent) {
  if (langWrapper.value && !langWrapper.value.contains(e.target as Node)) {
    langMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => document.removeEventListener("click", handleClickOutside));
</script>

<style scoped>
@reference "../style.css";

.nav-link {
  @apply text-sm font-medium text-ink-on-inv-secondary transition hover:text-ink-on-inv;
}

.nav-link.router-link-active {
  @apply text-ink-on-inv;
}

.icon-btn {
  @apply flex cursor-pointer items-center justify-center rounded-md p-1.5 text-ink-on-inv-secondary transition hover:bg-surface-inv-raised hover:text-ink-on-inv;
  background: none;
  border: none;
}

.lang-dropdown {
  @apply absolute right-0 top-full mt-2 min-w-[60px] overflow-hidden rounded-lg border border-surface-inv-border bg-surface-inv-raised shadow-xl;
  z-index: 100;
}

.lang-option {
  @apply block w-full cursor-pointer px-4 py-2 text-left text-sm text-ink-on-inv-secondary transition hover:bg-surface-inv-border hover:text-ink-on-inv;
  background: none;
  border: none;
}

.lang-option.active {
  @apply bg-surface-inv-border font-semibold text-ink-on-inv;
}
</style>
