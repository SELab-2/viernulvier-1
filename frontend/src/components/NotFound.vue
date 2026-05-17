<template>
  <div class="flex-1 flex flex-col justify-center bg-surface-1 text-ink-primary border-t border-surface-3 min-h-0">
    <div class="mx-auto max-w-6xl px-6 lg:px-10 w-full py-12 lg:py-20">
      <section class="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-x-16 items-start">

        <div class="lg:col-span-7">
          <div class="space-y-10">
            <div class="space-y-6">
              <div class="space-y-3">
                <p class="text-xs font-medium uppercase tracking-[0.2em] text-ink-tertiary">
                  {{ kicker || $t('errors.notFound.kicker') }}
                </p>
                <h1 class="font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-ink-primary">
                  {{ title || $t('errors.notFound.title') }}
                </h1>
              </div>
              <p class="text-base md:text-lg leading-relaxed text-ink-secondary max-w-xl">
                {{ description || $t('errors.notFound.description') }}
              </p>
            </div>

            <div>
              <router-link
                :to="buttonLink"
                class="inline-flex items-center gap-2 rounded-md bg-accent-dark px-4 py-2 text-sm font-medium text-surface-0 transition-colors hover:bg-accent-dark-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight"
              >
                {{ buttonLabel || $t('errors.notFound.buttonLabel') }}
              </router-link>
            </div>
          </div>
        </div>

        <aside class="lg:col-start-9 lg:col-span-4 lg:self-end">
          <div class="space-y-6 border-t border-surface-3 pt-8">
            <div class="space-y-3">
              <h2 class="text-xs font-medium uppercase tracking-[0.2em] text-ink-tertiary">
                {{ helpTitle || $t('errors.notFound.helpTitle') }}
              </h2>
              <p class="text-sm leading-relaxed text-ink-secondary">
                {{ helpText || $t('errors.notFound.helpText') }}
              </p>
            </div>

            <a
              href="mailto:info@viernulvier.gent"
              class="inline-block border-b border-ink-tertiary pb-0.5 text-sm font-medium text-ink-primary transition-colors hover:border-ink-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight"
            >
              {{ contactLabel || $t('errors.notFound.contactLabel') }}
            </a>
          </div>
        </aside>

      </section>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  kicker?: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonLink?: string;
  helpTitle?: string;
  helpText?: string;
  contactLabel?: string;
}

withDefaults(defineProps<Props>(), {
  kicker: undefined,
  title: undefined,
  description: undefined,
  buttonLabel: undefined,
  buttonLink: '/',
  helpTitle: undefined,
  helpText: undefined,
  contactLabel: undefined,
});

</script>
