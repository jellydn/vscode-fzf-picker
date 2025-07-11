# Decision: Syntax Highlighting for Untracked Files

## Status
Proposed

## Context

When previewing untracked files in the git status file picker, users currently see plain text without syntax highlighting. This makes it difficult to read and understand code files, configuration files, and other structured content.

Modern terminal tools like `bat` provide syntax highlighting for file content, which significantly improves readability and user experience. However, there are considerations around tool availability, performance, and fallback strategies.

## Decision

Implement syntax highlighting for untracked file previews using `bat` as the primary tool, with fallback strategies:

1. **Primary**: Use `bat --color=always --style=plain {}` for syntax highlighted preview
2. **Fallback**: Use `cat {}` when `bat` is not available
3. **Detection**: Check for `bat` availability at runtime
4. **Configuration**: Allow users to override the preview command

## Consequences

### Positive
- Enhanced readability for code files and structured content
- Better user experience when reviewing untracked files
- Consistent with modern terminal tool standards
- Maintains compatibility with systems without `bat`

### Negative
- Additional dependency on `bat` (though optional)
- Slight performance overhead for syntax parsing
- Need to handle edge cases (binary files, unsupported file types)
- Potential compatibility issues on systems without proper terminal support

## Alternatives Considered

### 1. Always Use Plain Text
Continue using `cat` for all untracked files.
- **Pros**: Simple, no dependencies, fast
- **Cons**: Poor readability for code files, suboptimal user experience

### 2. Multiple Tool Support
Support multiple syntax highlighting tools (bat, highlight, pygmentize).
- **Pros**: Maximum compatibility and user choice
- **Cons**: Complex configuration, harder to maintain

### 3. VSCode Integration
Use VSCode's built-in syntax highlighting via extensions.
- **Pros**: Consistent with VSCode experience
- **Cons**: Complex implementation, performance concerns, dependency on VSCode APIs

### 4. User Configuration Only
Require users to manually configure their preferred syntax highlighting.
- **Pros**: Full user control, no assumptions
- **Cons**: Poor default experience, manual setup required

## Implementation Notes

The implementation will enhance the smart preview command to include syntax highlighting:

```bash
# Smart preview with syntax highlighting
file="$1"

# Check if file is tracked by git
if git ls-files --error-unmatch "$file" 2>/dev/null; then
  # File is tracked - show diff with highlighting
  git diff --color=always -- "$file"
else
  # File is untracked - show content with syntax highlighting
  if command -v bat >/dev/null 2>&1; then
    # Use bat for syntax highlighting
    bat --color=always --style=plain "$file" 2>/dev/null || cat "$file"
  else
    # Fallback to plain text
    cat "$file"
  fi
fi
```

### Additional Considerations:

#### Tool Detection
- Check for `bat` availability using `command -v bat`
- Graceful fallback to `cat` when `bat` is unavailable or fails
- Consider system-specific installation paths

#### Performance Optimizations
- Use `--style=plain` to minimize `bat` overhead (no line numbers, grid)
- Handle large files appropriately (bat has built-in limits)
- Consider file size limits to prevent hanging

#### File Type Handling
- Let `bat` handle file type detection automatically
- Graceful handling of binary files (bat detects and shows appropriate message)
- Support for common file types (.js, .ts, .py, .md, .json, .yml, etc.)

#### Configuration Options
- Allow users to override via environment variables:
  - `PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND`
  - `FIND_FILES_PREVIEW_COMMAND`
- Maintain backward compatibility with existing configurations

#### Error Handling
- Handle permission errors gracefully
- Fallback to `cat` if `bat` fails for any reason
- Show meaningful error messages for inaccessible files

#### Cross-Platform Support
- Ensure compatibility across Linux, macOS, and Windows
- Handle different `bat` installation methods (package managers, cargo, etc.)
- Test with various terminal environments

## Related Issues

This decision builds upon:
- Decision 001: Git Preview for Untracked Files
- The need for better developer experience when reviewing code changes
- User feedback about poor readability of plain text previews

## Future Considerations

- Potential integration with other preview enhancement tools
- Theme support to match user's terminal theme
- Configuration for additional `bat` options (line numbers, themes)
- Support for other syntax highlighting tools based on user preference