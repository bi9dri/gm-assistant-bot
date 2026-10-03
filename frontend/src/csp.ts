// Content-Security-Policy。HTML 応答の meta (`__root.tsx` の CspMeta) から出す。
// Start の SSR はハイドレーション用インライン script を吐くため、リクエストごとに
// 生成した nonce で許可する (内容はビルドごとに変わるためハッシュ許可は不可)。
export function buildContentSecurityPolicy(nonce: string): string {
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com https://www.googletagmanager.com; connect-src 'self' https://gm-assistant-bot-api.bidri.dev https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com; img-src 'self' data: blob: https://cdn.discordapp.com; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:`;
}
