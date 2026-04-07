import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/services/auth", () => ({
  getCurrentlyLoggedInAdmin: vi.fn().mockResolvedValue({
    id: 1,
    username: "admin",
    profile_picture: null,
  }),
}));

describe("stores/auth.ts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("fetches and stores the current admin", async () => {
    const store = useAuthStore();
    await store.fetchAdmin();
    expect(store.admin).toEqual({ id: 1, username: "admin", profile_picture: null });
  });

  it("clears the admin", async () => {
    const store = useAuthStore();
    await store.fetchAdmin();
    store.clearAdmin();
    expect(store.admin).toBeNull();
  });
});