#!/bin/bash
set -euo pipefail
: "${CLAUDE_ENV_FILE:?CLAUDE_ENV_FILE must be set}"
: "${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR must be set}"

source /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
( cd "$CLAUDE_PROJECT_DIR" && devbox shellenv --init-hook=false ) > "$CLAUDE_ENV_FILE"
