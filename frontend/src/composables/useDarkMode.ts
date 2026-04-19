/**
 * @file Singleton dark-mode composable.
 *
 * Manages the `dark` class on `<html>` and persists the user's preference
 * to `localStorage`. Because the reactive state and side-effect live at
 * module scope, all consumers share the same instance — toggling dark mode
 * on any page is immediately reflected everywhere.
 *
 * Usage:
 * ```ts
 * const { isDark, toggleDark } = useDarkMode();
 * ```
 */

import { ref, watchEffect } from "vue";

/** `localStorage` key used to persist the dark-mode preference. */
const STORAGE_KEY = "viernulvier-dark";

/**
 * Resolves the initial dark-mode state.
 *
 * Priority:
 * 1. Persisted value in `localStorage` (explicit user choice).
 * 2. OS-level `prefers-color-scheme: dark` media query.
 *
 * @returns `true` if dark mode should be active on first load.
 */
export function getInitialDark(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    return stored === "true";
  } else {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
}

/**
 * Singleton reactive ref shared across all composable consumers.
 * Mutating this value automatically triggers the `watchEffect` below.
 */
const isDark = ref<boolean>(getInitialDark());

/**
 * Module-level side effect — runs once on first import, then re-runs
 * whenever `isDark` changes.
 *
 * - Adds/removes the `dark` class on `<html>` (consumed by Tailwind and
 *   the design-token overrides in `design-tokens.css`).
 * - Persists the new preference to `localStorage`.
 */
watchEffect(() => {
  document.documentElement.classList.toggle("dark", isDark.value);
  localStorage.setItem(STORAGE_KEY, String(isDark.value));
});

/**
 * Composable that exposes the shared dark-mode state and a toggle helper.
 *
 * Because the underlying `ref` is a module-level singleton, calling
 * `useDarkMode()` in multiple components always returns the same `isDark`
 * reference — there is no risk of the state going out of sync across views.
 *
 * @returns An object containing:
 * - `isDark` — reactive boolean; `true` when dark mode is active.
 * - `toggleDark` — flips `isDark` between `true` and `false`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useDarkMode } from "@/composables/useDarkMode";
 *
 * const { isDark, toggleDark } = useDarkMode();
 * </script>
 *
 * <template>
 *   <button @click="toggleDark">
 *     {{ isDark ? "Switch to light" : "Switch to dark" }}
 *   </button>
 * </template>
 * ```
 */
export function useDarkMode() {
  return {
    isDark,
    toggleDark: () => { isDark.value = !isDark.value; },
  };
}

/** @internal For testing only — resets singleton state from current localStorage. */
export function __reset() {
  isDark.value = getInitialDark();
}