import { exec } from "node:child_process";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { findFiles } from "./commands/find-files";
import { findTodoFixme } from "./commands/find-todo-fixme";
import { pickFilesFromGitStatus } from "./commands/git-status";
import { liveGrep } from "./commands/live-grep";
import { getLastQuery } from "./utils/search-cache";

const DEBUG = process.env.DEBUG_FZF_PICKER === "1";

/**
 * Logs debug information to fzf.logs file when debugging is enabled
 */
function logDebug(message: string, data?: any) {
	if (!DEBUG) return;

	const timestamp = new Date().toISOString();
	const logEntry = `[${timestamp}] ${message}${data ? " " + JSON.stringify(data, null, 2) : ""}\n`;

	try {
		appendFileSync("fzf.logs", logEntry);
		console.log("[DEBUG]", message, data || "");
	} catch (error) {
		console.error("Failed to write to fzf.logs:", error);
	}
}

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

export function openFiles(filePath: string) {
	// Strip ANSI color codes before parsing
	const cleanPath = filePath.replace(/\x1b\[[0-9;]*m/g, "");
	let [file, lineTmp, charTmp] = cleanPath.split(":", 3);

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
	const executeCommand = async (
		func: (paths: string[], selectedText?: string) => Promise<string[]>,
	) => {
		logDebug("=== COMMAND EXECUTION START ===", {
			command,
			args,
			environment: {
				DEBUG_FZF_PICKER: process.env.DEBUG_FZF_PICKER,
				OPEN_COMMAND_CLI: process.env.OPEN_COMMAND_CLI,
				HAS_RESUME: process.env.HAS_RESUME,
				SELECTED_TEXT: process.env.SELECTED_TEXT,
				EXTENSION_PATH: process.env.EXTENSION_PATH,
				PID_FILE_NAME: process.env.PID_FILE_NAME,
			},
		});

		try {
			const isResumeSearch = process.env.HAS_RESUME === "1";
			let initialQuery = "";

			if (isResumeSearch) {
				logDebug("Resume search detected, getting cached query");
				// Use the unified cache system for all commands
				try {
					const cachedQuery = await getLastQuery();
					if (cachedQuery) {
						initialQuery = cachedQuery;
						logDebug("Using cached query", { cachedQuery });
					} else {
						logDebug("No cached query found");
					}
				} catch (error) {
					logDebug("Failed to get cached query", { error: error.message });
					console.error("Failed to get cached query:", error);
				}
			} else if (process.env.SELECTED_TEXT) {
				initialQuery = process.env.SELECTED_TEXT;
				logDebug("Using selected text as initial query", { initialQuery });
			}

			logDebug("Calling command function", {
				initialQuery,
				argsCount: args.length,
			});
			const files = await func(args, initialQuery);
			logDebug("Command function completed", {
				filesCount: files.length,
				files,
			});

			// Query saving is now handled internally by each command

			const openCommand = process.env.OPEN_COMMAND_CLI;
			if (!openCommand) {
				logDebug("CRITICAL ERROR: OPEN_COMMAND_CLI not set");
				console.error("OPEN_COMMAND_CLI is not set");
				process.exit(1);
			}

			logDebug("Preparing to open files", {
				openCommand,
				filesCount: files.length,
			});

			const openPromises = files.map((filePath, index) => {
				return new Promise<void>((resolve, reject) => {
					const { file, selection } = openFiles(filePath);
					const escapedFile = escapeShellPath(file);
					const finalCommand = `${openCommand} ${
						selection ? `${escapedFile}:${selection.start.line}` : escapedFile
					}`;

					logDebug(`Opening file ${index + 1}/${files.length}`, {
						originalPath: filePath,
						parsedFile: file,
						selection,
						escapedFile,
						finalCommand,
					});

					exec(finalCommand, (error: Error | null, stdout: string) => {
						if (error) {
							logDebug(`File open FAILED ${index + 1}/${files.length}`, {
								filePath,
								error: error.message,
								code: error.code,
							});
							console.error("Error opening file", error);
							reject(error);
						} else {
							logDebug(`File open SUCCESS ${index + 1}/${files.length}`, {
								filePath,
								stdout: stdout.trim(),
							});
							console.log(stdout);
							resolve();
						}
					});
				});
			});

			logDebug("Starting file opening operations", {
				promisesCount: openPromises.length,
			});
			try {
				await Promise.all(openPromises);
				logDebug("All file opening operations completed successfully");
			} catch (error) {
				logDebug("File opening operations failed", {
					error: error.message,
					errorType: error.constructor.name,
				});
				console.error("Error opening files:", error);
			}

			const pidFilePath = path.join(
				process.env.EXTENSION_PATH || process.cwd(),
				"out",
				process.env.PID_FILE_NAME || "",
			);

			logDebug("Finalizing command execution", { pidFilePath });

			// Update the PID file to 0 so the extension knows the command is done
			if (existsSync(pidFilePath)) {
				writeFileSync(pidFilePath, "0");
				logDebug("PID file updated successfully");
			} else {
				logDebug("WARNING: PID file not found", { expectedPath: pidFilePath });
			}

			logDebug("=== COMMAND EXECUTION END (SUCCESS) ===");
			process.exit(0);
		} catch (error) {
			logDebug("=== COMMAND EXECUTION END (ERROR) ===", {
				error: error.message,
				stack: error.stack,
			});
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
