import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

interface SearchCache {
	findTodoFixme: {
		lastQuery: string;
		timestamp: number;
		projectPath: string;
	};
}

/**
 * Get the cache file path for search state
 */
function getCacheFilePath(): string {
	const cacheDir = join(homedir(), ".config", "fzf-picker");
	return join(cacheDir, "search-cache.json");
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(): Promise<void> {
	const cacheFilePath = getCacheFilePath();
	const cacheDir = dirname(cacheFilePath);

	try {
		await fs.mkdir(cacheDir, { recursive: true });
	} catch (error) {
		if (DEBUG) console.error("Failed to create cache directory:", error);
		// Silently fail - cache is optional
	}
}

/**
 * Read cache from file system
 */
async function readCache(): Promise<SearchCache | null> {
	try {
		const cacheFilePath = getCacheFilePath();
		const data = await fs.readFile(cacheFilePath, "utf-8");
		return JSON.parse(data) as SearchCache;
	} catch (error) {
		if (DEBUG) console.error("Failed to read cache:", error);
		return null;
	}
}

/**
 * Write cache to file system atomically
 */
async function writeCache(cache: SearchCache): Promise<void> {
	try {
		await ensureCacheDir();
		const cacheFilePath = getCacheFilePath();
		const tempPath = `${cacheFilePath}.tmp`;

		// Write to temporary file first for atomic operation
		await fs.writeFile(tempPath, JSON.stringify(cache, null, 2), "utf-8");

		// Atomic rename
		await fs.rename(tempPath, cacheFilePath);

		if (DEBUG) console.log("Cache saved successfully");
	} catch (error) {
		if (DEBUG) console.error("Failed to write cache:", error);
		// Silently fail - cache is optional
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
	try {
		const cacheFilePath = getCacheFilePath();
		await fs.unlink(cacheFilePath);
		if (DEBUG) console.log("Cache cleared successfully");
	} catch (error) {
		if (DEBUG) console.error("Failed to clear cache:", error);
		// Silently fail - cache might not exist
	}
}
