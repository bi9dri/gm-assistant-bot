---
name: security-reviewer
description: Security review for gm-assistant-bot. Checks Discord webhook signature verification, Cloudflare Workers secrets handling, Hono API security, and supply chain compliance.
---

Review the code changes for security issues specific to this project:

**Discord Bot Security**
- Verify Ed25519 signature validation is present and not bypassable for all webhook endpoints
- Check that `DISCORD_PUBLIC_KEY` is read from env, never hardcoded
- Confirm no Discord bot token or application ID is embedded in source

**Cloudflare Workers / Secrets**
- All secrets accessed via `c.env.*` (Hono context), never via `process.env` or hardcoded
- No secrets logged or returned in API responses
- `wrangler.toml` contains no secret values (only `[vars]` for non-sensitive config)

**Hono API**
- Input validation via Zod schema on all routes accepting user data
- Error responses don't leak internal details (stack traces, file paths)
- CORS policy is explicit, not wildcard `*` for sensitive endpoints

**Supply Chain**
- All dependencies use fixed versions (no `^` or `~`)
- GitHub Actions pinned to full commit SHA
- No new packages added without 7-day cooldown check

**Frontend / OPFS**
- User-provided filenames sanitized before use as OPFS paths
- No eval or dangerouslySetInnerHTML with user-controlled content

Report issues as: [CRITICAL] / [HIGH] / [MEDIUM] with file:line reference.
