<template>
  <section class="border-y border-surface-3 bg-surface-0 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2
            class="font-serif text-3xl font-semibold leading-tight tracking-tight text-ink-primary md:text-4xl"
          >
            {{ t("production.blog.title") }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-ink-secondary">
            {{ t("production.blog.body") }}
          </p>
        </div>
        <a
          href="#"
          class="border-b-2 border-ink-primary text-ink-primary pb-1 text-[10px] font-bold uppercase tracking-widest"
        >
          {{ t("production.blog.all") }}
        </a>
      </div>

      <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div v-for="(insight, index) in insights" :key="index" class="group cursor-pointer">
          <div class="mb-6 aspect-video overflow-hidden bg-surface-2">
            <img
              :alt="insight.title"
              class="h-full w-full object-cover grayscale transition-transform duration-700 group-hover:scale-105"
              :src="insight.image"
              referrerPolicy="no-referrer"
            />
          </div>
          <span class="text-[10px] font-black uppercase tracking-widest text-ink-tertiary">
            {{ insight.category }}
          </span>
          <h3
            class="mt-2 font-serif text-2xl font-semibold leading-snug tracking-tight text-ink-primary decoration-2 group-hover:underline"
          >
            {{ insight.title }}
          </h3>
          <p class="mt-4 text-sm leading-relaxed text-ink-secondary">
            {{ insight.description }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const insights = [
  {
    category: "Essay — Oct 2024",
    title: "Sculpting with Shadow: Elena Vance’s Lightwork",
    description:
      "How lighting design transformed a minimalist stage into a complex architectural maze.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCm-IV4I29eomSGLY4WPdxEyXqZeyFa8eQPus8fFLlpWpPNqFWykEaxZ8mCN2osbnDmxdBjCVc5PxCUZVb55mBD9LBRQYmF6S4sCDcLd2RgsEJXVh1juUvJX9rpUgkWIIYON5QIJtGE3HwurGDQC_c6hQogKZpm_1psN5p7Uo2zPQu9M1I3EjOxio2J0iOaCqZt7UfkCSXZYwRsNcnZqvaddt9ZIpd2uFgmAGgnrYT6nm_OwyKdHSsq2V8TE7uldF4abQK2bepI5GbV",
  },
  {
    category: "Interview — Sep 2024",
    title: "Marina Kostova on the Power of Structural Voids",
    description:
      "A conversation about the skeletal frame, negative space, and the dancer's endurance.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBvVM2WYuziq9ZRq9DFQzHhahGLZGPSJOcmI0dG0rqKNLFrtc7scqYC6AIPf0RPnuD_MZJnEpe0L96NUtVK6A4-QbPNf5-ZZFWD4pYcSOhwBATNu4XeMRgbnkRWjzD9jWWKNd30gL6RG6f_DSMT0CkHkf2tO4RX9cCfCba2L8ekdqqcKxCxBxqOcMpXKH6SV6McWGVuvpmvM8FnqogxodboFv9M56KtICF45QsgOsR2qzAdaoySRErUkW4NnWbepTE13OTYNzUw1wd7",
  },
  {
    category: "Archive Note — Nov 2024",
    title: "Technical Rider Analysis: Touring Constraints",
    description:
      "A deep dive into the logistical complexity of the Silent Architecture stage setup.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAELbkcJldyjugHjgd0h1DiQBz-dMKMI1oh5JB_BU6E_QcyLxTQUYoI3XbsSrTMli814TYD-pPIrUrfrNCbNubX4H4TL-CmTg6c3iMjCJREg6drknoETRDZR53yLc2QYRMqVm70Ck68xWVmn53gdGS0RAp5Xe2x5SCtzc0L4ZdFEvcWhe3LCb3aASmliKyR9WGALoxcH0CoJT1BCK2SHaOkCOjlR4T71_j-nqBc6OiPgqpqF128DAgf8ChsJ7f8BLjPYhYUrupJ84p",
  },
];
</script>
