# Decision: Configurable Cache Directory for Cross-Platform Support

## Status
Proposed

## Context

The Find It Faster extension currently stores cache files in a hardcoded location (`~/.config/fzf-picker/`), which causes issues on certain systems:

1. **NixOS and Immutable Filesystems**: Systems where the extension directory is read-only or immutable
2. **Cross-Platform Compatibility**: Different operating systems have different conventions for cache storage
3. **User Preferences**: Some users prefer to customize where application data is stored
4. **Corporate Environments**: Restricted filesystem permissions or specific directory requirements

### Current Implementation Issues:
- Fixed cache directory location in `~/.config/fzf-picker/`
- No fallback mechanism for write failures
- Non-compliance with platform-specific cache directory standards
- Extension fails completely on NixOS due to immutable filesystem

### Platform Standards:
- **Linux**: XDG Base Directory Specification (`$XDG_CACHE_HOME` or `~/.cache`)
- **macOS**: `~/Library/Caches`
- **Windows**: `%LOCALAPPDATA%` or `%TEMP%`

## Decision

Implement a **configurable cache directory system** with platform-aware defaults and graceful fallbacks.

### Architecture Components:

#### 1. **Configuration System**
- Add VSCode setting: `fzf-picker.general.cacheDirectory`
- Support environment variable: `FZF_PICKER_CACHE_DIR`
- Platform-aware default locations

#### 2. **Fallback Strategy**
- Primary: User-configured directory
- Secondary: Platform-specific cache directory
- Tertiary: System temporary directory
- Final: In-memory cache (no persistence)

#### 3. **Cache Directory Resolution Order**
```typescript
1. VSCode setting: fzf-picker.general.cacheDirectory
2. Environment variable: FZF_PICKER_CACHE_DIR  
3. Platform default:
   - Linux: $XDG_CACHE_HOME/fzf-picker or ~/.cache/fzf-picker
   - macOS: ~/Library/Caches/fzf-picker
   - Windows: %LOCALAPPDATA%/fzf-picker
4. Temporary directory: os.tmpdir()/fzf-picker-{userId}
5. In-memory cache (no persistence)
```

## Implementation Strategy

### 1. **Configuration Schema**
```json
{
  "fzf-picker.general.cacheDirectory": {
    "type": "string",
    "default": "",
    "description": "Custom directory for cache files. If empty, uses platform-specific default location."
  },
  "fzf-picker.general.enableCache": {
    "type": "boolean", 
    "default": true,
    "description": "Enable or disable cache functionality entirely."
  }
}
```

### 2. **Cache Directory Detection**
```typescript
function getCacheDirectory(): string {
  // 1. User configuration
  const userConfigured = config.get('fzf-picker.general.cacheDirectory');
  if (userConfigured && isWritable(userConfigured)) {
    return userConfigured;
  }
  
  // 2. Environment variable
  const envConfigured = process.env.FZF_PICKER_CACHE_DIR;
  if (envConfigured && isWritable(envConfigured)) {
    return envConfigured;
  }
  
  // 3. Platform defaults
  const platformDefault = getPlatformCacheDirectory();
  if (isWritable(platformDefault)) {
    return platformDefault;
  }
  
  // 4. Temporary directory fallback
  const tempDir = join(os.tmpdir(), `fzf-picker-${os.userInfo().uid}`);
  if (isWritable(tempDir)) {
    return tempDir;
  }
  
  // 5. In-memory cache
  return null; // Triggers in-memory mode
}
```

### 3. **Migration Strategy**
- Detect existing cache files in old location
- Automatically migrate to new location if possible
- Maintain backward compatibility
- Log migration actions for transparency

### 4. **Error Handling**
- Graceful degradation when cache is unavailable
- Clear error messages for configuration issues
- Fallback to in-memory cache when filesystem is unavailable
- Optional telemetry for cache system health

## Consequences

### Positive
- **NixOS Compatibility**: Solves immutable filesystem issues
- **Platform Compliance**: Follows OS-specific cache directory standards
- **User Flexibility**: Allows customization for specific requirements
- **Graceful Degradation**: Extension continues working even when cache is unavailable
- **Better Error Handling**: Clear feedback when cache operations fail

### Negative
- **Configuration Complexity**: More settings for users to understand
- **Migration Overhead**: One-time cost for existing users
- **Platform Testing**: Need to test across multiple operating systems
- **Backward Compatibility**: Additional code to handle legacy cache locations

### Risks
- **Data Loss**: Potential cache data loss during migration
- **Permission Issues**: Complex permission scenarios across platforms
- **Configuration Confusion**: Users may not understand cache directory options
- **Performance Impact**: Additional filesystem checks during initialization

## Alternatives Considered

### 1. **Hard-coded Platform Directories**
Use platform-specific directories without user configuration.
- **Pros**: Simple implementation, follows standards
- **Cons**: No flexibility for edge cases, doesn't solve NixOS completely

### 2. **VSCode Extension Storage API**
Use VSCode's built-in storage mechanisms.
- **Pros**: Managed by VSCode, no filesystem concerns
- **Cons**: Limited functionality, not suitable for large cache files

### 3. **Disable Cache on Immutable Systems**
Detect immutable filesystems and disable caching.
- **Pros**: Simple implementation
- **Cons**: Reduced functionality, poor user experience

### 4. **Multiple Cache Strategies**
Implement different cache backends (filesystem, memory, VSCode storage).
- **Pros**: Maximum flexibility
- **Cons**: Complex implementation and maintenance

## Implementation Plan

### Phase 1: Core Implementation
1. **Cache Directory Resolution**: Implement platform-aware cache directory detection
2. **Configuration Integration**: Add VSCode settings and environment variable support
3. **Fallback Logic**: Implement graceful fallbacks for write failures
4. **Error Handling**: Add comprehensive error handling and logging

### Phase 2: Migration and Compatibility
5. **Migration Logic**: Implement automatic migration from old cache location
6. **Backward Compatibility**: Ensure existing functionality continues to work
7. **Platform Testing**: Test across Linux, macOS, and Windows
8. **NixOS Validation**: Specific testing on NixOS and immutable systems

### Phase 3: Documentation and Polish
9. **Documentation**: Update configuration documentation with examples
10. **User Communication**: Add migration notifications and configuration guidance
11. **Performance Optimization**: Optimize cache directory detection performance
12. **Telemetry**: Add optional telemetry for cache system health monitoring

## Configuration Examples

### Basic Configuration
```json
{
  "fzf-picker.general.cacheDirectory": "/home/user/.local/share/fzf-picker"
}
```

### NixOS Configuration
```json
{
  "fzf-picker.general.cacheDirectory": "/home/user/.cache/fzf-picker"
}
```

### Corporate Environment
```json
{
  "fzf-picker.general.cacheDirectory": "/shared/cache/vscode-extensions/fzf-picker",
  "fzf-picker.general.enableCache": true
}
```

### Disable Cache
```json
{
  "fzf-picker.general.enableCache": false
}
```

## Testing Strategy

### Unit Tests
- Cache directory resolution logic
- Platform-specific path generation
- Permission checking and fallback logic
- Migration functionality

### Integration Tests
- Full cache workflow on different platforms
- Configuration change handling
- Error scenarios and graceful degradation

### Platform Tests
- Linux (various distributions)
- macOS (different versions)
- Windows (different versions)
- NixOS (immutable filesystem validation)

### Edge Case Tests
- Non-existent directories
- Permission-denied scenarios
- Disk space limitations
- Network-mounted filesystems

## Success Metrics

### Functional Metrics
- Extension works on NixOS without modification
- Cache directory respects user configuration
- Automatic migration preserves existing cache data
- Graceful fallback when preferred location is unavailable

### User Experience Metrics
- Clear error messages for configuration issues
- Minimal user intervention required for default case
- Transparent migration process
- Consistent behavior across platforms

### Performance Metrics
- Cache directory detection time < 50ms
- Migration time < 2s for typical cache sizes
- No performance regression for existing functionality

## Related Issues

- GitHub Issue #10: Support moving the last query file location
- XDG Base Directory Specification compliance
- VSCode extension best practices for data storage
- Cross-platform filesystem permission handling

## Future Considerations

### Advanced Features
- **Cache Size Management**: Automatic cleanup of old cache files
- **Compression**: Compress cache files to save space
- **Encryption**: Optional encryption for sensitive cache data
- **Cloud Sync**: Integration with cloud storage for cache synchronization

### Monitoring and Observability
- **Cache Hit Rates**: Monitor cache effectiveness
- **Error Tracking**: Track cache-related errors across platforms
- **Performance Metrics**: Monitor cache system performance impact
- **User Analytics**: Understand cache directory usage patterns

This decision provides a robust foundation for supporting diverse deployment environments while maintaining excellent user experience and platform compliance.