/**
 * Path utilities for file resolution in rg/fzf search commands.
 *
 * rg --color=always outputs file paths relative to the cwd, often prefixed
 * with "./". When we chdir to a single-root workspace, we need to prepend
 * the original root directory back. This utility handles stripping the "./"
 * prefix so paths resolve correctly.
 */

/**
 * Normalizes a file path from rg output: strips leading "./" if present.
 * Also handles "././" and similar degenerate prefixes.
 */
export function normalizeRgPath(file: string): string {
	let result = file;
	while (result.startsWith("./")) {
		result = result.slice(2);
	}
	return result;
}

/**
 * Resolves a file path from rg output against a root directory.
 * Strips the leading "./" prefix (added by rg --color=always) before
 * prepending the root directory.
 *
 * @param file - The file path from rg output (may have "./" prefix)
 * @param rootDir - The single directory root to prepend
 * @returns The resolved absolute-style path
 */
export function resolveFilePath(file: string, rootDir: string): string {
	return `${rootDir}/${normalizeRgPath(file)}`;
}
