# 3. FZF Picker Extension Architecture and Design

Date: 2025-01-11

## Status

Accepted

## Context

The Find It Faster (FZF Picker) VSCode extension is a sophisticated file search and navigation tool that integrates the powerful command-line tools `fzf` (fuzzy finder) and `rg` (ripgrep) into the VSCode environment. This extension was originally forked from vscode-finditfaster to provide enhanced functionality and better integration with fuzzy finding workflows.

The extension needs to provide:
- Fast file searching across large codebases
- Text search within files with live preview
- Git status integration for modified files
- TODO/FIXME comment discovery
- Customizable search workflows
- Seamless integration with VSCode's editor experience

## Decision

We have adopted a **layered architecture** with **command-terminal hybrid execution model** that separates concerns between VSCode integration, command orchestration, and external tool execution.

### Architecture Components

#### 1. **Extension Layer** (`extension.ts`)
- **Primary Role**: VSCode API integration and lifecycle management
- **Key Responsibilities**:
  - Command registration and activation
  - Configuration management using reactive-vscode
  - Terminal management and lifecycle
  - User interface interactions (QuickPick, selections)
  - Environment variable coordination between VSCode and shell commands

#### 2. **Command Orchestration Layer** (`commands.ts`)
- **Primary Role**: Bridge between VSCode commands and shell execution
- **Key Responsibilities**:
  - Command parsing and argument handling
  - File path processing and shell escaping
  - Process execution and output handling
  - Integration with VSCode's file opening API
  - Error handling and graceful degradation

#### 3. **Search Implementation Layer** (`commands/`)
- **Primary Role**: Specialized search implementations
- **Key Components**:
  - `find-files.ts`: File discovery using `rg --files` + `fzf`
  - `live-grep.ts`: Live text search using `rg` + `fzf --phony`
  - `git-status.ts`: Git integration for modified files
  - `find-todo-fixme.ts`: Pattern-based comment discovery
- **Common Pattern**: Spawn processes, pipe data, handle user selections

#### 4. **Utility Layer** (`utils/`)
- **Primary Role**: Shared functionality and cross-cutting concerns
- **Key Components**:
  - `search-cache.ts`: Unified caching system for search queries
  - Configuration helpers and path utilities

#### 5. **Configuration Layer** (`config.ts`)
- **Primary Role**: Centralized configuration management
- **Key Responsibilities**:
  - User setting synchronization
  - Default value management
  - Runtime configuration state
  - Type-safe configuration access

### Key Architectural Decisions

#### **1. Terminal-Based Execution Model**
- **Decision**: Execute search commands in VSCode terminal instead of hidden processes
- **Rationale**: 
  - Provides visual feedback to users
  - Allows interactive fzf usage (preview toggles, key bindings)
  - Enables easy debugging and transparency
  - Maintains process isolation

#### **2. Hybrid Process Management**
- **Decision**: Combine VSCode terminal commands with Node.js child processes
- **Rationale**:
  - Terminal for interactive fzf sessions
  - Node.js processes for programmatic rg execution
  - Best of both worlds: interactivity + control

#### **3. Environment Variable Configuration**
- **Decision**: Pass configuration through environment variables
- **Rationale**:
  - Decouples VSCode configuration from shell commands
  - Enables dynamic configuration injection
  - Supports both Windows and Unix-like systems

#### **4. Reactive Configuration System**
- **Decision**: Use reactive-vscode for configuration management
- **Rationale**:
  - Automatic configuration updates
  - Type-safe configuration access
  - Reduced boilerplate code

#### **5. Unified Search Cache**
- **Decision**: Centralized cache system for all search commands
- **Rationale**:
  - Consistent resume functionality across all search types
  - Project-aware caching
  - Atomic cache operations

#### **6. Command Pattern Implementation**
- **Decision**: Standardized command structure with pre/post callbacks
- **Rationale**:
  - Consistent command lifecycle
  - Extensible for new search types
  - Clear separation of concerns

### Data Flow Architecture

```
User Input → VSCode Command → Extension Layer → Terminal/Process → External Tools → Results → File Opening
     ↓                                                                     ↓
Configuration System ←→ Environment Variables ←→ Search Cache ←→ Search Results
```

### External Tool Integration

#### **FZF Integration**
- **Preview System**: Dynamic preview commands based on file type
- **Key Bindings**: Ctrl+G for preview toggle, standard fzf navigation
- **Configuration**: Flexible preview window positioning and styling
- **Multi-selection**: Support for opening multiple files simultaneously

#### **Ripgrep Integration**
- **File Discovery**: `rg --files` with gitignore support
- **Text Search**: `rg` with live filtering and syntax highlighting
- **Type Filtering**: File type restrictions for targeted searches
- **Pattern Matching**: Regex support for TODO/FIXME discovery

#### **Git Integration**
- **Status Tracking**: Integration with `git status` for modified files
- **Diff Previews**: Live diff display in fzf preview window
- **Ignored Files**: Respect .gitignore patterns by default

### Security Considerations

#### **Shell Command Injection Prevention**
- **File Path Escaping**: Proper shell escaping for file paths with spaces/special characters
- **Command Sanitization**: Controlled command construction with predefined patterns
- **Environment Isolation**: Separate environment variables prevent cross-contamination

#### **Process Management**
- **Resource Cleanup**: Proper terminal and process disposal
- **Error Handling**: Graceful degradation on external tool failures
- **Timeout Management**: Process lifecycle monitoring

### Performance Optimizations

#### **Lazy Loading**
- **Command Registration**: Commands registered only when needed
- **Configuration Loading**: Reactive configuration updates
- **Process Spawning**: On-demand process creation

#### **Caching Strategy**
- **Query Caching**: Recent search queries cached per project
- **Configuration Caching**: In-memory configuration state
- **Result Streaming**: Pipe-based data transfer between processes

#### **Memory Management**
- **Process Cleanup**: Automatic terminal disposal after use
- **Stream Management**: Proper pipe closure and cleanup
- **Cache Expiration**: Time-based cache invalidation

## Consequences

### Positive
- **Scalability**: Handles large codebases efficiently through external tools
- **Flexibility**: Highly configurable search workflows
- **Performance**: Leverages optimized external tools (fzf, ripgrep)
- **User Experience**: Familiar fzf interface with VSCode integration
- **Extensibility**: Easy to add new search commands and workflows
- **Maintainability**: Clear separation of concerns and modular design

### Negative
- **External Dependencies**: Requires fzf, ripgrep, and bat to be installed
- **Platform Complexity**: Different behavior on Windows vs Unix-like systems
- **Process Management**: Complex terminal and process lifecycle management
- **Configuration Complexity**: Multiple configuration layers and environment variables
- **Debugging Complexity**: Harder to debug across multiple processes and tools

### Risks
- **Tool Availability**: Extension fails if external tools are not installed
- **Process Leaks**: Potential resource leaks if cleanup fails
- **Configuration Drift**: Environment variables may become inconsistent
- **Platform Differences**: Behavior differences across operating systems

### Mitigations
- **Graceful Degradation**: Clear error messages when tools are missing
- **Resource Monitoring**: Proper cleanup and disposal patterns
- **Configuration Validation**: Type-safe configuration with validation
- **Cross-Platform Testing**: Comprehensive testing across platforms
- **Documentation**: Clear setup instructions and troubleshooting guides

## Technical Specifications

### Key Files and Responsibilities

| File | Primary Responsibility | Key Patterns |
|------|----------------------|--------------|
| `extension.ts` | VSCode integration | Command registration, reactive configuration |
| `commands.ts` | Command orchestration | Process spawning, file opening |
| `commands/find-files.ts` | File search | rg + fzf pipeline |
| `commands/live-grep.ts` | Text search | Live filtering with fzf --phony |
| `commands/git-status.ts` | Git integration | Git status parsing |
| `commands/find-todo-fixme.ts` | Comment discovery | Pattern-based search |
| `utils/search-cache.ts` | Cache management | Atomic file operations |
| `config.ts` | Configuration | Reactive configuration state |

### Configuration Architecture

The extension uses a three-tier configuration system:
1. **VSCode Settings**: User-configurable settings in settings.json
2. **Runtime Configuration**: In-memory state managed by reactive-vscode
3. **Environment Variables**: Bridge between VSCode and shell commands

### Command Lifecycle

1. **Registration**: Commands registered in package.json and extension.ts
2. **Invocation**: User triggers command via keyboard shortcut or command palette
3. **Preparation**: Pre-run callbacks (type filtering, custom task selection)
4. **Execution**: Terminal command execution with environment variables
5. **Processing**: External tool execution (fzf, rg) with user interaction
6. **Results**: File opening and post-run callbacks
7. **Cleanup**: Terminal disposal and resource cleanup

## Future Considerations

### Planned Enhancements
- **Workspace Multi-root Support**: Enhanced multi-workspace search
- **Custom Preview Commands**: User-defined preview commands
- **Search History**: Extended search history and favorites
- **Integration Plugins**: Support for additional external tools

### Architectural Evolution
- **Plugin Architecture**: Support for third-party search providers
- **Language Server Integration**: Semantic search capabilities
- **Performance Monitoring**: Built-in performance metrics
- **Configuration Migration**: Smooth configuration updates

This architecture provides a solid foundation for a high-performance, extensible file search tool that leverages the best of both VSCode's integration capabilities and the power of command-line tools.