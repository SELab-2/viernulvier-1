<template>
  <div
    class="group -mx-3 flex items-stretch gap-4 border-b border-surface-3 px-3 py-8 transition-colors last:border-b-0 sm:-mx-4 sm:gap-6 sm:px-4 md:-mx-5 md:gap-8 md:px-5 animate-pulse"
  >
    <!-- Image Placeholder -->
    <div
      class="h-28 w-24 shrink-0 rounded-md bg-surface-2 sm:h-32 sm:w-28 md:h-36 md:w-32"
    />

    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <!-- Date Placeholder -->
      <div class="absolute right-0 top-0 flex flex-col items-end">
        <div class="h-4 w-24 bg-surface-2 rounded mb-1"></div>
        <div class="h-3 w-16 bg-surface-1 rounded"></div>
      </div>

      <div class="min-w-0">
        <!-- Title Placeholder -->
        <div class="h-7 w-1/2 bg-surface-2 rounded mb-2 md:h-8"></div>

        <!-- Artist Placeholder -->
        <div class="h-5 w-1/3 bg-surface-1 rounded mb-6"></div>

        <!-- Hall Placeholder -->
        <div class="flex items-center gap-2 mt-4">
          <div class="size-4 rounded-full bg-surface-1"></div>
          <div class="h-4 w-32 bg-surface-1 rounded"></div>
        </div>
      </div>

      <!-- Tags Placeholder -->
      <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <div class="h-6 w-16 bg-surface-1 rounded-full"></div>
        <div class="h-6 w-20 bg-surface-1 rounded-full"></div>
        <div class="h-6 w-14 bg-surface-1 rounded-full"></div>
      </div>
    </div>
  </div>
</template>
