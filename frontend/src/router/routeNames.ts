/**
 * Centralized route names for type-safe navigation.
 * Always use `router.push({ name: RouteNames.X, params })` instead of hardcoded paths.
 * Advantages:
 *  - TypeScript catches typos
 *  - Easier refactoring
 *  - Supports dynamic params safely
 */
export const RouteNames = {
  HOME: "home",
  PRODUCTIONS: "productions",
  PRODUCTION_DETAIL: "production-detail",
  BLOG_POST_DETAIL: "blog-post-detail",
  BLOG_POSTS: "blog-posts",

  // admin
  ADMIN: "admin",
  CMS: "cms",
  LOGIN: "login",

  NOT_FOUND: "not-found",
} as const;
