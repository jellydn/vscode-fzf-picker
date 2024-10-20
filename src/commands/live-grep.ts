import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { lastQueryFile } from "../commands";

/**
 * Interactive search for text within files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 */

export async function liveGrep(
	paths: string[],
	initialQuery?: string,
): Promise<string[]> {
	// TODO: Need to update the test to match the new behavior
	return new Promise((resolve, reject) => {
		const previewCommand =
			process.env.FIND_WITHIN_FILES_PREVIEW_COMMAND ||
			"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid";
		const previewWindow =
			process.env.FIND_WITHIN_FILES_PREVIEW_WINDOW_CONFIG ||
			"right:border-left:50%:+{2}+3/3:~3";
		// TODO: Add <Ctr-g> to toggle gitignore with fzf keybinding
		const useGitignore = process.env.USE_GITIGNORE !== "0";
		const fileTypes = process.env.TYPE_FILTER || "";
		const fuzzRgQuery = process.env.FUZZ_RG_QUERY === "1";

		// Navigate to the first path if it's the only one
		let singleDirRoot = "";
		if (paths.length === 1) {
			singleDirRoot = paths[0];
			process.chdir(singleDirRoot);
			// biome-ignore lint: it's okay as the path is already set
			paths = [];
		}

		const query = initialQuery || "";

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

		const searchCommand = `rg ${rgArgsString} ${
			fuzzRgQuery ? "-e" : ""
		} {q} || true`;

		const fzfArgs = [
			"--ansi",
			"--multi",
			"--delimiter",
			":",
			"--preview",
			previewCommand,
			"--preview-window",
			previewWindow,
			"--query",
			query,
			"--print-query",
			"--bind",
			`change:reload:${searchCommand}`,
			"--layout=reverse",
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
			const rg = spawn("rg", rgArgs.filter(Boolean));
			rg.stdout.pipe(fzf.stdin);
		}

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
		});

		fzf.on("close", (code) => {
			if (code === 0) {
				const lines = output.trim().split("\n");
				const lastQuery = lines[0]; // The first line is the query
				let selectedFiles = lines.slice(1); // The rest are selected files
				if (singleDirRoot) {
					selectedFiles = selectedFiles.map(
						(file) =>
							`${singleDirRoot}/${file.split(":")[0]}:${file.split(":")[1]}:${
								file.split(":")[2]
							}`,
					);
				}
				writeFileSync(lastQueryFile, lastQuery);
				resolve(selectedFiles);
			} else {
				reject(new Error("Search canceled"));
			}
		});

		fzf.on("error", (error) => {
			reject(new Error(`Failed to start fzf: ${error.message}`));
		});
	});
}