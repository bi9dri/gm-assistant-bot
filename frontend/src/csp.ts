// Content-Security-Policy (`__root.tsx` の meta と `public/_headers` で共有)。
// Start の SSR はハイドレーション用インライン script を吐く (内容はビルドごとに変わる
// ためハッシュ許可は不可)。nonce 配線までは 'unsafe-inline' で許す。
export const CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com; connect-src 'self' https://gm-assistant-bot-api.bidri.dev https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com; img-src 'self' data: blob: https://cdn.discordapp.com; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:";
