<template>
  <!--
    Featured blog post on the landing page. Reads as the "lead article"
    on the front page of the archive. The placeholder below mirrors the
    shape of a real `BlogPostWithBackwardsRefs` so that, once the
    backend lookup is wired up, only the data source needs to change.
  -->
  <section class="bg-surface-1 px-6 py-20 lg:px-10 lg:py-24">
    <div class="mx-auto max-w-3xl">
      <!-- Eyebrow with thin rules -->
      <div
        class="mb-8 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-ink-secondary"
      >
        <span
          class="h-px w-8 bg-ink-tertiary opacity-50"
          aria-hidden="true"
        />
        <span class="whitespace-nowrap">{{ t("featuredBlog.eyebrow") }}</span>
        <span
          class="h-px w-8 bg-ink-tertiary opacity-50"
          aria-hidden="true"
        />
      </div>

      <!-- Editorial card -->
      <article
        class="border border-surface-3 bg-surface-0 px-6 py-10 md:px-12 md:py-12"
      >
        <!-- Dateline -->
        <p
          class="mb-5 text-xs uppercase tracking-[0.2em] text-ink-tertiary"
        >
          {{ datelineText }}
        </p>

        <!-- Title -->
        <h2
          class="font-serif text-3xl font-semibold leading-[1.1] tracking-tight text-ink-primary md:text-4xl"
        >
          {{ title }}
        </h2>

        <!--
          Lead image with caption. Sits between the title and the
          excerpt the way a magazine article opens.

          PLACEHOLDER: the real `BlogPost` schema has no image field —
          images live inside the markdown of `content`. Wire this up
          later by either (a) parsing the first image from `content`,
          or (b) extending the schema with a lead-image FK.
        -->
        <figure class="mt-8">
          <img
            src="@/assets/images/bento.webp"
            alt=""
            width="2400"
            height="1600"
            class="block w-full"
            loading="lazy"
            decoding="async"
          />
          <figcaption
            class="mt-3 font-serif text-sm italic leading-snug text-ink-secondary"
          >
            {{ t("featuredBlog.imageCaption") }}
          </figcaption>
        </figure>

        <!-- Excerpt with drop-cap -->
        <p
          class="article-lead mt-8 font-serif text-base leading-[1.7] text-ink-primary md:text-lg text-justify hyphens-auto"
        >
          {{ excerpt }}
        </p>

        <!-- Read-more link -->
        <RouterLink
          :to="{
            name: RouteNames.BLOG_POST_DETAIL,
            params: { lang: currentLang, id: post.id },
          }"
          class="mt-10 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-ink-primary underline decoration-1 underline-offset-[6px] transition hover:decoration-2"
        >
          <span>{{ t("featuredBlog.readMore") }}</span>
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </RouterLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { i18n, type SupportedLang } from "@/i18n";
import { RouteNames } from "@/router/routeNames";
import type { BlogPostWithBackwardsRefs } from "@viernulvier/shared";
import { localizeOrEmpty } from "@/utils/language-utils";
import { formatDate } from "@/utils/date";

const { t, locale } = useI18n();

const currentLang = computed(
  () => i18n.global.locale.value as SupportedLang,
);

/**
 * Placeholder blogpost shaped exactly like a real
 * `BlogPostWithBackwardsRefs` returned by `getBlogPost`.
 * Swap this for a real fetch (e.g. `getFeaturedBlogPost()`)
 * once the endpoint exists; no template changes needed.
 *
 * NOTE: real blogposts store markdown/HTML in `content`. The
 * placeholder uses plain text so the excerpt renders as-is.
 * When wiring real data, parse and truncate `content` here.
 */
const post = computed<BlogPostWithBackwardsRefs>(() => ({
  id: 1,
  blog: { id: 1 },
  title: {
    nl: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    en: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    fr: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
  },
  content: {
    nl: "Aenean euismod, urna ac dignissim porta, leo arcu vehicula nibh, sed congue dolor magna nec massa. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In hac habitasse platea dictumst — donec vitae sapien ut libero venenatis faucibus.",
    en: "Aenean euismod, urna ac dignissim porta, leo arcu vehicula nibh, sed congue dolor magna nec massa. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In hac habitasse platea dictumst — donec vitae sapien ut libero venenatis faucibus.",
    fr: "Aenean euismod, urna ac dignissim porta, leo arcu vehicula nibh, sed congue dolor magna nec massa. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. In hac habitasse platea dictumst — donec vitae sapien ut libero venenatis faucibus.",
  },
  published_at: new Date("2026-04-21"),
  productions: [],
}));

const title = computed(() =>
  localizeOrEmpty(post.value.title, currentLang.value),
);

const excerpt = computed(() =>
  localizeOrEmpty(post.value.content, currentLang.value),
);

const datelineText = computed(() => {
  if (!post.value.published_at) {
    return t("featuredBlog.dateline", { date: "" });
  }
  return t("featuredBlog.dateline", {
    date: formatDate(post.value.published_at, locale.value),
  });
});
</script>

<style scoped>
@reference "@/style.css";

/*
 * Drop cap on the excerpt — same recipe as ProductionDetail's
 * DetailsSection so the editorial vocabulary stays consistent.
 */
.article-lead::first-letter {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--ink-primary);
  margin-right: 0.4rem;
  -webkit-initial-letter: 3;
  initial-letter: 3;
}

@supports not ((initial-letter: 3) or (-webkit-initial-letter: 3)) {
  .article-lead::first-letter {
    float: left;
    font-size: 4.8em;
    line-height: 1;
    margin: 0.05em 0.5rem 0 0;
  }
}
</style>
