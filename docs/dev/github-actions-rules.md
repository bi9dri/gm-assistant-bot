# GitHub Actions Security Rules

## Overview

This document defines security rules for GitHub Actions workflows to protect against supply chain attacks.

---

## Core Rule: Pin External Actions to Full Commit SHA

**CRITICAL:** All external actions MUST be pinned using full commit SHA hash, NOT tags or branches.

### ❌ PROHIBITED (Vulnerable to supply chain attacks)
```yaml
- uses: actions/checkout@v6
- uses: actions/checkout@main
- uses: oven-sh/setup-bun@v2
```

### ✅ REQUIRED (Secure)
```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
- uses: oven-sh/setup-bun@3d267786b128fe76c2f16a390aa2448b815359f3  # v2.1.2
```

### Why?
- Tags and branches are mutable — attackers can replace them with malicious code
- Commit SHA is immutable — ensures exact version is used
- Comment with version number maintains readability

---

## Version Update Procedure

When updating action versions:

1. Navigate to the action's GitHub releases page
2. Find the desired release tag
3. Click on the tag to view the commit
4. Copy the full commit SHA (40 characters)
5. Update the workflow file with the SHA and version comment:
   ```yaml
   - uses: owner/action@<FULL_COMMIT_SHA>  # vX.Y.Z
   ```

### Example
To update `actions/checkout` to v6.0.2:
1. Go to https://github.com/actions/checkout/releases
2. Find "v6.0.2" release
3. Click tag → copy commit SHA: `de0fac2e4500dabe0009e67214ff5f5447ce83dd`
4. Update:
   ```yaml
   - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
   ```

---

## Current Workflows and Actions

### `deploy-frontend.yml`
- **actions/checkout** — `@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2)
- **oven-sh/setup-bun** — `@3d267786b128fe76c2f16a390aa2448b815359f3` (v2.1.2)
- **actions/upload-pages-artifact** — Version to be verified
- **actions/deploy-pages** — Version to be verified

### `ci.yml` (New)
- **actions/checkout** — `@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2)
- **oven-sh/setup-bun** — `@3d267786b128fe76c2f16a390aa2448b815359f3` (v2.1.2)

---

## Security Rationale

### Attack Scenario
1. Attacker compromises action maintainer account
2. Attacker force-pushes malicious code to tag `v2.0.0`
3. Workflows using `@v2.0.0` or `@v2` automatically pull malicious code
4. Attacker gains access to secrets, can modify releases, inject backdoors

### Protection Mechanism
- Commit SHA is cryptographically immutable
- Even if tag is moved, SHA reference remains unchanged
- Workflow continues using the verified, secure version

---

## Review Checklist

Before merging workflow changes:

- [ ] All external actions use full commit SHA (40 characters)
- [ ] Each SHA has version comment for readability
- [ ] No uses of `@vX`, `@vX.Y`, `@main`, `@master`
- [ ] SHAs verified against official release pages

---

## References

- [GitHub Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)
- [Dependabot for Actions](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/keeping-your-actions-up-to-date-with-dependabot)
