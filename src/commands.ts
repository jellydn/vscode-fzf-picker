import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

/**
 * Runs `rg` to search for files and pipes the output to `fzf` to select files.
 * If only one path is provided, it will be used as the working directory.
 * If the `RESUME_SEARCH` environment variable is set, it will resume the last search.
 * If the `HAS_SELECTION` environment variable is set, it will use the selection file.
 * If the `USE_GITIGNORE` environment variable is not set to "0", it will use `.gitignore` files.
 * If the `TYPE_FILTER` environment variable is set, it will filter by file type.
 * If the `FIND_FILES_PREVIEW_ENABLED` environment variable is set to "1", it will enable preview.
 * @param paths The paths to search.
 * @returns A promise that resolves with the selected files.
 */
export async function findFiles(paths: string[]): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const previewEnabled = process.env.FIND_FILES_PREVIEW_ENABLED === "1";
		const previewCommand =
			process.env.FIND_FILES_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always --plain {}";
		const previewWindow =
			process.env.FIND_FILES_PREVIEW_WINDOW_CONFIG || "right:50%:border-left";
		const hasSelection = process.env.HAS_SELECTION === "1";
		const resumeSearch = process.env.RESUME_SEARCH === "1";
		const lastQueryFile = process.env.LAST_QUERY_FILE || "";
		const selectionFile = process.env.SELECTION_FILE || "";
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			// biome-ignore lint: it's okay as the path is already set
			paths = [];
			process.chdir(singleDirRoot);
		}

		let query = "";
		if (resumeSearch && lastQueryFile && existsSync(lastQueryFile)) {
			try {
				query = readFileSync(lastQueryFile, "utf-8").trim();
			} catch (error) {
				console.error("Error reading last query file:", error);
			}
		} else if (hasSelection && selectionFile) {
			try {
				query = readFileSync(selectionFile, "utf-8").trim();
			} catch (error) {
				console.error("Error reading selection file:", error);
			}
		}

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

		const fzfArgs = [
			"--cycle",
			"--multi",
			"--history",
			lastQueryFile,
			"--query",
			query,
		];

		if (previewEnabled) {
			fzfArgs.push(
				"--preview",
				previewCommand,
				"--preview-window",
				previewWindow,
			);
		}

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		rg.stdout.pipe(fzf.stdin);

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				let selectedFiles = output.trim().split("\n");
				if (singleDirRoot) {
					// Prepend the single directory root to each selected file
					selectedFiles = selectedFiles.map(
						(file) => `${singleDirRoot}/${file}`,
					);
				}
				// After successful file selection, save the query for future resume
				if (lastQueryFile) {
					writeFileSync(lastQueryFile, query);
				}
				resolve(selectedFiles);
			} else {
				reject(new Error("File selection canceled"));
			}
		});

		rg.on("error", (error) => {
			reject(new Error(`Failed to start rg: ${error.message}`));
		});

		fzf.on("error", (error) => {
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});
}

/**
 * Interactive search for text within files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 */
export async function liveGrep(
	paths: string[],
	initialQuery?: string,
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
		const fuzzRgQuery = process.env.FUZZ_RG_QUERY === "1";
		const resumeSearch = process.env.RESUME_SEARCH === "1";
		const lastQueryFile = process.env.LAST_QUERY_FILE || "";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			process.chdir(singleDirRoot);
			// biome-ignore lint: it's okay as the path is already set
			paths = [];
		}

		let query = initialQuery || "";
		if (resumeSearch && lastQueryFile && existsSync(lastQueryFile)) {
			try {
				query = readFileSync(lastQueryFile, "utf-8").trim();
			} catch (error) {
				console.error("Error reading last query file:", error);
			}
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

		const rg = spawn("rg", rgArgs.filter(Boolean));

		const searchCommand = `rg --column --line-number --no-heading --color=always --smart-case ${fuzzRgQuery ? "-e" : ""} {q} ${paths.join(" ")} || true`;

		const fzfArgs = [
			"--ansi",
			"--delimiter",
			":",
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
			"--query",
			query,
			"--bind",
			`change:reload:${searchCommand}`,
		];

		if (initialQuery) {
			fzfArgs.push("--bind", `start:reload:${searchCommand}`);
		}

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		// If there's an initial query, perform the search immediately
		if (initialQuery) {
			const initialSearch = spawn("sh", [
				"-c",
				searchCommand.replace("{q}", query),
			]);
			initialSearch.stdout.pipe(fzf.stdin);
			initialSearch.stderr.pipe(process.stderr);
		} else {
			rg.stdout.pipe(fzf.stdin);
		}

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				let selectedFiles = output.trim().split("\n");
				if (singleDirRoot) {
					selectedFiles = selectedFiles.map(
						(file) =>
							`${singleDirRoot}/${file.split(":")[0]}:${file.split(":")[1]}:${file.split(":")[2]}`,
					);
				}
				// After successful search, save the query for future resume
				if (lastQueryFile) {
					writeFileSync(lastQueryFile, query || "");
				}
				resolve(selectedFiles);
			} else {
				reject(new Error("Search canceled"));
			}
		});

		rg.on("error", (error) => {
			reject(new Error(`Failed to start rg: ${error.message}`));
		});

		fzf.on("error", (error) => {
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});
}

/**
 * Searches for TODO/FIXME comments in files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 */
export async function findTodoFixme(paths: string[]): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";
		const searchPattern =
			process.env.FIND_TODO_FIXME_SEARCH_PATTERN || "(TODO|FIXME|HACK|FIX):s";
		const rgArgs = [
			"--column",
			"--line-number",
			"--no-heading",
			"--color=always",
			"--smart-case",
			"--glob",
			useGitignore ? "" : "--no-ignore",
			"!**/.git/",
			searchPattern,
		];

		if (fileTypes) {
			const fileTypesArray = fileTypes.split(":");
			for (const fileType of fileTypesArray) {
				rgArgs.push("--type", fileType);
			}
		}

		rgArgs.push(...paths);

		const rg = spawn("rg", rgArgs.filter(Boolean));

		const previewCommand =
			process.env.FIND_TODO_FIXME_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
		const previewWindow =
			process.env.FIND_TODO_FIXME_PREVIEW_WINDOW_CONFIG ||
			"right:border-left:50%:+{2}+3/3:~3";

		const fzfArgs = [
			"--ansi",
			"--delimiter",
			":",
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
		];

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		rg.stdout.pipe(fzf.stdin);

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				resolve(output.trim().split("\n"));
			} else {
				reject(new Error("Search canceled"));
			}
		});
	});
}

/**
 * Picks files from git status using fzf.
 * If no file is selected, it will return an empty array.
 * @returns A promise that resolves to an array of selected file paths.
 */
async function pickFilesFromGitStatus(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const previewEnabled =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED !== "0";
		const previewCommand =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND ||
			"git diff --color=always -- {}";
		const previewWindow =
			process.env.PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG ||
			"right:50%:border-left";

		try {
			// Change to the root directory of the git repository
			const gitRoot = execSync("git rev-parse --show-toplevel", {
				encoding: "utf-8",
			}).trim();
			process.chdir(gitRoot);

			// Get git status
			const gitStatus = execSync("git status --porcelain", {
				encoding: "utf-8",
			});

			if (!gitStatus.trim()) {
				console.log("No changes in the git repository.");
				resolve([]);
				return;
			}

			const fzfArgs = ["--cycle", "--multi"];

			if (previewEnabled) {
				fzfArgs.push(
					"--preview",
					previewCommand,
					"--preview-window",
					previewWindow,
				);
			}

			const fzf = spawn("fzf", fzfArgs, {
				stdio: ["pipe", "pipe", process.stderr],
			});

			// Prepare git status for fzf input
			const fzfInput = gitStatus
				.split("\n")
				.filter(Boolean)
				.map((line) => line.slice(3))
				.join("\n");

			fzf.stdin.write(fzfInput);
			fzf.stdin.end();

			let output = "";
			fzf.stdout.on("data", (data) => {
				output += data.toString();
			});

			fzf.on("close", (code) => {
				if (code === 0 && output.trim()) {
					const selectedFiles = output.trim().split("\n");
					const fullPaths = selectedFiles.map((file) =>
						path.join(gitRoot, file),
					);
					resolve(fullPaths);
				} else {
					console.log("No file selected.");
					resolve([]);
				}
			});

			fzf.on("error", (error) => {
				reject(new Error(`Failed to start fzf: ${error.message}`));
			});
		} catch (error) {
			reject(
				new Error(
					`Error in pickFilesFromGitStatus: ${error instanceof Error ? error.message : String(error)}`,
				),
			);
		}
	});
}

if (require.main === module) {
	const command = process.argv[2];
	const args = process.argv.slice(3);

	const executeCommand = async (
		func: (paths: string[], selectedText?: string) => Promise<string[]>,
	) => {
		try {
			const files = await func(args, process.env.SELECTED_TEXT);
			const canaryFile = process.env.CANARY_FILE || "/tmp/canaryFile";
			writeFileSync(canaryFile, files.join("\n"));
			console.log("Files selected. Check the canary file.");
		} catch (error) {
			console.error("Error:", error);
			process.exit(1);
		}
	};

	switch (command) {
		case "findFiles":
			executeCommand(findFiles);
			break;
		case "findWithinFiles":
			executeCommand(liveGrep);
			break;
		case "pickFileFromGitStatus":
			executeCommand(pickFilesFromGitStatus);
			break;
		case "findTodoFixme":
			executeCommand(findTodoFixme);
			break;
		default:
			console.error("Unknown command");
			process.exit(1);
	}
}
