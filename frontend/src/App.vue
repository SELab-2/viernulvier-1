<template>
  <div class="app" :class="{ dark: isDark }">
    <nav class="navbar">
      <div class="nav-left">
        <a href="#" class="nav-link">Home</a>
        <a href="#" class="nav-link">Archief</a>
      </div>

      <div class="nav-logo">
        <img src="./assets/logo.svg" alt="vierNulvier" class="logo-img" />
      </div>

      <div class="nav-right">
        <button class="icon-btn" @click="() => {}">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </button>
        <button class="icon-btn" @click="isDark = !isDark">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </nav>

    <main class="main-content">
      <section class="hero">
        <h1 class="hero-title">Welkom bij het VierNulVier Archief</h1>
        <p class="hero-subtitle">
          Op deze pagina kunt u het archief van VierNulVier bekijken.<br />
          Dit archief bevat een overzicht van alle verleden voorstellingen, concerten, films en andere<br />
          culturele evenementen georganiseerd door VierNulVier.
        </p>
        <button class="cta-btn" @click="() => {}">
          Bekijk Archief &nbsp;→
        </button>
      </section>

      <section class="info-card">
        <h2 class="info-title">Over het archief</h2>
        <p class="info-text">
          In het VierNulVier-archief ontdek je duizenden producties en evenementen uit de geschiedenis van De Vooruit.
          Blader door theater, dans, film en muziek, of gebruik de zoekfunctie om snel een productie, artiest of reeks te vinden.
        </p>
      </section>

      <section class="stats">
        <div class="stat-card">
          <span class="stat-number">1000 +</span>
          <span class="stat-label">producties</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">50 +</span>
          <span class="stat-label">reeksen</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">10 +</span>
          <span class="stat-label">jaren</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const isDark = ref(false);
</script>
