import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type ReactNode, useEffect } from "react";
import { FaDiscord } from "react-icons/fa";
import { LuLayoutTemplate, LuPanelLeftOpen } from "react-icons/lu";
import { SiSessionize } from "react-icons/si";

import { ThemeIcon } from "@/theme/ThemeIcon";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ThemeSwichMenu } from "@/theme/ThemeSwichMenu";
import { ToastProvider } from "@/toast/ToastProvider";

import stylesCss from "../styles.css?url";

declare global {
  function gtag(...args: unknown[]): void;
}

interface RootContext {
  layoutMode: "padded" | "full-height";
}

// hydrate 前に保存済みテーマを DOM に反映し、SSR "light" との
// hydration mismatch (描画が永久に light のままになる) を避ける。
// 対象は ThemeProvider の div のみ (div[data-theme])。ThemeIcon の swatch は
// テーマ名が固定で SSR/クライアント一致するため触らない。
// CSP 用 sha256 はこの文字列ちょうどのハッシュ。変えたら CSP も更新すること。
const THEME_INIT_SCRIPT = `try{var s=localStorage.getItem("theme"),t=s==="light"||s==="dark"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),d=document.querySelector("div[data-theme]");if(d)d.setAttribute("data-theme",t)}catch(e){}`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { title: "GM Assistant Bot" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com https://www.googletagmanager.com 'sha256-AEp7fPy6lEZUibfBm5EpRgaohKT5eg4TQXX2teIY7nY=' 'sha256-hbsV1Ahy61js7Yns1aXsjt/xVzufQpWRnzAA20ZJf/M='; connect-src 'self' https://gm-assistant-bot-api.bidri.dev https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com; img-src 'self' data: blob: https://cdn.discordapp.com; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:",
      },
      { name: "theme-color", content: "#000000" },
      { name: "description", content: "Web site created using create-tsrouter-app" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/logo192.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "stylesheet", href: stylesCss },
    ],
    scripts: [
      {
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-05FZ21G8P1",
      },
      {
        children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-05FZ21G8P1', { send_page_view: false });`,
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppChrome />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Scripts />
      </body>
    </html>
  );
}

function AppChrome() {
  // 各ルートの beforeLoad が返す layoutMode は子マッチの context にしか現れない
  // (useRouteContext({ from: "__root__" }) はルート自身の context を返すため見えない)。
  // 最深マッチから遡って最初に見つかった layoutMode を採用する。
  const layoutMode = useRouterState({
    select: (state) => {
      for (let i = state.matches.length - 1; i >= 0; i--) {
        const mode = (state.matches[i].context as Partial<RootContext> | undefined)?.layoutMode;
        if (mode !== undefined) return mode;
      }
      return "padded";
    },
  });
  const router = useRouter();

  useEffect(() => {
    gtag("event", "page_view", { page_path: window.location.pathname + window.location.search });
    return router.subscribe("onResolved", () => {
      gtag("event", "page_view", { page_path: window.location.pathname + window.location.search });
    });
  }, [router]);

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="drawer lg:drawer-open">
          <input id="drawer" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content">
            <nav className="navbar w-full bg-base-300">
              <label
                htmlFor="drawer"
                aria-label="メニューを開く"
                className="btn btn-square btn-ghost"
              >
                <LuPanelLeftOpen size="20" />
              </label>
              <h1 className="px-4">GM Assistant Bot</h1>
            </nav>
            <main className={layoutMode}>
              <Outlet />
            </main>
          </div>

          <div className="drawer-side is-drawer-close:overflow-visible">
            <label
              htmlFor="drawer"
              aria-label="メニューを閉じる"
              className="drawer-overlay"
            ></label>
            <aside className="flex min-h-full bg-base-200 flex-col items-start is-drawer-close:w-14 is-drawer-open:w-64">
              <ul className="menu w-full grow">
                <li>
                  <Link
                    to="/bot"
                    className="is-drawer-close:tooltip is-drawer-close:tooltip-right py-4"
                    data-tip="Discord Bot"
                  >
                    <FaDiscord size="20" />
                    <span className="is-drawer-close:hidden">Discord Bot</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/session"
                    className="is-drawer-close:tooltip is-drawer-close:tooltip-right py-4"
                    data-tip="セッション"
                  >
                    <SiSessionize size="20" />
                    <span className="is-drawer-close:hidden">セッション</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/template"
                    className="is-drawer-close:tooltip is-drawer-close:tooltip-right py-4"
                    data-tip="テンプレート"
                  >
                    <LuLayoutTemplate size="20" />
                    <span className="is-drawer-close:hidden">テンプレート</span>
                  </Link>
                </li>
              </ul>
              <ul className="menu w-full">
                <li>
                  <details>
                    <summary
                      className="is-drawer-close:tooltip is-drawer-close:tooltip-right py-4"
                      data-tip="テーマ"
                    >
                      <ThemeIcon size={20} />
                      <span className="is-drawer-close:hidden">テーマ</span>
                    </summary>
                    <ThemeSwichMenu />
                  </details>
                </li>
              </ul>
            </aside>
          </div>
        </div>
        {/* VRT では起動ボタンが全 baseline に写り込み、パネルの dynamic import が
            vite の依存再最適化とレースして毎回 fetch 失敗するのでマウントしない。 */}
        {import.meta.env.VITE_USE_MSW !== "true" && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}
