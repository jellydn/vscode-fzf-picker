import { execSync, spawn } from "node:child_process";
import * as path from "node:path";
import { DEBUG } from "../utils/debug";
import { getLastQuery, saveLastQuery } from "../utils/search-cache";

/**
 * Removes quotes that git adds around filenames with special characters
 * and unescapes common git escape sequences.
 */
function unquoteGitFilename(filename: string): string {
	if (filename.startsWith('"') && filename.endsWith('"')) {
		filename = filename.slice(1, -1);
		// Unescape common git escape sequences
		filename = filename.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
	}
	return filename;
}

/**
 * Picks files from git status using fzf.
 * If no file is selected, it will return an empty array.
 * @param paths - An array of file paths to search within (not used, but maintained for consistency).
 * @param initialQuery - Optional initial query to pre-populate search. Empty strings are ignored.
 * @param saveQuery - Whether to save the query for later resume. Defaults to true.
 * @returns A promise that resolves to an array of selected file paths.
 *          Returns empty array if user cancels or no matches found.
 * @throws {Error} If fzf processes fail to start.
 */
export async function pickFilesFromGitStatus(
	_paths: string[] = [],
	initialQuery?: string,
	saveQuery: boolean = true,
): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const previewEnabled =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED !== "0";
		const previewCommand =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND ||
			(process.platform === "win32"
				? 'powershell -NoProfile -Command "& { param($file) $diff = git diff --color=always -- $file 2>$null; if($diff) { $diff } else { if(Get-Command bat -ErrorAction SilentlyContinue) { bat --color=always --style=plain $file } else { Get-Content $file } } }" {}'
				: 'bash -c \'file="$@"; diff_output=$(git diff --color=always -- "$file" 2>/dev/null); if [ -n "$diff_output" ]; then echo "$diff_output"; else if command -v bat >/dev/null 2>&1; then bat --color=always --style=plain "$file" 2>/dev/null || echo "[Binary file or unable to read]"; else cat "$file" 2>/dev/null || echo "[Binary file or unable to read]"; fi; fi\' -- {}');
		const previewWindow =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG ||
			"right:50%:border-left";

		try {
			// Change to the root directory of the git repository
			const gitRoot = execSync("git rev-parse --show-toplevel", {
				encoding: "utf-8",
			}).trim();
			process.chdir(gitRoot);

			// Get git status for tracked files
			const gitStatus = execSync("git status --porcelain", {
				encoding: "utf-8",
			});

			// Get untracked files, including those in new folders
			const untrackedFiles = execSync(
				"git ls-files --others --exclude-standard",
				{
					encoding: "utf-8",
				},
			);

			if (!gitStatus.trim() && !untrackedFiles.trim()) {
				console.log("No changes in the git repository.");
				resolve([]);
				return;
			}

			const fzfArgs = [
				"--cycle",
				"--multi",
				"--layout=reverse",
				"--print-query",
			];

			// Only add query parameter if query is not empty
			if (initialQuery && initialQuery.trim() !== "") {
				fzfArgs.push("--query", initialQuery);
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
				console.log("Git status command:", "git status --porcelain");
			}

			const fzf = spawn("fzf", fzfArgs, {
				stdio: ["pipe", "pipe", process.stderr],
			});

			// Prepare git status for fzf input - filter out directory entries
			const trackedFiles = gitStatus
				.split("\n")
				.filter(Boolean)
				.filter((line) => !line.startsWith("D ") && !line.startsWith(" D"))
				.map((line) => unquoteGitFilename(line.slice(3)))
				.filter((line) => !line.endsWith("/")); // Filter out directory entries

			// Combine tracked and untracked files, ensuring we only include files
			const allFiles = [
				...new Set([
					...trackedFiles,
					...untrackedFiles.split("\n").filter(Boolean),
				]),
			].join("\n");

			if (DEBUG) {
				console.log("All files to be shown in fzf:", allFiles);
			}

			fzf.stdin.write(allFiles);
			fzf.stdin.end();

			let output = "";
			fzf.stdout.on("data", (data) => {
				output += data.toString();
				if (DEBUG) console.log("FZF stdout:", data.toString());
			});

			fzf.on("close", async (code) => {
				if (DEBUG) console.log("FZF process closed with code:", code);
				if (code === 0) {
					const lines = output.split("\n");

					// With --print-query, first line is the query, rest are results
					const actualQuery = lines[0] || ""; // The first line is the query
					const selectedFiles = lines
						.slice(1)
						.filter((line) => line.trim() !== ""); // Filter out empty lines

					if (selectedFiles.length > 0) {
						const fullPaths = selectedFiles.map((file) =>
							path.join(gitRoot, file),
						);

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

						resolve(fullPaths);
					} else {
						if (DEBUG) console.log("No files selected");
						resolve([]);
					}
				} else {
					if (DEBUG) console.log("FZF process was canceled by user");
					resolve([]);
				}
			});

			fzf.on("error", (error) => {
				if (DEBUG) console.error("FZF error:", error);
				reject(new Error(`Failed to start fzf: ${error.message}`));
			});
		} catch (error) {
			if (DEBUG) console.error("Error in pickFilesFromGitStatus:", error);
			reject(
				new Error(
					`Error in pickFilesFromGitStatus: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
		}
	});
}

/**
 * Resume the last git status file picker with the previously used query.
 * @param paths - An array of file paths to search within (not used, but maintained for consistency).
 * @returns A promise that resolves to an array of selected file paths.
 *          Returns empty array if no last query exists or user cancels.
 * @throws {Error} If fzf processes fail to start.
 */
export async function pickFilesFromGitStatusResume(
	paths: string[] = [],
): Promise<string[]> {
	const lastQuery = await getLastQuery();

	if (!lastQuery) {
		if (DEBUG) console.log("No last query found, starting fresh search");
		return pickFilesFromGitStatus(paths);
	}

	if (DEBUG) console.log("Resuming with last query:", lastQuery);
	return pickFilesFromGitStatus(paths, lastQuery, true);
}
