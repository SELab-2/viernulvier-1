<template>
  <div>
    <img :src="admin?.profile_picture ?? '/favicon.ico'" alt="Profile picture" />
    <span>{{ admin?.username }}</span>

    <RouterLink :to="{ name: RouteNames.CMS }">Go to CMS</RouterLink>
    <button @click="handleLogout">Logout</button>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter, useRoute } from "vue-router";
import { logout } from "@/services/auth";
import { RouteNames } from "@/router/routeNames";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const { admin, clearAdmin } = useAuthStore();

async function handleLogout() {
  clearAdmin();
  await logout();
  await router.push({
    name: RouteNames.LOGIN,
    params: { lang: route.params.lang },
  });
}
</script>