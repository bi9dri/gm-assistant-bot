import { RPCHandler } from "@orpc/server/fetch";
import { onError } from "@orpc/server";
import { router } from "./orpc/router";

export function createApp() {
  const handler = new RPCHandler(router, {
    interceptors: [
      onError((error) => {
        console.error(error);
      })
    ],
  });

  return {
    fetch: async (request: Request) => {
      const context = {
        requestId: crypto.randomUUID(),
      };

      const { matched, response } = await handler.handle(request, {
        prefix: "/rpc",
        context,
      });

      if (matched) {
        return response;
      }

      return new Response("Not Found", { status: 404 });
    }
  };
}
