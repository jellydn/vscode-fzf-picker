---
id: task-10
title: Fix file opening for git and TODO/FIXME commands
status: Done
assignee: []
created_date: '2025-09-09 07:17'
updated_date: '2025-09-09 08:17'
labels: []
dependencies: []
---

## Description

File opening fails for git status and TODO/FIXME search results because ANSI color codes interfere with file path parsing. The openFiles() function needs to strip color codes before parsing file:line:column format.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] ANSI color codes are stripped from file paths
- [x] File opening works for TODO/FIXME search results
- [x] File opening works for git status results
- [x] Line and column positioning works correctly
<!-- AC:END -->


## Implementation Plan

1. Strip ANSI color codes using regex in openFiles function
2. Test with TODO/FIXME search results containing color codes
3. Test with git status file paths
4. Verify line/column positioning works correctly
5. Run existing tests to ensure no regressions


## Implementation Notes

Comprehensive bug fixes implemented:

**1. ANSI color code stripping in openFiles() function:**
- Added regex pattern /\x1b\[[0-9;]*m/g to strip ANSI codes from file paths
- Fixed file path parsing for all color-coded outputs

**2. Regex pattern fix in find-todo-fixme.ts:**
- Fixed broken regex from ':s' to ':\\s' in line 31
- Now properly matches TODO/FIXME comments with colon and whitespace

**3. Race condition fix:**
- Changed Promise.all(openPromises).catch() to await Promise.all(openPromises) 
- Added proper try/catch error handling
- Ensures all file opening operations complete before process exit

**4. Output parsing improvements:**
- Removed .trim() calls that were interfering with proper parsing
- Fixed both git-status.ts and find-todo-fixme.ts output handling

**5. Comprehensive logging system:**
- Added detailed logging throughout the file opening process
- Better error reporting and debugging capabilities

**6. Test coverage:**
- Added 10 new test cases for openFiles() function
- Covers ANSI stripping, various file path formats, and edge cases

**Files modified:**
- src/commands.ts (ANSI stripping, race condition fix)
- src/commands/find-todo-fixme.ts (regex fix, output parsing)
- src/commands/git-status.ts (output parsing)
- test/commands.test.ts (comprehensive test suite)

All 45 tests pass. File opening now works correctly for all three commands: findFiles, gitStatus, and findTodoFixme.
