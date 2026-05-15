<template>
  <section class="flex-1 bg-surface-0 px-6 py-12 lg:px-10 lg:py-20">
    <div class="mx-auto max-w-4xl">
      <h1
        class="font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-ink-primary"
      >
        {{ title }}
      </h1>

      <p class="mt-6 max-w-2xl text-base leading-relaxed text-ink-secondary">
        {{ description }}
      </p>

      <div class="mt-10">
        <router-link
          :to="buttonLink"
          class="inline-flex items-center gap-2 rounded-md bg-accent-dark px-4 py-2 text-sm font-medium text-surface-0 transition-colors hover:bg-accent-dark-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight"
        >
          {{ buttonLabel }}
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  description: string;
  buttonLabel: string;
  buttonLink?: string;
}

withDefaults(defineProps<Props>(), {
  buttonLink: "/productions",
});
</script>
