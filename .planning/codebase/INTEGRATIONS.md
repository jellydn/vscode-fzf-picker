# Integrations

## VS Code API

The extension depends entirely on the VS Code Extension API (`@types/vscode` 1.93.0):

### API Surface Used

| API                                  | Usage                                           | File                                     |
| ------------------------------------ | ----------------------------------------------- | ---------------------------------------- |
| `window.createTerminal`              | Spawn fzf/rg commands in a terminal             | `src/extension.ts`                       |
| `window.createQuickPick`             | Type filter selection UI                        | `src/commands/type-filter.ts`            |
| `window.showQuickPick`               | Custom task selection                           | `src/extension.ts`                       |
| `window.showErrorMessage`            | User-facing error messages                      | `src/extension.ts`                       |
| `commands.registerCommand`           | Expose findFiles, findWithinFiles, etc.         | `src/extension.ts` (via reactive-vscode) |
| `workspace.onDidChangeConfiguration` | React to setting changes                        | `src/extension.ts`                       |
| `workspace.workspaceFolders`         | Determine project root                          | `src/extension.ts`                       |
| `window.activeTextEditor`            | Read selected text for query pre-fill           | `src/extension.ts`                       |
| `TerminalLocation`                   | Terminal placement (Editor/Panel, configurable) | `src/extension.ts`                       |

### reactive-vscode Wrapper

- `defineExtension` — extension lifecycle
- `useCommand` — VS Code command registration
- `extensionContext` — extension path and state access
- `defineConfig` — typed config access with reactive updates
- `defineLogger` — output channel logger

## External CLI Tools (user-installed)

The extension shells out to these tools — they must be on `PATH`:

- **fzf** — interactive fuzzy selector
- **rg** (ripgrep) — file search and content search
- **bat** — file preview with syntax highlighting
- **sed** — stream editing for path processing

## No APIs, Databases, Auth Providers

- Zero external HTTP APIs
- Zero databases
- Zero auth providers or webhooks
- Zero cloud services

## Cache System

- **Local filesystem cache** (`~/.cache/fzf-picker` or configurable)
- Stores last search query for resume functionality
- IO via `node:fs` in `src/utils/search-cache.ts`
