import type { HttpHandler } from "msw";

// 空配列は意図: smoke.spec.ts は静的レンダリングのみで API を叩かない。
// per-feature 分割パターン (src/mocks/handlers/<feature>.ts) と per-test override は #151 / #152 で実装
export const handlers: HttpHandler[] = [];
