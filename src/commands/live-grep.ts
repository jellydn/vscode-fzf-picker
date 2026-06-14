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
 * Interactive search for text within files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @param initialQuery - Optional initial query to pre-populate search. Empty strings are ignored.
 * @param saveQuery - Whether to save the query for later resume. Defaults to true.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 *          Returns empty array if user cancels or no matches found.
 * @throws {Error} If rg or fzf processes fail to start.
 */

export async function liveGrep(
	paths: string[],
	initialQuery?: string,
	saveQuery: boolean = true,
): Promise<string[]> {
	const previewCommand =
		process.env.FIND_WITHIN_FILES_PREVIEW_COMMAND ||
		"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
	const previewWindow =
		process.env.FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG ||
		"right:border-left:50%:+{2}+3/3:~3";
	const useGitignore = process.env.USE_GITIGNORE !== "0";
	const fileTypes = process.env.TYPE_FILTER || "";

	// Navigate to the first path if it's the only one
	let singleDirRoot = "";
	if (paths.length === 1) {
		singleDirRoot = paths[0];
		process.chdir(singleDirRoot);
		paths = [];
	}

	// Base rg args that are always used
	const baseRgArgs = [
		"--column",
		"--line-number",
		"--no-heading",
		"--color=always",
		"--smart-case",
		"--glob",
		"!**/.git/",
	];

	if (fileTypes) {
		const fileTypesArray = fileTypes.split(":");
		for (const fileType of fileTypesArray) {
			baseRgArgs.push("--type", fileType);
		}
	}

	baseRgArgs.push(...paths);

	// Create search commands for both gitignore states
	const rgArgsWithIgnore = [...baseRgArgs];
	const rgArgsWithoutIgnore = [...baseRgArgs, "--no-ignore"];

	const createSearchCommand = (args: string[]) => {
		const rgArgsString = args
			.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`)
			.join(" ");
		return `rg ${rgArgsString} '{q}' || true`;
	};

	const searchCommandWithIgnore = createSearchCommand(rgArgsWithIgnore);
	const searchCommandWithoutIgnore = createSearchCommand(rgArgsWithoutIgnore);

	const searchCommand = useGitignore
		? searchCommandWithIgnore
		: searchCommandWithoutIgnore;

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
		"--disabled",
		"--query",
		initialQuery || "",
		"--print-query",
		"--bind",
		`change:reload:[ ! -z '{q}' ] && sleep 0.1 && ${searchCommand}`,
		"--layout=reverse",
		"--bind",
		"ctrl-g:toggle-preview",
	];

	fzfArgs.push(
		"--bind",
		`ctrl-t:execute-silent([ -f ${toggleFile} ] && rm ${toggleFile} || touch ${toggleFile})+reload([ -f ${toggleFile} ] && [ ! -z '{q}' ] && ${searchCommandWithoutIgnore} || [ ! -z '{q}' ] && ${searchCommandWithIgnore} || true)`,
	);

	if (initialQuery) {
		fzfArgs.push("--bind", `start:reload:${searchCommand}`);
	}

	if (DEBUG) {
		console.log("FZF command:", "fzf", fzfArgs.join(" "));
		console.log("Search command:", searchCommand);
	}

	const { fzf, promise } = runFzf(fzfArgs);

	// Pipe initial rg results to fzf's stdin
	if (initialQuery) {
		if (DEBUG) {
			console.log("Executing initial search with query:", initialQuery);
		}
		const initialSearch = spawn("sh", [
			"-c",
			searchCommand.replace("{q}", initialQuery.replace(/'/g, "'\\''")),
		]);
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by stdio:["pipe",...]
		initialSearch.stdout.pipe(fzf.stdin!);
		initialSearch.stderr.pipe(process.stderr);

		if (DEBUG) {
			initialSearch.stderr.on("data", (data) => {
				console.error("Initial search stderr:", data.toString());
			});
		}
	} else {
		if (DEBUG) console.log("No initial query, waiting for user input");
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by stdio:["pipe",...]
		fzf.stdin!.end();
	}

	const { query, results } = await promise;
	const selectedFiles = resolveResults(results, singleDirRoot);

	trySaveQuery(query, selectedFiles, saveQuery);

	return selectedFiles;
}

/**
 * Resume the last live grep search with the previously used query.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 *          Returns empty array if no last query exists or user cancels.
 * @throws {Error} If rg or fzf processes fail to start.
 */
export async function liveGrepResume(paths: string[]): Promise<string[]> {
	const lastQuery = await getLastQuery();

	if (!lastQuery) {
		if (DEBUG) console.log("No last query found, starting fresh search");
		return liveGrep(paths);
	}

	if (DEBUG) console.log("Resuming with last query:", lastQuery);
	return liveGrep(paths, lastQuery, true);
}
