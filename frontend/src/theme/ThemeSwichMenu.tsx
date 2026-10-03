import { useEffect, useState } from "react";

import { type THEME, THEMES } from ".";
import { ThemeIcon } from "./ThemeIcon";
import { useTheme } from "./ThemeProvider";

export const ThemeSwichMenu = () => {
  const { theme, setTheme } = useTheme();
  // SSR は常に "light" で描画するため、初回 render をテーマ非依存に揃えて
  // hydration mismatch を避け、mount 後に正しい選択状態を付ける。
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const onClick = (newTheme: THEME) => {
    console.log("clicked theme:", newTheme);
    setTheme(newTheme);
  };

  return (
    <ul className="menu w-full h-40 bg-base-200 overflow-y-scroll flex flex-col flex-nowrap">
      {THEMES.map((t) => (
        <li key={t}>
          <button
            key={t}
            onClick={() => onClick(t)}
            disabled={mounted && theme === t}
            className={(mounted && theme === t ? "btn-disabled" : "btn-ghost") + " btn"}
          >
            <ThemeIcon theme={t} size={32} />
            <div className="grow text-start">{t}</div>
          </button>
        </li>
      ))}
    </ul>
  );
};
