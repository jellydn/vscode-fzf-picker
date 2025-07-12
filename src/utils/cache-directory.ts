import { promises as fs } from "node:fs";
import { homedir, platform, tmpdir, userInfo } from "node:os";
import { join } from "node:path";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

/**
 * Configuration options for cache directory resolution
 */
export interface CacheDirectoryConfig {
	/** Custom cache directory path from user configuration */
	userCacheDirectory?: string;
	/** Whether cache is enabled */
	cacheEnabled?: boolean;
}

// Cache for resolved cache directory to avoid repeated filesystem operations
let cachedCacheDirectory: string | null | undefined;
let cacheDirectoryPromise: Promise<string | null> | null = null;

/**
 * Check if a directory is writable by attempting to create a test file
 */
async function isDirectoryWritable(dirPath: string): Promise<boolean> {
	try {
		await fs.mkdir(dirPath, { recursive: true });
		const testFile = join(dirPath, ".fzf-picker-write-test");
		await fs.writeFile(testFile, "test", "utf-8");
		await fs.unlink(testFile);
		return true;
	} catch (error) {
		if (DEBUG) console.debug(`Directory ${dirPath} is not writable:`, error);
		return false;
	}
}

/**
 * Get platform-specific default cache directory
 */
function getPlatformDefaultCacheDirectory(): string {
	const platformType = platform();

	switch (platformType) {
		case "linux": {
			// XDG Base Directory Specification
			const xdgCacheHome = process.env.XDG_CACHE_HOME;
			if (xdgCacheHome) {
				return join(xdgCacheHome, "fzf-picker");
			}
			return join(homedir(), ".cache", "fzf-picker");
		}

		case "darwin": {
			// macOS standard cache location
			return join(homedir(), "Library", "Caches", "fzf-picker");
		}

		case "win32": {
			// Windows standard cache location
			const localAppData = process.env.LOCALAPPDATA;
			if (localAppData) {
				return join(localAppData, "fzf-picker");
			}
			return join(homedir(), "AppData", "Local", "fzf-picker");
		}

		default: {
			// Fallback for other platforms
			return join(homedir(), ".cache", "fzf-picker");
		}
	}
}

/**
 * Get temporary directory fallback with user isolation
 */
function getTempCacheDirectory(): string {
	const userInfo_ = userInfo();
	const userId = userInfo_.uid ?? userInfo_.username ?? "default";
	return join(tmpdir(), `fzf-picker-${userId}`);
}

/**
 * Expand environment variables in a path string
 */
function expandEnvironmentVariables(path: string): string {
	return path
		.replace(/\$\{([^}]+)\}/g, (match, envVar) => {
			return process.env[envVar] || match;
		})
		.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, envVar) => {
			return process.env[envVar] || match;
		});
}

/**
 * Internal function to resolve cache directory without caching
 */
async function resolveActualCacheDirectory(
	config?: CacheDirectoryConfig,
): Promise<string | null> {
	// Check if cache is disabled entirely
	if (config?.cacheEnabled === false) {
		if (DEBUG) console.log("Cache is disabled via configuration");
		return null;
	}

	// 1. User configuration from passed config
	if (config?.userCacheDirectory) {
		const expandedPath = expandEnvironmentVariables(config.userCacheDirectory);
		if (await isDirectoryWritable(expandedPath)) {
			if (DEBUG)
				console.log(`Using user-configured cache directory: ${expandedPath}`);
			return expandedPath;
		}
		if (DEBUG)
			console.warn(
				`User-configured cache directory is not writable: ${expandedPath}`,
			);
	}

	// 2. Environment variable
	const envConfigured = process.env.FZF_PICKER_CACHE_DIR;
	if (envConfigured) {
		const expandedPath = expandEnvironmentVariables(envConfigured);
		if (await isDirectoryWritable(expandedPath)) {
			if (DEBUG)
				console.log(
					`Using environment-configured cache directory: ${expandedPath}`,
				);
			return expandedPath;
		}
		if (DEBUG)
			console.warn(
				`Environment-configured cache directory is not writable: ${expandedPath}`,
			);
	}

	// 3. Platform-specific default
	const platformDefault = getPlatformDefaultCacheDirectory();
	if (await isDirectoryWritable(platformDefault)) {
		if (DEBUG)
			console.log(`Using platform default cache directory: ${platformDefault}`);
		return platformDefault;
	}
	if (DEBUG)
		console.warn(
			`Platform default cache directory is not writable: ${platformDefault}`,
		);

	// 4. Temporary directory fallback
	const tempDir = getTempCacheDirectory();
	if (await isDirectoryWritable(tempDir)) {
		if (DEBUG) console.log(`Using temporary cache directory: ${tempDir}`);
		return tempDir;
	}
	if (DEBUG)
		console.warn(`Temporary cache directory is not writable: ${tempDir}`);

	// 5. No cache available
	if (DEBUG)
		console.warn("No writable cache directory found, cache will be disabled");
	return null;
}

/**
 * Resolve cache directory with caching to avoid repeated filesystem operations
 *
 * Resolution order:
 * 1. User configuration: config.userCacheDirectory
 * 2. Environment variable: FZF_PICKER_CACHE_DIR
 * 3. Platform-specific default cache directory
 * 4. System temporary directory with user isolation
 * 5. null (triggers in-memory cache mode)
 */
export async function resolveCacheDirectory(
	config?: CacheDirectoryConfig,
): Promise<string | null> {
	// Return cached result if available
	if (cachedCacheDirectory !== undefined) {
		return cachedCacheDirectory;
	}

	// If resolution is already in progress, wait for it
	if (cacheDirectoryPromise) {
		return cacheDirectoryPromise;
	}

	// Start new resolution and cache the promise
	cacheDirectoryPromise = resolveActualCacheDirectory(config);

	try {
		cachedCacheDirectory = await cacheDirectoryPromise;
		return cachedCacheDirectory;
	} finally {
		// Clear the promise reference once resolved
		cacheDirectoryPromise = null;
	}
}

/**
 * Clear the cache directory cache (useful for testing or when configuration changes)
 */
export function clearCacheDirectoryCache(): void {
	cachedCacheDirectory = undefined;
	cacheDirectoryPromise = null;
}

/**
 * Get the legacy cache directory path for migration purposes
 */
export function getLegacyCacheDirectory(): string {
	return join(homedir(), ".config", "fzf-picker");
}
