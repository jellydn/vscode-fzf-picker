---
id: task-1
title: Fix empty git preview for untracked files
status: Done
assignee:
  - '@claude'
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies: []
---

## Description

Git preview shows empty content when selecting untracked files (files not yet added to git) in the git status picker. This happens because the default preview command 'git diff' doesn't work for untracked files.

## Acceptance Criteria

- [x] Untracked files show their content in preview pane
- [x] Tracked files continue to show git diff as before
- [x] Preview command is configurable for both tracked and untracked files
- [x] No performance degradation in git status picker

## Implementation Plan

1. Analyze current git preview implementation in git-status.ts
2. Create a helper function to detect if a file is tracked by git
3. Implement smart preview command that handles both tracked and untracked files
4. Update the default preview command to use the smart logic
5. Test with various file states (tracked, untracked, modified, deleted)

## Implementation Notes

Implemented a smart preview command in git-status.ts that detects whether a file is tracked or untracked. For tracked files, it shows git diff as before. For untracked files, it shows the file content using bat (with syntax highlighting) or head as fallback. The command also handles edge cases like binary files and limits preview to 500 lines to prevent hanging on large files.

Modified files:
- src/commands/git-status.ts: Updated defaultPreviewCommand with smart logic

Implemented a cross-platform compatible preview command in git-status.ts that handles both tracked and untracked files. The solution uses the command: 'git diff --color=always -- {} 2>/dev/null || cat {}'. For tracked files with changes, it shows git diff as before. For untracked files or files without changes, it falls back to showing file content using cat. This approach is more efficient (single git diff call) and works across different operating systems including Windows.

Modified files:
- src/commands/git-status.ts: Updated defaultPreviewCommand with cross-platform compatible logic
