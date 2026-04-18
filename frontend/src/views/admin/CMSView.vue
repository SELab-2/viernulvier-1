<template>
  <div class="flex min-h-screen flex-col bg-surface-0">
    <AdminNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

    <main class="flex-1 bg-surface-1 px-6 py-10 lg:px-10">
      <div class="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-black tracking-tight text-ink-primary">
              {{ t("cms.title") }}
            </h1>
            <p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
              {{ t("cms.subtitle") }}
            </p>
          </div>
        </header>

        <nav class="cms-tabs" role="tablist" :aria-label="t('cms.tabs.ariaLabel')">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :class="['cms-tab', { 'cms-tab-active': activeTab === tab.id }]"
            :data-testid="`cms-tab-${tab.id}`"
            @click="activeTab = tab.id"
          >
            {{ t(tab.labelKey) }}
          </button>
        </nav>

        <CmsProductionsTab v-if="activeTab === 'productions'" />
        <CmsTagsTab v-else-if="activeTab === 'tags'" />
        <CmsAdminsTab v-else-if="activeTab === 'admins'" />
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AdminNavbar from "@/components/admin/AdminNavbar.vue";
import AppFooter from "@/components/AppFooter.vue";
import CmsProductionsTab from "@/components/admin/cms/tabs/CmsProductionsTab.vue";
import CmsTagsTab from "@/components/admin/cms/tabs/CmsTagsTab.vue";
import CmsAdminsTab from "@/components/admin/cms/tabs/CmsAdminsTab.vue";
import { useDarkMode } from "@/composables/useDarkMode";

type CmsTabId = "productions" | "tags" | "admins";

const { t } = useI18n();
const { isDark, toggleDark } = useDarkMode();

const tabs: ReadonlyArray<{ id: CmsTabId; labelKey: string }> = [
  { id: "productions", labelKey: "cms.tabs.productions" },
  { id: "tags", labelKey: "cms.tabs.tags" },
  { id: "admins", labelKey: "cms.tabs.admins" },
];

const activeTab = ref<CmsTabId>("productions");

defineExpose({ activeTab });
</script>
