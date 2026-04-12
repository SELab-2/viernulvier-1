<template>
  <div class="flex-1 flex flex-col justify-center bg-surface-1 text-ink-primary border-t border-surface-3 min-h-0">
    <div class="mx-auto max-w-7xl px-6 md:px-12 w-full py-12 lg:py-20">
      <section class="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-16 items-start">
        
        <div class="lg:col-span-7">
          <div class="space-y-12">
            <div class="space-y-8">
              <h1 class="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-ink-primary italic">
                {{ title || $t('production.notFound.title') }}
              </h1>
              <p class="text-xl font-light text-ink-secondary leading-relaxed max-w-lg opacity-80">
                {{ description || $t('production.notFound.description') }}
              </p>
            </div>

            <div class="pt-6">
              <router-link 
                :to="buttonLink" 
                class="inline-block relative overflow-hidden group border border-ink-primary px-12 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-500"
              >
                <span class="relative z-10 transition-colors duration-500 group-hover:text-surface-0">
                  {{ buttonLabel || $t('production.notFound.buttonLabel') }}
                </span>
                <div class="absolute inset-0 bg-ink-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
              </router-link>
            </div>
          </div>
        </div>

        <div class="lg:col-start-9 lg:col-span-4 self-end">
          <div class="space-y-10 border-t border-surface-3 pt-10">
            <div class="space-y-4">
              <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-ink-tertiary">
                {{ helpTitle || $t('production.notFound.helpTitle') }}
              </h3>
              <p class="text-sm font-light leading-relaxed text-ink-secondary">
                {{ helpText || $t('production.notFound.helpText') }}
              </p>
            </div>
            
            <a 
              href="mailto:info@viernulvier.gent" 
              class="group flex items-center justify-between border-b border-surface-3 pb-4 hover:border-ink-primary transition-colors"
            >
              <span class="text-[10px] font-black uppercase tracking-[0.2em]">
                {{ contactLabel || $t('production.notFound.contactLabel') }}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 transition-transform group-hover:-rotate-45">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonLink?: string;
  helpTitle?: string;
  helpText?: string;
  contactLabel?: string;
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  buttonLabel: undefined,
  buttonLink: '/productions',
  helpTitle: undefined,
  helpText: undefined,
  contactLabel: undefined,
});

</script>