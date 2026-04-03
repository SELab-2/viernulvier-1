<template>
  <div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
    <h1 class="text-4xl font-bold mb-4 text-ink-primary">Pagina niet gevonden</h1>
    <p class="text-lg text-ink-secondary">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message?: string;
}

const props = defineProps<Props>();

const message = props.message ?? "Deze pagina bestaat niet of is verwijderd.";
</script>
