---
id: task-4
title: Fix preview command for files with complex names and special characters
status: Done
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

- [x] Preview works for files with spaces in names
- [x] Preview works for files with hyphens and parentheses
- [x] Preview works for files with mixed special characters
- [x] Both tracked and untracked files preview correctly
- [x] No syntax errors in shell commands

## Implementation Plan

1. Create test files with complex names to reproduce the issue\n2. Analyze the current shell command and identify escaping problems\n3. Research proper shell escaping techniques for complex file names\n4. Implement improved quoting mechanism\n5. Test with various file name patterns (spaces, hyphens, parentheses, special chars)\n6. Verify both tracked and untracked file previews work correctly

## Implementation Notes

Fixed the preview command for files with complex names containing spaces, hyphens, parentheses, and other special characters. The issue was that the previous implementation used variable assignment like file="{}" which broke when filenames contained special shell characters like parentheses. The solution was to use {} directly in the commands, letting fzf handle the proper escaping automatically. Now both Windows (PowerShell) and Unix (sh) preview commands work correctly with complex filenames like 'task-5 - Implement-multi-factor-authentication-(MFA)-system.md'.

Fixed the preview command for files with complex names containing spaces, hyphens, parentheses, and other special characters. The initial fix used {} directly but still had issues with certain filenames. The final solution uses bash -c with positional parameters (-- {}) which properly handles all special characters including those in paths like 'backlog/archive/tasks/task-6 - Add-social-authentication-providers.md'. For Windows, used PowerShell script blocks with param() for proper parameter handling.

Fixed the preview command for files with complex names in multiple steps:

1. Initial issue: Variable assignment file="{}" broke with parentheses in filenames
2. First fix: Used {} directly but still had shell parsing issues 
3. Second fix: Used bash -c with positional parameters (-- {}) for proper parameter handling
4. Final fix: Added unquoteGitFilename() function to handle quotes that git adds around filenames with special characters in git status --porcelain output

The complete solution now properly handles:
- Files with spaces, hyphens, parentheses, and other special characters
- Git's automatic quoting of filenames with special characters
- Cross-platform compatibility (Windows PowerShell and Unix bash)
- Proper shell escaping for all edge cases

Files like 'backlog/tasks/task-4 - Fix-preview-command-for-files-with-complex-names-and-special-characters.md' now preview correctly.
