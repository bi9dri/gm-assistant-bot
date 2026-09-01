# PR Preview 環境

PR の動作確認用に、使い捨ての Cloudflare Worker を立てる仕組み。
本番フロントエンド (GitHub Pages) には影響しない。

- 作成: Actions の **PR Preview** を PR 番号入力で手動実行
- URL: `https://gm-assistant-bot-preview-pr-<PR番号>.<ランダム>.workers.dev` (実行後に PR へコメントされる)
- 破棄: **60 分で自動失効**。手動での削除は不要

構成ファイルは [`.github/workflows/preview.yml`](../../.github/workflows/preview.yml) と
[`frontend/preview/`](../../frontend/preview/)。Cloudflare の認証情報は不要で、
リポジトリ Secrets の設定も要らない。

## 仕組み

`wrangler deploy --temporary` は、認証情報がないときに Cloudflare の一時プレビュー
アカウントを作ってそこへデプロイする ([Claim deployments](https://developers.cloudflare.com/workers/platform/claim-deployments/))。
アカウントごと 60 分で失効するため、デプロイした Worker も一緒に消える。

## 設計上の選択

**Cloudflare Pages ではなく Workers Static Assets。** Pages は新規プロジェクトでは非推奨で、
バックエンドが既に Workers + wrangler なのでツールチェーンを増やさずに済む。

**API トークンを CI に置かない。** `--temporary` なら本番アカウントの認証情報を CI に
持たせずに済み、削除ジョブや期限切れ掃除のジョブも要らない。60 分という寿命は
「見たいときに実行して確認する」用途には足り、切れたら再実行すればよい。

**preview Worker が `/api` を本番 API へ中継する。** 本番 API の CORS 許可 origin は
本番フロントのみで、preview の origin (毎回変わる) を足すことはできない。同一オリジンで
中継すれば本番側は無変更で済み、`public/_headers` の CSP (`connect-src 'self'`) もそのまま通る。
ビルド時に `VITE_API_BASE_URL=""` を渡して相対 URL に切り替えている。

## 制約

- 寿命 60 分。URL はデプロイのたびに変わる (サブドメインがランダム)
- 一時アカウントのため Cloudflare の Bot 対策が挟まり、初回アクセスでチャレンジ画面が
  出ることがある。通常のブラウザからは通過できる
- preview から叩く API は**本番**。Discord への操作は実アカウントに反映される
