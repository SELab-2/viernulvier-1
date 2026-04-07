import { defineStore } from "pinia";
import { ref } from "vue";
import { getCurrentlyLoggedInAdmin } from "@/services/auth";
import type { Admin } from "@viernulvier/shared";

export const useAuthStore = defineStore("auth", () => {
  const admin = ref<Admin | null>(null);

  async function fetchAdmin() {
    admin.value = await getCurrentlyLoggedInAdmin();
  }

  function clearAdmin() {
    admin.value = null;
  }

  return { admin, fetchAdmin, clearAdmin };
});