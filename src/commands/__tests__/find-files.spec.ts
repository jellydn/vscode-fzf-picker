import * as childProcess from "node:child_process";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findFiles } from "../find-files";
import { liveGrep } from "../live-grep";

vi.mock("node:child_process");
vi.mock("node:fs");

describe("findFiles", () => {
	const cwd = process.cwd();
	const testDir = path.join(cwd, "src");
	beforeEach(() => {
		vi.resetAllMocks();
		vi.resetModules();
		vi.spyOn(process, "chdir").mockImplementation(() => {});
		process.chdir(testDir);
	});
	afterEach(() => {
		vi.clearAllMocks();
		process.chdir(cwd);
	});
	it("should use gitignore by default", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		// Mock rg and fzf processes
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(0);
			}),
		};
		mockSpawn.mockImplementation((command) => {
			if (command === "rg")
				return mockRg as unknown as childProcess.ChildProcess;
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return {} as childProcess.ChildProcess;
		});
		await findFiles([testDir]);
		expect(mockSpawn).toHaveBeenCalledWith(
			"rg",
			expect.not.arrayContaining(["--no-ignore"]),
		);
	});
	it("should not use gitignore when USE_GITIGNORE is set to 0", async () => {
		process.env.USE_GITIGNORE = "0";
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(0);
			}),
		};
		mockSpawn.mockImplementation((command) => {
			if (command === "rg")
				return mockRg as unknown as childProcess.ChildProcess;
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return {} as childProcess.ChildProcess;
		});
		await findFiles([testDir]);
		expect(mockSpawn).toHaveBeenCalledWith(
			"rg",
			expect.arrayContaining(["--no-ignore"]),
		);
	});
	it("should handle file type filtering", async () => {
		process.env.TYPE_FILTER = "ts:js";
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(0);
			}),
		};
		mockSpawn.mockImplementation((command) => {
			if (command === "rg")
				return mockRg as unknown as childProcess.ChildProcess;
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return {} as childProcess.ChildProcess;
		});
		await findFiles([testDir]);
		expect(mockSpawn).toHaveBeenCalledWith(
			"rg",
			expect.arrayContaining(["--type", "ts", "--type", "js"]),
		);
	});
	it("should return an empty array when fzf process exits with non-zero code", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") callback(1);
			}),
		};
		mockSpawn.mockImplementation((command) => {
			if (command === "fzf")
				return mockFzf as unknown as childProcess.ChildProcess;
			return mockRg as unknown as childProcess.ChildProcess;
		});
		const result = await findFiles([testDir]);
		expect(result).toEqual([]);
	});
	describe("arrow key selection edge cases", () => {
		it("should handle file selection via arrow keys without search query", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data") callback("\nfile1.txt");
					}),
				},
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "close") callback(0);
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return mockRg as unknown as childProcess.ChildProcess;
			});
			const result = await findFiles([testDir]);
			expect(result).toEqual([`${testDir}/file1.txt`]);
		});
		it("should handle empty query without passing --query parameter to fzf", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: { on: vi.fn() },
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "close") callback(0);
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return {} as childProcess.ChildProcess;
			});
			await findFiles([testDir], "");
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.arrayContaining(["--print-query"]),
				expect.any(Object),
			);
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.not.arrayContaining(["--query"]),
				expect.any(Object),
			);
		});
		it("should filter out empty lines from selected files", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data")
							callback("search query\nfile1.txt\n\nfile2.txt\n \n");
					}),
				},
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "close") callback(0);
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return mockRg as unknown as childProcess.ChildProcess;
			});
			const result = await findFiles([testDir]);
			expect(result).toEqual([`${testDir}/file1.txt`, `${testDir}/file2.txt`]);
		});
	});
});
describe("liveGrep", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(process, "chdir").mockImplementation(() => {});
	});
	afterEach(() => {
		vi.clearAllMocks();
	});
	it("should handle errors", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		mockSpawn.mockImplementation(() => {
			throw new Error("Command failed");
		});
		await expect(liveGrep([process.cwd()], "searchText")).rejects.toThrow(
			"Command failed",
		);
	});
	describe("--disabled flag (not deprecated --phony)", () => {
		beforeEach(() => {
			vi.resetAllMocks();
			vi.spyOn(process, "chdir").mockImplementation(() => {});
		});
		it("uses --disabled instead of deprecated --phony", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const testDir = "/home/user/project";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockSh = {
				stdout: { pipe: vi.fn().mockReturnValue(undefined) },
				stderr: { pipe: vi.fn() },
				on: vi.fn(),
			};
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: { on: vi.fn() },
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "close") callback(0);
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
				if (command === "sh")
					return mockSh as unknown as childProcess.ChildProcess;
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return {} as childProcess.ChildProcess;
			});
			await liveGrep([testDir], "test");
			const fzfCall = mockSpawn.mock.calls.find(([cmd]) => cmd === "fzf");
			const fzfArgs = fzfCall?.[1] as string[];
			expect(fzfArgs).not.toContain("--phony");
			expect(fzfArgs).toContain("--disabled");
		});
		it("strips ./ prefix with singleDirRoot", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const testDir = "/home/user/project";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockSh = {
				stdout: { pipe: vi.fn().mockReturnValue(undefined) },
				stderr: { pipe: vi.fn() },
				on: vi.fn(),
			};
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data") callback("query\n./file.py:42:15:content\n");
					}),
				},
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "close") callback(0);
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
				if (command === "sh")
					return mockSh as unknown as childProcess.ChildProcess;
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return {} as childProcess.ChildProcess;
			});
			const result = await liveGrep([testDir], "test");
			expect(result[0]).toBe("/home/user/project/file.py:42:15:content");
			expect(result[0]).not.toContain("/./");
		});
	});
});
