<template>
  <section class="bg-surface-inv px-6 py-16 lg:px-10">
    <div class="mx-auto max-w-xl text-center">
      <h2 class="text-2xl font-bold text-ink-on-inv">{{ t("newsletter.title") }}</h2>
      <p class="mt-3 text-sm leading-relaxed text-ink-on-inv-secondary">
        {{ t("newsletter.subtitle") }}
      </p>
      <form
        class="mt-6 flex flex-col gap-3 sm:flex-row"
        @submit.prevent="handleSubmit"
      >
        <input
          v-model="email"
          type="email"
          :placeholder="t('newsletter.placeholder')"
          required
          class="flex-1 rounded-md border border-surface-inv-border bg-surface-inv-raised px-4 py-2.5 text-sm text-ink-on-inv placeholder-ink-on-inv-tertiary outline-none transition focus:border-ink-on-inv-tertiary focus:ring-1 focus:ring-ink-on-inv-tertiary"
        />
        <button
          type="submit"
          class="rounded-md bg-ink-on-inv px-5 py-2.5 text-sm font-semibold text-surface-inv transition hover:bg-ink-on-inv-secondary"
        >
          {{ t("newsletter.cta") }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const email = ref("");

function handleSubmit() {
  // TODO: connect to backend newsletter endpoint
  email.value = "";
}
</script>
