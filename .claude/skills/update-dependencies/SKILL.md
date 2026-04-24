---
name: update-dependencies
description: Update project dependencies following a structured process to ensure stability and security. This skill guides you through deep inspection, triage, and orchestrated updates of npm packages, with a focus on minimizing breaking changes and maintaining project integrity. Use this skill when you need to update dependencies while ensuring that the updates do not introduce breaking changes or security vulnerabilities.
disable-model-invocation: true
allowed-tools:
  - Read
  - Bash(bunx --bun ncu:*)
  - Bash(pinact:*)
  - Bash(bun audit)
  - Bash(osv-scanner:*)
  - Bash(gh:*)
  - Write
  - Edit
  - Bash(git:*)
  - Bash(bun install:*)
  - Bash(bun add:*)
  - Bash(bun info:*)
  - Bash(bun run:*)
  - Bash(grep:*)
  - Bash(head:*)
  - Bash(jq:*)
---

update dependencies with following instructions

use `jq` to parse JSON outputs and `grep` to filter for relevant information.

## Step 1: Deep Inspection & Security

1. Sync the environment with `bun install --frozen-lockfile`

2. To mitigate supply chain attacks, check for the latest versions released more than 7 days ago. Unless specified otherwise, check across all package managers.
```
# npm packages
bunx --bun ncu -c 7 -p bun -w

# GitHub Actions
pinact run -m 7
```

3. Gather security information. Security updates take priority and bypass the 7-day rule in Step 1.2.
```
bun audit
osv-scanner scan source -r .
```

## Step 2: Triage

For each package detected in Steps 1.2 and 1.3, do the following:

1. Resolve the repository URL with `bun info {package} repository.url`.
2. Check the tag naming convention (e.g., whether tags are prefixed with `v`) using `gh release list -R {repo} -L 3 --json tagName -q '.[].tagName'`, so that `{from}` and `{to}` can be passed in the correct format to the next command.
3. Estimate the impact on the project and triage each package into one of two classes using `gh api repos/{repo}/compare/{from}...{to} --jq '.commits[].commit.message' | grep -iE '(^[a-z]+(\([^)]+\))?!:|BREAKING[ _-]?CHANGE|^(deprecate|remove|drop)\b)' | head -30` (this grep detects conventional commit breaking markers and fallback keywords).

Batched: no impact on project code or behavior → processed together in a single PR
Individual: likely to have impact → processed in a dedicated PR per package

**Do not over-trust SemVer. Even patch updates can contain breaking changes. That said, major updates are unconditionally treated as Individual.**

## Step 3: Orchestrate Sub-Agents

Based on the triage results, delegate update work to sub-agents.

**All PRs, issues, and commit messages must be written in Japanese.**

### Batched updates

Pass the list of Batched packages (identified in Step 2) to a single sub-agent. The sub-agent must not re-triage; it operates on the provided list.

- Work in a single git worktree and produce a single PR.
- Update packages one at a time, running the following tests after each update:
  ```
  bun run --bun test && bun run --bun type-check && bun run --bun lint && bun run knip
  ```
- If tests pass, proceed to the next package (one commit per package).
- If tests fail, do not create a commit for that package. Revert to the pre-update state with `git stash && bun install --frozen-lockfile` and skip the package.
- Once all packages have been processed, create a PR containing only the packages that passed.
  - PR body: list of updated packages with before/after versions.
- On completion, report the list of skipped packages (package name, from/to versions, and a summary of the failure) to the orchestrator.

**The sub-agent must not attempt to fix skipped packages.** Report failures to the orchestrator so they can be re-triaged as Individual and handled with dedicated context.

### Re-triage by the orchestrator

When the Batched sub-agent reports skipped packages, re-triage them as Individual and add them to the Individual updates below.

### Individual updates

Packages classified as Individual (both originally Individual and those promoted from Batched) are processed by a dedicated sub-agent, git worktree, and PR per package.

- Address the following:
  - Fixes for failing tests.
  - Code improvements that leverage new or improved APIs.
  - Replacement of deprecated APIs.
- PR body: updated package, before/after versions, affected project code or behavior, summary of changes made, and rationale for any items left unaddressed.
- If tests still fail after 5 fix attempts (one attempt = one cycle of code change → `bun run --bun test && bun run --bun type-check && bun run --bun lint && bun run knip`), create a GitHub Issue and a Draft PR, then stop.
  - Title: `[Package Name] from vA to vB`
  - Body: error details, the upstream change causing the impact, affected project code or behavior, and approaches attempted.
  - After creating the Issue, create a Draft PR and include a link to the Issue in its description.