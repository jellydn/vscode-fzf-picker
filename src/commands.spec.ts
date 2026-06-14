import { describe, expect, it } from "vitest";
import { buildOpenFileCommand, openFiles } from "./commands";

describe("buildOpenFileCommand", () => {
	it("includes line and column inside the quoted file path string", () => {
		const cmd = buildOpenFileCommand("code -g", "/path/to/file.ts", {
			start: { line: 42, character: 15 },
			end: { line: 42, character: 15 },
		});
		// The full file:line:col string must be inside the quotes
		expect(cmd).toBe('code -g "/path/to/file.ts:42:15"');
		// No colons outside quotes
		expect(cmd).toMatch(/"[^"]+"$/);
	});
	it("includes line and column when character is 0", () => {
		const cmd = buildOpenFileCommand("code -g", "/path/to/file.ts", {
			start: { line: 42, character: 0 },
			end: { line: 42, character: 0 },
		});
		expect(cmd).toBe('code -g "/path/to/file.ts:42:0"');
	});
	it("handles file path with spaces", () => {
		const cmd = buildOpenFileCommand("code -g", "/path/to/my file.ts", {
			start: { line: 10, character: 5 },
			end: { line: 10, character: 5 },
		});
		expect(cmd).toBe('code -g "/path/to/my file.ts:10:5"');
	});
	it("handles file path without selection (no regression)", () => {
		const cmd = buildOpenFileCommand("code -g", "/path/to/file.ts");
		expect(cmd).toBe('code -g "/path/to/file.ts"');
	});
	it("escapes existing double quotes in the path", () => {
		const cmd = buildOpenFileCommand("cursor -g", '/path/with"quote/file.ts', {
			start: { line: 10, character: 0 },
			end: { line: 10, character: 0 },
		});
		expect(cmd).toBe('cursor -g "/path/with\\"quote/file.ts:10:0"');
	});
});
describe("openFiles", () => {
	it("should parse simple file path without line/column", () => {
		const result = openFiles("src/commands.ts");
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toBeUndefined();
	});
	it("should parse file path with line number", () => {
		const result = openFiles("src/commands.ts:42");
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toEqual({
			start: { line: 42, character: 0 },
			end: { line: 42, character: 0 },
		});
	});
	it("should parse file path with line and column numbers", () => {
		const result = openFiles("src/commands.ts:42:15");
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toEqual({
			start: { line: 42, character: 15 },
			end: { line: 42, character: 15 },
		});
	});
	it("should handle file paths with ANSI color codes", () => {
		const colorizedPath =
			"\x1b[0m\x1b[35msrc/commands.ts\x1b[0m:\x1b[0m\x1b[32m42\x1b[0m:\x1b[0m15\x1b[0m:	// TODO: fix this";
		const result = openFiles(colorizedPath);
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toEqual({
			start: { line: 42, character: 15 },
			end: { line: 42, character: 15 },
		});
	});
	it("should handle complex ANSI color codes with multiple escape sequences", () => {
		const complexColorPath =
			"\x1b[0m\x1b[35msrc/extension.ts\x1b[0m:\x1b[0m\x1b[32m208\x1b[0m:\x1b[0m7\x1b[0m:			// \x1b[1m\x1b[31mTODO\x1b[0m: Support those settings";
		const result = openFiles(complexColorPath);
		expect(result.file).toBe("src/extension.ts");
		expect(result.selection).toEqual({
			start: { line: 208, character: 7 },
			end: { line: 208, character: 7 },
		});
	});
	it("should handle file paths with spaces", () => {
		const result = openFiles("src/my file.ts:10:5");
		expect(result.file).toBe("src/my file.ts");
		expect(result.selection).toEqual({
			start: { line: 10, character: 5 },
			end: { line: 10, character: 5 },
		});
	});
	it("should handle invalid line numbers gracefully", () => {
		const result = openFiles("src/commands.ts:invalid:15");
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toBeUndefined();
	});
	it("should handle negative line numbers gracefully", () => {
		const result = openFiles("src/commands.ts:-1:5");
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toBeUndefined();
	});
	it("should strip ANSI codes but preserve file paths with colons in content", () => {
		const pathWithContent =
			"\x1b[0m\x1b[35msrc/config.ts\x1b[0m:\x1b[0m\x1b[32m42\x1b[0m:\x1b[0m8\x1b[0m:	const url = 'https://example.com:8080';";
		const result = openFiles(pathWithContent);
		expect(result.file).toBe("src/config.ts");
		expect(result.selection).toEqual({
			start: { line: 42, character: 8 },
			end: { line: 42, character: 8 },
		});
	});
	it("should trim whitespace from file paths", () => {
		const result = openFiles("  src/commands.ts  :42:15");
		expect(result.file).toBe("src/commands.ts");
		expect(result.selection).toEqual({
			start: { line: 42, character: 15 },
			end: { line: 42, character: 15 },
		});
	});
});
