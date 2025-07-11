import { promises as fs } from "node:fs";
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
}));

const mockFs = fs as {
	mkdir: typeof fs.mkdir;
	readFile: typeof fs.readFile;
	writeFile: typeof fs.writeFile;
	rename: typeof fs.rename;
	unlink: typeof fs.unlink;
};

describe("search-cache", () => {
	const testProjectPath = "/test/project";
	const expectedCacheFilePath = join(
		"/mock/home",
		".config",
		"fzf-picker",
		"search-cache.json",
	);

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock successful directory creation
		mockFs.mkdir.mockResolvedValue(undefined);
		mockFs.writeFile.mockResolvedValue(undefined);
		mockFs.rename.mockResolvedValue(undefined);
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

			expect(mockFs.mkdir).toHaveBeenCalledWith(
				join("/mock/home", ".config", "fzf-picker"),
				{ recursive: true },
			);

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
});
