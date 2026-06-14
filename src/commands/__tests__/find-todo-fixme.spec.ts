import * as childProcess from "node:child_process";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLastQuery, saveLastQuery } from "../../utils/search-cache";
import { findTodoFixme, findTodoFixmeResume } from "../find-todo-fixme";

vi.mock("node:child_process");
vi.mock("node:fs");
vi.mock("../../utils/search-cache", () => ({
	saveLastQuery: vi.fn(),
	getLastQuery: vi.fn(),
	clearCache: vi.fn(),
}));

describe("findTodoFixme", () => {
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
	it("should pass initialQuery to fzf when provided", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");
		const initialQuery = "test search";
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
		await findTodoFixme([testDir], initialQuery);
		expect(mockSpawn).toHaveBeenCalledWith(
			"fzf",
			expect.arrayContaining(["--query", initialQuery, "--print-query"]),
			expect.any(Object),
		);
	});
	it("should not pass query parameter when initialQuery is not provided", async () => {
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
		await findTodoFixme([testDir]);
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
	describe("initialQuery edge cases", () => {
		it("should handle empty string initialQuery", async () => {
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
			await findTodoFixme([testDir], "");
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.not.arrayContaining(["--query"]),
				expect.any(Object),
			);
		});
		it("should handle initialQuery with special characters", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const specialQuery = "TODO: fix $var @user #123 (test)";
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
			await findTodoFixme([testDir], specialQuery);
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.arrayContaining(["--query", specialQuery]),
				expect.any(Object),
			);
		});
		it("should handle initialQuery with whitespace", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const whitespaceQuery = "  TODO fix  \t\n  ";
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
			await findTodoFixme([testDir], whitespaceQuery);
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.arrayContaining(["--query", whitespaceQuery]),
				expect.any(Object),
			);
		});
		it("should handle very long initialQuery", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const longQuery = `${"TODO: ".repeat(100)}fix this`;
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
			await findTodoFixme([testDir], longQuery);
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.arrayContaining(["--query", longQuery]),
				expect.any(Object),
			);
		});
	});
	describe("error handling", () => {
		it("should reject when rg spawn fails", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = {
				stdout: { pipe: vi.fn() },
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "error") callback(new Error("rg not found"));
				}),
			};
			// Provide a valid fzf mock because runFzf() now validates stdout/on
			const mockFzf = {
				stdout: { on: vi.fn() },
				on: vi.fn(),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return {} as childProcess.ChildProcess;
			});
			await expect(findTodoFixme([testDir])).rejects.toThrow(
				"Failed to start rg: rg not found",
			);
		});
		it("should reject when fzf spawn fails", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: { on: vi.fn() },
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "error") callback(new Error("fzf not found"));
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return {} as childProcess.ChildProcess;
			});
			await expect(findTodoFixme([testDir])).rejects.toThrow(
				"Failed to start fzf: fzf not found",
			);
		});
		it("should handle empty paths array", async () => {
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
			const result = await findTodoFixme([]);
			expect(result).toEqual([]);
		});
		it("should return empty array when user cancels (non-zero exit code)", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: { on: vi.fn() },
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "close") callback(130);
				}),
			};
			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
				if (command === "fzf")
					return mockFzf as unknown as childProcess.ChildProcess;
				return {} as childProcess.ChildProcess;
			});
			const result = await findTodoFixme([testDir]);
			expect(result).toEqual([]);
		});
	});
	describe("query caching", () => {
		const mockSaveLastQuery = vi.mocked(saveLastQuery);
		const _mockGetLastQuery = vi.mocked(getLastQuery);
		beforeEach(() => {
			vi.clearAllMocks();
		});
		it("should save query when search is successful and has results", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const initialQuery = "test query";
			const actualQuery = "user entered query";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data")
							callback(`${actualQuery}\nresult1:1:content\n`);
					}),
				},
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
			mockSaveLastQuery.mockResolvedValue();
			const result = await findTodoFixme([testDir], initialQuery);
			expect(result).toEqual([`${testDir}/result1:1:content`]);
			expect(mockSaveLastQuery).toHaveBeenCalledWith(actualQuery);
		});
		it("should not save query when saveQuery is false", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const initialQuery = "test query";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data") callback("result1:1:content\n");
					}),
				},
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
			await findTodoFixme([testDir], initialQuery, false);
			expect(mockSaveLastQuery).not.toHaveBeenCalled();
		});
		it("should not save query when no results are found", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const initialQuery = "test query";
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
			await findTodoFixme([testDir], initialQuery);
			expect(mockSaveLastQuery).not.toHaveBeenCalled();
		});
		it("should handle cache save errors gracefully", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const initialQuery = "test query";
			const actualQuery = "user entered query";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data")
							callback(`${actualQuery}\nresult1:1:content\n`);
					}),
				},
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
			mockSaveLastQuery.mockRejectedValue(new Error("Cache error"));
			const result = await findTodoFixme([testDir], initialQuery);
			expect(result).toEqual([`${testDir}/result1:1:content`]);
		});
	});
	describe("findTodoFixmeResume", () => {
		const _mockGetLastQuery = vi.mocked(getLastQuery);
		beforeEach(() => {
			vi.clearAllMocks();
		});
		it("should resume with last query when available", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const lastQuery = "cached query";
			const actualQuery = "user entered query";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data")
							callback(`${actualQuery}\nresult1:1:content\n`);
					}),
				},
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
			_mockGetLastQuery.mockResolvedValue(lastQuery);
			const result = await findTodoFixmeResume([testDir]);
			expect(_mockGetLastQuery).toHaveBeenCalled();
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.arrayContaining(["--query", lastQuery]),
				expect.any(Object),
			);
			expect(result).toEqual([`${testDir}/result1:1:content`]);
		});
		it("should start fresh search when no last query exists", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const actualQuery = "user entered query";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data")
							callback(`${actualQuery}\nresult1:1:content\n`);
					}),
				},
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
			_mockGetLastQuery.mockResolvedValue(null);
			const result = await findTodoFixmeResume([testDir]);
			expect(_mockGetLastQuery).toHaveBeenCalled();
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.not.arrayContaining(["--query"]),
				expect.any(Object),
			);
			expect(result).toEqual([`${testDir}/result1:1:content`]);
		});
	});
	describe("./ prefix handling", () => {
		beforeEach(() => {
			vi.resetAllMocks();
			vi.spyOn(process, "chdir").mockImplementation(() => {});
		});
		it("strips ./ prefix when prepending singleDirRoot", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const testDir = "/home/user/project";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data")
							callback("query\n./file.py:61:31:TODO: fix me\n");
					}),
				},
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
			const result = await findTodoFixme([testDir]);
			expect(result[0]).toBe("/home/user/project/file.py:61:31:TODO: fix me");
			expect(result[0]).not.toContain("/./");
		});
		it("handles paths without ./ prefix", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const testDir = "/home/user/project";
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data") callback("query\nsrc/file.py:10:5:content\n");
					}),
				},
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
			const result = await findTodoFixme([testDir]);
			expect(result[0]).toBe("/home/user/project/src/file.py:10:5:content");
		});
	});
});
