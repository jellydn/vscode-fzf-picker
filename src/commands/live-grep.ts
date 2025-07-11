import { spawn } from "node:child_process";
import { getLastQuery, saveLastQuery } from "../utils/search-cache";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

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
	return new Promise((resolve, reject) => {
		const previewCommand =
			process.env.FIND_WITHIN_FILES_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
		const previewWindow =
			process.env.FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG ||
			"right:border-left:50%:+{2}+3/3:~3";
		// TODO: Add <Ctr-t> to toggle gitignore with fzf keybinding
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			process.chdir(singleDirRoot);
			paths = [];
		}

		const rgArgs = [
			"--column",
			"--line-number",
			"--no-heading",
			"--color=always",
			"--smart-case",
			useGitignore ? "" : "--no-ignore",
			"--glob",
			"!**/.git/",
		];

		if (fileTypes) {
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				rgArgs.push("--type", fileType);
			}
		}

		rgArgs.push(...paths);

		// Create a string of all rgArgs, properly escaped
		const rgArgsString = rgArgs
			.filter(Boolean)
			.map((arg) => `'${arg.replace(/'/g, "'\\''")}'`)
			.join(" ");

		const rgQueryParsing = "{q}";
		const searchCommand = `rg ${rgArgsString} ${rgQueryParsing} || true`;

		const fzfArgs = [
			"--ansi",
			"--multi",
			"--delimiter",
			":",
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
			"--phony",
			"--query",
			initialQuery || "",
			"--print-query",
			"--bind",
			`change:reload:[ ! -z {q} ] && sleep 0.1 && ${searchCommand}`, // Only run if query is not empty
			"--layout=reverse",
			"--bind",
			"ctrl-g:toggle-preview",
		];

		if (initialQuery) {
			fzfArgs.push("--bind", `start:reload:${searchCommand}`);
		}

		if (DEBUG) {
			console.log("FZF command:", "fzf", fzfArgs.join(" "));
			console.log("Search command:", searchCommand);
		}

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		// If there's an initial query, perform the search immediately
		if (initialQuery) {
			if (DEBUG) {
				console.log("Executing initial search with query:", initialQuery);
			}
			const initialSearch = spawn("sh", [
				"-c",
				searchCommand.replace("{q}", initialQuery),
			]);
			initialSearch.stdout.pipe(fzf.stdin);
			initialSearch.stderr.pipe(process.stderr);

			if (DEBUG) {
				initialSearch.stderr.on("data", (data) => {
					console.error("Initial search stderr:", data.toString());
				});
			}
		} else {
			// Don't run initial rg command when there's no query
			if (DEBUG) console.log("No initial query, waiting for user input");
			fzf.stdin.end();
		}

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
			if (DEBUG) console.log("FZF stdout:", data.toString());
		});

		fzf.on("close", async (code) => {
			if (DEBUG) console.log("FZF process closed with code:", code);
			if (code === 0) {
				const lines = output.trim().split("\n");

				// With --print-query, first line is the query, rest are results
				const actualQuery = lines[0] || ""; // The first line is the query
				let selectedFiles = lines.slice(1).filter((line) => line.trim() !== ""); // Filter out empty lines

				if (singleDirRoot) {
					selectedFiles = selectedFiles.map(
						(file) => `${singleDirRoot}/${file}`,
					);
				}

				// Save the actual query entered by user for future resume
				if (
					saveQuery &&
					actualQuery.trim() !== "" &&
					selectedFiles.length > 0
				) {
					try {
						await saveLastQuery(actualQuery.trim());
					} catch (error) {
						if (DEBUG) console.error("Failed to save last query:", error);
						// Don't fail the search if cache save fails
					}
				}

				resolve(selectedFiles);
			} else {
				// Even when the user cancels, we need to resolve with an empty array
				// to ensure the terminal is properly hidden
				if (DEBUG) console.log("FZF process was canceled by user");
				resolve([]);
			}
		});

		fzf.on("error", (error) => {
			if (DEBUG) console.error("FZF error:", error);
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});
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
