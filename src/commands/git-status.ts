import { execSync } from "node:child_process";
import { spawn } from "node:child_process";
import * as path from "node:path";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

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
				.map((line) => line.slice(3))
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

			fzf.on("close", (code) => {
				if (DEBUG) console.log("FZF process closed with code:", code);
				if (code === 0 && output.trim()) {
					const selectedFiles = output.trim().split("\n");
					const fullPaths = selectedFiles.map((file) =>
						path.join(gitRoot, file),
					);
					resolve(fullPaths);
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
