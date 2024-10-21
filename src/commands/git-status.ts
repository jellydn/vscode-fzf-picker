import { execSync } from "node:child_process";
import { spawn } from "node:child_process";
import * as path from "node:path";

/**
 * Picks files from git status using fzf.
 * If no file is selected, it will return an empty array.
 * @returns A promise that resolves to an array of selected file paths.
 */
export async function pickFilesFromGitStatus(): Promise<string[]> {
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

			const fzfArgs = ["--cycle", "--multi", "--layout=reverse"];

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

			const fzf = spawn("fzf", fzfArgs, {
				stdio: ["pipe", "pipe", process.stderr],
			});

			// Prepare git status for fzf input and exclude deleted files
			const fzfInput = gitStatus
				.split("\n")
				.filter(Boolean)
				.filter((line) => !line.startsWith("D ") && !line.startsWith(" D"))
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
					`Error in pickFilesFromGitStatus: ${
						error instanceof Error ? error.message : String(error)
					}`,
				),
			);
		}
	});
}
