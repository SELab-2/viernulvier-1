import type { RouteRecordRaw } from "vue-router";
import { RouteNames } from "./routeNames";
import { detectLanguage } from "./index";

export const routes: RouteRecordRaw[] = [
  // root redirect
  {
    path: "/",
    redirect: () => `/${detectLanguage()}`,
  },

  // redirects zonder taalprefix
  {
    path: "/productions",
    redirect: () => `/${detectLanguage()}/productions`,
  },
  {
    path: "/productions/:id",
    redirect: (to) => `/${detectLanguage()}/productions/${to.params.id}`,
  },
//   {
//     path: "/prints",
//     redirect: () => `/${detectLanguage()}/prints`,
//   },

  // routes met taalprefix
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
    //   {
    //     path: "prints",
    //     name: RouteNames.PRINTS,
    //     component: () => import("../views/PrintUploadsView.vue"),
    //   },
    ],
  },

  // admin
  {
    path: "/:lang(nl|fr|en)/admin/cms",
    name: RouteNames.CMS,
    component: () => import("../views/admin/CMSView.vue"),
    meta: { requiresAdmin: true },
  },

  // 404
  {
    path: "/:pathMatch(.*)*",
    name: RouteNames.NOT_FOUND,
    component: () => import("../views/NotFoundView.vue"),
  },
];
