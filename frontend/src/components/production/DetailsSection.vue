<template>
  <div class="bg-surface-1">
    <section class="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 py-24 md:px-12 lg:grid-cols-12">
      <div class="space-y-12 lg:col-span-8">
        <div class="space-y-8">
          <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-ink-tertiary">
            Production Concept
          </h2>
          <p class="italic text-3xl font-black leading-[1.1] tracking-tighter text-ink-primary md:text-5xl">
            Working with architectural lighting designer Elena Vance, the
            production utilizes harsh shadows to "build" temporary walls on
            stage.
          </p>
        </div>
        
        <div class="grid grid-cols-1 gap-12 border-t border-surface-3 pt-12 md:grid-cols-2">
          <div class="text-lg font-light leading-relaxed text-ink-secondary">
            <p>
              <span class="font-bold text-ink-primary">The Silent Architecture</span> is a contemporary dance piece that challenges
              the perception of physical boundaries. Kostova investigates the
              tension between the skeletal frame and negative space.
            </p>
          </div>
          <div class="text-lg font-light leading-relaxed text-ink-secondary">
            <p>
              Marking a new chapter in VierNulVier's archive, it is a work of
              profound restraint and explosive athleticism, exploring how
              silence can be as loud as movement.
            </p>
          </div>
        </div>

        <div class="border-t border-surface-3 pt-12 space-y-3">
          <div
            v-for="group in tagGroups"
            :key="group.label"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="mr-2 text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">
              {{ group.label }}:
            </span>
            <span
              v-for="tag in group.tags"
              :key="tag"
              class="border border-surface-3 bg-surface-0 px-3 py-1 text-[10px] font-bold uppercase text-ink-secondary"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <div class="lg:col-span-4">
        <div class="sticky top-32 space-y-8">
          <div class="border border-surface-3 bg-surface-0 p-8">
            <h3 class="mb-6 border-b border-surface-3 pb-4 text-xs font-black uppercase tracking-[0.2em] text-ink-primary">
              Archival Status
            </h3>
            <p class="mb-4 text-sm leading-relaxed text-ink-secondary">
              This production record includes high-fidelity video recordings,
              technical floorplans, and original soundscapes from the October
              2024 premiere.
            </p>
          </div>
            
          <div class="border border-surface-3 bg-surface-1 p-6">
            <span class="mb-2 block text-[10px] font-bold tracking-widest uppercase text-ink-tertiary">
              Internal Note
            </span>
            <p class="italic text-xs text-ink-secondary">
              Physical archive holds original costume swatches and lighting gel
              samples.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// import { Plus } from "lucide-vue-next";

const tagGroups = [
  { label: "Type",    tags: ["Dance"] },
  { label: "Genre",   tags: ["Contemporary", "Minimalism"] },
  { label: "Festival", tags: ["Gentse Feesten"] },
];
</script>