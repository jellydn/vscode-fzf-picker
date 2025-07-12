# Cache Directory Configuration Guide

## Overview

The Find It Faster extension uses a configurable cache system to store search queries and improve user experience. This guide explains how to configure cache directories for different environments, including support for NixOS and other immutable filesystems.

## Why Configure Cache Directory?

### Default Behavior
By default, the extension stores cache files in platform-specific locations:
- **Linux**: `~/.cache/fzf-picker/`
- **macOS**: `~/Library/Caches/fzf-picker/`
- **Windows**: `%LOCALAPPDATA%/fzf-picker/`

### When You Need Custom Configuration
- **NixOS**: Extension directory is immutable and read-only
- **Corporate Environments**: Restricted filesystem permissions
- **Custom Setups**: Preference for specific directory structures
- **Shared Systems**: Multiple users with different cache requirements

## Configuration Options

### 1. VSCode Settings

Add to your VSCode `settings.json`:

```json
{
  "fzf-picker.general.cacheDirectory": "/path/to/your/cache/directory",
  "fzf-picker.general.enableCache": true
}
```

### 2. Environment Variable

Set environment variable before starting VSCode:

```bash
export FZF_PICKER_CACHE_DIR="/path/to/your/cache/directory"
code
```

### 3. Disable Cache Entirely

```json
{
  "fzf-picker.general.enableCache": false
}
```

## Platform-Specific Examples

### NixOS Configuration

**Option 1: User Cache Directory**
```json
{
  "fzf-picker.general.cacheDirectory": "/home/username/.cache/fzf-picker"
}
```

**Option 2: XDG Cache Home**
```bash
export XDG_CACHE_HOME="/home/username/.cache"
export FZF_PICKER_CACHE_DIR="$XDG_CACHE_HOME/fzf-picker"
```

**Option 3: Temporary Directory**
```json
{
  "fzf-picker.general.cacheDirectory": "/tmp/fzf-picker-cache"
}
```

### Corporate/Restricted Environments

**Shared Network Directory**
```json
{
  "fzf-picker.general.cacheDirectory": "/shared/vscode-cache/fzf-picker"
}
```

**User-Specific Project Directory**
```json
{
  "fzf-picker.general.cacheDirectory": "${workspaceFolder}/.vscode/fzf-picker-cache"
}
```

### Development Environments

**Project-Local Cache**
```json
{
  "fzf-picker.general.cacheDirectory": "./.cache/fzf-picker"
}
```

**RAM Disk (Linux)**
```json
{
  "fzf-picker.general.cacheDirectory": "/dev/shm/fzf-picker-cache"
}
```

## Cache Directory Resolution

The extension resolves cache directories in the following order:

1. **User Configuration**: `fzf-picker.general.cacheDirectory` setting
2. **Environment Variable**: `FZF_PICKER_CACHE_DIR`
3. **Platform Default**: OS-specific cache directory
4. **Temporary Fallback**: System temporary directory
5. **In-Memory**: No persistence (if all else fails)

### Resolution Logic Flow

```
User Setting Exists? ────Yes────→ Is Writable? ────Yes────→ ✓ Use It
       │                              │
       No                             No
       ↓                              ↓
Environment Var? ────Yes────→ Is Writable? ────Yes────→ ✓ Use It
       │                              │
       No                             No
       ↓                              ↓
Platform Default ────────────→ Is Writable? ────Yes────→ ✓ Use It
       │                              │
       │                              No
       │                              ↓
       └─────────→ Temp Directory ────→ Is Writable? ────Yes────→ ✓ Use It
                                          │
                                          No
                                          ↓
                                    In-Memory Cache
                                   (No Persistence)
```

## Cache File Structure

### Default Cache Files

```
cache-directory/
├── search-cache.json          # Unified search query cache
├── .gitignore                 # Ignore cache files in git
└── migration.log             # Migration history (if applicable)
```

### Cache Content Example

```json
{
  "findTodoFixme": {
    "lastQuery": "TODO: implement",
    "timestamp": 1641024000000,
    "projectPath": "/path/to/project"
  },
  "findFiles": {
    "lastQuery": "component",
    "timestamp": 1641024000000,
    "projectPath": "/path/to/project"
  },
  "liveGrep": {
    "lastQuery": "function.*async",
    "timestamp": 1641024000000,
    "projectPath": "/path/to/project"
  }
}
```

## Migration and Backward Compatibility

### Automatic Migration

When you configure a new cache directory, the extension automatically:

1. **Detects** existing cache files in the old location
2. **Migrates** cache data to the new location
3. **Preserves** all search history and preferences
4. **Logs** migration actions for transparency

### Manual Migration

If automatic migration fails, you can manually copy cache files:

```bash
# Copy from old location to new location
cp ~/.config/fzf-picker/search-cache.json /new/cache/dir/
```

### Rollback

To rollback to the previous cache location:

1. Remove the custom configuration
2. Restart VSCode
3. The extension will return to platform defaults

## Troubleshooting

### Common Issues

#### 1. Permission Denied
**Error**: Cannot write to cache directory
**Solution**: 
- Check directory permissions: `ls -la /path/to/cache/dir`
- Ensure parent directories exist: `mkdir -p /path/to/cache/dir`
- Verify write permissions: `touch /path/to/cache/dir/test && rm /path/to/cache/dir/test`

#### 2. Directory Doesn't Exist
**Error**: Cache directory not found
**Solution**:
- Create directory: `mkdir -p /path/to/cache/dir`
- Or use existing directory in configuration

#### 3. NixOS Immutable Filesystem
**Error**: Extension directory is read-only
**Solution**:
```json
{
  "fzf-picker.general.cacheDirectory": "/home/username/.cache/fzf-picker"
}
```

#### 4. Cache Not Working
**Error**: Search queries not being remembered
**Solution**:
- Check if cache is enabled: `"fzf-picker.general.enableCache": true`
- Verify cache directory is writable
- Check VSCode developer console for errors

### Debug Mode

Enable debug logging to troubleshoot cache issues:

```json
{
  "fzf-picker.general.debugMode": true
}
```

This will log cache operations to the VSCode developer console:
- Cache directory resolution
- File read/write operations
- Migration activities
- Error conditions

### Health Check

Verify your cache configuration:

1. **Check Settings**: View current configuration in VSCode settings
2. **Test Write**: Try creating a file in the cache directory
3. **Check Logs**: Look for cache-related messages in VSCode output
4. **Verify Function**: Perform a search and check if query is cached

## Performance Considerations

### Cache Size Management

The extension automatically manages cache size:
- **File Size**: Cache files are typically < 1MB
- **Cleanup**: Old entries are automatically pruned
- **Compression**: Cache data is stored efficiently

### Performance Tips

1. **SSD Storage**: Use SSD for cache directory for faster access
2. **Local Directory**: Avoid network-mounted directories
3. **RAM Disk**: Consider RAM disk for maximum performance
4. **Regular Cleanup**: Periodically clean cache if it grows large

### Network Considerations

For network-mounted cache directories:
- **Latency**: May slow down extension startup
- **Reliability**: Network issues can cause cache failures
- **Permissions**: Ensure proper network permissions

## Security Considerations

### Cache Content

Cache files contain:
- **Search Queries**: Your recent search terms
- **Project Paths**: Absolute paths to your projects
- **Timestamps**: When searches were performed

### Security Best Practices

1. **Permissions**: Set appropriate file permissions (600 or 700)
2. **Location**: Avoid shared directories for sensitive projects
3. **Cleanup**: Regularly clean cache for sensitive data
4. **Encryption**: Consider encrypting the entire cache directory

### Example Security Configuration

```bash
# Create cache directory with restricted permissions
mkdir -p ~/.cache/fzf-picker
chmod 700 ~/.cache/fzf-picker

# Verify permissions
ls -la ~/.cache/ | grep fzf-picker
# Should show: drwx------ ... fzf-picker
```

## Advanced Configuration

### Multiple VSCode Instances

For multiple VSCode instances with different cache requirements:

**Instance 1** (Personal Projects):
```json
{
  "fzf-picker.general.cacheDirectory": "~/.cache/fzf-picker-personal"
}
```

**Instance 2** (Work Projects):
```json
{
  "fzf-picker.general.cacheDirectory": "~/.cache/fzf-picker-work"
}
```

### Project-Specific Cache

Configure per-project cache in workspace settings (`.vscode/settings.json`):

```json
{
  "fzf-picker.general.cacheDirectory": "${workspaceFolder}/.cache/fzf-picker"
}
```

### Container Environments

For Docker/container environments:

```json
{
  "fzf-picker.general.cacheDirectory": "/tmp/fzf-picker-cache",
  "fzf-picker.general.enableCache": true
}
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `FZF_PICKER_CACHE_DIR` | Override cache directory | `/custom/cache/path` |
| `XDG_CACHE_HOME` | XDG cache directory (Linux) | `/home/user/.cache` |
| `HOME` | User home directory | `/home/user` |
| `LOCALAPPDATA` | Windows local app data | `C:\Users\User\AppData\Local` |
| `TMPDIR` | Temporary directory | `/tmp` |

## Migration Guide

### From Extension < v1.2.0

If you're upgrading from an older version:

1. **Backup** existing cache: `cp ~/.config/fzf-picker/search-cache.json ~/backup/`
2. **Configure** new cache directory (optional)
3. **Restart** VSCode
4. **Verify** cache migration in output logs

### From Other Extensions

If migrating from similar extensions:

1. **Export** existing search history (if possible)
2. **Configure** FZF Picker cache directory
3. **Import** search history manually (if needed)

## Support and Troubleshooting

### Getting Help

1. **Documentation**: Check this guide first
2. **GitHub Issues**: Report bugs or feature requests
3. **VSCode Output**: Check "Find It Faster" output channel
4. **Community**: Ask questions in discussions

### Reporting Issues

When reporting cache-related issues, include:
- Operating system and version
- VSCode version
- Extension version
- Cache configuration
- Error messages from VSCode output
- Steps to reproduce

This comprehensive configuration guide ensures you can set up the cache system to work perfectly in any environment, from NixOS to corporate networks to development containers.