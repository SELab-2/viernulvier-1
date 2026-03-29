<template>
  <div class="app" :class="{ dark: isDark }">
    <nav class="navbar">
      <div class="nav-left">
        <RouterLink :to="`/${currentLang}`" class="nav-link">{{
          t("nav.home")
        }}</RouterLink>
        <RouterLink :to="`/${currentLang}/productions`" class="nav-link">{{
          t("nav.archive")
        }}</RouterLink>
      </div>
      <div class="nav-logo">
        <img src="../assets/logo.svg" alt="vierNulvier" class="logo-img" />
      </div>

      <div class="nav-right">
        <div ref="langWrapper" class="lang-wrapper">
          <button class="icon-btn" @click="toggleLangMenu">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path
                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
              />
            </svg>
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

        <button class="icon-btn" @click="isDark = !isDark">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </nav>

    <main class="main-content">
      <section class="hero">
        <h1 class="hero-title">{{ t("hero.title") }}</h1>
        <!-- eslint-disable-next-line vue/no-v-html — content is from hardcoded locale files, no XSS risk -->
        <p class="hero-subtitle" v-html="t('hero.subtitle')"></p>
        <button class="cta-btn">{{ t("hero.cta") }} →</button>
      </section>

      <section class="info-card">
        <h2 class="info-title">{{ t("info.title") }}</h2>
        <p class="info-text">{{ t("info.text") }}</p>
      </section>

      <section class="stats">
        <div class="stat-card">
          <span class="stat-number">1000 +</span>
          <span class="stat-label">{{ t("stats.productions") }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">50 +</span>
          <span class="stat-label">{{ t("stats.series") }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">15 +</span>
          <span class="stat-label">{{ t("stats.years") }}</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { i18n, SUPPORTED_LANGS, type SupportedLang } from "../i18n";
import { useLocale } from "../composables/useLocale";

const { t } = useI18n();
const { setLocale } = useLocale();

const isDark = ref(false);
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
