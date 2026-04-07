import { ref, watchEffect } from "vue";

/**
 * Determines the initial theme preference from localStorage or system settings.
 * @returns {boolean} True if dark mode is preferred.
 */
function getInitialDark(): boolean {
  const stored = localStorage.getItem("viernulvier-dark");
  if (stored !== null) return stored === "true";

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  return false;
}

/**
 * Sets initial theme and returns a ref that automatically syncs 
 * the HTML class and localStorage upon change.
 * * Usage: const { isDark } = useDarkMode();
 */
export function useDarkMode() {
  const isDark = ref(getInitialDark());

  watchEffect(() => {
    const htmlEl = document.documentElement;

    htmlEl.classList.toggle("dark", isDark.value);

    localStorage.setItem("viernulvier-dark", String(isDark.value));
  });

  return { isDark };
}