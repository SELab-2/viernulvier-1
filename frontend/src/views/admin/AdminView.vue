<template>
  <div class="admin-root">
    <AdminNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

    <main class="admin-main">

      <!-- Profile header -->
      <div class="profile-header">
        <div class="profile-meta">
          <img
            v-if="admin?.profile_picture"
            :src="admin.profile_picture"
            class="profile-avatar"
            alt="Profile picture"
          />
          <div v-else class="profile-avatar-fallback">{{ initials }}</div>
          <div>
            <p class="profile-eyebrow">{{ t("admin.dashboard.signedInAs") }}</p>
            <h1 class="profile-name">{{ admin?.username }}</h1>
          </div>
        </div>
        <span v-if="admin?.super" class="super-badge">{{ t("admin.dashboard.superAdmin") }}</span>
      </div>

      <div class="section-divider" />

      <!-- Quick actions -->
      <section class="section">
        <h2 class="section-title">{{ t("admin.dashboard.quickActions") }}</h2>
        <div class="actions-grid">
          <RouterLink :to="{ name: RouteNames.CMS, params: { lang: currentLang } }" class="action-card">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span class="action-label">{{ t("admin.dashboard.openCms") }}</span>
            <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </RouterLink>

          <button id="show-password-modal-button" class="action-card" @click="showPasswordModal = true">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span class="action-label">{{ t("admin.dashboard.changePassword") }}</span>
            <svg class="action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>
    </main>

    <ChangePasswordModal
      v-if="showPasswordModal"
      id="change-password-modal"
      @close="showPasswordModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useDarkMode } from "@/composables/useDarkMode";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";
import { RouteNames } from "@/router/routeNames";
import AdminNavbar from "@/components/admin/AdminNavbar.vue";
import ChangePasswordModal from "@/components/admin/ChangePasswordModal.vue";
import { i18n, type SupportedLang } from "@/i18n";

const { isDark, toggleDark } = useDarkMode();

const { t } = useI18n();
const { admin } = useAuthStore();

const showPasswordModal = ref(false);

const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
const initials = computed(() => admin?.username?.slice(0, 2).toUpperCase() ?? "??");
</script>

<style scoped>
@reference "@/style.css";

.admin-root { @apply min-h-screen bg-surface-1; }

.admin-main { @apply mx-auto max-w-3xl px-6 py-10 lg:px-8; }

.profile-header { @apply flex items-center justify-between; }
.profile-meta { @apply flex items-center gap-4; }
.profile-avatar { @apply h-14 w-14 rounded-full object-cover ring-2 ring-surface-3; }
.profile-avatar-fallback { @apply flex h-14 w-14 items-center justify-center rounded-full bg-accent-dark text-lg font-bold text-surface-0 ring-2 ring-surface-3; }
.profile-eyebrow { @apply text-xs font-medium uppercase tracking-widest text-ink-tertiary; }
.profile-name { @apply text-2xl font-bold text-ink-primary; }
.super-badge { @apply rounded-full border border-surface-3 bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-ink-secondary; }

.section-divider { @apply my-8 border-t border-surface-3; }

.section { @apply flex flex-col gap-4; }
.section-title { @apply text-xs font-semibold uppercase tracking-widest text-ink-tertiary; }

.actions-grid { @apply grid grid-cols-1 gap-3 sm:grid-cols-2; }
.action-card { @apply flex items-center gap-4 rounded-xl border border-surface-3 bg-surface-2 px-5 py-4 no-underline transition hover:bg-surface-3; }
.action-icon { @apply h-5 w-5 shrink-0 text-ink-secondary; }
.action-label { @apply flex-1 text-left text-sm font-medium text-ink-primary; }
.action-arrow { @apply h-4 w-4 shrink-0 text-ink-tertiary; }
</style>