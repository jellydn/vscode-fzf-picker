# Decision: Git Preview for Untracked Files

## Status
Proposed

## Context

When using the git status file picker in vscode-finditfaster, untracked files (files not yet added to git) show an empty preview pane. This is because the default preview command `git diff --color=always -- {}` only works for files that are already tracked by git.

Users expect to see file content when previewing untracked files, similar to how they can preview tracked files' changes.

## Decision

Implement a smart preview command that:
1. Detects whether a file is tracked or untracked
2. Shows git diff for tracked/modified files
3. Shows file content for untracked files
4. Maintains performance and user experience

## Consequences

### Positive
- Consistent preview experience for all files in git status
- Better user experience when reviewing untracked files
- No need for users to manually configure different preview commands

### Negative
- Slightly more complex preview command
- Small performance overhead for file status detection
- Need to handle edge cases (binary files, large files, etc.)

## Alternatives Considered

### 1. Separate Preview Commands
Have two different preview commands - one for tracked and one for untracked files.
- **Pros**: Simple implementation
- **Cons**: Complex UI, difficult to configure

### 2. Always Show File Content
Show full file content for all files instead of git diff.
- **Pros**: Simple, consistent
- **Cons**: Loses valuable diff information for tracked files

### 3. Documentation Only
Document the limitation and provide example custom preview commands.
- **Pros**: No code changes needed
- **Cons**: Poor user experience, manual configuration required

## Implementation Notes

The smart preview command will be implemented as a shell script that:
```bash
# Check if file is tracked by git
if git ls-files --error-unmatch {} 2>/dev/null; then
  # File is tracked - show diff
  git diff --color=always -- {}
else
  # File is untracked - show content
  # Could use bat, cat, or other file viewers
  cat {}
fi
```

Additional considerations:
- Handle binary files gracefully
- Support syntax highlighting if available (e.g., using `bat`)
- Respect file size limits to prevent hanging on large files
- Provide fallback for permission-denied scenarios