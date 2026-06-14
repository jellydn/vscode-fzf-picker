import { spawn } from "node:child_process";
import { DEBUG } from "../utils/debug";
import { getLastQuery } from "../utils/search-cache";
import {
	getToggleFilePath,
	resolveResults,
	runFzf,
	trySaveQuery,
} from "./fzf-utils";

/**
 * Runs `rg` to search for files and pipes the output to `fzf` to select files.
 * If only one path is provided, it will be used as the working directory.
 * @param paths - An array of file paths to search within.
 * @param initialQuery - Optional initial query to pre-populate search. Empty strings are ignored.
 * @param saveQuery - Whether to save the query for later resume. Defaults to true.
 * @returns A promise that resolves to an array of selected file paths.
 *          Returns empty array if user cancels or no matches found.
 * @throws {Error} If rg or fzf processes fail to start.
 */

export async function findFiles(
	paths: string[],
	initialQuery?: string,
	saveQuery: boolean = true,
): Promise<string[]> {
	const previewEnabled = process.env.FIND_FILES_PREVIEW_ENABLED === "1";
	const previewCommand =
		process.env.FIND_FILES_PREVIEW_COMMAND ||
		"bat --decorations=always --color=always --plain {}";
	const previewWindow =
		process.env.FIND_FILES_PREVIEW_WINDOW_CONFIG || "right:50%:border-left";
	const useGitignore = process.env.USE_GITIGNORE !== "0";
	const fileTypes = process.env.TYPE_FILTER || "";

	// Navigate to the first path if it's the only one
	let singleDirRoot = "";
	if (paths.length === 1) {
		singleDirRoot = paths[0];
		paths = [];
		process.chdir(singleDirRoot);
	}

	const query = initialQuery || "";

	// Base rg args that are always used
	const baseRgArgs = ["--files", "--hidden", "--glob", "!**/.git/"];
	if (fileTypes) {
		const fileTypesArray = fileTypes.split(":");
		for (const fileType of fileTypesArray) {
			baseRgArgs.push("--type", fileType);
		}
	}
	baseRgArgs.push(...paths);

	// Create initial rg args with current gitignore setting
	const rgArgs = [...baseRgArgs, useGitignore ? "" : "--no-ignore"].filter(
		Boolean,
	);

	const rg = spawn("rg", rgArgs);

	const fzfArgs = ["--cycle", "--multi", "--print-query", "--layout=reverse"];

	// Only add query parameter if query is not empty
	if (query.trim() !== "") {
		fzfArgs.push("--query", query);
	}

	// Create reload commands for toggling gitignore
	const rgArgsWithoutIgnore = [...baseRgArgs, "--no-ignore"];
	const rgArgsWithIgnore = [...baseRgArgs];

	const escapeArg = (arg: string) => `'${arg.replace(/'/g, "'\"'\"'")}'`;
	const reloadCommandNoIgnore = `rg ${rgArgsWithoutIgnore.map(escapeArg).join(" ")}`;
	const reloadCommandWithIgnore = `rg ${rgArgsWithIgnore.map(escapeArg).join(" ")}`;

	const toggleFile = getToggleFilePath();

	fzfArgs.push(
		"--bind",
		`ctrl-t:execute-silent([ -f ${toggleFile} ] && rm ${toggleFile} || touch ${toggleFile})+reload([ -f ${toggleFile} ] && ${reloadCommandNoIgnore} || ${reloadCommandWithIgnore})`,
	);

	if (previewEnabled) {
		fzfArgs.push(
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
			"--bind",
			"ctrl-g:toggle-preview",
		);
	}

	if (DEBUG) {
		console.log("FZF command:", "fzf", fzfArgs.join(" "));
		console.log("RG command:", "rg", rgArgs.filter(Boolean).join(" "));
	}

	const { fzf, promise } = runFzf(fzfArgs);

	// biome-ignore lint/style/noNonNullAssertion: stdin/stdout guaranteed by stdio:["pipe",...]
	rg.stdout?.pipe(fzf.stdin!);

	// If rg fails to spawn, reject instead of hanging.
	// Use .finally to suppress unhandled rejection if rg errors after fzf completes.
	const rgErrorPromise = new Promise<never>((_, reject) => {
		rg.on("error", (error) => {
			if (DEBUG) console.error("RG error:", error);
			reject(new Error(`Failed to start rg: ${error.message}`));
		});
	});

	if (DEBUG) {
		rg.stderr.on("data", (data) => {
			console.error("RG stderr:", data.toString());
		});
	}

	const { query: actualQuery, results } = await Promise.race([
		promise,
		rgErrorPromise,
	]).finally(() => {
		rgErrorPromise.catch(() => {});
	});
	const selectedFiles = resolveResults(results, singleDirRoot);

	trySaveQuery(actualQuery, selectedFiles, saveQuery);

	return selectedFiles;
}

/**
 * Resume the last file search with the previously used query.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths.
 *          Returns empty array if no last query exists or user cancels.
 * @throws {Error} If rg or fzf processes fail to start.
 */
export async function findFilesResume(paths: string[]): Promise<string[]> {
	const lastQuery = await getLastQuery();

	if (!lastQuery) {
		if (DEBUG) console.log("No last query found, starting fresh search");
		return findFiles(paths);
	}

	if (DEBUG) console.log("Resuming with last query:", lastQuery);
	return findFiles(paths, lastQuery, true);
}
