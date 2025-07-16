import { promises as fs } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CacheDirectoryConfig,
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
		it("should use platform default when no config provided", async () => {
			const result = await resolveCacheDirectory();
			expect(result).toBe(join("/mock/home", ".cache", "fzf-picker"));
		});

		it("should use user-configured directory when provided", async () => {
			const config: CacheDirectoryConfig = {
				userCacheDirectory: "/custom/cache/path",
				cacheEnabled: true,
			};

			const result = await resolveCacheDirectory(config);
			expect(result).toBe("/custom/cache/path");
		});

		it("should return null when cache is disabled", async () => {
			const config: CacheDirectoryConfig = {
				cacheEnabled: false,
			};

			const result = await resolveCacheDirectory(config);
			expect(result).toBeNull();
		});

		it("should expand environment variables in user config", async () => {
			// Set up environment variable
			const originalHome = process.env.HOME;
			process.env.HOME = "/home/testuser";

			const config: CacheDirectoryConfig = {
				userCacheDirectory: "$" + "{HOME}/.local/share/fzf-picker",
				cacheEnabled: true,
			};

			const result = await resolveCacheDirectory(config);
			expect(result).toBe("/home/testuser/.local/share/fzf-picker");

			// Clean up
			if (originalHome !== undefined) {
				process.env.HOME = originalHome;
			} else {
				delete process.env.HOME;
			}
		});

		it("should fall back to environment variable when user config is not writable", async () => {
			// Set up environment variable
			const originalEnv = process.env.FZF_PICKER_CACHE_DIR;
			process.env.FZF_PICKER_CACHE_DIR = "/env/cache/dir";

			// Mock user config directory as not writable
			mockFs.writeFile.mockImplementationOnce(() => {
				throw new Error("Permission denied");
			});

			const config: CacheDirectoryConfig = {
				userCacheDirectory: "/not/writable/path",
				cacheEnabled: true,
			};

			const result = await resolveCacheDirectory(config);
			expect(result).toBe("/env/cache/dir");

			// Clean up
			if (originalEnv !== undefined) {
				process.env.FZF_PICKER_CACHE_DIR = originalEnv;
			} else {
				delete process.env.FZF_PICKER_CACHE_DIR;
			}
		});

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

	describe("Security validation", () => {
		it("should reject system directories", async () => {
			clearCacheDirectoryCache();

			// Test with system directory
			const result = await resolveCacheDirectory({
				userCacheDirectory: "/etc/fzf-picker",
				cacheEnabled: true,
			});

			// Should fallback to platform default
			expect(result).toBe(join("/mock/home", ".cache", "fzf-picker"));
		});

		it("should reject paths with directory traversal", async () => {
			clearCacheDirectoryCache();

			// Test with directory traversal
			const result = await resolveCacheDirectory({
				userCacheDirectory: "/home/../../../etc/passwd",
				cacheEnabled: true,
			});

			// Should fallback to platform default
			expect(result).toBe(join("/mock/home", ".cache", "fzf-picker"));
		});

		it("should reject Windows system directories", async () => {
			clearCacheDirectoryCache();

			// Test with Windows system path
			const result = await resolveCacheDirectory({
				userCacheDirectory: "C:\\Windows\\System32\\fzf-picker",
				cacheEnabled: true,
			});

			// Should fallback to platform default
			expect(result).toBe(join("/mock/home", ".cache", "fzf-picker"));
		});

		it("should allow safe user directories", async () => {
			clearCacheDirectoryCache();
			mockFs.mkdir.mockClear();
			mockFs.writeFile.mockClear();

			// Test with safe path
			const result = await resolveCacheDirectory({
				userCacheDirectory: "/mock/home/.local/share/fzf-picker",
				cacheEnabled: true,
			});

			// Should use the user-configured path
			expect(result).toBe("/mock/home/.local/share/fzf-picker");
			expect(mockFs.mkdir).toHaveBeenCalledWith(
				"/mock/home/.local/share/fzf-picker",
				{ recursive: true },
			);
		});
	});
});
