---
id: task-12
title: Fix single file selection parsing for git status and TODO/FIXME commands
status: Done
assignee: []
created_date: '2025-09-09 08:15'
labels: []
dependencies: []
---

## Description

Single file selection in git status and TODO/FIXME commands failed because output.trim() was removing the empty query line that fzf outputs with --print-query, causing incorrect parsing of selected files

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] Git status single file selection works correctly
- [x] TODO/FIXME single file selection works correctly
- [x] Output parsing correctly handles fzf --print-query format
- [x] Implementation matches working find-files.ts pattern
<!-- AC:END -->

## Implementation Notes

Fixed by removing .trim() from output processing in both git-status.ts and find-todo-fixme.ts to match the working find-files.ts implementation. The issue was that fzf with --print-query always outputs the query on the first line (even if empty), followed by selected items. Using .trim() was incorrectly removing this structure.
