import type { THEME } from ".";
import { useTheme } from "./ThemeProvider";

interface Props {
    theme?: THEME;
    size?: number;
}

export const ThemeIcon = ({ theme, size = 24 }: Props) => {
    const { theme: currentTheme } = useTheme();
    if (!theme) {
        theme = currentTheme;
    }

    return (
        <svg xmlns="http://www.w3.org/2000/svg" data-theme={theme} viewBox="0 0 25 25" width={size} height={size}>
            <rect className="fill-base-200" x="1" y="1" width="23" height="23" rx="2" />
            <rect className="fill-primary" x="2" y="2" width="10" height="10" rx="1" />
            <rect className="fill-secondary" x="13" y="2" width="10" height="10" rx="1" />
            <rect className="fill-accent" x="2" y="13" width="10" height="10" rx="1" />
            <rect className="fill-neutral" x="13" y="13" width="10" height="10" rx="1" />
        </svg>
    );
};
