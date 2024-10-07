import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

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

async function findWithinFiles(paths: string[]): Promise<string[]> {
	// TODO: Implement this
	return [];
}

async function pickFilesFromGitStatus(): Promise<string[]> {
	// TODO: Implement this
	return [];
}

async function findTodoFixme(paths: string[]): Promise<string[]> {
	// TODO: Implement this
	return [];
}

if (require.main === module) {
	const command = process.argv[2];
	const args = process.argv.slice(3);

	const executeCommand = async (
		func: (args: string[]) => Promise<string[]>,
	) => {
		try {
			const files = await func(args);
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
			executeCommand(findWithinFiles);
			break;
		case "gitStatus":
			executeCommand(pickFilesFromGitStatus);
			break;
		case "todo":
			executeCommand(findTodoFixme);
			break;
		default:
			console.error("Unknown command");
			process.exit(1);
	}
}
