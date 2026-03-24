<template>
  <section class="bg-zinc-900 px-6 py-16 lg:px-10">
    <div class="mx-auto max-w-xl text-center">
      <h2 class="text-2xl font-bold text-white">{{ t("newsletter.title") }}</h2>
      <p class="mt-3 text-sm leading-relaxed text-zinc-400">
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
          class="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        <button
          type="submit"
          class="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
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
