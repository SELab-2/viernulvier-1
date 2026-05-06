import type { RouteRecordRaw } from "vue-router";
import { RouteNames } from "./routeNames";
import { useAuthStore } from "@/stores/auth";

export const routes: RouteRecordRaw[] = [
  {
    path: "/:lang(nl|fr|en)",
    children: [
      {
        path: "",
        name: RouteNames.HOME,
        component: () => import("../views/HomeView.vue"),
      },
      {
        path: "productions",
        name: RouteNames.PRODUCTIONS,
        component: () => import("../views/ProductionsView.vue"),
      },
      {
        path: "productions/:id",
        name: RouteNames.PRODUCTION_DETAIL,
        component: () => import("../views/ProductionDetailView.vue"),
        props: true,
      },
      {
        path: "blog/post/:id",
        name: RouteNames.BLOG_POST_DETAIL,
        component: () => import("../views/BlogPostDetailView.vue"),
        props: true,
      },
      //   {
      //     path: "prints",
      //     name: RouteNames.PRINTS,
      //     component: () => import("../views/PrintUploadsView.vue"),
      //   },

      // ADMIN
      {
        path: "admin",
        children: [
          {
            path: "",
            name: RouteNames.ADMIN, // home screen for admins, shows currently logged in admin, with button to go to CMS
            component: () => import("../views/admin/AdminView.vue"),
            meta: { requiresAdmin: true },
          },
          {
            path: "cms",
            name: RouteNames.CMS,
            component: () => import("../views/admin/CmsView.vue"),
            meta: { requiresAdmin: true },
          },
          {
            path: "login",
            name: RouteNames.LOGIN,
            component: () => import("../views/admin/LoginView.vue"),
            beforeEnter: async (to) => {
              const authStore = useAuthStore();
              try {
                await authStore.fetchAdmin();
                // already logged in, redirect to admin
                return { name: RouteNames.ADMIN, params: { lang: to.params.lang } };
              } catch {
                // not logged in, proceed to login page
              }
            },
          },
        ],
      },
    ],
  },

  // 404
  {
    path: "/:pathMatch(.*)*",
    name: RouteNames.NOT_FOUND,
    component: () => import("../views/NotFoundView.vue"),
  },
];
