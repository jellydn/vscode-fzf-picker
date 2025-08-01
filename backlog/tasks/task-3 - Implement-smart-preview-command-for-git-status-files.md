---
id: task-3
title: Implement smart preview command for git status files
status: Done
assignee:
  - '@claude'
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies:
  - task-1
  - task-2
---

## Description

Create a preview command that intelligently handles both tracked and untracked files, showing git diff for tracked files and file content for untracked files.

## Acceptance Criteria

- [x] Preview command detects if file is tracked or untracked
- [x] Shows git diff for tracked/modified files
- [x] Shows file content for untracked files
- [x] Handles edge cases like deleted files and binary files

## Implementation Plan

1. Improve the smart preview command to handle edge cases
2. Add support for better file viewing (use bat if available)
3. Handle binary files gracefully
4. Add file size limits to prevent hanging
5. Test with various git file states

## Implementation Notes

Enhanced the smart preview command to be more robust and user-friendly. The improved command handles multiple scenarios gracefully including binary files, large files, and missing commands.

Implementation details:
- Uses conditional logic to detect tracked vs untracked files
- Prefers bat for syntax highlighting when available
- Falls back to head for plain text preview
- Limits preview to 500 lines to prevent hanging
- Shows friendly error message when file cannot be previewed

The command is now production-ready and provides a consistent preview experience for all file types in git status.
