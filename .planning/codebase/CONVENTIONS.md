# Conventions

## File Naming

- `kebab-case.ts` for all modules (`find-files.ts`, `live-grep.ts`)
- `.spec.ts` suffix for test files
- Export functions named in `camelCase`
- Types/interfaces in `PascalCase`

## Code Style

- **Indentation**: Tabs (VS Code default)
- **Quotes**: Double quotes for strings (consistent across codebase)
- **Semicolons**: Required
- **Trailing commas**: Yes (ES2017+ style)
- **Line wrapping**: ~100 char width, object properties break per-line
- **Type annotations**: Explicit return types on exported functions, inferred on internals

## Imports

- Node builtins first: `import { exec } from "node:child_process"`
- Third-party packages second: `import { defineExtension } from "reactive-vscode"`
- Internal modules last: `import { CFG } from "../config"`
- Empty line between import groups

## Error Handling

- **Promise rejections** for process spawn failures (rg/fzf not found)
- **User-facing errors** via `vscode.window.showErrorMessage()`
- **Graceful fallbacks**: empty array returned on user cancellation, not thrown
- **Cache errors caught silently**: cache save errors won't break the search
- **Debug logging** via `logDebug()` in `commands.ts` (gated by `DEBUG` env var)

## Asynchronous Patterns

- `async/await` throughout
- fzf/RG process lifecycle handled via Promise-wrapped event callbacks
- `new Promise((resolve, reject) => { spawn.on("close", ...) })` pattern in all command modules

## State Management

- `CFG` object in `config.ts` — mutable global state, single source of truth for runtime config
- `cachedRuntimeInfo` in `runtime.ts` — module-level cache for runtime detection
- No class instances or DI — plain module-level state

## Environment Variables

- Extension host passes config to terminal process via env vars:
  - `EXTENSION_PATH`, `SELECTED_TEXT`, `TYPE_FILTER`, `HAS_RESUME`, `PID_FILE_NAME`
  - `FIND_FILES_PREVIEW_ENABLED`, `FIND_WITHIN_FILES_PREVIEW_*`
  - `BAT_THEME`, `OPEN_COMMAND_CLI`, `DEBUG_FZF_PICKER`, `FZF_PICKER_CACHE_DIR`
- Terminal process reads these from `process.env`

## Git Conventions

- **Commit style**: Conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- **Atomic commits**: Single logical change per commit
- **Branch**: Main branch development, feature branches for PRs
