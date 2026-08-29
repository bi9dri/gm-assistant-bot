/**
 * VRT 用のアバター画像。
 *
 * 実在の CDN URL を使うと、MSW が `onUnhandledRequest: "bypass"` で起動している
 * (`src/main.tsx`) ため画像だけがモックの外側に出て、取得がスクリーンショットに
 * 間に合うかどうかで snapshot が揺れる。単色の inline SVG にして描画を固定する。
 */
export const avatarDataUri = (color: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="${color}"/></svg>`,
  )}`;
