import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

import { lastQueryFile } from "../commands";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

/**
 * Runs `rg` to search for files and pipes the output to `fzf` to select files.
 * If only one path is provided, it will be used as the working directory.
 * @param paths The paths to search.
 * @param initialQuery The initial query to search for.
 * @returns A promise that resolves with the selected files.
 */

export async function findFiles(
	paths: string[],
	initialQuery?: string,
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
			// biome-ignore lint: it's okay as the path is already set
			paths = [];
			process.chdir(singleDirRoot);
		}

		// Implement resume search with last query file
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

		const fzfArgs = [
			"--cycle",
			"--multi",
			"--query",
			query,
			"--print-query",
			"--layout=reverse",
		];

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
		let lastQuery = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
			if (DEBUG) console.log("FZF stdout:", data.toString());
		});

		fzf.on("close", (code) => {
			if (DEBUG) console.log("FZF process closed with code:", code);
			if (code === 0) {
				const lines = output.trim().split("\n");
				lastQuery = lines[0]; // The first line is the query
				let selectedFiles = lines.slice(1); // The rest are selected files
				if (singleDirRoot) {
					// Prepend the single directory root to each selected file
					selectedFiles = selectedFiles.map(
						(file) => `${singleDirRoot}/${file}`,
					);
				}
				resolve(selectedFiles);
				// Save the query for future resume
				if (lastQuery !== null) {
					writeFileSync(lastQueryFile, lastQuery);
				}
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
