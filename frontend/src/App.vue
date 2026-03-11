<template>
  <div class="app" :class="{ dark: isDark }">
    <nav class="navbar">
      <div class="nav-left">
        <a href="#" class="nav-link">{{ t.home }}</a>
        <a href="#" class="nav-link">{{ t.archive }}</a>
      </div>

      <div class="nav-logo">
        <img src="./assets/logo.svg" alt="vierNulvier" class="logo-img" />
      </div>

      <div class="nav-right">
        <div class="lang-wrapper" ref="langWrapper">
          <button class="icon-btn" @click="toggleLangMenu">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </button>
          <div class="lang-dropdown" v-if="langMenuOpen">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </nav>

    <main class="main-content">
      <section class="hero">
        <h1 class="hero-title">{{ t.heroTitle }}</h1>
        <p class="hero-subtitle" v-html="t.heroSubtitle"></p>
        <button class="cta-btn" @click="() => {}">
          {{ t.ctaBtn }} &nbsp;→
        </button>
      </section>

      <section class="info-card">
        <h2 class="info-title">{{ t.infoTitle }}</h2>
        <p class="info-text">{{ t.infoText }}</p>
      </section>

      <section class="stats">
        <div class="stat-card">
          <span class="stat-number">1000 +</span>
          <span class="stat-label">{{ t.productions }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">50 +</span>
          <span class="stat-label">{{ t.series }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">15 +</span>
          <span class="stat-label">{{ t.years }}</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const isDark = ref(false);
const langMenuOpen = ref(false);
const currentLang = ref<"NL" | "FR" | "EN">("NL");
const langWrapper = ref<HTMLElement | null>(null);

const languages = [
  { code: "NL" as const, label: "NL" },
  { code: "FR" as const, label: "FR" },
  { code: "EN" as const, label: "EN" },
];

const translations = {
  NL: {
    home: "Home",
    archive: "Archief",
    heroTitle: "Welkom bij het VierNulVier Archief",
    heroSubtitle:
      "Op deze pagina kunt u het archief van VierNulVier bekijken.<br />Dit archief bevat een overzicht van alle verleden voorstellingen, concerten, films en andere<br />culturele evenementen georganiseerd door VierNulVier.",
    ctaBtn: "Bekijk Archief",
    infoTitle: "Over het archief",
    infoText:
      "In het VierNulVier-archief ontdek je duizenden producties en evenementen uit de geschiedenis van De Vooruit. Blader door theater, dans, film en muziek, of gebruik de zoekfunctie om snel een productie, artiest of reeks te vinden.",
    productions: "producties",
    series: "reeksen",
    years: "jaren",
  },
  FR: {
    home: "Accueil",
    archive: "Archives",
    heroTitle: "Bienvenue dans les Archives VierNulVier",
    heroSubtitle:
      "Sur cette page, vous pouvez consulter les archives de VierNulVier.<br />Ces archives offrent un aperçu de toutes les représentations, concerts, films et autres<br />événements culturels organisés par VierNulVier.",
    ctaBtn: "Voir les Archives",
    infoTitle: "À propos des archives",
    infoText:
      "Dans les archives VierNulVier, découvrez des milliers de productions et d'événements de l'histoire de De Vooruit. Parcourez le théâtre, la danse, le film et la musique, ou utilisez la fonction de recherche pour trouver rapidement une production, un artiste ou une série.",
    productions: "productions",
    series: "séries",
    years: "années",
  },
  EN: {
    home: "Home",
    archive: "Archive",
    heroTitle: "Welcome to the VierNulVier Archive",
    heroSubtitle:
      "On this page you can browse the VierNulVier archive.<br />This archive contains an overview of all past performances, concerts, films and other<br />cultural events organised by VierNulVier.",
    ctaBtn: "Browse Archive",
    infoTitle: "About the archive",
    infoText:
      "In the VierNulVier archive you can discover thousands of productions and events from the history of De Vooruit. Browse through theatre, dance, film and music, or use the search function to quickly find a production, artist or series.",
    productions: "productions",
    series: "series",
    years: "years",
  },
};

const t = computed(() => translations[currentLang.value]);

function toggleLangMenu() {
  langMenuOpen.value = !langMenuOpen.value;
}

function setLang(code: "NL" | "FR" | "EN") {
  currentLang.value = code;
  langMenuOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (langWrapper.value && !langWrapper.value.contains(e.target as Node)) {
    langMenuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => document.removeEventListener("click", handleClickOutside));
</script>