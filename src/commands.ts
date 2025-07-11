import { exec } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { findFiles } from "./commands/find-files";
import { findTodoFixme } from "./commands/find-todo-fixme";
import { pickFilesFromGitStatus } from "./commands/git-status";
import { liveGrep } from "./commands/live-grep";

export let lastQueryFile: string;

function openFiles(filePath: string) {
	let [file, lineTmp, charTmp] = filePath.split(":", 3);

	file = file.trim();
	let selection;
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
			if (isResumeSearch && existsSync(lastQueryFile)) {
				initialQuery = readFileSync(lastQueryFile, "utf-8").trim();
			} else if (process.env.SELECTED_TEXT) {
				initialQuery = process.env.SELECTED_TEXT;
			}
			const files = await func(args, initialQuery);
			const openCommand = process.env.OPEN_COMMAND_CLI;
			if (!openCommand) {
				console.error("OPEN_COMMAND_CLI is not set");
				process.exit(1);
			}

			const openPromises = files.map((filePath) => {
				return new Promise<void>((resolve, reject) => {
					const { file, selection } = openFiles(filePath);
					exec(
						`${openCommand} ${
							selection ? `${file}:${selection.start.line}` : file
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
