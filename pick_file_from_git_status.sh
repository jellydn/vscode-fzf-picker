#!/bin/bash
set -uo pipefail

. "$EXTENSION_PATH/shared.sh"

PREVIEW_ENABLED=${PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED:-1}
PREVIEW_COMMAND=${PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND:-'git diff --color=always -- {}'}
PREVIEW_WINDOW=${PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG:-'right:50%:border-left'}
CANARY_FILE=${CANARY_FILE:-'/tmp/canaryFile'}

git_status=$(git status --porcelain)

if [[ -z "$git_status" ]]; then
    echo "No changes in the git repository."
    echo "1" > "$CANARY_FILE"
    exit 1
fi

PREVIEW_STR=()
if [[ "$PREVIEW_ENABLED" -eq 1 ]]; then
    PREVIEW_STR=(--preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW")
fi

selected_file=$(echo "$git_status" | \
    awk '{print $2}' | \
    fzf --cycle --multi \
        ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"})

if [[ -z "$selected_file" ]]; then
    echo "No file selected."
    echo "1" > "$CANARY_FILE"
    exit 1
else
    echo "$selected_file" > "$CANARY_FILE"
fi