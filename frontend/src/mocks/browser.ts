import { setupWorker } from "msw/browser";

// 暫定: handlers は tests/vrt/msw/ 配下にあるが #151 で src/mocks/handlers/ 配下へ移動予定。
// 移動完了までは production code が tests/ を import する layering 違反だが、
// VITE_MSW_ENABLED gate + dynamic import の tree-shake によって prod bundle には載らない
import { handlers } from "../../tests/vrt/msw/handlers";

export const worker = setupWorker(...handlers);
