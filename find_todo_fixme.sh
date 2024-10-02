#!/usr/bin/env bash
set -uo pipefail  # No -e to support write to canary file after cancel

. "$EXTENSION_PATH/shared.sh"

# If we only have one directory to search, invoke commands relative to that directory
PATHS=("$@")
SINGLE_DIR_ROOT=''
if [ ${#PATHS[@]} -eq 1 ]; then
  SINGLE_DIR_ROOT=${PATHS[0]}
  PATHS=()
  cd "$SINGLE_DIR_ROOT" || exit
fi

# Get the search pattern from the environment variable or use a default
SEARCH_PATTERN=${FIND_TODO_FIXME_SEARCH_PATTERN:-'(TODO|FIXME|HACK|FIX):\s'}

# Set up the ripgrep command
# shellcheck disable=SC2207
RG_PREFIX=(rg
    --column
    --hidden
    $(array_join ${USE_GITIGNORE_OPT+"${USE_GITIGNORE_OPT[@]}"})
    --line-number
    --no-heading
    --color=always
    --smart-case
    --colors 'match:fg:green'
    --colors 'path:fg:white'
    --colors 'path:style:nobold'
    --glob "'!**/.git/'"
    $(array_join "${GLOBS[@]+"${GLOBS[@]}"}")
)
if [[ ${#TYPE_FILTER_ARR[@]} -gt 0 ]]; then
    RG_PREFIX+=("$(printf "%s " "${TYPE_FILTER_ARR[@]}")")
fi
RG_PREFIX+=(" 2> /dev/null")

PREVIEW_ENABLED=${FIND_TODO_FIXME_PREVIEW_ENABLED:-1}
PREVIEW_COMMAND=${FIND_TODO_FIXME_PREVIEW_COMMAND:-'bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid'}
PREVIEW_WINDOW=${FIND_TODO_FIXME_PREVIEW_WINDOW_CONFIG:-'right:border-left:50%:+{2}+3/3:~3'}

PREVIEW_STR=()
if [[ "$PREVIEW_ENABLED" -eq 1 ]]; then
    PREVIEW_STR=(--preview "$PREVIEW_COMMAND" --preview-window "$PREVIEW_WINDOW")
fi

RG_PREFIX_STR=$(array_join "${RG_PREFIX+"${RG_PREFIX[@]}"}")
FZF_CMD="${RG_PREFIX+"${RG_PREFIX[@]}"} '$SEARCH_PATTERN' $(array_join "${PATHS[@]+"${PATHS[@]}"}")"

# Check if there are any TODO/FIXME comments
if ! eval "$FZF_CMD" | grep -q .; then
    echo "No TODO/FIXME comments found in the project."
    echo "1" > "$CANARY_FILE"
    exit 1
fi

# Use fzf to select multiple TODO/FIXME comments
SELECTED=$(FZF_DEFAULT_COMMAND="$FZF_CMD" \
  fzf --ansi \
      --multi \
      --cycle \
      --delimiter : \
      --bind "change:reload:sleep 0.1; $FZF_CMD | rg -i {q} || true" \
      ${PREVIEW_STR[@]+"${PREVIEW_STR[@]}"})

if [[ -z "$SELECTED" ]]; then
    echo canceled
    echo "1" > "$CANARY_FILE"
    exit 1
else
    # Process each selected item
    while IFS= read -r line; do
        IFS=: read -ra VAL <<< "$line"
        FILENAME=${VAL[0]}:${VAL[1]}:${VAL[2]}
        if [[ -n "$SINGLE_DIR_ROOT" ]]; then
            echo "$SINGLE_DIR_ROOT/$FILENAME" >> "$CANARY_FILE"
        else
            echo "$FILENAME" >> "$CANARY_FILE"
        fi
    done <<< "$SELECTED"
fi