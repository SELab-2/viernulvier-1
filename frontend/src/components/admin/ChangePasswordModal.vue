<template>
  <div class="modal-backdrop">
    <div class="modal">
      <h3 class="title">{{ t('admin.dashboard.changePassword') }}</h3>

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

      <form @submit.prevent="submit">
        <h4>{{ t('admin.changePassword.oldPassword') }}</h4>
        <input
          v-model="oldPassword"
          :type="showPassword ? 'text' : 'password'"
          class="input"
        />
        <h4>{{ t('admin.changePassword.newPassword') }}</h4>
        <input
          v-model="newPassword"
          :type="showPassword ? 'text' : 'password'"
          class="input"
        />
        <h4>{{ t('admin.changePassword.confirmPassword') }}</h4>
        <input
          v-model="confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          class="input"
        />

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions">
          <button id="close-btn" type="button" class="btn secondary" @click="close">{{ t('general.cancel') }}</button>
          <button id="submit-btn" type="submit" class="btn primary" :disabled="loading">
            {{ loading ? t('general.saving') : t('admin.changePassword.update') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ApiError, updateOwnPassword } from "@/services/auth";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const emit = defineEmits(["close"]);

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const error = ref<string | null>(null);
const loading = ref(false);
const showPassword = ref(false);

function close() {
  emit("close");
}

async function submit() {
  error.value = null;

  if (!oldPassword.value || oldPassword.value.length < 8 || !newPassword.value || newPassword.value.length < 8) {
    error.value = t('admin.changePassword.tooShortError');
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = t('admin.changePassword.dontMatchError');
    return;
  }

  loading.value = true;

  try {
    await updateOwnPassword(oldPassword.value, newPassword.value);
    close();
  } catch (err) {
    if (err instanceof ApiError) {
      // invalid credentials means the old password was wrong
      if (err.status === 401 && err.message === "Invalid credentials")
        error.value = t('admin.changePassword.wrongOldPasswordError');
      // other API error
      else error.value = `${t('admin.changePassword.failedToUpdate')}: ${err.message}`;
    }
    // other error
    else error.value = t('admin.changePassword.failedToUpdate') + ".";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@reference "@/style.css";

.modal-backdrop { @apply fixed inset-0 flex items-center justify-center bg-surface-inv/60; }
.modal { @apply relative w-full max-w-md rounded-2xl border border-surface-3 bg-surface-1 p-6 shadow-lg; }
.password-toggle { @apply absolute top-4 right-4; }
.title { @apply mb-4 text-lg font-bold text-ink-primary; }
.form { @apply flex flex-col; }
.input { @apply w-full rounded-xl border border-surface-3 bg-surface-2 px-4 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary outline-none mb-4; }
.input:focus { @apply border-accent-outline; }
.error { @apply text-sm font-medium text-ink-secondary; }
.actions { @apply mt-6 flex justify-end gap-2; }
.btn { @apply rounded-xl px-4 py-2 text-sm font-medium; }
.primary { @apply bg-accent-dark text-surface-0 hover:bg-accent-dark-hover;}
.secondary { @apply border border-accent-outline text-ink-primary hover:bg-surface-2; }
</style>
