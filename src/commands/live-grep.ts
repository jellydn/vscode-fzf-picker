import { spawn } from "node:child_process";
import path, { join, dirname } from "node:path";
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
		let previewCommand =
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
			"--pcre2", // Enable PCRE2 for regex lookaheads
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
			const helperPath = join(__dirname, "commands", "rg-search-helper.js");
			const paramsJson = JSON.stringify({ paths: searchPaths, args });
			const paramsB64 = Buffer.from(paramsJson).toString("base64");
			const maxWords = 4;
			const placeholderArgs = Array.from({ length: maxWords }, (_, i) => `"{q:${i + 1}}"`).join(" ");

			// Minimal shell script: collect words, base64 encode each, pass to Node helper
			const shellScript = [
				'query="$1";',
				'shift;',
				'[ -n "$query" ] || exit 0;',
				'words_b64="";',
				'for w in "$@"; do',
				'  [ -z "$w" ] && continue;',
				'  w_b64=$(printf "%s" "$w" | base64 | tr -d "\\n");',
				'  words_b64="$words_b64 $w_b64";',
				'done;',
				'[ -z "$words_b64" ] && exit 0;',
				`node "${helperPath}" "${paramsB64}" "$words_b64" 2>/dev/null || true`,
			].join(" ");

			return `sh -c '${shellScript.replace(/'/g, "'\\''")}' _ '{q}' ${placeholderArgs}`;
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
			// Split initial query by whitespace to get individual words
			const queryWords = initialQuery.trim().split(/\s+/).filter((w) => w.length > 0);
			
			if (queryWords.length > 0) {
				// Build the regex pattern with lookaheads for AND search
				const escapedTerms = queryWords.map((term) => {
					// Escape regex special characters
					return term.replace(/[\.\^$*+?()\[\]{}|]/g, "\\$&");
				});
				const pattern = escapedTerms.map((term) => `(?=.*${term})`).join("");
				
				// Use the appropriate args based on gitignore setting
				const rgArgs = useGitignore ? rgArgsWithIgnore : rgArgsWithoutIgnore;
				
				// Execute rg directly with the pattern
				const initialSearch = spawn("rg", [
					...rgArgs,
					"-e",
					pattern,
					"--",
					...paths,
				], {
					cwd: singleDirRoot || undefined,
				});
				initialSearch.stderr.pipe(process.stderr);
				initialSearch.stdout.pipe(fzf.stdin);
			} else {
				fzf.stdin.end();
			}
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
