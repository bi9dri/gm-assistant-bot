import { HttpResponse, http, type RequestHandler } from "msw";

export const handlers: RequestHandler[] = [
  http.get("/api/profile", () =>
    HttpResponse.json({
      profile: {
        id: "vrt-bot-001",
        name: "VRT Bot",
        icon: "https://cdn.discordapp.com/embed/avatars/0.png",
      },
    }),
  ),
  http.get("/api/guilds", () =>
    HttpResponse.json({
      guilds: [
        {
          id: "vrt-guild-001",
          name: "VRT Guild Alpha",
          icon: "https://cdn.discordapp.com/embed/avatars/1.png",
        },
        {
          id: "vrt-guild-002",
          name: "VRT Guild Bravo",
          icon: "https://cdn.discordapp.com/embed/avatars/2.png",
        },
      ],
    }),
  ),
];
