<template>
  <div class="login-root">
    <div class="bg-grid" aria-hidden="true" />

    <!-- Top-right controls -->
    <div class="login-controls">
      <NavControls :is-dark="isDark" @toggle-dark="toggleDark" />
    </div>

    <div class="login-shell">
      <!-- Header mark -->
      <div class="login-header">
        <img
          src="@/assets/images/logo.svg"
          alt="VierNulVier"
          width="120"
          height="38"
          class="login-logo"
          :style="isDark ? 'filter: brightness(0) invert(0.88)' : 'filter: brightness(0) invert(0.15)'"
        />
        <span class="login-scope">Admin</span>
      </div>

      <!-- Card -->
      <div class="login-card">
        <h1 class="card-title">{{ t("admin.login.title") }}</h1>

        <div class="field-group">
          <!-- Username -->
          <div class="field">
            <label class="field-label" for="username">{{ t("admin.login.username") }}</label>
            <input
              id="username"
              v-model="username"
              type="text"
              class="field-input"
              :class="{ 'field-input--error': !!error }"
              placeholder="admin"
              autocomplete="username"
              @keyup.enter="handleLogin"
            />
          </div>

          <!-- Password -->
          <div class="field">
            <label class="field-label" for="password">{{ t("admin.login.password") }}</label>
            <div class="input-wrapper">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="field-input"
                :class="{ 'field-input--error': !!error }"
                placeholder="antibrugge"
                autocomplete="current-password"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? t('admin.login.hidePassword') : t('admin.login.showPassword')"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Error -->
        <Transition name="error-fade">
          <div v-if="error" id="error" class="error-banner" role="alert">{{ error }}</div>
        </Transition>

        <!-- Submit -->
        <button class="submit-btn" :disabled="loading" @click="handleLogin">
          {{ loading ? t("admin.login.submitting") : t("admin.login.submit") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDarkMode } from "@/composables/useDarkMode";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { login, ApiError } from "@/services/auth";
import { RouteNames } from "@/router/routeNames";
import NavControls from "@/components/NavControls.vue";

const { isDark, toggleDark } = useDarkMode();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const showPassword = ref(false);

async function handleLogin() {
  if (loading.value) return;
  error.value = "";
  loading.value = true;
  try {
    await login({ username: username.value, password: password.value });
    const redirect = route.query.redirect as string | undefined;
    await router.push(
      redirect
        ? decodeURIComponent(redirect)
        : { name: RouteNames.ADMIN, params: { lang: route.params.lang } },
    );
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) {
      error.value = t("admin.login.errorUnauthorized");
    } else {
      error.value = t("admin.login.errorGeneric");
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@reference "@/style.css";

.login-root { @apply relative flex min-h-screen items-center justify-center px-4 bg-surface-1; }

.bg-grid { @apply absolute inset-0 pointer-events-none opacity-15; background-image: radial-gradient(circle, var(--surface-3) 1px, transparent 1px); background-size: 28px 28px; }


.login-controls { @apply absolute right-6 top-4 z-10; }
.login-shell { @apply relative z-10 flex w-full max-w-sm flex-col items-center gap-6; }
.login-header { @apply flex flex-col items-center gap-2; }
.login-logo { @apply h-9 w-auto; }
.login-scope { @apply text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary; }

.login-card { @apply w-full rounded-2xl p-8 bg-surface-1 border border-surface-3 shadow-sm; }
.card-title { @apply mb-7 text-2xl font-bold text-ink-primary; }

.field-group { @apply flex flex-col gap-4; }
.field { @apply flex flex-col gap-1.5; }
.field-label { @apply text-xs font-semibold uppercase tracking-wider text-ink-secondary; }
.field-input {
  @apply w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition bg-surface-0 border border-surface-3 text-ink-primary placeholder-ink-tertiary;
  &:focus { @apply border-ink-secondary ring-2 ring-accent-highlight; }
}
.field-input--error { @apply border-red-400; }

.input-wrapper { @apply relative; }
.input-wrapper .field-input { @apply pr-10; }
.password-toggle { @apply absolute right-3 top-1/2 -translate-y-1/2 flex cursor-pointer items-center text-ink-tertiary transition hover:text-ink-secondary; background: none; border: none; padding: 0; }

.error-banner { @apply mt-4 rounded-lg bg-accent-highlight px-3.5 py-2.5 text-sm text-ink-primary; }
.error-fade-enter-active, .error-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.error-fade-enter-from, .error-fade-leave-to { opacity: 0; transform: translateY(-4px); }

.submit-btn { @apply mt-6 w-full cursor-pointer rounded-lg bg-accent-dark py-2.5 text-sm font-semibold text-surface-0 transition hover:bg-accent-dark-hover disabled:cursor-not-allowed disabled:opacity-50; border: none; }
</style>