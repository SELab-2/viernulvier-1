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
        src="@/assets/logo.svg"
        alt="VierNulVier"
        width="102"
        height="32"
        class="h-8 w-[102px] brightness-0 invert"
      />
    </RouterLink>

    <!-- Right: actions -->
    <div class="flex items-center gap-3">
      <!-- Language switcher -->
      <div ref="langWrapper" class="relative">
        <button class="icon-btn" @click="toggleLangMenu">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
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
        <svg v-if="isDark" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
        <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
      </button>

    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import { useLocale } from "@/composables/useLocale";
import { RouteNames } from "@/router/routeNames";

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
