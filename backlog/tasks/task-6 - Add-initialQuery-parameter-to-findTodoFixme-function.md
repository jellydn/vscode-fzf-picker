---
id: task-6
title: Add initialQuery parameter to findTodoFixme function
status: Done
assignee:
  - '@claude'
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies: []
---

## Description

Enable users to resume previous searches in the findTodoFixme function by adding support for an initialQuery parameter. This feature will improve the user experience by allowing them to continue or modify their search queries without starting from scratch.

## Description

## Acceptance Criteria

- [x] Add initialQuery parameter to findTodoFixme function
- [x] Implement query persistence to save actual user input
- [x] Add resume functionality with cached queries  
- [x] Comprehensive test coverage including edge cases and error handling
- [x] Maintain backward compatibility
- [x] Handle special characters and whitespace in queries

## Implementation Notes

Implementation completed using TDD approach with comprehensive query persistence and resume functionality.

### Key Changes:
1. **Query Persistence Fix**: Added `--print-query` flag to fzf to capture actual user input, not just initialQuery
2. **New Cache System**: Created `src/utils/search-cache.ts` with project-specific caching in `~/.config/fzf-picker/`
3. **Smart Persistence**: Only saves non-empty queries from successful searches with results
4. **Resume Functionality**: Added `findTodoFixmeResume()` function that retrieves cached queries
5. **CLI Integration**: Updated `src/commands.ts` to use new cache system specifically for findTodoFixme

### Technical Details:
- **Query Capture**: Changed from `output.trim().split("\n")` to properly parse --print-query output
- **Cache Location**: Project-specific cache files in `~/.config/fzf-picker/<project-hash>.json`
- **Error Handling**: Graceful fallback when cache operations fail
- **Test Coverage**: 32 total tests including edge cases, error handling, and cache functionality

### Files Modified:
- `src/commands/find-todo-fixme.ts` - Core implementation with --print-query
- `src/utils/search-cache.ts` - New cache utility system  
- `src/commands.ts` - CLI integration for resume functionality
- `src/commands.spec.ts` - Comprehensive test suite

### Architecture:
- Two-layer solution: CLI layer uses old .last_query file, advanced cache system for findTodoFixme
- Backward compatibility maintained
- Clean separation of concerns with dedicated cache utilities

Successfully addresses the missing query persistence issue where previous implementation only saved initialQuery but not actual user input.
