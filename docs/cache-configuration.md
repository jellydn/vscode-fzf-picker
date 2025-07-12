# Cache Configuration

This document explains how to configure the cache directory for the Find It Faster (FZF Picker) extension.

## Overview

The extension uses a cache system to store search queries and other temporary data. By default, it uses platform-specific cache directories, but you can customize this behavior for your specific needs.

## Configuration Options

### VSCode Settings

Configure cache behavior through your VSCode settings:

```json
{
  "fzf-picker.general.cacheDirectory": "/path/to/custom/cache",
  "fzf-picker.general.enableCache": true
}
```

#### `fzf-picker.general.cacheDirectory`
- **Type**: `string`
- **Default**: `""` (uses platform default)
- **Description**: Custom directory for cache files. If empty, uses platform-specific default location. Supports environment variable expansion.

#### `fzf-picker.general.enableCache`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable or disable cache functionality entirely. When disabled, no cache files will be created or used.

### Environment Variables

You can also configure the cache directory using environment variables:

```bash
export FZF_PICKER_CACHE_DIR="/home/user/.custom-cache"
```

## Cache Directory Resolution Order

The extension uses the following order to determine where to store cache files:

1. **VSCode setting**: `fzf-picker.general.cacheDirectory`
2. **Environment variable**: `FZF_PICKER_CACHE_DIR`
3. **Platform-specific default**:
   - **Linux**: `$XDG_CACHE_HOME/fzf-picker` or `~/.cache/fzf-picker`
   - **macOS**: `~/Library/Caches/fzf-picker`
   - **Windows**: `%LOCALAPPDATA%/fzf-picker`
4. **Temporary directory**: `${tmpdir}/fzf-picker-${userId}`
5. **In-memory cache**: No persistent storage (cache is lost when VSCode closes)

## Configuration Examples

### Basic Custom Directory

```json
{
  "fzf-picker.general.cacheDirectory": "/home/user/.local/share/fzf-picker"
}
```

### Using Environment Variables

```json
{
  "fzf-picker.general.cacheDirectory": "${HOME}/.config/vscode-extensions/fzf-picker"
}
```

Or with shell-style expansion:

```json
{
  "fzf-picker.general.cacheDirectory": "$HOME/.config/vscode-extensions/fzf-picker"
}
```

### NixOS Configuration

For NixOS users with immutable filesystems:

```json
{
  "fzf-picker.general.cacheDirectory": "/home/user/.cache/fzf-picker"
}
```

### Corporate Environment

For environments with specific directory requirements:

```json
{
  "fzf-picker.general.cacheDirectory": "/shared/cache/vscode-extensions/fzf-picker"
}
```

### Disable Cache Completely

```json
{
  "fzf-picker.general.enableCache": false
}
```

## Environment Variable Configuration

### Shell Configuration

Add to your shell configuration file (`.bashrc`, `.zshrc`, etc.):

```bash
# Custom cache directory for FZF Picker
export FZF_PICKER_CACHE_DIR="$HOME/.local/share/fzf-picker"
```

### Docker/Container Environments

For containerized environments:

```bash
export FZF_PICKER_CACHE_DIR="/tmp/fzf-picker-cache"
```

### CI/CD Environments

For build environments where cache should be disabled:

```bash
export FZF_PICKER_CACHE_DIR=""
# Or in VSCode settings:
# "fzf-picker.general.enableCache": false
```

## Migration from Legacy Cache

The extension automatically migrates cache data from the legacy location (`~/.config/fzf-picker/`) to the new configured location. This migration:

- Preserves your existing search query history
- Removes the legacy cache file after successful migration
- Only happens once per new cache location
- Falls back gracefully if migration fails

## Troubleshooting

### Cache Directory Not Writable

If the configured cache directory is not writable, the extension will:

1. Log a warning (visible with `DEBUG_FZF_PICKER=1`)
2. Automatically fallback to the next option in the resolution order
3. Eventually use in-memory cache if no filesystem location is available

### Enable Debug Logging

To see detailed cache resolution information:

```bash
export DEBUG_FZF_PICKER=1
```

Then check the VSCode Developer Console (Help → Toggle Developer Tools → Console) for cache-related messages.

### Common Issues

#### Permission Denied on NixOS

**Problem**: Extension fails with permission errors on NixOS.

**Solution**: Configure a writable cache directory:

```json
{
  "fzf-picker.general.cacheDirectory": "/home/user/.cache/fzf-picker"
}
```

#### Cache Not Persisting

**Problem**: Search queries are not remembered between sessions.

**Solutions**:
1. Check if cache is enabled: `"fzf-picker.general.enableCache": true`
2. Verify cache directory is writable
3. Check debug logs for cache write failures

#### Large Cache Files

**Problem**: Cache directory grows too large.

**Solution**: Manually clear cache by deleting files in the cache directory, or disable cache:

```json
{
  "fzf-picker.general.enableCache": false
}
```

## Security Considerations

- Cache files contain search query history but no sensitive code content
- Cache directories should have appropriate filesystem permissions
- In shared environments, use user-specific cache directories
- Consider disabling cache in security-sensitive environments

## Performance Notes

- Filesystem cache provides persistence across VSCode sessions
- In-memory cache is faster but lost when VSCode closes
- Platform-specific defaults follow OS conventions for optimal performance
- Cache directory resolution is performed once per session and cached

## Related Documentation

- [GitHub Issue #10: Support moving the last query file location](https://github.com/jellydn/vscode-fzf-picker/issues/10)
- [Architecture Decision Record 003: Configurable Cache Directory](../backlog/decisions/003-configurable-cache-directory.md)