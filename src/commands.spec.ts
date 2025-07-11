import * as childProcess from "node:child_process";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findFiles } from "./commands/find-files";
import { findTodoFixme, findTodoFixmeResume } from "./commands/find-todo-fixme";
import { liveGrep } from "./commands/live-grep";
import { getLastQuery, saveLastQuery } from "./utils/search-cache";

vi.mock("node:child_process");
vi.mock("node:fs");
vi.mock("./utils/search-cache", () => ({
	saveLastQuery: vi.fn(),
	getLastQuery: vi.fn(),
	clearCache: vi.fn(),
}));

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
			expect.arrayContaining(["--no-ignore"]),
		);
	});

	it("should handle file type filtering", async () => {
		process.env.TYPE_FILTER = "ts:js";
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
			expect.arrayContaining(["--type", "ts", "--type", "js"]),
		);
	});

	it("should return an empty array when fzf process exits with non-zero code", async () => {
		const mockSpawn = vi.spyOn(childProcess, "spawn");

		// Mock rg process
		const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };

		// Mock fzf process with non-zero exit code
		const mockFzf = {
			stdin: { end: vi.fn() },
			stdout: { on: vi.fn() },
			on: vi.fn().mockImplementation((event, callback) => {
				if (event === "close") {
					callback(1);
				}
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

	// Edge cases for file selection without search query
	describe("arrow key selection edge cases", () => {
		it("should handle file selection via arrow keys without search query", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");

			// Mock rg process
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };

			// Mock fzf process that simulates user selecting file via arrow keys (no search input)
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data") {
							// Simulate fzf output: empty query line + selected file
							// When user selects via arrow keys without typing: empty query + newline + filename
							callback("\nfile1.txt");
						}
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

			await findFiles([testDir], ""); // Empty initial query

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

			// Mock rg process
			const mockRg = { stdout: { pipe: vi.fn() }, on: vi.fn() };

			// Mock fzf process that returns files with empty lines
			const mockFzf = {
				stdin: { end: vi.fn() },
				stdout: {
					on: vi.fn().mockImplementation((event, callback) => {
						if (event === "data") {
							// Simulate fzf output with empty lines
							callback("search query\nfile1.txt\n\nfile2.txt\n \n");
						}
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
});

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

		await findTodoFixme([testDir], initialQuery);

		expect(mockSpawn).toHaveBeenCalledWith(
			"fzf",
			expect.arrayContaining(["--query", initialQuery, "--print-query"]),
			expect.any(Object),
		);
	});

	it("should not pass query parameter when initialQuery is not provided", async () => {
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

	// Edge cases following JavaScript testing best practices
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
			const longQuery = "TODO: ".repeat(100) + "fix this";
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

	// Error handling edge cases
	describe("error handling", () => {
		it("should reject when rg spawn fails", async () => {
			const mockSpawn = vi.spyOn(childProcess, "spawn");
			const mockRg = {
				stdout: { pipe: vi.fn() },
				on: vi.fn().mockImplementation((event, callback) => {
					if (event === "error") callback(new Error("rg not found"));
				}),
			};

			mockSpawn.mockImplementation((command) => {
				if (command === "rg")
					return mockRg as unknown as childProcess.ChildProcess;
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
					if (event === "close") callback(130); // SIGINT
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

	// Query caching functionality
	describe("query caching", () => {
		const mockSaveLastQuery = vi.mocked(saveLastQuery);
		const mockGetLastQuery = vi.mocked(getLastQuery);

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

			expect(result).toEqual(["result1:1:content"]);
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

			// Should not throw even if cache save fails
			const result = await findTodoFixme([testDir], initialQuery);
			expect(result).toEqual(["result1:1:content"]);
		});
	});

	// Resume functionality
	describe("findTodoFixmeResume", () => {
		const mockGetLastQuery = vi.mocked(getLastQuery);

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

			mockGetLastQuery.mockResolvedValue(lastQuery);

			const result = await findTodoFixmeResume([testDir]);

			expect(mockGetLastQuery).toHaveBeenCalled();
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.arrayContaining(["--query", lastQuery]),
				expect.any(Object),
			);
			expect(result).toEqual(["result1:1:content"]);
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

			mockGetLastQuery.mockResolvedValue(null);

			const result = await findTodoFixmeResume([testDir]);

			expect(mockGetLastQuery).toHaveBeenCalled();
			expect(mockSpawn).toHaveBeenCalledWith(
				"fzf",
				expect.not.arrayContaining(["--query"]),
				expect.any(Object),
			);
			expect(result).toEqual(["result1:1:content"]);
		});
	});
});
