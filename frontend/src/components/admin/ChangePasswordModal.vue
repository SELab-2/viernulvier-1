<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal">
      <h3 class="title">{{ t('admin.dashboard.changePassword') }}</h3>

      <form @submit.prevent="submit">
        <input
          v-model="password"
          type="password"
          :placeholder="t('admin.changePassword.newPassword')"
          class="input"
        />

        <input
          v-model="confirm"
          type="password"
          :placeholder="t('admin.changePassword.confirmPassword')"
          class="input"
        />

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions">
          <button id="close-btn" type="button" @click="close" class="btn secondary">{{ t('general.cancel') }}</button>
          <button id="close-btn" type="submit" class="btn primary" :disabled="loading">
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

const password = ref("");
const confirm = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

function close() {
  emit("close");
}

async function submit() {
  error.value = null;

  if (!password.value || password.value.length < 8) {
    error.value = t('admin.changePassword.tooShortError');
    return;
  }

  if (password.value !== confirm.value) {
    error.value = t('admin.changePassword.dontMatchError');
    return;
  }

  loading.value = true;

  try {
    await updateOwnPassword(password.value);
    close();
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = `${t('admin.changePassword.failedToUpdate')}: ${err.message}`;
    }
    error.value = t('admin.changePassword.failedToUpdate') + ".";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@reference "@/style.css";

.modal-backdrop { @apply fixed inset-0 flex items-center justify-center bg-surface-inv/60; }
.modal { @apply w-full max-w-md rounded-2xl border border-surface-3 bg-surface-1 p-6 shadow-lg; }
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
