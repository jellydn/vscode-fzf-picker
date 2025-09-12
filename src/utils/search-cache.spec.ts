import { promises as fs } from "node:fs";
import * as os from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, getLastQuery, saveLastQuery } from "./search-cache";

vi.mock("node:fs", () => ({
	promises: {
		mkdir: vi.fn(),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		rename: vi.fn(),
		unlink: vi.fn(),
	},
}));

vi.mock("node:os", () => ({
	homedir: vi.fn(() => "/mock/home"),
	platform: vi.fn(() => "linux"),
}));

// No need to mock vscode anymore - cache utility is now purely environment-based

// Get mocked functions with proper typing
const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);

describe("search-cache", () => {
	const testProjectPath = "/test/project";
	const expectedLinuxCacheDir = join("/mock/home", ".cache", "fzf-picker");
	const expectedCacheFilePath = join(
		expectedLinuxCacheDir,
		"search-cache.json",
	);

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock successful directory creation
		mockFs.mkdir.mockResolvedValue(undefined);
		mockFs.writeFile.mockResolvedValue(undefined);
		mockFs.rename.mockResolvedValue(undefined);

		// Clear environment variables
		delete process.env.FZF_PICKER_CACHE_DIR;
		delete process.env.XDG_CACHE_HOME;
		delete process.env.APPDATA;

		// Default to Linux platform
		mockOs.platform.mockReturnValue("linux");
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("saveLastQuery", () => {
		it("should save query with timestamp and project path", async () => {
			const testQuery = "test TODO query";
			const mockTimestamp = 1234567890;

			vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery(testQuery, testProjectPath);

			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedLinuxCacheDir, {
				recursive: true,
			});

			const expectedCache = {
				findTodoFixme: {
					lastQuery: testQuery,
					timestamp: mockTimestamp,
					projectPath: testProjectPath,
				},
			};

			expect(mockFs.writeFile).toHaveBeenCalledWith(
				`${expectedCacheFilePath}.tmp`,
				JSON.stringify(expectedCache, null, 2),
				"utf-8",
			);

			expect(mockFs.rename).toHaveBeenCalledWith(
				`${expectedCacheFilePath}.tmp`,
				expectedCacheFilePath,
			);
		});

		it("should not save empty queries", async () => {
			await saveLastQuery("", testProjectPath);
			await saveLastQuery("   ", testProjectPath);

			expect(mockFs.writeFile).not.toHaveBeenCalled();
		});

		it("should update existing cache", async () => {
			const existingCache = {
				findTodoFixme: {
					lastQuery: "old query",
					timestamp: 1000,
					projectPath: "/old/project",
				},
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(existingCache));

			const newQuery = "new query";
			const mockTimestamp = 2000;
			vi.spyOn(Date, "now").mockReturnValue(mockTimestamp);

			await saveLastQuery(newQuery, testProjectPath);

			const expectedCache = {
				findTodoFixme: {
					lastQuery: newQuery,
					timestamp: mockTimestamp,
					projectPath: testProjectPath,
				},
			};

			expect(mockFs.writeFile).toHaveBeenCalledWith(
				`${expectedCacheFilePath}.tmp`,
				JSON.stringify(expectedCache, null, 2),
				"utf-8",
			);
		});

		it("should handle file system errors gracefully", async () => {
			mockFs.mkdir.mockRejectedValue(new Error("Permission denied"));

			// Should not throw
			await expect(
				saveLastQuery("test", testProjectPath),
			).resolves.toBeUndefined();
		});
	});

	describe("getLastQuery", () => {
		it("should return cached query for matching project path", async () => {
			const testQuery = "cached query";
			const cache = {
				findTodoFixme: {
					lastQuery: testQuery,
					timestamp: Date.now(),
					projectPath: testProjectPath,
				},
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(cache));

			const result = await getLastQuery(testProjectPath);

			expect(result).toBe(testQuery);
			expect(mockFs.readFile).toHaveBeenCalledWith(
				expectedCacheFilePath,
				"utf-8",
			);
		});

		it("should return null for different project path", async () => {
			const cache = {
				findTodoFixme: {
					lastQuery: "cached query",
					timestamp: Date.now(),
					projectPath: "/different/project",
				},
			};

			mockFs.readFile.mockResolvedValue(JSON.stringify(cache));

			const result = await getLastQuery(testProjectPath);

			expect(result).toBeNull();
		});

		it("should return null when cache file does not exist", async () => {
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			const result = await getLastQuery(testProjectPath);

			expect(result).toBeNull();
		});

		it("should return null when cache is corrupted", async () => {
			mockFs.readFile.mockResolvedValue("invalid json");

			const result = await getLastQuery(testProjectPath);

			expect(result).toBeNull();
		});

		it("should return null when cache structure is invalid", async () => {
			mockFs.readFile.mockResolvedValue(
				JSON.stringify({ invalid: "structure" }),
			);

			const result = await getLastQuery(testProjectPath);

			expect(result).toBeNull();
		});
	});

	describe("clearCache", () => {
		it("should delete cache file", async () => {
			mockFs.unlink.mockResolvedValue(undefined);

			await clearCache();

			expect(mockFs.unlink).toHaveBeenCalledWith(expectedCacheFilePath);
		});

		it("should handle missing cache file gracefully", async () => {
			mockFs.unlink.mockRejectedValue(new Error("File not found"));

			// Should not throw
			await expect(clearCache()).resolves.toBeUndefined();
		});
	});

	describe("configurable cache directory", () => {
		it("should use environment variable override for cache directory", async () => {
			process.env.FZF_PICKER_CACHE_DIR = "/custom/env/cache";
			const expectedCustomCacheFile = join(
				"/custom/env/cache",
				"search-cache.json",
			);

			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			expect(mockFs.mkdir).toHaveBeenCalledWith("/custom/env/cache", {
				recursive: true,
			});
			expect(mockFs.writeFile).toHaveBeenCalledWith(
				`${expectedCustomCacheFile}.tmp`,
				expect.any(String),
				"utf-8",
			);
		});

		it("should use extension configuration via environment variable", async () => {
			process.env.FZF_PICKER_CACHE_DIR = "/custom/config/cache";

			const expectedCustomCacheFile = join(
				"/custom/config/cache",
				"search-cache.json",
			);
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			expect(mockFs.mkdir).toHaveBeenCalledWith("/custom/config/cache", {
				recursive: true,
			});
			expect(mockFs.writeFile).toHaveBeenCalledWith(
				`${expectedCustomCacheFile}.tmp`,
				expect.any(String),
				"utf-8",
			);
		});

		it("should use environment variable when set", async () => {
			process.env.FZF_PICKER_CACHE_DIR = "/priority/env/cache";

			const expectedEnvCacheFile = join(
				"/priority/env/cache",
				"search-cache.json",
			);
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			expect(mockFs.mkdir).toHaveBeenCalledWith("/priority/env/cache", {
				recursive: true,
			});
			expect(mockFs.writeFile).toHaveBeenCalledWith(
				`${expectedEnvCacheFile}.tmp`,
				expect.any(String),
				"utf-8",
			);
		});
	});

	describe("OS-specific default cache directories", () => {
		beforeEach(() => {
			// Clear environment variables that might affect cache directory
			delete process.env.FZF_PICKER_CACHE_DIR;
			delete process.env.XDG_CACHE_HOME;
			delete process.env.APPDATA;
		});

		it("should use Linux/Unix XDG cache directory", async () => {
			mockOs.platform.mockReturnValue("linux");
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			const expectedLinuxCache = join("/mock/home", ".cache", "fzf-picker");
			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedLinuxCache, {
				recursive: true,
			});
		});

		it("should use Linux/Unix XDG_CACHE_HOME when available", async () => {
			mockOs.platform.mockReturnValue("linux");
			process.env.XDG_CACHE_HOME = "/custom/xdg/cache";
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			const expectedXdgCache = join("/custom/xdg/cache", "fzf-picker");
			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedXdgCache, {
				recursive: true,
			});
		});

		it("should use macOS Library/Caches directory", async () => {
			mockOs.platform.mockReturnValue("darwin");
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			const expectedMacCache = join(
				"/mock/home",
				"Library",
				"Caches",
				"fzf-picker",
			);
			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedMacCache, {
				recursive: true,
			});
		});

		it("should use Windows APPDATA directory", async () => {
			mockOs.platform.mockReturnValue("win32");
			process.env.APPDATA = "C:\\Users\\TestUser\\AppData\\Roaming";
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			const expectedWinCache = join(
				"C:\\Users\\TestUser\\AppData\\Roaming",
				"fzf-picker",
			);
			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedWinCache, {
				recursive: true,
			});
		});

		it("should fallback to user profile AppData on Windows when APPDATA is not set", async () => {
			mockOs.platform.mockReturnValue("win32");
			// Don't set APPDATA environment variable
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			const expectedWinFallback = join(
				"/mock/home",
				"AppData",
				"Roaming",
				"fzf-picker",
			);
			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedWinFallback, {
				recursive: true,
			});
		});

		it("should handle unknown platforms as Linux-like", async () => {
			mockOs.platform.mockReturnValue("freebsd");
			mockFs.readFile.mockRejectedValue(new Error("File not found"));

			await saveLastQuery("test query", testProjectPath);

			const expectedUnixCache = join("/mock/home", ".cache", "fzf-picker");
			expect(mockFs.mkdir).toHaveBeenCalledWith(expectedUnixCache, {
				recursive: true,
			});
		});
	});
});
