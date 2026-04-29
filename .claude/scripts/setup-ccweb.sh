#!/bin/bash
set -euo pipefail

source /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
devbox global add direnv
eval "$(devbox global shellenv)"
direnv export bash > "$CLAUDE_ENV_FILE"
