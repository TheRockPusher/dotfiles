#!/usr/bin/env bash
set -euo pipefail

# Sync selected local Pi agent folders into this dotfiles repo.
# After running, review/commit/push with normal git commands.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_PI="${PI_HOME:-$HOME/.pi}"
DEST_PI="$SCRIPT_DIR/.pi"

folders=(
  "agent/extensions"
  "agent/skills"
  "agent/prompts"
)

if [[ ! -d "$SRC_PI" ]]; then
  echo "Source Pi directory not found: $SRC_PI" >&2
  exit 1
fi

mkdir -p "$DEST_PI/agent"

for folder in "${folders[@]}"; do
  src="$SRC_PI/$folder/"
  dest="$DEST_PI/$folder/"

  if [[ -d "$src" ]]; then
    mkdir -p "$dest"
    rsync -a --delete "$src" "$dest"
    echo "Synced $folder"
  else
    echo "Skipping missing folder: $src"
  fi
done

echo
echo "Done. Review changes with:"
echo "  cd '$SCRIPT_DIR'"
echo "  git status"
echo "  git diff"
