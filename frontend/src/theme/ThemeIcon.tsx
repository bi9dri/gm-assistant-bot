import type { THEME } from ".";

interface Props {
  theme?: THEME;
  size?: number;
}

export const ThemeIcon = ({ theme, size = 24 }: Props) => {
  // 一覧用 swatch (theme 指定あり) だけ data-theme を出す。現在テーマの
  // プレビュー (指定なし) は Provider の data-theme を継承する。
  // SSR と初回 render で食い違う属性を出さないことで hydration mismatch を避ける。
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 25"
      width={size}
      height={size}
      {...(theme === undefined ? {} : { "data-theme": theme })}
    >
      <rect className="fill-base-200" x="1" y="1" width="23" height="23" rx="2" />
      <rect className="fill-primary" x="2" y="2" width="10" height="10" rx="1" />
      <rect className="fill-secondary" x="13" y="2" width="10" height="10" rx="1" />
      <rect className="fill-accent" x="2" y="13" width="10" height="10" rx="1" />
      <rect className="fill-neutral" x="13" y="13" width="10" height="10" rx="1" />
    </svg>
  );
};
