# Git Preview System

## Overview

The git preview system in vscode-fzf-picker provides a preview pane when browsing files in the git status picker. This document describes how the preview system works and how to configure it.

## How It Works

### Git Status File Picker

The git status file picker (`pickFilesFromGitStatus`) shows all files with git changes including:
- Modified files (M)
- Added files (A)
- Deleted files (D)
- Renamed files (R)
- Untracked files (??)

### Preview Implementation

The preview is implemented using fzf's `--preview` flag with these components:

1. **Preview Command**: Executes a shell command to generate preview content
2. **Preview Window**: Configures the preview pane position and size
3. **Preview Toggle**: Can be enabled/disabled via configuration

### File Status Detection

Files are categorized based on `git status --porcelain` output:
- First two characters indicate the file status
- `??` indicates untracked files
- Other codes indicate various tracked file states

## Configuration

### VSCode Settings

```json
{
  "fzf-picker.pickFileFromGitStatus.showPreview": true,
  "fzf-picker.pickFileFromGitStatus.previewCommand": "custom-preview-command",
  "fzf-picker.pickFileFromGitStatus.previewWindowConfig": "right:50%:border-left"
}
```

### Environment Variables

The git status picker reads these environment variables:
- `PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED`: "1" or "0"
- `PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND`: Preview command template
- `PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG`: fzf preview window config

## Preview Commands

### Default Behavior

The default preview command is `git diff --color=always -- {}` which:
- Shows colored diff for tracked files with changes
- Shows nothing for untracked files (limitation)

### Smart Preview Command

A smart preview command should:
1. Detect if the file is tracked or untracked
2. Use `git diff` for tracked files
3. Use `cat` or similar for untracked files
4. Handle special cases (deleted files, binary files, etc.)

Example smart preview command:
```bash
if git ls-files --error-unmatch {} 2>/dev/null; then
  git diff --color=always -- {}
else
  cat {}
fi
```

## Integration Points

1. **src/commands/git-status.ts**: Main implementation of git status picker
2. **src/extension.ts**: Configuration loading and terminal setup
3. **src/config.ts**: Configuration type definitions
4. **package.json**: VSCode settings contributions

## Known Issues

1. Untracked files show empty preview with default command
2. Preview settings not properly passed to terminal environment
3. No built-in smart preview command for mixed file types