import { exec } from "node:child_process";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { findFiles } from "./commands/find-files";
import { findTodoFixme } from "./commands/find-todo-fixme";
import { pickFilesFromGitStatus } from "./commands/git-status";
import { liveGrep } from "./commands/live-grep";
import { DEBUG } from "./utils/debug";
import { getLastQuery } from "./utils/search-cache";

/**
 * Logs debug information to fzf.logs file when debugging is enabled
 */
function logDebug(message: string, data?: unknown) {
	if (!DEBUG) return;

	const timestamp = new Date().toISOString();
	const logEntry = `[${timestamp}] ${message}${data ? ` ${JSON.stringify(data, null, 2)}` : ""}\n`;

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
export function escapeShellPath(filePath: string): string {
	// Replace any existing double quotes with escaped quotes
	const escapedPath = filePath.replace(/"/g, '\\"');
	// Wrap the entire path in double quotes
	return `"${escapedPath}"`;
}

/**
 * Constructs the shell command to open a file at an optional line/column.
 *
 * Constructs the full file:line:column string BEFORE quoting, so that
 * the line/column indicators are part of the quoted argument. This avoids
 * the bug where code -g "/path/file.ts":42 would put :42 outside quotes.
 *
 * @param openCommand - The editor CLI command (e.g. "code -g")
 * @param file - The file path (already parsed, no ANSI codes)
 * @param selection - Optional line/column selection
 * @returns The complete shell command string
 */
export function buildOpenFileCommand(
	openCommand: string,
	file: string,
	selection?: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	},
): string {
	let fileArg = file;
	if (selection) {
		fileArg = `${file}:${selection.start.line}:${selection.start.character}`;
	}
	return `${openCommand} ${escapeShellPath(fileArg)}`;
}

export function openFiles(filePath: string) {
	// Strip ANSI color codes before parsing
	// Using regex to match ANSI escape sequences (ESC[...m)
	// Construct regex to avoid linter warning about control characters
	const escapeCode = String.fromCharCode(0x1b);
	const ansiRegex = new RegExp(`${escapeCode}\\[[0-9;]*m`, "g");
	const cleanPath = filePath.replace(ansiRegex, "");
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
			char = Number.parseInt(charTmp, 10);
		}
		const line = Number.parseInt(lineTmp, 10);
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

/**
 * Orchestrates the full command lifecycle: resolves initial query, invokes
 * the command function, opens returned files, and writes the PID file.
 */
export async function executeCommand(
	func: (paths: string[], selectedText?: string) => Promise<string[]>,
	args: string[],
	commandName?: string,
): Promise<void> {
	logDebug("=== COMMAND EXECUTION START ===", { command: commandName, args });
	const initialQuery = await resolveInitialQuery();

	try {
		const files = await func(args, initialQuery);

		const openCommand = process.env.OPEN_COMMAND_CLI;
		if (!openCommand) {
			console.error("OPEN_COMMAND_CLI is not set");
			process.exit(1);
		}

		await Promise.all(files.map((filePath) => openFile(openCommand, filePath)));

		writePIDFile();

		logDebug("=== COMMAND EXECUTION END (SUCCESS) ===");
		process.exit(0);
	} catch (error) {
		logDebug("=== COMMAND EXECUTION END (ERROR) ===", {
			error: error instanceof Error ? error.message : String(error),
		});
		console.error("Error:", error);
		process.exit(1);
	}
}

async function resolveInitialQuery(): Promise<string> {
	const isResumeSearch = process.env.HAS_RESUME === "1";
	if (isResumeSearch) {
		try {
			const cachedQuery = await getLastQuery();
			if (cachedQuery) {
				logDebug("Using cached query", { cachedQuery });
				return cachedQuery;
			}
		} catch (error) {
			logDebug("Failed to get cached query", { error });
		}
	} else if (process.env.SELECTED_TEXT) {
		return process.env.SELECTED_TEXT;
	}
	return "";
}

function openFile(openCommand: string, filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const { file, selection } = openFiles(filePath);
		const finalCommand = buildOpenFileCommand(openCommand, file, selection);
		exec(finalCommand, (error) => {
			if (error) reject(error);
			else resolve();
		});
	});
}

function writePIDFile() {
	const pidFilePath = path.join(
		process.env.EXTENSION_PATH || process.cwd(),
		"out",
		process.env.PID_FILE_NAME || "",
	);
	if (existsSync(pidFilePath)) {
		writeFileSync(pidFilePath, "0");
	}
}

if (require.main === module) {
	const command = process.argv[2];
	const args = process.argv.slice(3);

	const dispatch: Record<
		string,
		(paths: string[], query?: string) => Promise<string[]>
	> = {
		findFiles,
		findWithinFiles: liveGrep,
		pickFileFromGitStatus: pickFilesFromGitStatus,
		findTodoFixme,
	};

	const func = dispatch[command ?? ""];
	if (!func) {
		console.error(`Unknown command: ${command}`);
		process.exit(1);
	}

	executeCommand(func, args, command);
}
