<template>
  <div class="flex min-h-screen flex-col bg-surface-0">
    <AdminNavbar :is-dark="isDark" @toggle-dark="toggleDark" />

    <main class="flex-1 bg-surface-1 px-6 py-10 lg:px-10">
      <div class="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header>
          <h1 class="text-3xl font-black tracking-tight text-ink-primary">
            {{ t("cms.title") }}
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
            {{ t("cms.subtitle") }}
          </p>
        </header>

        <div class="cms-tabs" role="tablist" :aria-label="t('cms.tabs.ariaLabel')">
          <button
            type="button"
            class="cms-tab"
            :class="{ 'cms-tab-active': activeTab === 'productions' }"
            role="tab"
            data-testid="cms-tab-productions"
            :aria-selected="activeTab === 'productions'"
            @click="activeTab = 'productions'"
          >
            {{ t("cms.tabs.productions") }}
          </button>
          <button
            type="button"
            class="cms-tab"
            :class="{ 'cms-tab-active': activeTab === 'tags' }"
            role="tab"
            data-testid="cms-tab-tags"
            :aria-selected="activeTab === 'tags'"
            @click="activeTab = 'tags'"
          >
            {{ t("cms.tabs.tags") }}
          </button>
          <button
            type="button"
            class="cms-tab"
            :class="{ 'cms-tab-active': activeTab === 'admins' }"
            role="tab"
            data-testid="cms-tab-admins"
            :aria-selected="activeTab === 'admins'"
            @click="activeTab = 'admins'"
          >
            {{ t("cms.tabs.admins") }}
          </button>
        </div>

        <CmsProductionsTab v-if="activeTab === 'productions'" />
        <CmsTagsTab v-else-if="activeTab === 'tags'" />
        <CmsAdminsTab v-else />
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import AppFooter from "@/components/AppFooter.vue";
import AdminNavbar from "@/components/admin/AdminNavbar.vue";
import CmsAdminsTab from "@/components/admin/cms/tabs/CmsAdminsTab.vue";
import CmsProductionsTab from "@/components/admin/cms/tabs/CmsProductionsTab.vue";
import CmsTagsTab from "@/components/admin/cms/tabs/CmsTagsTab.vue";
import { useDarkMode } from "@/composables/useDarkMode";

type CmsTabId = "productions" | "tags" | "admins";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { isDark, toggleDark } = useDarkMode();

const validTabs = ["productions", "tags", "admins"] as const;

const activeTab = computed({
  get(): CmsTabId {
    const tab = route.query.tab;
    if (typeof tab === "string" && validTabs.includes(tab as CmsTabId)) {
      return tab as CmsTabId;
    }
    return "productions";
  },
  set(tab: CmsTabId) {
    void router.replace({ query: { ...route.query, tab } });
  },
});

defineExpose({ activeTab });
</script>
