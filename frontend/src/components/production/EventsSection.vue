<template>
  <section class="border-b border-surface-3 bg-surface-0 py-24">
    <div class="mx-auto max-w-7xl px-6 md:px-12">
      <div class="grid grid-cols-1 gap-16 lg:grid-cols-12">
        <div class="lg:col-span-4">
          <h2 class="mb-6 text-4xl font-black uppercase leading-none tracking-tighter text-ink-primary">
            Production<br />History
          </h2>
          <p class="text-sm leading-relaxed text-ink-secondary">
            Comprehensive log of past stagings and archival milestones. Every
            event is preserved with high-fidelity records.
          </p>
        </div>
        
        <div class="divide-y divide-surface-3 lg:col-span-8">
          <div
            v-for="(event, index) in events"
            :key="index"
            class="group -mx-4 flex flex-col justify-between px-4 py-8 transition-colors duration-300 hover:bg-surface-1 md:flex-row md:items-center"
          >
            <div class="flex items-center gap-8">
              <div class="flex min-w-12 flex-col items-center">
                <span class="text-[10px] font-bold uppercase text-ink-secondary">
                  {{ event.date }}
                </span>
                <span class="text-lg font-black text-ink-primary">{{ event.time }}</span>
              </div>
              <div>
                <h4 class="text-lg font-bold text-ink-primary">
                  {{ event.title }}
                </h4>
                <p class="text-xs uppercase tracking-wide text-ink-secondary">
                  {{ event.subtitle }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-6 md:mt-0">
              <span class="text-lg font-black uppercase text-ink-primary">
                € 15,00
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface Event {
  date: string;
  time: string;
  title: string;
  subtitle: string;
}

const events: Event[] = [
  {
    date: "Oct 14",
    time: "20:00",
    title: "Ghent: De Vooruit",
    subtitle: "Theaterzaal — 20:00 - 21:15",
  },
  {
    date: "Nov 02",
    time: "19:30",
    title: "Brussels: Théâtre National",
    subtitle: "Studio 1 — 19:30 - 20:45",
  },
  {
    date: "Jan 12",
    time: "14:00",
    title: "Digital Hall: Archive Seminar",
    subtitle: "Online Lecture — 14:00 - 15:30",
  },
];
</script>