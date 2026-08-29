import { HttpResponse, http, type RequestHandler } from "msw";

import { avatarDataUri } from "../avatar";

export const handlers: RequestHandler[] = [
  http.get("/api/profile", () =>
    HttpResponse.json({
      profile: {
        id: "vrt-bot-001",
        name: "VRT Bot",
        icon: avatarDataUri("#5865f2"),
      },
    }),
  ),
  http.get("/api/guilds", () =>
    HttpResponse.json({
      guilds: [
        {
          id: "vrt-guild-001",
          name: "VRT Guild Alpha",
          icon: avatarDataUri("#57f287"),
        },
        {
          id: "vrt-guild-002",
          name: "VRT Guild Bravo",
          icon: avatarDataUri("#fee75c"),
        },
      ],
    }),
  ),
];
