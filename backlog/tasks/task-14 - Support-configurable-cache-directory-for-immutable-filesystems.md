---
id: task-14
title: Support configurable cache directory for immutable filesystems
status: Done
assignee: []
created_date: '2025-09-11 23:44'
updated_date: '2025-09-11 23:57'
labels: []
dependencies: []
---

## Description

Enable users to configure cache directory location to support systems like NixOS where extension directory is read-only

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cache directory can be configured via VS Code settings,Environment variable FZF_PICKER_CACHE_DIR overrides settings,Cache falls back gracefully when directory is not writable,Cache can be disabled entirely when needed
<!-- AC:END -->


## Implementation Notes

Successfully implemented configurable cache directory feature with comprehensive testing and OS-specific default paths.

**Implementation:**
1. Added VS Code configuration settings:
   - fzf-picker.cache.enabled: Enable/disable caching
   - fzf-picker.cache.directory: Custom cache directory path

2. Implemented OS-specific default cache directories following platform conventions:
   - Windows: %APPDATA%\fzf-picker (with fallback to %USERPROFILE%\AppData\Roaming\fzf-picker)
   - macOS: ~/Library/Caches/fzf-picker (following Apple guidelines)
   - Linux/Unix: ~/.cache/fzf-picker or $XDG_CACHE_HOME/fzf-picker (XDG Base Directory Specification)

3. Implemented fallback hierarchy in search-cache.ts:
   - Priority 1: FZF_PICKER_CACHE_DIR environment variable
   - Priority 2: VS Code fzf-picker.cache.directory setting
   - Priority 3: OS-specific default cache directory

4. Enhanced cache functions with:
   - Configuration-aware cache enable/disable
   - Graceful handling when cache is disabled
   - Environment variable override support
   - Platform-aware cache directory selection

5. Updated extension.ts to:
   - Pass cache configuration to terminal environment
   - Monitor cache configuration changes
   - Reinitialize on configuration updates

6. Added comprehensive test coverage (23 tests):
   - Environment variable priority
   - VS Code configuration support
   - Cache disabled functionality
   - OS-specific cache directory selection (Windows, macOS, Linux, FreeBSD)
   - XDG_CACHE_HOME and APPDATA environment variable support
   - All existing cache functionality

**Files modified:**
- package.json: Added cache configuration schema with OS-specific documentation
- src/config.ts: Added cache properties to Config interface
- src/extension.ts: Configuration mapping and environment variables
- src/utils/search-cache.ts: OS-specific configurable directory logic
- src/utils/search-cache.spec.ts: Comprehensive test suite with platform tests

**OS-Specific Cache Locations:**
- Windows: C:\Users\[user]\AppData\Roaming\fzf-picker
- macOS: /Users/[user]/Library/Caches/fzf-picker  
- Linux: /home/[user]/.cache/fzf-picker
- Linux with XDG: $XDG_CACHE_HOME/fzf-picker

**Testing:**
- All 23 cache tests pass including new OS-specific tests
- Environment variable override works correctly
- VS Code configuration integration working
- Cache disable functionality working  
- Platform-specific cache directory selection working
- Graceful fallback to OS-appropriate default directories
