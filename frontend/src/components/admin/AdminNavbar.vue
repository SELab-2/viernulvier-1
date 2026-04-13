<template>
  <nav class="navbar">
    <!-- Left: nav links -->
    <div class="flex items-center gap-6">
      <RouterLink
        :to="{ name: RouteNames.ADMIN, params: { lang: currentLang } }"
        class="nav-link"
      >
        {{ t("nav.admin.dashboard") }}
      </RouterLink>
      <RouterLink
        :to="{ name: RouteNames.CMS, params: { lang: currentLang } }"
        class="nav-link"
      >
        {{ t("nav.admin.cms") }}
      </RouterLink>
    </div>
    
    <!-- Center: logo -->
    <RouterLink :to="{ name: RouteNames.ADMIN, params: { lang: currentLang } }" class="brand">
      <img src="@/assets/images/logo.svg" alt="VierNulVier" width="80" height="25" class="logo" />
      <span class="brand-divider" />
      <span class="brand-label">Admin</span>
    </RouterLink>

    <!-- Right: controls + profile -->
    <div class="nav-right">
      <NavControls :is-dark="isDark" @toggle-dark="$emit('toggle-dark')" />

      <div ref="profileWrapper" class="relative">
        <button class="profile-btn" @click="profileOpen = !profileOpen">
          <img v-if="admin?.profile_picture" :src="admin.profile_picture" class="avatar-img" alt="" />
          <span v-else class="avatar-fallback">{{ initials }}</span>
          <span class="profile-name hidden sm:inline">{{ admin?.username }}</span>
          <svg class="h-8 w-8 transition-transform" :class="{ 'rotate-180': profileOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>

        <div v-if="profileOpen" class="dropdown">
          <button class="dropdown-item" @click="handleLogout">{{ t("nav.admin.signOut") }}</button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from "vue";
import { RouterLink, useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import { useAuthStore } from "@/stores/auth";
import { logout } from "@/services/auth";
import NavControls from "@/components/NavControls.vue";
import "@/assets/stylesheets/navbar.css";

defineProps<{ isDark: boolean }>();
defineEmits<{ "toggle-dark": [] }>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { admin, clearAdmin } = useAuthStore();

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const initials = computed(() => admin?.username?.slice(0, 2).toUpperCase() ?? "??");

const profileOpen = ref(false);
const profileWrapper = useTemplateRef<HTMLElement>("profileWrapper");

function handleClickOutside(e: MouseEvent) {
  if (profileWrapper.value && !profileWrapper.value.contains(e.target as Node))
    profileOpen.value = false;
}

async function handleLogout() {
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
.logo { @apply h-6 w-auto; }
.brand-divider { @apply block h-4 w-px bg-surface-inv-border; }
.brand-label { @apply text-xs font-semibold uppercase tracking-widest text-ink-on-inv-tertiary; }

.nav-right { @apply flex min-w-[140px] items-center justify-end gap-2; }

.profile-btn {
  @apply flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-on-inv-secondary transition hover:bg-surface-inv-raised hover:text-ink-on-inv;
  background: none;
  border: none;
}

.avatar-img {
  @apply h-7 w-7 rounded-full object-cover ring-1 ring-surface-inv-border;
}
.avatar-fallback {
  @apply flex h-7 w-7 items-center justify-center rounded-full bg-surface-inv-raised text-[11px] font-semibold text-ink-on-inv ring-1 ring-surface-inv-border;
}
.profile-name {
  @apply max-w-[100px] truncate text-sm text-ink-on-inv-secondary;
}

.dropdown {
  @apply absolute right-0 top-full mt-2 min-w-[140px] overflow-hidden rounded-lg border border-surface-inv-border bg-surface-inv-raised shadow-xl;
  z-index: 100;
}
.dropdown-item {
  @apply block w-full cursor-pointer px-4 py-2 text-left text-sm text-ink-on-inv-secondary transition hover:bg-surface-inv-border hover:text-ink-on-inv;
  background: none;
  border: none;
}
</style>