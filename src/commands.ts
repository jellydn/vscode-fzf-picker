import { exec } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { findFiles } from "./commands/find-files";
import { findTodoFixme } from "./commands/find-todo-fixme";
import { pickFilesFromGitStatus } from "./commands/git-status";
import { liveGrep } from "./commands/live-grep";
import { getLastQuery } from "./utils/search-cache";

export let lastQueryFile: string;

/**
 * Properly escapes a file path for shell execution by wrapping it in quotes
 * and escaping any existing quotes within the path.
 */
function escapeShellPath(filePath: string): string {
	// Replace any existing double quotes with escaped quotes
	const escapedPath = filePath.replace(/"/g, '\\"');
	// Wrap the entire path in double quotes
	return `"${escapedPath}"`;
}

function openFiles(filePath: string) {
	let [file, lineTmp, charTmp] = filePath.split(":", 3);

	file = file.trim();
	let selection:
		| {
				start: { line: number; character: number };
				end: { line: number; character: number };
		  }
		| undefined;
	if (lineTmp !== undefined) {
		let char = 0;
		if (charTmp !== undefined) {
			char = Number.parseInt(charTmp);
		}
		const line = Number.parseInt(lineTmp);
		if (line >= 0 && char >= 0) {
			selection = {
				start: {
					line,
					character: char,
				},
				end: {
					line,
					character: char,
				},
			};
		}
	}

	return {
		file,
		selection,
	};
}

if (require.main === module) {
	const command = process.argv[2];
	const args = process.argv.slice(3);
	lastQueryFile = path.join(
		process.env.EXTENSION_PATH || process.cwd(),
		".last_query",
	);
	const executeCommand = async (
		func: (paths: string[], selectedText?: string) => Promise<string[]>,
	) => {
		try {
			const isResumeSearch = process.env.HAS_RESUME === "1";
			let initialQuery = "";

			if (isResumeSearch) {
				// For findTodoFixme, use the new cache system
				if (command === "findTodoFixme") {
					try {
						const cachedQuery = await getLastQuery();
						if (cachedQuery) {
							initialQuery = cachedQuery;
						}
					} catch (error) {
						console.error("Failed to get cached query:", error);
					}
				} else {
					// For other commands, use the old file-based system
					if (existsSync(lastQueryFile)) {
						initialQuery = readFileSync(lastQueryFile, "utf-8").trim();
					}
				}
			} else if (process.env.SELECTED_TEXT) {
				initialQuery = process.env.SELECTED_TEXT;
			}
			const files = await func(args, initialQuery);

			// For findTodoFixme, the query saving is handled internally
			// For other commands, save the initial query if search was successful
			if (
				files.length > 0 &&
				files[0] !== "" &&
				initialQuery &&
				command !== "findTodoFixme"
			) {
				try {
					writeFileSync(lastQueryFile, initialQuery);
				} catch (error) {
					console.error("Failed to save last query:", error);
					// Don't fail the search if save fails
				}
			}

			const openCommand = process.env.OPEN_COMMAND_CLI;
			if (!openCommand) {
				console.error("OPEN_COMMAND_CLI is not set");
				process.exit(1);
			}

			const openPromises = files.map((filePath) => {
				return new Promise<void>((resolve, reject) => {
					const { file, selection } = openFiles(filePath);
					const escapedFile = escapeShellPath(file);
					exec(
						`${openCommand} ${
							selection ? `${escapedFile}:${selection.start.line}` : escapedFile
						}`,
						(error: Error | null, stdout: string) => {
							if (error) {
								console.error("Error opening file", error);
								reject(error);
							} else {
								console.log(stdout);
								resolve();
							}
						},
					);
				});
			});

			Promise.all(openPromises).catch(console.error);

			const pidFilePath = path.join(
				process.env.EXTENSION_PATH || process.cwd(),
				"out",
				process.env.PID_FILE_NAME || "",
			);
			// Update the PID file to 0 so the extension knows the command is done
			if (existsSync(pidFilePath)) {
				writeFileSync(pidFilePath, "0");
			}
			process.exit(0);
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
