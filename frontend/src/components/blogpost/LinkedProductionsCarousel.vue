<template>
  <section v-if="productions.length" class="relative left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] w-screen border-y border-surface-3 bg-surface-0 py-20 mt-12 overflow-hidden group/carousel">
    <div class="mx-auto max-w-7xl px-6 md:px-12 relative">
      
      <div class="mb-10 flex items-center gap-4">
        <h2 class="text-[11px] font-black uppercase tracking-[0.3em] text-ink-primary shrink-0">
          Gerelateerde producties
        </h2>
        <div class="h-px flex-1 bg-surface-3 opacity-50"></div>
      </div>

      <div class="hidden md:block">
        <button 
          class="absolute -left-4 top-[58%] z-30 -translate-y-1/2 p-4 text-ink-primary opacity-0 transition-all hover:scale-125 group-hover/carousel:opacity-100"
          aria-label="Vorige"
          @click="scroll('left')"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
        </button>
        
        <button 
          class="absolute -right-4 top-[58%] z-30 -translate-y-1/2 p-4 text-ink-primary opacity-0 transition-all hover:scale-125 group-hover/carousel:opacity-100"
          aria-label="Volgende"
          @click="scroll('right')"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-sm">
            <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
        </button>
      </div>

      <div 
        ref="scroll-container"
        class="hide-scrollbar flex w-full snap-x snap-mandatory gap-8 overflow-x-auto pb-4 scroll-smooth"
      >
        <div 
          v-for="prod in productions" 
          :key="prod.id"
          class="flex-none snap-start w-[85vw] md:w-[350px]"
        >
          <LinkedProductionCard 
            :production="prod" 
            :thumbnail-url="thumbnails.get(prod.id)"
            :date-range="dateRanges.get(prod.id)" 
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { ProductionWithBackwardsRefs } from "@viernulvier/shared";
import LinkedProductionCard from "./LinkedProductionCard.vue";

defineProps<{
  productions: ProductionWithBackwardsRefs[];
  thumbnails: Map<number, string | null>;
  dateRanges: Map<number, string>;
}>();

const scrollContainer = useTemplateRef<HTMLElement>('scroll-container');

const scroll = (direction: 'left' | 'right') => {
  const el = scrollContainer.value;
  if (!el) return;

  const step = el.clientWidth > 768 ? (350 * 2) + (32 * 2) : el.clientWidth;
  
  el.scrollBy({
    left: direction === 'left' ? -step : step,
    behavior: 'smooth',
  });
};
</script>

<style scoped>
@reference "@/style.css";

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.drop-shadow-sm {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

button {
  transition: opacity 0.3s ease, transform 0.2s ease;
}
</style>