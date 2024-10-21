import { spawn } from "node:child_process";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

/**
 * Searches for TODO/FIXME comments in files using rg and fzf.
 * @param paths - An array of file paths to search within.
 * @param initialQuery - The initial query to search for.
 * @returns A promise that resolves to an array of selected file paths with line and column numbers.
 */

export async function findTodoFixme(
	paths: string[],
	// TODO: Support initialQuery for resume search
	initialQuery?: string,
): Promise<string[]> {
	return new Promise((resolve, reject) => {
		// TODO: Add <Ctr-g> to toggle gitignore with fzf keybinding
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
		];

		const fzf = spawn("fzf", fzfArgs, {
			stdio: ["pipe", "pipe", process.stderr],
		});

		rg.stdout.pipe(fzf.stdin);

		let output = "";
		fzf.stdout.on("data", (data) => {
			output += data.toString();
			if (DEBUG) console.log("FZF stdout:", data.toString());
		});

		fzf.on("close", (code) => {
			if (DEBUG) console.log("FZF process closed with code:", code);
			if (code === 0) {
				resolve(output.trim().split("\n"));
			} else {
				reject(new Error("Search canceled"));
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
