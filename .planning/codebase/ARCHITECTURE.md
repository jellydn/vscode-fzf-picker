# Architecture

## Overview

The extension has a **split-process architecture**:

1. **Extension Host** (`src/extension.ts`) — lives inside VS Code, registers commands, manages config, creates terminals
2. **Terminal Process** (`src/commands.ts`) — standalone script spawned in a terminal, runs rg/fzf, opens selected files

Communication is one-way: extension host → env vars → terminal process. The terminal signals completion via a PID-file watcher.

## Data Flow

```
User presses shortcut (e.g. Cmd+Shift+J)
  │
  ▼
useCommand() → executeTerminalCommand("findFiles")
  │
  ├─ preRunCallback (optional type filter selection)
  ▼
executeCommand()
  │
  ├─ Build env vars (SELECTED_TEXT, TYPE_FILTER, HAS_RESUME, PID_FILE_NAME)
  ├─ Write PID to file for watch mechanism
  ├─ Build shell command string
  ▼
Create terminal → sendText(command)
  │
  ▼
[separate process] commands.ts
  ├─ execSync(require.main === module) dispatcher
  ├─ executeCommand(func) wraps the command module
  ├─ Command module (find-files.ts, live-grep.ts, etc.)
  │   ├─ spawn(rg) → pipe → spawn(fzf)
  │   └─ returns selected file paths
  ├─ openFiles() parses file:line:col from fzf output
  ├─ buildOpenFileCommand() constructs editor CLI command
  └─ exec() each file via editor command + update PID file to "0"
  │
  ▼
PID file change (file → "0" or deleted)
  │
  ▼
watch() fires → hide/dispose terminal
```

## Entry Points

| Entry              | Bundle             | Purpose                                                                 |
| ------------------ | ------------------ | ----------------------------------------------------------------------- |
| `src/extension.ts` | `out/extension.js` | VS Code extension host — registers commands, manages terminal lifecycle |
| `src/commands.ts`  | `out/commands.js`  | Standalone CLI — runs in terminal, dispatches to command modules        |

## Command Modules (all in `src/commands/`)

| Module               | Export                                                   | rg Command                  | Description                             |
| -------------------- | -------------------------------------------------------- | --------------------------- | --------------------------------------- |
| `find-files.ts`      | `findFiles`, `findFilesResume`                           | `rg --files`                | List project files → fzf                |
| `live-grep.ts`       | `liveGrep`, `liveGrepResume`                             | `rg --column --line-number` | Searches file contents → fzf            |
| `git-status.ts`      | `pickFilesFromGitStatus`, `pickFilesFromGitStatusResume` | `git status --porcelain`    | Git status → fzf                        |
| `find-todo-fixme.ts` | `findTodoFixme`, `findTodoFixmeResume`                   | `rg` (custom pattern)       | TODO/FIXME comments → fzf               |
| `type-filter.ts`     | `selectTypeFilter`                                       | —                           | QuickPick UI for rg file type filtering |

## Config Layer

- `src/config.ts` — `config` (reactive, from VS Code settings) + `CFG` (mutable global state object)
- Config read on activation and on `onDidChangeConfiguration` events
- Terminal env vars passed to child process

## Key Patterns

- **Reactive lifecycle**: `defineExtension(() => { ... reactive setup ... })` with `useCommand` for registration
- **PID file watch**: Extension creates a PID file, terminal process sets it to "0" on completion, `fs.watch` triggers hide/dispose
- **Query resume**: Last search query saved to filesystem cache, replayed via `HAS_RESUME` env var
- **fzf integration**: spawn rg → pipe stdout → fzf stdin, parse selected output for file:line:column
- **Preview toggling**: `Ctrl+G` and `Ctrl+T` (gitignore toggle) keybindings passed to fzf
