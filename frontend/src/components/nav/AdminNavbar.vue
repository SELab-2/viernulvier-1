<template>
  <nav class="navbar">
    <div class="nav-left">
      <NavHamburger :open="menuOpen" @click="menuOpen = !menuOpen" />
      <div class="nav-links">
        <RouterLink :to="{ name: RouteNames.ADMIN, params: { lang: currentLang } }" class="nav-link">
          {{ t("nav.admin.dashboard") }}
        </RouterLink>
        <RouterLink :to="{ name: RouteNames.CMS, params: { lang: currentLang } }" class="nav-link">
          {{ t("nav.admin.cms") }}
        </RouterLink>
      </div>
    </div>

    <RouterLink :to="{ name: RouteNames.ADMIN, params: { lang: currentLang } }" class="brand">
      <img src="@/assets/images/logo.svg" alt="VierNulVier" width="80" height="25" class="logo" />
      <span class="brand-divider" />
      <span class="brand-label">Admin</span>
    </RouterLink>

    <div class="nav-right">
      <div class="hidden sm:flex items-center gap-2">
        <NavControls :is-dark="isDark" @toggle-dark="$emit('toggle-dark')" />
        <div ref="profileWrapper" class="relative">
          <button class="profile-btn" @click="profileOpen = !profileOpen">
            <img v-if="admin?.profile_picture" :src="admin.profile_picture" class="avatar-img" alt="" />
            <span v-else class="avatar-fallback">{{ initials }}</span>
            <span class="profile-name">{{ admin?.username }}</span>
            <svg class="h-8 w-8 transition-transform" :class="{ 'rotate-180': profileOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div v-if="profileOpen" class="dropdown">
            <button class="dropdown-item" @click="handleLogout">{{ t("nav.admin.signOut") }}</button>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <NavDrawer :open="menuOpen">
    <RouterLink
      :to="{ name: RouteNames.ADMIN, params: { lang: currentLang } }"
      class="drawer-link"
      @click="menuOpen = false"
    >{{ t("nav.admin.dashboard") }}</RouterLink>
    <RouterLink
      :to="{ name: RouteNames.CMS, params: { lang: currentLang } }"
      class="drawer-link"
      @click="menuOpen = false"
    >{{ t("nav.admin.cms") }}</RouterLink>
    <div class="drawer-divider" />
    <NavControls :is-dark="isDark" @toggle-dark="$emit('toggle-dark')" />
    <div class="drawer-divider" />
    <div class="drawer-profile">
      <img v-if="admin?.profile_picture" :src="admin.profile_picture" class="drawer-avatar-img" alt="" />
      <span v-else class="drawer-avatar-fallback">{{ initials }}</span>
      <span class="drawer-username">{{ admin?.username }}</span>
    </div>
    <button class="drawer-link drawer-signout" @click="handleLogout">
      {{ t("nav.admin.signOut") }}
    </button>
  </NavDrawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from "vue";
import { RouterLink, useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { useAuthStore } from "@/stores/auth";
import { logout } from "@/services/auth";
import NavControls from "@/components/nav/NavControls.vue";
import NavHamburger from "@/components/nav/NavHamburger.vue";
import NavDrawer from "@/components/nav/NavDrawer.vue";
import "@/assets/stylesheets/navbar.css";

defineProps<{ isDark: boolean }>();
defineEmits<{ "toggle-dark": [] }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { admin, clearAdmin } = useAuthStore();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const initials = computed(() => admin?.username?.slice(0, 2).toUpperCase() ?? "??");

const menuOpen = ref(false);
const profileOpen = ref(false);
const profileWrapper = useTemplateRef<HTMLElement>("profileWrapper");

function handleClickOutside(e: MouseEvent) {
  if (profileWrapper.value && !profileWrapper.value.contains(e.target as Node))
    profileOpen.value = false;
}

async function handleLogout() {
  menuOpen.value = false;
  clearAdmin();
  await logout();
  await router.push({ name: RouteNames.LOGIN, params: { lang: route.params.lang } });
}

onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => document.removeEventListener("click", handleClickOutside));
</script>

<style scoped>
@reference "@/style.css";

.brand { @apply flex min-w-[140px] items-end gap-3 no-underline absolute left-1/2 -translate-x-1/2; }
.brand-divider { @apply block h-4 w-px shrink-0 bg-surface-inv-border; }
.brand-label { @apply text-xs font-semibold uppercase tracking-widest text-ink-on-inv-tertiary; }

.nav-right { @apply flex items-center justify-end; }

.profile-btn {
  @apply flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-on-inv-secondary transition hover:bg-surface-inv-raised hover:text-ink-on-inv;
  background: none;
  border: none;
}
.avatar-img { @apply h-7 w-7 rounded-full object-cover ring-1 ring-surface-inv-border; }
.avatar-fallback {
  @apply flex h-7 w-7 items-center justify-center rounded-full bg-surface-inv-raised text-[11px] font-semibold text-ink-on-inv ring-1 ring-surface-inv-border;
}
.profile-name { @apply max-w-[100px] truncate text-sm text-ink-on-inv-secondary; }

.dropdown {
  @apply absolute right-0 top-full mt-2 min-w-[140px] overflow-hidden rounded-lg border border-surface-inv-border bg-surface-inv-raised shadow-xl;
  z-index: 100;
}
.dropdown-item {
  @apply block w-full cursor-pointer px-4 py-2 text-left text-sm text-ink-on-inv-secondary transition hover:bg-surface-inv-border hover:text-ink-on-inv;
  background: none;
  border: none;
}

.drawer-signout { @apply text-red-400 hover:text-red-300; }
</style>