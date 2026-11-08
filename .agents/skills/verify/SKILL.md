---
name: verify
description: Verify frontend UI changes end-to-end by driving Storybook stories with Playwright + the pre-installed Chromium. Use after changing flow editor / node UI components to observe real runtime behavior (clicks, drags, renders) instead of relying on unit tests alone.
---

# Verify frontend UI changes via Storybook + Playwright

## Launch Storybook (dev server)

```bash
cd frontend && nohup pnpm storybook --ci > /tmp/storybook.log 2>&1 &
# wait until: curl -s -o /dev/null -w "%{http_code}" http://localhost:6006/iframe.html?id=<story-id>&viewMode=story  => 200 (~6s)
```

Gotchas:

- Storybook runs on Node (Vite+ toolchain).
- Storybook writes `frontend/debug-storybook.log` on errors — delete it before committing.

## Story URLs

Stories live in `frontend/test/stories/`. Direct iframe URL (no manager UI):
`http://localhost:6006/iframe.html?id=<kebab-title>--<story>&viewMode=story`
e.g. `flow-steplistpanel--default`. Stories seed the Zustand stores themselves,
so no IndexedDB/app setup is needed — this is the cheapest handle on flow-editor UI.

## Drive with Playwright

Write a script and run it with `node <script>.ts` importing from `@playwright/test`
(resolved from `frontend/`, so run with cwd=frontend or keep the script's imports resolvable):

```ts
import { chromium } from "@playwright/test";
// The repo pins a @playwright/test version whose browser build may not match the
// pre-installed set — always pass executablePath:
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
```

Gotchas:

- `page.waitForSelector("li")` matches Storybook's _hidden_ error-template
  `<li>Please check the Storybook config.</li>` and times out. Wait for real
  content instead: `page.getByText("<known row title>").waitFor()`.
- dnd-kit's PointerSensor has `activationConstraint: { distance: 5 }` — after
  `mouse.down()`, make a small move (>5px) first, then move to the target in
  steps, then `mouse.up()`. `keyboard.press("Escape")` mid-drag cancels.

## Running the repo's VRT suite locally (remote/sandbox environments)

`pnpm --filter gm-assistant-bot-frontend test:vrt` needs Playwright's own browser revisions. If the
pinned @playwright/test expects a revision the environment doesn't have
(`Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-<rev>/...`),
shim it instead of downloading (`playwright install` is blocked/unnecessary):

```bash
# full chromium: layout matches across revisions — a directory symlink suffices
ln -sfn /opt/pw-browsers/chromium-<have> /opt/pw-browsers/chromium-<want>
# headless shell: layout differs (chrome-linux/headless_shell vs
# chrome-headless-shell-linux64/chrome-headless-shell) — bridge both names
mkdir -p /opt/pw-browsers/chromium_headless_shell-<want>
ln -sfn /opt/pw-browsers/chromium_headless_shell-<have>/chrome-linux \
  /opt/pw-browsers/chromium_headless_shell-<want>/chrome-headless-shell-linux64
ln -sfn headless_shell \
  /opt/pw-browsers/chromium_headless_shell-<have>/chrome-linux/chrome-headless-shell
```

Storybook stories must be built first (`pnpm --filter gm-assistant-bot-frontend build-storybook`); the
vite dev server on :3000 is started by the Playwright webServer config.
