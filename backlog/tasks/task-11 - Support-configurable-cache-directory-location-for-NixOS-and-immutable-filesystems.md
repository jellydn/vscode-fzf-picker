---
id: task-11
title: >-
  Support configurable cache directory location for NixOS and immutable
  filesystems
status: Done
assignee:
  - '@claude'
created_date: '2025-07-12'
updated_date: '2025-07-12'
labels: []
dependencies: []
---

## Description

Enable users to configure where cache files are stored to support NixOS and other immutable filesystem environments where the extension directory is read-only. Currently the extension fails on NixOS because it tries to write cache files to the immutable extension directory.

## Acceptance Criteria

- [x] Cache directory is configurable via VSCode settings
- [x] Default cache location follows platform standards (XDG on Linux)
- [x] Graceful fallback when preferred cache location is not writable
- [x] All existing cache functionality continues to work
- [x] Documentation updated with configuration examples
- [x] Backward compatibility maintained for existing cache files

## Implementation Plan

1. Research platform-specific cache directory standards (XDG, macOS, Windows)\n2. Create architecture decision record for cache directory strategy\n3. Design configurable cache directory system with fallbacks\n4. Implement cache directory configuration in VSCode settings\n5. Update search-cache.ts to support configurable locations\n6. Add migration logic for existing cache files\n7. Write comprehensive tests for new cache system\n8. Update documentation with configuration examples\n9. Test on different platforms and immutable filesystems

## Implementation Notes

Successfully implemented configurable cache directory system for NixOS and immutable filesystem support.

**Architecture Implemented:**
- Platform-aware cache directory resolution with robust fallback chain
- User configuration via VSCode settings (fzf-picker.general.cacheDirectory, fzf-picker.general.enableCache)
- Environment variable support (FZF_PICKER_CACHE_DIR)
- Automatic migration from legacy ~/.config/fzf-picker location
- In-memory cache fallback when filesystem unavailable

**Key Features:**
1. **Platform Standards Compliance**: XDG on Linux (~/.cache), Library/Caches on macOS, AppData/Local on Windows
2. **Robust Fallback Chain**: User config → env var → platform default → temp dir → in-memory cache
3. **Write Permission Testing**: Verifies directory writability before use
4. **Atomic Cache Operations**: Uses temporary files for atomic writes
5. **Environment Variable Expansion**: Supports /Users/huynhdung and /Users/huynhdung patterns
6. **User Isolation**: Includes user ID in temp directory paths

**Files Modified:**
- package.json: Added cache configuration properties
- src/utils/cache-directory.ts: New platform-aware cache resolver with performance optimizations
- src/utils/search-cache.ts: Refactored for configurable cache with migration
- src/utils/search-cache.spec.ts: Updated test expectations for new cache behavior
- src/utils/cache-directory.spec.ts: Comprehensive test suite for caching functionality
- docs/cache-configuration.md: Comprehensive user documentation with performance notes
- backlog/decisions/003-configurable-cache-directory.md: Updated ADR with implementation status

**Performance Improvements:**
- **Result Caching**: Cache directory resolution result to eliminate repeated filesystem operations
- **Promise Deduplication**: Concurrent calls share same resolution promise to avoid race conditions
- **Command Line Compatibility**: Conditional VSCode dependency loading for command line usage
- **Comprehensive Testing**: 45 total tests covering all scenarios including caching behavior

**Testing:**
- All 45 tests pass with new caching and command line compatibility
- Cache system tested on feat/configurable-cache-directory-issue-10 branch
- PR #14 created and ready for merge with all CI checks passing
- Performance optimizations verified to avoid repeated filesystem operations

**GitHub Issue Resolution:**
Addresses GitHub issue #10 - Extension now works on NixOS and other immutable filesystems by allowing cache directory configuration outside read-only extension directory. Additional performance improvements ensure efficient cache operations and command line compatibility.
