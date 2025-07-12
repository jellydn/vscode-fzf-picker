import { promises as fs } from "node:fs";
import { homedir, platform, tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import * as vscode from "vscode";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

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
 * Resolve cache directory with fallback chain
 *
 * Resolution order:
 * 1. VSCode setting: fzf-picker.general.cacheDirectory
 * 2. Environment variable: FZF_PICKER_CACHE_DIR
 * 3. Platform-specific default cache directory
 * 4. System temporary directory with user isolation
 * 5. null (triggers in-memory cache mode)
 */
export async function resolveCacheDirectory(): Promise<string | null> {
	const config = vscode.workspace.getConfiguration("fzf-picker");

	// Check if cache is disabled entirely
	const cacheEnabled = config.get<boolean>("general.enableCache", true);
	if (!cacheEnabled) {
		if (DEBUG) console.log("Cache is disabled via configuration");
		return null;
	}

	// 1. User configuration from VSCode settings
	const userConfigured = config.get<string>("general.cacheDirectory", "");
	if (userConfigured) {
		const expandedPath = expandEnvironmentVariables(userConfigured);
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
 * Get the legacy cache directory path for migration purposes
 */
export function getLegacyCacheDirectory(): string {
	return join(homedir(), ".config", "fzf-picker");
}
