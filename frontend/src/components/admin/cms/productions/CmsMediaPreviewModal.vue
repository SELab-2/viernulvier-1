<template>
  <div v-if="mediaPreview" class="cms-modal-overlay" @click.self="$emit('close')">
    <section class="cms-modal cms-media-modal" role="dialog" aria-modal="true">
      <header class="cms-modal-header">
        <h2 class="text-xl font-bold text-ink-primary">
          {{ t("cms.columns.media") }}
        </h2>
        <button type="button" class="cms-side-close" @click="$emit('close')">
          {{ t("cms.panel.close") }}
        </button>
      </header>

      <div class="cms-modal-body cms-media-preview-body">
        <input
          ref="mediaPreviewImageInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="$emit('image-selected', $event)"
        />
        <div v-if="mediaPreview.kind === 'gallery'" class="cms-media-gallery">
          <img :src="mediaPreview.url" :alt="mediaPreview.label" class="cms-media-preview-large" />
          <div class="cms-media-gallery-nav">
            <button type="button" class="cms-side-close" :disabled="!mediaPreview.images || mediaPreview.images.length < 2" @click="$emit('sync-gallery-preview', (mediaPreview.currentImageIndex ?? 0) - 1)">
              ←
            </button>
            <span class="cms-media-gallery-count">
              {{ (mediaPreview.currentImageIndex ?? 0) + 1 }} / {{ mediaPreview.images?.length ?? 0 }}
            </span>
            <button type="button" class="cms-side-close" :disabled="!mediaPreview.images || mediaPreview.images.length < 2" @click="$emit('sync-gallery-preview', (mediaPreview.currentImageIndex ?? 0) + 1)">
              →
            </button>
          </div>
          <div class="cms-media-gallery-thumbs">
            <button
              v-for="(image, index) in mediaPreview.images"
              :key="image.id"
              type="button"
              class="cms-media-gallery-thumb"
              :class="{ active: index === (mediaPreview.currentImageIndex ?? 0) }"
              @click="$emit('sync-gallery-preview', index)"
            >
              <img :src="image.url" :alt="`${mediaPreview.label} ${index + 1}`" />
            </button>
          </div>
        </div>
        <img v-else-if="mediaPreview.kind === 'image'" :src="mediaPreview.url" :alt="mediaPreview.label" class="cms-media-preview-large" />
        <iframe
          v-else
          :src="mediaPreview.url"
          :title="mediaPreview.label"
          class="cms-media-preview-large"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>

      <footer class="cms-modal-footer">
        <div class="cms-modal-footer-right cms-media-footer-actions">
          <input
            v-if="mediaPreview.kind !== 'image' && mediaPreview.mediaField"
            :value="mediaPreviewEditUrl"
            type="text"
            class="cms-text-input cms-media-url-input"
            :placeholder="t('cms.create.media.editVideoUrlPlaceholder')"
            :disabled="isSaving"
            @input="$emit('update:media-preview-edit-url', ($event.target as HTMLInputElement).value)"
            @keyup.enter="$emit('save-video-url')"
          />
          <div class="cms-media-footer-buttons">
            <button
              v-if="(mediaPreview.kind === 'image' || mediaPreview.kind === 'gallery') && mediaPreview.productionId"
              type="button"
              class="cms-side-save"
              :disabled="isSaving"
              @click="mediaPreviewImageInput?.click()"
            >
              {{ isSaving ? t("general.saving") : t("cms.create.media.addImage") }}
            </button>
            <button
              v-if="mediaPreview.kind !== 'image' && mediaPreview.mediaField"
              type="button"
              class="cms-side-save"
              :disabled="isSaving || !mediaPreviewEditUrl"
              @click="$emit('save-video-url')"
            >
              {{ isSaving ? t("general.saving") : t("cms.panel.save") }}
            </button>
            <button v-if="mediaPreview.imageId" type="button" class="cms-remove-button" :disabled="isSaving" @click="$emit('remove-image')">
              {{ isSaving ? t("general.saving") : t("general.delete") }}
            </button>
            <button
              v-if="mediaPreview.kind !== 'image' && mediaPreview.mediaField"
              type="button"
              class="cms-remove-button"
              :disabled="isSaving"
              @click="$emit('remove-video')"
            >
              {{ isSaving ? t("general.saving") : t("general.delete") }}
            </button>
          </div>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import type { CmsMediaPreview } from "@/services/cms/media-preview";

defineProps<{
  mediaPreview: CmsMediaPreview | null;
  mediaPreviewEditUrl: string;
  isSaving: boolean;
}>();

const mediaPreviewImageInput = useTemplateRef<HTMLInputElement>("mediaPreviewImageInput");

defineEmits<{
  close: [];
  "image-selected": [event: Event];
  "remove-image": [];
  "remove-video": [];
  "save-video-url": [];
  "sync-gallery-preview": [nextIndex: number];
  "update:media-preview-edit-url": [value: string];
}>();

const { t } = useI18n();
</script>

<style scoped>
.cms-media-preview-body {
  min-width: 600px;
  min-height: 500px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cms-media-preview-large {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.cms-media-gallery {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.75rem;
}

.cms-media-gallery-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.cms-media-gallery-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink-secondary);
}

.cms-media-gallery-thumbs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.cms-media-gallery-thumb {
  flex: 0 0 auto;
  width: 4.5rem;
  height: 4.5rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--surface-1);
}

.cms-media-gallery-thumb.active {
  border-color: var(--surface-inv);
}

.cms-media-gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cms-media-footer-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.75rem;
}

.cms-media-url-input {
  width: 100%;
}

.cms-media-footer-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

img.cms-media-preview-large {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

iframe.cms-media-preview-large {
  height: 100%;
  aspect-ratio: 16 / 9;
}
</style>
