# 2. How to support resume based on cache

Date: 2025-07-12

## Status

Accepted

## Context

The VS Code extension needs to support resuming search operations with previously entered queries. Users frequently perform similar searches and want to quickly resume their last search without re-typing queries. The challenge is persisting user input across VS Code sessions and providing a consistent resume experience across all search commands (findFiles, liveGrep, findTodoFixme, pickFilesFromGitStatus).

**Key Requirements:**
- Persist actual user input, not just initial queries
- Support project-specific caching to prevent conflicts
- Handle multiple search command types consistently
- Survive VS Code restarts and session changes
- Provide atomic, reliable cache operations

**Previous State:**
- File-based `.last_query` files in project directories
- Inconsistent behavior across commands
- Only saved initial queries, not user modifications
- No project isolation leading to conflicts

## Decision

Implement a unified cache system with the following architecture:

### 1. **Centralized Cache Storage**
- **Location**: `~/.config/fzf-picker/search-cache.json`
- **Format**: JSON with project-scoped queries
- **Structure**: 
  ```json
  {
    "findTodoFixme": {
      "lastQuery": "user-entered-query",
      "timestamp": 1641123456789,
      "projectPath": "/path/to/project"
    }
  }
  ```

### 2. **Query Capture Strategy**
- Use `--print-query` flag with fzf to capture actual user input
- Parse fzf output to separate user query from selected results
- Save queries only when non-empty and search returned results

### 3. **Command Integration Pattern**
- Each search command provides a `<command>Resume()` function
- Unified API: `saveLastQuery()` and `getLastQuery()`
- Environment variable `HAS_RESUME=1` indicates resume mode
- Fallback to fresh search if no cached query exists

### 4. **Project Isolation**
- Cache queries per project path to prevent conflicts
- Automatic project detection from VS Code workspace
- Separate cache entries for different projects

### 5. **Atomic Operations**
- Use temporary files with atomic rename for cache writes
- Graceful error handling for file system operations
- Prevent corrupted cache files

## Consequences

### Positive
- **Consistent UX**: All search commands support resume functionality
- **Reliability**: Atomic operations prevent data corruption
- **Project Isolation**: No query conflicts between different projects
- **Persistence**: Queries survive VS Code restarts and session changes
- **Actual Input**: Captures user's final query, not just initial search
- **Unified API**: Single cache system for all search types
- **Testability**: Comprehensive test coverage with mocked file system

### Negative
- **File System Dependency**: Relies on local file system for persistence
- **Storage Overhead**: Additional JSON file per user configuration
- **Complexity**: More complex than simple in-memory caching
- **Migration**: Required migration from old `.last_query` file system

### Risks and Mitigations
- **Permission Issues**: Graceful fallback when cache directory is not writable
- **Corrupted Cache**: JSON parsing errors handled with cache reset
- **Concurrent Access**: Atomic writes prevent race conditions
- **Cache Growth**: Only stores last query per command type (bounded size)

### Implementation Impact
- **Code Changes**: Refactored all search commands to use unified cache
- **Testing**: Added comprehensive test suite for cache operations
- **Migration**: Automatic cleanup of old `.last_query` files
- **Documentation**: Updated command documentation to reflect resume capability
