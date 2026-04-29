import { setupWorker } from "msw/browser";

import { handlers } from "../../tests/vrt/msw/handlers";

export const worker = setupWorker(...handlers);
