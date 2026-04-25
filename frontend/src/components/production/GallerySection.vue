<template>
  <section v-if="slides.length > 0" class="border-t border-surface-3 bg-surface-2 py-20 md:py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="mb-10 md:mb-12">
        <h2 class="text-3xl font-black uppercase tracking-tighter text-ink-primary md:text-4xl">
          {{ t("production.gallery.title") }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-secondary md:text-base">
          {{ t("production.gallery.intro") }}
        </p>
      </div>

      <ProductionImageCarousel :slides="slides" />
    </div>
  </section>
</template>

<script setup lang="ts">
import ProductionImageCarousel, {
  type CarouselSlide,
} from "@/components/production/ProductionImageCarousel.vue";
import { useI18n } from "vue-i18n";

defineProps<{
  slides: CarouselSlide[];
}>();

const { t } = useI18n();
</script>
