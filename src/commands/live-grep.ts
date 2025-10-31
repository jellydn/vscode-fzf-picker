import { spawn } from "node:child_process";
import { DEBUG } from "../utils/debug";
import { getLastQuery, saveLastQuery } from "../utils/search-cache";

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
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			process.chdir(singleDirRoot);
			paths = ["."];
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
			"--no-ignore-parent",
		];

		if (fileTypes) {
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				baseRgArgs.push("--type", fileType);
			}
		}

		// Create search commands for both gitignore states
		const rgArgsWithIgnore = [...baseRgArgs];
		const rgArgsWithoutIgnore = [...baseRgArgs, "--no-ignore"];

		const createSearchCommand = (args: string[], searchPaths: string[]) => {
			const rgArgsString = args.join(" ");
			const quotedPaths = searchPaths
				.map((p) => `'${p.replace(/'/g, "'\\''")}'`)
				.join(" ");
			const cmd = `sh -c 'q="$1"; shift; [ -n "$q" ] || exit 0; printf "%s\n" "$q" | rg ${rgArgsString} -f - -- "$@" || true' _ '{q}'${quotedPaths ? ` ${quotedPaths}` : ""}`;
			return cmd;
		};

		const searchCommandWithIgnore = createSearchCommand(rgArgsWithIgnore, paths);
		const searchCommandWithoutIgnore = createSearchCommand(rgArgsWithoutIgnore, paths);

		// Use current gitignore setting for initial search
		const searchCommand = useGitignore
			? searchCommandWithIgnore
			: searchCommandWithoutIgnore;

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
			`change:reload:${searchCommand}`,
			"--layout=reverse",
			"--bind",
			"ctrl-g:toggle-preview",
		];

		// Add ctrl-t toggle for gitignore using execute to manage state and reload
		const toggleFile = `/tmp/fzf_gitignore_${process.pid}`;

		fzfArgs.push(
			"--bind",
			`ctrl-t:execute-silent([ -f ${toggleFile} ] && rm ${toggleFile} || touch ${toggleFile})+reload([ -f ${toggleFile} ] && ${searchCommandWithoutIgnore} || ${searchCommandWithIgnore})`,
		);

		if (initialQuery) {
			fzfArgs.push("--bind", `start:reload:${searchCommand}`);
		}

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		// If there's an initial query, perform the search immediately
		if (initialQuery) {
			const escapedInitialQuery = initialQuery.replace(/'/g, "'\\''");
			const actualSearchCommand = searchCommand.replace("{q}", escapedInitialQuery);
			const initialSearch = spawn("sh", [
				"-c",
				actualSearchCommand,
			]);
			initialSearch.stderr.pipe(process.stderr);
			initialSearch.stdout.pipe(fzf.stdin);
		} else {
			// Don't run initial rg command when there's no query
			fzf.stdin.end();
		}

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", async (code) => {
			if (code === 0) {
				const lines = output.trim().split("\n");

				// With --print-query, first line is the query, rest are results
				const actualQuery = lines[0] || ""; // The first line is the query
				let selectedFiles = lines.slice(1).filter((line) => line.trim() !== ""); // Filter out empty lines

				if (singleDirRoot) {
					selectedFiles = selectedFiles.map((line) => {
						// Split on ':' - format is file:line:column:match
						const parts = line.split(":");
						if (parts.length < 3) return line; // Malformed, return as-is

						let filePath = parts[0];
						// Strip './' prefix if present
						if (filePath.startsWith("./")) {
							filePath = filePath.slice(2);
						}
						// Prepend singleDirRoot to file path only
                        const fullPath = path.join(singleDirRoot, filePath);
						// Reconstruct the line with new file path
						return `${fullPath}:${parts.slice(1).join(":")}`;
					});
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
				resolve([]);
			}
		});

		fzf.on("error", (error) => {
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
