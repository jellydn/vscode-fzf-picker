# Concerns

## Technical Debt

### 1. Dual Dispatch Pattern in `src/extension.ts`

The `Command` interface and `commands` map define `preRunCallback`/`postRunCallback`, but the switch statement in `executeTerminalCommand()` duplicates routing logic for `withTextSelection` and `hasFilter`. These should be consolidated into the command table. ~15 lines of dead code (`getCommandString`, unreachable `default` branch) remain from the previous iteration.

### 2. Large Test File

`src/commands.spec.ts` is 889 lines. While well-organized with clear section headers, it's approaching the 1k threshold. The previous attempt to split it was reverted. Consider splitting into per-module test files (`find-files.spec.ts`, `find-todo-fixme.spec.ts`, etc.).

### 3. CLI Orchestration in `src/commands.ts`

The `if (require.main === module) { const executeCommand = async ... }` block is ~200 lines of nested closure containing CLI orchestration, error handling, debug logging, env var parsing, and PID-file cleanup. Extractable into a dedicated `src/cli/runner.ts`.

### 4. Manual Dispatch Switch in `src/commands.ts`

The `switch (command)` at the bottom mirrors the command table in `extension.ts`. The dispatch could be driven by a mapping object.

## Bugs & Potential Issues

### 1. `vscode-ext-gen` Not in Scripts

The `prepare` script runs `nr update` which runs `vscode-ext-gen`, but the generated `meta.ts` is out of sync when `package.json` changes unless `pnpm install` is run. This can cause type errors.

### 2. Peer Dep Warning

`reactive-vscode 1.0.2` expects `@types/vscode@^1.101.0` but the project pins `@types/vscode@1.93.0`. This may miss newer VS Code API types. The extension still works (runtime API is backward-compatible), but type-level features from newer VS Code versions aren't accessible.

### 3. Terminal Reuse Edge Case

`getOrCreateTerminal()` reuses an existing terminal by name. If a user manually closes the terminal tab, VS Code may leave a stale reference in `vscode.window.terminals`. The cache state (`CFG`) is not reset on manual terminal closure.

## Security

No security concerns — the extension only runs local CLI tools (fzf, rg, bat, git) and opens files via the editor's CLI. No network access, no user data transmission, no dependency on external APIs.

## Performance

### Terminal Overhead

Each fzf command creates a VS Code terminal, which has ~100-200ms startup overhead. Terminal reuse (by name) mitigates this after the first invocation.

### Process Overhead

rg + fzf pipeline spawn overhead. rg is fast for file listing and pattern matching, but for very large repositories (>100k files), the initial `rg --files` scan may take 1-2 seconds.

## Fragile Areas

### PID File Watch Mechanism

The extension writes a PID file and watches it for changes to detect command completion. This is a cross-process signaling mechanism using the filesystem. Race conditions:

- What if the terminal process exits before writing "0"?
- What if the file watcher fires before the write completes?
- What if the user manually terminates the terminal?

### rg/fzf Assumptions

- All command modules assume `rg` and `fzf` are on `PATH`
- No graceful fallback if tools are missing (process spawn will throw)
- fzf flags like `--phony` (deprecated) need to stay compatible

## Out of Scope

- No E2E tests with actual fzf/rg execution
- No VS Code integration tests
- No Windows CI (`.github/workflows/` has Claude-based workflows)
