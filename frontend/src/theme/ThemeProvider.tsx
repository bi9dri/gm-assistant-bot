import { type PropsWithChildren, createContext, useContext, useState } from "react";

import { type THEME, THEMES } from ".";

const THEME_LOCAL_STORAGE_KEY = "theme";

// SSR では window / localStorage が無いので既定値 "light" を返し、クライアントで
// 保存済みテーマを復元する。
function readInitialTheme(): THEME {
  if (typeof window === "undefined") return "light";
  let theme: THEME = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const storedTheme = localStorage.getItem(THEME_LOCAL_STORAGE_KEY);
    if (storedTheme && THEMES.includes(storedTheme as THEME)) {
      theme = storedTheme as THEME;
    }
  } catch {
    // ignore
  }
  return theme;
}

const ThemeContext = createContext<{ theme: THEME; setTheme: React.Dispatch<THEME> }>({
  theme: "light",
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useState<THEME>(readInitialTheme);
  const onSetTheme = (newTheme: THEME) => {
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_LOCAL_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  };
  const value = { theme, setTheme: onSetTheme };
  return (
    <ThemeContext.Provider value={value}>
      <div data-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
