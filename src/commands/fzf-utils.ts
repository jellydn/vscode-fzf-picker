import { type ChildProcess, spawn } from "node:child_process";
import * as os from "node:os";
import { DEBUG } from "../utils/debug";
import { resolveFilePath } from "../utils/path";
import { saveLastQuery } from "../utils/search-cache";

export interface FzfResult {
	query: string;
	results: string[];
}

/**
 * Returns a unique temp file path for toggling gitignore state in fzf binds.
 * Uses os.tmpdir() + process.pid to avoid collisions.
 */
export function getToggleFilePath(): string {
	return `${os.tmpdir()}/fzf_gitignore_${process.pid}`;
}

/**
 * Spawns fzf with the given args and returns the fzf ChildProcess (for stdin
 * piping) and a promise that resolves to the parsed query and results.
 *
 * Assumes --print-query is in the args. Output parsing:
 * - First line is the query
 * - Remaining lines are results, with empty lines filtered out
 * - Non-zero exit (user cancel) returns empty arrays
 * - Spawn errors reject the promise
 */
export function runFzf(fzfArgs: string[]): {
	fzf: ChildProcess;
	promise: Promise<FzfResult>;
} {
	const fzf = spawn("fzf", fzfArgs, {
		stdio: ["pipe", "pipe", process.stderr],
	});

	if (DEBUG) {
		console.log("FZF command:", "fzf", fzfArgs.join(" "));
	}

	const promise = new Promise<FzfResult>((resolve, reject) => {
		if (!fzf.stdout || !fzf.on) {
			reject(new Error("Failed to start fzf: process returned unexpectedly"));
			return;
		}

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
			if (DEBUG) console.log("FZF stdout:", data.toString());
		});

		fzf.on("close", (code) => {
			if (DEBUG) console.log("FZF process closed with code:", code);
			if (code === 0) {
				const lines = output.split("\n");
				resolve({
					query: lines[0] || "",
					results: lines.slice(1).filter((line) => line.trim() !== ""),
				});
			} else {
				if (DEBUG) console.log("FZF process was canceled by user");
				resolve({ query: "", results: [] });
			}
		});

		fzf.on("error", (error) => {
			if (DEBUG) console.error("FZF error:", error);
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});

	return { fzf, promise };
}

/**
 * Prepends a single directory root to result paths.
 * No-op when singleDirRoot is empty.
 */
export function resolveResults(
	results: string[],
	singleDirRoot: string,
): string[] {
	if (!singleDirRoot) return results;
	return results.map((file) => resolveFilePath(file, singleDirRoot));
}

/**
 * Fire-and-forget save of a query string for resume functionality.
 * Swallows errors to avoid breaking the caller flow.
 */
export function trySaveQuery(
	query: string,
	results: string[],
	saveQuery: boolean,
): void {
	if (!saveQuery || query.trim() === "" || results.length === 0) return;

	Promise.resolve(saveLastQuery(query.trim())).catch(() => {
		// Don't fail the search if cache save fails
	});
}
