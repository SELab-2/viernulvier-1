<template>
  <div>
    <input v-model="username" type="text" placeholder="Username" @keyup.enter="handleLogin" />
    <input v-model="password" type="password" placeholder="Password" @keyup.enter="handleLogin" />
    <button @click="handleLogin">Login</button>
    <div v-if="error" id="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { login, ApiError } from "@/services/auth";
import { RouteNames } from "@/router/routeNames";

const router = useRouter();
const route = useRoute();

const username = ref("");
const password = ref("");
const error = ref("");

async function handleLogin() {
  error.value = "";
  try {
    await login({ username: username.value, password: password.value });

    const redirect = route.query.redirect as string | undefined;
    await router.push(
      redirect
        ? decodeURIComponent(redirect)
        : { name: RouteNames.ADMIN, params: { lang: route.params.lang } },
    );
  } catch (err) {
    if (err instanceof ApiError && err.isUnauthorized) {
      error.value = "Invalid username or password.";
    } else {
      error.value = "Something went wrong. Please try again.";
    }
  }
}
</script>