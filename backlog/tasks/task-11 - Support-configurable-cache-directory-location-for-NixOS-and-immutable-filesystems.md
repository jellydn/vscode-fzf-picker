---
id: task-11
title: >-
  Support configurable cache directory location for NixOS and immutable
  filesystems
status: To Do
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

- [ ] Cache directory is configurable via VSCode settings
- [ ] Default cache location follows platform standards (XDG on Linux)
- [ ] Graceful fallback when preferred cache location is not writable
- [ ] All existing cache functionality continues to work
- [ ] Documentation updated with configuration examples
- [ ] Backward compatibility maintained for existing cache files

## Implementation Plan

1. Research platform-specific cache directory standards (XDG, macOS, Windows)\n2. Create architecture decision record for cache directory strategy\n3. Design configurable cache directory system with fallbacks\n4. Implement cache directory configuration in VSCode settings\n5. Update search-cache.ts to support configurable locations\n6. Add migration logic for existing cache files\n7. Write comprehensive tests for new cache system\n8. Update documentation with configuration examples\n9. Test on different platforms and immutable filesystems
