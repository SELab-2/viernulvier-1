import { ref, watchEffect } from "vue";

function getInitialDark(): boolean {
  const stored = localStorage.getItem("viernulvier-dark");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const isDark = ref(getInitialDark());

watchEffect(() => {
  const htmlEl = document.documentElement;
  if (isDark.value) {
    htmlEl.classList.add("dark");
  } else {
    htmlEl.classList.remove("dark");
  }
  localStorage.setItem("viernulvier-dark", String(isDark.value));
});

export function useDarkMode() {
  return { isDark };
}