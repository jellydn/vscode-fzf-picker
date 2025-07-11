---
id: task-8
title: Fix file opening when user selects file without entering any search query
status: Done
assignee: ['@claude']
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies: []
---

## Description

When users open findFiles and use arrow keys to select a file without typing any search query, the file opening fails. This edge case needs to be handled to ensure files can be opened regardless of whether the user entered a search query or just navigated with arrow keys.

## Acceptance Criteria

- [x] File opens successfully when selected via arrow keys without search input
- [x] Empty query handling doesn't interfere with file selection
- [x] Backward compatibility maintained for existing search workflows
- [x] Error handling for edge cases with empty or missing query data

## Implementation Notes

Fixed the edge case where users selecting files via arrow keys without entering search queries couldn't open files. 

**Root Cause**: Improper output parsing that used `.trim()` which removed the empty query line from fzf `--print-query` output, causing the first selected file to be misinterpreted as the query.

**Solution**: 
1. Removed `.trim()` call from output processing to preserve empty query line
2. Modified query parameter passing to only include `--query` when query is not empty
3. Enhanced file filtering to remove empty lines from selected files
4. Added comprehensive test coverage for arrow key selection scenarios

**Files Modified**:
- `src/commands/find-files.ts` - Fixed output parsing and query parameter handling
- `src/commands.spec.ts` - Added 3 new edge case tests

**Test Results**: All 35 tests now pass, including new edge case scenarios.
