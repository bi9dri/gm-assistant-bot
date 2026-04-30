# Visual Regression Test (VRT)

`frontend/` の見た目崩れを検出する。Playwright で screenshot を撮り、
ベースラインと pixel diff を比較する。バックエンド / Discord OAuth は MSW でモックする。

親 issue: [#141](https://github.com/bi9dri/gm-assistant-bot/issues/141)

## レイアウト

```
frontend/
├─ playwright.config.ts          # chromium 単一 project, retries / timeout / 閾値
├─ public/mockServiceWorker.js   # `bunx msw init` で生成済み (Service Worker)
└─ tests/vrt/
   ├─ __screenshots__/           # baseline png (Git にコミットする)
   ├─ msw/
   │  ├─ handlers.ts             # MSW http ハンドラ (将来 /api/* をここに追加)
   │  └─ fixture.ts              # Playwright fixture: page goto 前に MSW worker を起動
   └─ *.vrt.ts                   # 個別 VRT テスト
```

## 実行

```sh
bun run --filter gm-assistant-bot-frontend test:vrt              # 実行 (diff 検出)
bun run --filter gm-assistant-bot-frontend test:vrt -- --update-snapshots  # baseline 更新
```

`--bun` を**付けない** — bun ランタイムは Playwright と非互換 (node 呼び出しまで shim される) のためハングする。

## 命名規約

- ファイル拡張子: `*.vrt.ts` (`*.test.ts` / `*.spec.ts` を避ける ため bun test に拾われない)
- baseline png: `tests/vrt/__screenshots__/<file>.vrt.ts/<name>.png`

## OS 差分

screenshot は OS 由来の font hinting で簡単にずれる。CI と同じ Linux で baseline を更新する
(将来 Phase 2 で Docker 化予定)。
