import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { LuLayoutTemplate, LuPanelLeftOpen } from "react-icons/lu";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ThemeIcon } from "@/theme/ThemeIcon";
import { ThemeSwichMenu } from "@/theme/ThemeSwichMenu";
import { Link } from "@tanstack/react-router";
import { ToastProvider } from "@/toast/ToastProvider";
import { SiSessionize } from "react-icons/si";

export const Route = createRootRoute({
  component: () => (
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
            <main className="p-4">
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
      </ToastProvider>
    </ThemeProvider>
  ),
});
