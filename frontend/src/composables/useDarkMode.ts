import { ref, watchEffect } from "vue";

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

export function useDarkMode() {
  const isDark = ref(getInitialDark());

  watchEffect(() => {
    const htmlEl = document.documentElement;

    htmlEl.classList.toggle("dark", isDark.value);

    localStorage.setItem("viernulvier-dark", String(isDark.value));
  });

  return { isDark };
}