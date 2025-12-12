import { THEMES, type THEME } from ".";
import { ThemeIcon } from "./ThemeIcon";
import { useTheme } from "./ThemeProvider";

export const ThemeSwichMenu = () => {
    const { theme, setTheme } = useTheme();

    const onClick = (newTheme: THEME) => {
        console.log("clicked theme:", newTheme);
        setTheme(newTheme);
    };
    
    return (
        <ul className="menu w-full h-40 bg-base-200 overflow-y-scroll flex flex-col flex-nowrap">
            {THEMES.map((t) => (
                <li key={t}>
                    <button key={t} onClick={() => onClick(t)} disabled={theme === t} className={(theme === t ? "btn-disabled" : "btn-ghost") + " btn"}>
                        <ThemeIcon theme={t} size={32} />
                        <div className="grow text-start">{t}</div>
                    </button>
                </li>
            ))} 
        </ul>
    );
};
