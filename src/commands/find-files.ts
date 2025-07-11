import { spawn } from "node:child_process";
import { getLastQuery, saveLastQuery } from "../utils/search-cache";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

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
	// TODO: Need to update the test to match the new behavior
	return new Promise((resolve, reject) => {
		const previewEnabled = process.env.FIND_FILES_PREVIEW_ENABLED === "1";
		const previewCommand =
			process.env.FIND_FILES_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always --plain {}";
		const previewWindow =
			process.env.FIND_FILES_PREVIEW_WINDOW_CONFIG || "right:50%:border-left";
		// TODO: Add <Ctr-t> to toggle gitignore with fzf keybinding
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

		const rgArgs = [
			"--files",
			"--hidden",
			useGitignore ? "" : "--no-ignore",
			"--glob",
			"!**/.git/",
		];
		if (fileTypes) {
			// Split file type `:` and add to rgArgs
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				rgArgs.push("--type", fileType);
			}
		}
		rgArgs.push(...paths);
		const rg = spawn("rg", rgArgs.filter(Boolean));

		const fzfArgs = ["--cycle", "--multi", "--print-query", "--layout=reverse"];

		// Only add query parameter if query is not empty
		if (query.trim() !== "") {
			fzfArgs.push("--query", query);
		}

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

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		rg.stdout.pipe(fzf.stdin);

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
			if (DEBUG) console.log("FZF stdout:", data.toString());
		});

		fzf.on("close", async (code) => {
			if (DEBUG) console.log("FZF process closed with code:", code);
			if (code === 0) {
				// Don't trim the output because we need to preserve the empty query line
				const lines = output.split("\n");

				// With --print-query, first line is the query, rest are results
				const actualQuery = lines[0] || ""; // The first line is the query
				let selectedFiles = lines.slice(1).filter((line) => line.trim() !== ""); // Filter out empty lines

				if (singleDirRoot) {
					// Prepend the single directory root to each selected file
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

		rg.on("error", (error) => {
			if (DEBUG) console.error("RG error:", error);
			reject(new Error(`Failed to start rg: ${error.message}`));
		});

		fzf.on("error", (error) => {
			if (DEBUG) console.error("FZF error:", error);
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});

		if (DEBUG) {
			rg.stderr.on("data", (data) => {
				console.error("RG stderr:", data.toString());
			});
		}
	});
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
