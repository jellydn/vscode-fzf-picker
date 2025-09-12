import { promises as fs } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";

// Cache utility is now purely environment-based for standalone execution
// VS Code extension passes configuration via environment variables

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

interface SearchCache {
	findTodoFixme: {
		lastQuery: string;
		timestamp: number;
		projectPath: string;
	};
}

/**
 * Get OS-specific default cache directory following platform conventions:
 * - Windows: %APPDATA%\fzf-picker
 * - macOS: ~/Library/Caches/fzf-picker
 * - Linux: ~/.cache/fzf-picker (XDG_CACHE_HOME or fallback)
 */
function getDefaultCacheDirectory(): string {
	const home = homedir();
	const currentPlatform = platform();

	switch (currentPlatform) {
		case "win32":
			// Windows: Use %APPDATA% or fallback to %USERPROFILE%\AppData\Roaming
			return process.env.APPDATA
				? join(process.env.APPDATA, "fzf-picker")
				: join(home, "AppData", "Roaming", "fzf-picker");

		case "darwin":
			// macOS: Use ~/Library/Caches following Apple conventions
			return join(home, "Library", "Caches", "fzf-picker");

		default:
			// Linux/Unix: Use XDG_CACHE_HOME or ~/.cache following XDG Base Directory Specification
			return process.env.XDG_CACHE_HOME
				? join(process.env.XDG_CACHE_HOME, "fzf-picker")
				: join(home, ".cache", "fzf-picker");
	}
}

/**
 * Get the cache directory with fallback hierarchy:
 * 1. FZF_PICKER_CACHE_DIR environment variable (set by VS Code extension or user)
 * 2. OS-specific default location
 *
 * VS Code extension handles the configuration hierarchy and sets FZF_PICKER_CACHE_DIR accordingly
 */
function getCacheDirectory(): string {
	// Priority 1: Environment variable (includes VS Code extension configuration)
	const envCacheDir = process.env.FZF_PICKER_CACHE_DIR;
	if (envCacheDir && envCacheDir.trim() !== "") {
		if (DEBUG)
			console.log("Using cache directory from environment:", envCacheDir);
		return envCacheDir.trim();
	}

	// Priority 2: OS-specific default location
	const defaultCacheDir = getDefaultCacheDirectory();
	if (DEBUG)
		console.log("Using OS-specific default cache directory:", defaultCacheDir);
	return defaultCacheDir;
}

/**
 * Get the cache file path for search state
 */
function getCacheFilePath(): string {
	const cacheDir = getCacheDirectory();
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

/**
 * Get the resolved cache directory for VS Code extension to pass to commands
 * This resolves the user configuration to the actual directory path
 */
export function getResolvedCacheDirectory(
	userConfigDirectory: string = "",
): string {
	// If user has set a custom directory, use it
	if (userConfigDirectory && userConfigDirectory.trim() !== "") {
		return userConfigDirectory.trim();
	}

	// Otherwise return the OS-specific default
	return getDefaultCacheDirectory();
}
