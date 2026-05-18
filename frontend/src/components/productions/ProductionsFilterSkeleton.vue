<template>
  <div class="mb-4 animate-pulse space-y-3">
    <!-- Row 1 -->
    <div class="flex flex-col gap-2 pb-0.5 sm:flex-row sm:items-stretch sm:gap-3">
      <!-- DateFilter -->
      <div class="h-11 w-36 shrink-0 rounded-md border border-surface-3 bg-surface-2" />

      <!-- Search bar -->
      <div class="min-h-11 flex-1 rounded-md border border-surface-3 bg-surface-2" />

      <!-- SortControl -->
      <div class="h-11 w-[calc(7rem+2rem+1px)] shrink-0 rounded-md border border-surface-3 bg-surface-2" />

      <!-- LayoutToggle -->
      <div class="h-11 w-[4.5rem] shrink-0 rounded-md border border-surface-3 bg-surface-2" />
    </div>

    <!-- Row 2 -->
    <div class="mt-4 flex w-full flex-wrap items-center gap-x-2 gap-y-2 border-t border-surface-3 pt-4">
      <!-- Genre pills -->
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div class="h-[2.125rem] w-20 rounded-sm border border-surface-3 bg-surface-2" />
        <div class="h-[2.125rem] w-16 rounded-sm border border-surface-3 bg-surface-2" />
        <div class="h-[2.125rem] w-24 rounded-sm border border-surface-3 bg-surface-2" />
        <div class="h-[2.125rem] w-16 rounded-sm border border-surface-3 bg-surface-2" />
        <div class="h-[2.125rem] w-20 rounded-sm border border-surface-3 bg-surface-2" />
      </div>

      <!-- Expand button -->
      <div class="size-9 shrink-0 rounded-md border border-surface-3 bg-surface-2" />
    </div>
  </div>
</template>