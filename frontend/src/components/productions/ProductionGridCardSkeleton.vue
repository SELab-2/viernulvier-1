<template>
  <div
    class="flex h-full flex-col overflow-hidden rounded-md border border-surface-3 bg-surface-0 animate-pulse dark:bg-surface-1"
  >
    <!-- Thumbnail -->
    <div class="aspect-[1920/900] w-full bg-surface-3" aria-hidden="true" />

    <div class="flex min-w-0 flex-1 flex-col gap-2.5 px-3 py-3 sm:px-4 sm:py-3.5">
      <div class="min-w-0">
        <!-- Title -->
        <div class="h-[1.75rem] w-3/4 rounded bg-surface-3" />

        <!-- Artist -->
        <div class="mt-1 h-[1.25rem] w-1/2 rounded bg-surface-2" />
      </div>

      <!-- Date -->
      <div class="flex items-center gap-1">
        <div class="size-[0.9rem] shrink-0 rounded-full bg-surface-2" />
        <div class="h-4 w-2/3 rounded bg-surface-2" />
      </div>

      <!-- Tags -->
      <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1.5">
        <div class="h-[1.125rem] w-14 rounded-sm bg-surface-2" />
        <div class="h-[1.125rem] w-16 rounded-sm bg-surface-2" />
      </div>
    </div>
  </div>
</template>
