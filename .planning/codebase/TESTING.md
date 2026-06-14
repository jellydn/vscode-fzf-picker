# Testing

## Framework

- **vitest** 4.1.8 — test runner
- **vite** 8.0.16 — vitest bundler
- **vi** globals — `vi.mock`, `vi.spyOn`, `vi.resetAllMocks`, `vi.clearAllMocks`

## Test Files

| File                             | Tests | Lines | Scope                                                                                                      |
| -------------------------------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------- |
| `src/commands.spec.ts`           | 43    | 889   | `openFiles` parsing, `findFiles`/`liveGrep`/`findTodoFixme` spawned process behavior, bug regression tests |
| `src/utils/search-cache.spec.ts` | 20    | 391   | Cache read/write/clear, OS-specific path resolution                                                        |
| `src/utils/path.spec.ts`         | 7     | 38    | `normalizeRgPath` and `resolveFilePath` unit tests                                                         |

**Total**: 70 tests across 3 files

## Test Patterns

### Process Spawning Tests

Command modules (findFiles, liveGrep, findTodoFixme) are tested by mocking `child_process.spawn`:

```typescript
const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
const mockFzf = {
  stdin: { end: vi.fn() },
  stdout: { on: vi.fn() },
  on: vi.fn().mockImplementation((event, callback) => {
    if (event === "close") callback(0);
  }),
};
vi.spyOn(childProcess, "spawn").mockImplementation((command) => {
  if (command === "rg") return mockRg;
  if (command === "fzf") return mockFzf;
  return {};
});
```

Key patterns:

- Mock processes implement `stdout.on("data", ...)` to simulate fzf output
- Mock `on("close", callback)` with exit code 0 or non-zero
- Tests verify fzf arguments passed correctly
- `beforeEach` resets all mocks

### File Parsing Tests

`openFiles()` tests validate ANSI code stripping, file:line:column parsing:

- Normal paths: `src/commands.ts:42:15`
- ANSI-colored paths (rg --color=always output)
- Edge cases: negative line numbers, non-numeric values, whitespace trimming

### Utility Tests

Pure function tests for `normalizeRgPath` and `resolveFilePath`:

- `./` prefix stripping
- Multiple `./` prefixes
- Paths without prefix (no regression)

### Bug Regression Tests

`commands.spec.ts` includes explicit bug regression describe blocks:

- Line number outside quotes
- ./ prefix path resolution
- Deprecated --phony flag
- Empty paths array after chdir

## Mocking Strategy

- `vi.spyOn(childProcess, "spawn")` — mock process creation
- `vi.spyOn(process, "chdir")` — prevent actual directory changes
- `vi.mocked(saveLastQuery)` — mock cache calls
- `vi.mock("node:child_process")` — in some test setups
- No VS Code API mocking needed for terminal process tests

## Coverage

- 3 test files, 70 tests
- No coverage thresholds configured
- No E2E tests
- No integration tests with actual fzf/rg processes
