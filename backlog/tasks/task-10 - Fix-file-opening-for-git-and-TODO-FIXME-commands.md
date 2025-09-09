---
id: task-10
title: Fix file opening for git and TODO/FIXME commands
status: Done
assignee: []
created_date: '2025-09-09 07:17'
updated_date: '2025-09-09 07:30'
labels: []
dependencies: []
---

## Description

File opening fails for git status and TODO/FIXME search results because ANSI color codes interfere with file path parsing. The openFiles() function needs to strip color codes before parsing file:line:column format.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ANSI color codes are stripped from file paths,File opening works for TODO/FIXME search results,File opening works for git status results,Line and column positioning works correctly
<!-- AC:END -->


## Implementation Plan

1. Strip ANSI color codes using regex in openFiles function
2. Test with TODO/FIXME search results containing color codes
3. Test with git status file paths
4. Verify line/column positioning works correctly
5. Run existing tests to ensure no regressions


## Implementation Notes

Issue identified and fixed:

1. **Broken regex pattern** in src/commands/find-todo-fixme.ts:31
   - Was: '(TODO|FIXME|HACK|FIX):s' (invalid regex)  
   - Fixed: '(TODO|FIXME|HACK|FIX):\\s' (correct regex)
   
2. **ANSI color code parsing** in src/commands.ts:23
   - Added: cleanPath.replace(/\x1b\[[0-9;]*m/g, '') before parsing
   
**Verification:**
- Regex now properly matches TODO/FIXME comments
- ANSI codes stripped correctly: 'src/file.ts:22:5' parsed cleanly  
- All 45 tests pass
- File opening should now work for all 3 commands (findFiles, gitStatus, findTodoFixme)
