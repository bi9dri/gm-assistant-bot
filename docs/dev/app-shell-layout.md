# App Shell Layout (full-height ビューの高さ連鎖)

ステップリスト編集 / 実行ビューのような「カラムごとに独立スクロールする全画面ビュー」は、
`html` → `#app` → `.drawer` → `.drawer-content` → `main` → ビュールートまで高さが
viewport に固定されて初めて成立する。この連鎖は過去に 2 箇所で切れていた
(症状: ページ全体が 1 本のスクロールになり、カラム内 `overflow-y-auto` が効かない)。
再発防止のため、切れやすいポイントと理由を記録する。

## 1. daisyUI drawer は CSS Grid — grid の auto 行では `height: 100%` が解決されない

daisyUI の `.drawer` は `display: grid` で、`.drawer-content` はその grid item。
grid の行トラックは `auto`(コンテンツサイズ)なので、item 側の `height: 100%` は
解決されず content 高さに膨張し、そこから下の `flex: 1` / `min-height: 0` /
`overflow-y-auto` がすべて無効化される。

対策 (`frontend/src/styles.css`): `.drawer-content { height: 100dvh }` と
**viewport 単位で固定**する。親の % に依存しないため grid のトラックサイズ規則の
影響を受けない。

## 2. TanStack Router: 子ルートの `beforeLoad` context はルートの match からは見えない

各ルートは `beforeLoad: () => ({ layoutMode: "full-height" })` で `main` の
レイアウトモードを宣言するが、`useRouteContext({ from: "__root__" })` は
**ルートルート自身の match の context** を返すため、子ルートが `beforeLoad` で
足した値は含まれない(context は親→子に merge され、逆方向には流れない)。

対策 (`frontend/src/routes/__root.tsx`): `useRouterState` で `state.matches` を
最深マッチから遡り、最初に見つかった `layoutMode` を採用する。

## 検証方法

クラスの見た目では判定できない(`overflow-y-auto` が付いていても親が膨張していれば
スクロールしない)。Playwright で実測するのが確実:

- `document.documentElement.scrollHeight > clientHeight` → **ページ全体スクロールが
  発生していたら連鎖が切れている**
- 各カラムの `scrollHeight > clientHeight` → カラム内スクロールが成立している

`verify` スキル / `bun <script>` + `playwright-core` + `/opt/pw-browsers/chromium` で
dev サーバー (`bun run --bun dev`) に対して計測できる。IndexedDB のシードは
Vite dev サーバー経由で `await import("/src/db/index.ts")` を `page.evaluate` 内で
実行すると手早い。
