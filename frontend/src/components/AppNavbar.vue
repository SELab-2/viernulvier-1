<template>
  <nav
    class="sticky top-0 z-50 flex h-16 w-full items-center justify-between bg-surface-inv px-6 lg:px-10"
  >
    <!-- Left: nav links -->
    <div class="flex items-center gap-6">
      <RouterLink
        :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
        class="nav-link"
      >
        {{ t("nav.home") }}
      </RouterLink>
      <RouterLink
        :to="{ name: RouteNames.PRODUCTIONS, params: { lang: currentLang } }"
        class="nav-link"
      >
        {{ t("nav.productions") }}
      </RouterLink>
    </div>

    <!-- Center: logo -->
    <RouterLink
      :to="{ name: RouteNames.HOME, params: { lang: currentLang } }"
      class="absolute left-1/2 -translate-x-1/2"
    >
      <img
        src="@/assets/logo.svg"
        alt="VierNulVier"
        width="102"
        height="32"
        class="h-8 w-[102px] brightness-0 invert"
      />
    </RouterLink>

    <!-- Right: controls -->
    <NavControls variant="dark" :is-dark="isDark" @toggle-dark="$emit('toggle-dark')" />
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import NavControls from "@/components/NavControls.vue";

defineProps<{ isDark: boolean }>();
defineEmits<{ "toggle-dark": [] }>();

const { t } = useI18n();
const currentLang = computed(() => i18n.global.locale.value as SupportedLang);
</script>

<style scoped>
@reference "@/style.css";

.nav-link {
  @apply text-sm font-medium text-ink-on-inv-secondary transition hover:text-ink-on-inv;
}
.nav-link.router-link-active {
  @apply text-ink-on-inv;
}
</style>