import { createContext, useContext, useState, type PropsWithChildren } from "react";
import { THEMES, type THEME } from ".";

const THEME_LOCAL_STORAGE_KEY = "theme";
let initialTheme: THEME = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
try {
    const storedTheme = localStorage.getItem(THEME_LOCAL_STORAGE_KEY);
    if (storedTheme && THEMES.includes(storedTheme as THEME)) {
        initialTheme = storedTheme as THEME;
    }
    console.log("Initial theme:", initialTheme);
} catch {
    // ignore
}

const ThemeContext = createContext<{theme: THEME; setTheme: React.Dispatch<THEME>}>({theme: initialTheme, setTheme: () => {}});

export const ThemeProvider = ({ children }: PropsWithChildren) => {
    const [theme, setTheme] = useState<THEME>(initialTheme);
    const onSetTheme = (newTheme: THEME) => {
        setTheme(newTheme);
        try {
            localStorage.setItem(THEME_LOCAL_STORAGE_KEY, newTheme);
        } catch {
            // ignore
        }
    }
    const value = { theme, setTheme: onSetTheme };
    return <ThemeContext.Provider value={value}><div data-theme={theme}>{children}</div></ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
