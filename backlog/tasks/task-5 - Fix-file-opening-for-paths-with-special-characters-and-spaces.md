---
id: task-5
title: Fix file opening for paths with special characters and spaces
status: Done
assignee:
  - '@claude'
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies: []
---

## Description

File opening fails when file paths contain special characters (spaces, hyphens, parentheses, etc.) across all commands (find files, live grep, git status, etc.). The issue affects the openFiles function in src/commands.ts and potentially other file opening mechanisms throughout the extension.

## Acceptance Criteria

- [x] Files with spaces in paths open correctly
- [x] Files with hyphens and parentheses in paths open correctly
- [x] Files with mixed special characters open correctly
- [x] All commands (find files, live grep, git status) handle special characters
- [x] Line and column jumping works with special character paths
- [x] Cross-platform compatibility maintained

## Implementation Plan

1. Analyze the current openFiles function in src/commands.ts to identify escaping issues\n2. Research how VSCode handles file paths with special characters\n3. Test file opening with various special character combinations\n4. Implement proper path escaping/quoting in openFiles function\n5. Verify all commands (find files, live grep, git status) work correctly\n6. Test line/column jumping with special character paths\n7. Ensure cross-platform compatibility

## Implementation Notes

Fixed file opening for paths with special characters and spaces by implementing proper shell path escaping.

## Root Cause
The issue was in the exec() call in src/commands.ts where file paths were directly interpolated into shell commands without proper quoting, causing the shell to split paths on spaces and treat special characters as shell metacharacters.

## Solution Implemented
1. Added escapeShellPath() function that wraps file paths in double quotes and escapes any existing quotes within the path
2. Updated the exec() command to use the escaped file path
3. Added proper TypeScript typing for the selection variable

## Technical Details
- The escapeShellPath() function handles both simple and complex file paths
- Supports files with spaces, hyphens, parentheses, ampersands, and other special characters
- Maintains compatibility with line:column jumping format
- Cross-platform compatible (Windows, macOS, Linux)

## Testing
Verified with test files containing:
- Spaces: 'test file with spaces.txt'
- Parentheses: 'test-file-(with-parentheses).txt'
- Mixed special chars: 'test file - (mixed & special).txt'

All file types now open correctly across all extension commands (find files, live grep, git status, find todo/fixme).
