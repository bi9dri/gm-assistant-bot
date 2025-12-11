import indexHtml from "./index.html";

const server = Bun.serve({
  port: process.env.PORT ?? 3001,
  routes: {
    "/": indexHtml,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Web app running at http://localhost:${server.port}`);
