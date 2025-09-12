---
id: task-13
title: Make TODO/FIXME commands show relative paths like other fzf commands
status: Done
assignee: []
created_date: '2025-09-09 10:01'
labels: []
dependencies: []
---

## Description

The TODO/FIXME command was displaying full absolute paths in its results, which was inconsistent with other fzf commands that show relative paths. This made the output harder to read and inconsistent with the rest of the extension's user interface.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TODO/FIXME command displays relative paths instead of absolute paths,Path display is consistent with other fzf commands like git status,Results are more readable and follow project conventions
<!-- AC:END -->

## Implementation Notes

