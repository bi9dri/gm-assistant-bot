/// <reference types="@cloudflare/workers-types" />

import { createApp } from "./app.ts";

const app = createApp();

export default {
  async fetch(request: Request): Promise<Response> {
    return app.fetch(request);
  },
} satisfies ExportedHandler;
