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
 * Searches for TODO/FIXME comments in files using rg and fzf.
 * @param paths - An array of file paths to search within. Returns empty array if empty.
 * @param initialQuery - Optional initial query to pre-populate search. Empty strings are ignored.
 * @param saveQuery - Whether to save the query for later resume. Defaults to true.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 *          Returns empty array if user cancels or no matches found.
 * @throws {Error} If rg or fzf processes fail to start.
 */

export async function findTodoFixme(
	paths: string[],
	initialQuery?: string,
	saveQuery: boolean = true,
): Promise<string[]> {
	// Handle empty paths array
	if (paths.length === 0) {
		return [];
	}

	// Navigate to the first path if it's the only one (for relative paths)
	let singleDirRoot = "";
	if (paths.length === 1) {
		singleDirRoot = paths[0];
		process.chdir(singleDirRoot);
		paths = ["."];
	}

	const useGitignore = process.env.USE_GITIGNORE !== "0";
	const fileTypes = process.env.TYPE_FILTER || "";
	const searchPattern =
		process.env.FIND_TODO_FIXME_SEARCH_PATTERN || "(TODO|FIXME|HACK|FIX):\\s";

	// Base rg args that are always used
	const baseRgArgs = [
		"--column",
		"--line-number",
		"--no-heading",
		"--color=always",
		"--smart-case",
		"--glob",
		"!**/.git/",
		searchPattern,
	];

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

	const previewCommand =
		process.env.FIND_TODO_FIXME_PREVIEW_COMMAND ||
		"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
	const previewWindow =
		process.env.FIND_TODO_FIXME_PREVIEW_WINDOW_CONFIG ||
		"right:border-left:50%:+{2}+3/3:~3";

	// Create reload commands for toggling gitignore
	const rgArgsWithIgnore = [...baseRgArgs];
	const rgArgsWithoutIgnore = [...baseRgArgs, "--no-ignore"];

	const escapeArg = (arg: string) => `'${arg.replace(/'/g, "'\"'\"'")}'`;
	const reloadCommandWithIgnore = `rg ${rgArgsWithIgnore.map(escapeArg).join(" ")}`;
	const reloadCommandWithoutIgnore = `rg ${rgArgsWithoutIgnore.map(escapeArg).join(" ")}`;

	const toggleFile = getToggleFilePath();

	const fzfArgs = [
		"--ansi",
		"--multi",
		"--delimiter",
		":",
		"--preview",
		previewCommand,
		"--preview-window",
		previewWindow,
		"--layout=reverse",
		"--bind",
		"ctrl-g:toggle-preview",
		"--print-query",
	];

	fzfArgs.push(
		"--bind",
		`ctrl-t:execute-silent([ -f ${toggleFile} ] && rm ${toggleFile} || touch ${toggleFile})+reload([ -f ${toggleFile} ] && ${reloadCommandWithoutIgnore} || ${reloadCommandWithIgnore})`,
	);

	if (initialQuery && initialQuery !== "") {
		fzfArgs.push("--query", initialQuery);
	}

	const { fzf, promise } = runFzf(fzfArgs);

	// If rg fails to spawn, reject instead of hanging
	const rgErrorPromise = new Promise<never>((_, reject) => {
		rg.on("error", (error) => {
			if (DEBUG) console.error("RG error:", error);
			reject(new Error(`Failed to start rg: ${error.message}`));
		});
	});

	// biome-ignore lint/style/noNonNullAssertion: stdin/stdout guaranteed by stdio:["pipe",...]
	rg.stdout?.pipe(fzf.stdin!);

	if (DEBUG) {
		rg.stderr.on("data", (data) => {
			console.error("RG stderr:", data.toString());
		});
	}

	const { query, results } = await Promise.race([promise, rgErrorPromise]);
	const selectedFiles = resolveResults(results, singleDirRoot);

	trySaveQuery(query, selectedFiles, saveQuery);

	return selectedFiles;
}

/**
 * Resume the last TODO/FIXME search with the previously used query.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 *          Returns empty array if no last query exists or user cancels.
 * @throws {Error} If rg or fzf processes fail to start.
 */
export async function findTodoFixmeResume(paths: string[]): Promise<string[]> {
	const lastQuery = await getLastQuery();

	if (!lastQuery) {
		if (DEBUG) console.log("No last query found, starting fresh search");
		return findTodoFixme(paths);
	}

	if (DEBUG) console.log("Resuming with last query:", lastQuery);
	return findTodoFixme(paths, lastQuery, true);
}
