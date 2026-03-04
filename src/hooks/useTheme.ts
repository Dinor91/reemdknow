import { useState, useEffect } from "react";

const THEME_KEY = "admin_theme";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch { /* ignore */ }

    // Clean up dark mode when component unmounts (leaving admin)
    return () => {
      root.classList.remove("dark");
    };
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return { isDark, toggleTheme };
}
