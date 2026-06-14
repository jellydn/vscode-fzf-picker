# Technology Stack

## Languages

- **TypeScript** 6.0.3 — all source code
- **JavaScript** — CJS output via tsup bundling

## Runtime

- **Node.js** LTS (primary) — used in VS Code extension host + terminal process
- **Bun** (optional) — configurable as alternative runtime via `fzf-picker.general.runtime`
- Runtime detection in `src/utils/runtime.ts`

## Package Manager

- **pnpm** 10.22.0 (pinned via `packageManager` field in `package.json`)

## Build System

- **tsup** 8.5.1 — bundles CJS output from 2 entry points (`src/extension.ts`, `src/commands.ts`)
- **vscode-ext-gen** 1.6.0 — auto-generates `src/generated/meta.ts` from package.json manifests

## VS Code Extension

- **@vscode/vsce** 3.9.2 — packaging and publishing
- **@types/vscode** 1.93.0 — VS Code API types (engine target)
- **reactive-vscode** 1.0.2 — reactive API wrapper for VS Code extension lifecycle

## Testing

- **vitest** 4.1.8 — test runner
- **vite** 8.0.16 — vitest bundler
- **vi.mock / vi.spyOn** — module mocking for process spawning tests

## Linting & Formatting

- **Biome** 2.5.0 — lint + format (single tool)
- Configured in `biome.json` with git VCS integration

## CLI Commands

- **nr** (via @antfu/ni 30.1.0) — unified package manager runner
- **bumpp** 11.1.0 — version bumping for releases
- **oxlint** ^1.69.0 — additional linting (not actively configured)

## External Tools (required by users)

- **fzf** — command-line fuzzy finder
- **ripgrep (rg)** — fast recursive search
- **bat** — file preview with syntax highlighting
- **sed** — stream editor (used for file path processing)

## Configuration Files

| File             | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `tsconfig.json`  | TypeScript config (ES2017 target, bundler resolution) |
| `biome.json`     | Lint/format rules, git VCS integration                |
| `tsup.config.ts` | Build entry points and output config                  |
| `.nvmrc`         | Node.js version (lts/\*)                              |
