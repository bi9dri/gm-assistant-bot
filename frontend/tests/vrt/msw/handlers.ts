import type { HttpHandler } from "msw";

// VRT 用 MSW ハンドラのスキャフォールディング。
// 個別ルートが /api を叩くようになったら、ここに http.get(...) などを追加する。
export const handlers: HttpHandler[] = [];
