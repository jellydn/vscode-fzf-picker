---
id: task-4
title: Fix preview command for files with complex names and special characters
status: In Progress
assignee:
  - '@claude'
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies: []
---

## Description

The preview command fails to work with files that have complex names containing spaces, hyphens, parentheses, and other special characters like 'backlog/tasks/task-5 - Implement-multi-factor-authentication-(MFA)-system.md'. Need to improve the file name escaping and quoting mechanism.

## Acceptance Criteria

- [ ] Preview works for files with spaces in names
- [ ] Preview works for files with hyphens and parentheses
- [ ] Preview works for files with mixed special characters
- [ ] Both tracked and untracked files preview correctly
- [ ] No syntax errors in shell commands

## Implementation Plan

1. Create test files with complex names to reproduce the issue\n2. Analyze the current shell command and identify escaping problems\n3. Research proper shell escaping techniques for complex file names\n4. Implement improved quoting mechanism\n5. Test with various file name patterns (spaces, hyphens, parentheses, special chars)\n6. Verify both tracked and untracked file previews work correctly
