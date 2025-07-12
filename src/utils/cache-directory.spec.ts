import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearCacheDirectoryCache,
	getLegacyCacheDirectory,
	resolveCacheDirectory,
} from "./cache-directory";

vi.mock("node:fs", () => ({
	promises: {
		mkdir: vi.fn(),
		writeFile: vi.fn(),
		unlink: vi.fn(),
	},
}));

vi.mock("node:os", () => ({
	homedir: vi.fn(() => "/mock/home"),
	platform: vi.fn(() => "linux"),
	tmpdir: vi.fn(() => "/tmp"),
	userInfo: vi.fn(() => ({ uid: 1000, username: "testuser" })),
}));

vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn((key: string, defaultValue: unknown) => {
				if (key === "general.enableCache") return true;
				if (key === "general.cacheDirectory") return "";
				return defaultValue;
			}),
		})),
	},
}));

const mockFs = vi.mocked(fs);

describe("cache-directory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearCacheDirectoryCache();
		// Mock successful directory operations by default
		mockFs.mkdir.mockResolvedValue(undefined);
		mockFs.writeFile.mockResolvedValue(undefined);
		mockFs.unlink.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
		clearCacheDirectoryCache();
	});

	describe("resolveCacheDirectory", () => {
		it("should cache the result to avoid repeated filesystem operations", async () => {
			// First call
			const result1 = await resolveCacheDirectory();

			// Second call should use cached result without additional filesystem operations
			const result2 = await resolveCacheDirectory();

			expect(result1).toBe(result2);
			expect(result1).toBe(join("/mock/home", ".cache", "fzf-picker"));

			// Should only have called mkdir and writeFile once (from first resolution)
			expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
			expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
		});

		it("should handle concurrent calls to resolveCacheDirectory", async () => {
			// Make multiple concurrent calls
			const promises = [
				resolveCacheDirectory(),
				resolveCacheDirectory(),
				resolveCacheDirectory(),
			];

			const results = await Promise.all(promises);

			// All results should be the same
			expect(results[0]).toBe(results[1]);
			expect(results[1]).toBe(results[2]);
			expect(results[0]).toBe(join("/mock/home", ".cache", "fzf-picker"));

			// Should only have called mkdir and writeFile once despite concurrent calls
			expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
			expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
		});

		it("should return the same result when called multiple times", async () => {
			// Multiple calls should return the same result
			const result1 = await resolveCacheDirectory();
			const result2 = await resolveCacheDirectory();
			const result3 = await resolveCacheDirectory();

			expect(result1).toBe(result2);
			expect(result2).toBe(result3);
			expect(result1).toBe(join("/mock/home", ".cache", "fzf-picker"));

			// Should only have called filesystem operations once
			expect(mockFs.mkdir).toHaveBeenCalledTimes(1);
			expect(mockFs.writeFile).toHaveBeenCalledTimes(1);
		});
	});

	describe("clearCacheDirectoryCache", () => {
		it("should clear the cache and allow fresh resolution", async () => {
			// First resolution
			const result1 = await resolveCacheDirectory();
			expect(result1).toBe(join("/mock/home", ".cache", "fzf-picker"));

			// Clear the cache
			clearCacheDirectoryCache();

			// Second resolution should perform filesystem operations again
			const result2 = await resolveCacheDirectory();
			expect(result2).toBe(join("/mock/home", ".cache", "fzf-picker"));

			// Should have called mkdir and writeFile twice (once for each resolution)
			expect(mockFs.mkdir).toHaveBeenCalledTimes(2);
			expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
		});
	});

	describe("getLegacyCacheDirectory", () => {
		it("should return the legacy cache directory path", () => {
			const result = getLegacyCacheDirectory();
			expect(result).toBe(join("/mock/home", ".config", "fzf-picker"));
		});
	});
});
