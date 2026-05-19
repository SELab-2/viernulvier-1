<template>
  <div
    class="group -mx-3 flex items-stretch gap-4 border-b border-surface-3 px-3 py-8 last:border-b-0 sm:-mx-4 sm:gap-6 sm:px-4 md:-mx-5 md:gap-8 md:px-5 animate-pulse"
  >
    <!-- Thumbnail -->
    <div class="w-52 shrink-0 self-start sm:w-60 md:w-72" aria-hidden="true">
      <div class="aspect-[1920/900] w-full rounded-md bg-surface-3" />
    </div>

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <!-- Date -->
      <div class="absolute right-0 top-0 max-w-[12rem] sm:max-w-[14rem]">
        <div class="ml-auto h-5 w-28 rounded bg-surface-3" />
      </div>

      <div class="-mt-0.5 min-w-0">
        <!-- Title -->
        <div class="h-7 w-2/3 rounded bg-surface-3 pr-[12rem] sm:pr-[14rem]" />

        <!-- Artist -->
        <div class="mt-1 h-5 w-2/5 rounded bg-surface-2" />

        <!-- Location -->
        <div class="mt-3 flex items-center gap-1">
          <div class="size-[0.9rem] shrink-0 rounded-full bg-surface-2" />
          <div class="h-4 w-36 rounded bg-surface-2" />
        </div>
      </div>

      <!-- Tags -->
      <div class="mt-auto flex flex-wrap items-center gap-2 pt-4.5">
        <div class="h-[1.375rem] w-16 rounded-sm bg-surface-2" />
        <div class="h-[1.375rem] w-20 rounded-sm bg-surface-2" />
        <div class="h-[1.375rem] w-14 rounded-sm bg-surface-2" />
      </div>
    </div>
  </div>
</template>
