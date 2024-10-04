import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

async function findFiles(paths: string[]): Promise<string[]> {
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

		let query = "";
		if (resumeSearch && lastQueryFile) {
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
		].concat(paths);

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
				resolve(output.trim().split("\n"));
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

if (require.main === module) {
	const command = process.argv[2];
	const args = process.argv.slice(3);

	if (command === "findFiles") {
		findFiles(args)
			.then((files) => {
				// Write the selected files to the canary file
				const canaryFile = process.env.CANARY_FILE || "/tmp/canaryFile";
				writeFileSync(canaryFile, files.join("\n"));
				console.log("Files selected. Check the canary file.");
			})
			.catch((error) => {
				console.error("Error:", error);
				process.exit(1);
			});
	} else {
		console.error("Unknown command");
		process.exit(1);
	}
}
