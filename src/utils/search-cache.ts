import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import {
	getLegacyCacheDirectory,
	resolveCacheDirectory,
} from "./cache-directory";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

interface SearchCache {
	findTodoFixme: {
		lastQuery: string;
		timestamp: number;
		projectPath: string;
	};
}

// In-memory cache when filesystem cache is unavailable
let inMemoryCache: SearchCache | null = null;

/**
 * Get the cache file path for search state
 * Returns null if cache should be in-memory only
 */
async function getCacheFilePath(): Promise<string | null> {
	const cacheDir = await resolveCacheDirectory();
	if (!cacheDir) {
		return null; // Use in-memory cache
	}
	return join(cacheDir, "search-cache.json");
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
	const cacheFilePath = await getCacheFilePath();
	if (!cacheFilePath) {
		return; // In-memory cache mode
	}

	const cacheDir = dirname(cacheFilePath);

	try {
		await fs.mkdir(cacheDir, { recursive: true });
	} catch (error) {
		if (DEBUG) console.error("Failed to create cache directory:", error);
		// Silently fail - cache is optional
	}
}

/**
 * Migrate cache from legacy location if it exists
 */
async function migrateLegacyCache(): Promise<SearchCache | null> {
	try {
		const legacyCacheFile = join(
			getLegacyCacheDirectory(),
			"search-cache.json",
		);
		const data = await fs.readFile(legacyCacheFile, "utf-8");
		const cache = JSON.parse(data) as SearchCache;

		if (DEBUG) console.log("Found legacy cache, migrating...");

		// Try to save to new location
		await writeCache(cache);

		// Remove legacy file after successful migration
		try {
			await fs.unlink(legacyCacheFile);
			if (DEBUG) console.log("Legacy cache migrated and removed");
		} catch (unlinkError) {
			if (DEBUG)
				console.warn("Failed to remove legacy cache file:", unlinkError);
		}

		return cache;
	} catch {
		// Legacy cache doesn't exist or can't be read - this is normal
		return null;
	}
}

/**
 * Read cache from file system or in-memory
 */
async function readCache(): Promise<SearchCache | null> {
	const cacheFilePath = await getCacheFilePath();

	// Use in-memory cache if filesystem cache is unavailable
	if (!cacheFilePath) {
		return inMemoryCache;
	}

	try {
		const data = await fs.readFile(cacheFilePath, "utf-8");
		return JSON.parse(data) as SearchCache;
	} catch (error) {
		if (DEBUG)
			console.debug("Failed to read cache, trying legacy location:", error);

		// Try to migrate from legacy location
		const migratedCache = await migrateLegacyCache();
		if (migratedCache) {
			return migratedCache;
		}

		return null;
	}
}

/**
 * Write cache to file system atomically or to memory
 */
async function writeCache(cache: SearchCache): Promise<void> {
	const cacheFilePath = await getCacheFilePath();

	// Use in-memory cache if filesystem cache is unavailable
	if (!cacheFilePath) {
		inMemoryCache = cache;
		if (DEBUG) console.log("Cache saved to memory");
		return;
	}

	try {
		await ensureCacheDir();
		const tempPath = `${cacheFilePath}.tmp`;

		// Write to temporary file first for atomic operation
		await fs.writeFile(tempPath, JSON.stringify(cache, null, 2), "utf-8");

		// Atomic rename
		await fs.rename(tempPath, cacheFilePath);

		if (DEBUG) console.log("Cache saved to filesystem");
	} catch (error) {
		if (DEBUG)
			console.error(
				"Failed to write cache to filesystem, falling back to memory:",
				error,
			);
		// Fallback to in-memory cache
		inMemoryCache = cache;
	}
}

/**
 * Save the last search query for findTodoFixme
 */
export async function saveLastQuery(
	query: string,
	projectPath: string = process.cwd(),
): Promise<void> {
	// Don't save empty queries
	if (!query || query.trim() === "") {
		return;
	}

	const cache = (await readCache()) || {
		findTodoFixme: { lastQuery: "", timestamp: 0, projectPath: "" },
	};

	cache.findTodoFixme = {
		lastQuery: query,
		timestamp: Date.now(),
		projectPath,
	};

	await writeCache(cache);
}

/**
 * Get the last search query for findTodoFixme
 */
export async function getLastQuery(
	projectPath: string = process.cwd(),
): Promise<string | null> {
	const cache = await readCache();

	if (!cache || !cache.findTodoFixme) {
		return null;
	}

	// Return query if it's from the same project or if project path matches
	const cachedData = cache.findTodoFixme;
	if (cachedData.projectPath === projectPath) {
		return cachedData.lastQuery;
	}

	return null;
}

/**
 * Clear all cached search data
 */
export async function clearCache(): Promise<void> {
	// Clear in-memory cache
	inMemoryCache = null;

	const cacheFilePath = await getCacheFilePath();
	if (!cacheFilePath) {
		if (DEBUG) console.log("In-memory cache cleared");
		return;
	}

	try {
		await fs.unlink(cacheFilePath);
		if (DEBUG) console.log("Filesystem cache cleared successfully");
	} catch (error) {
		if (DEBUG) console.error("Failed to clear filesystem cache:", error);
		// Silently fail - cache might not exist
	}
}
