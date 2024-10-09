import { platform } from "node:os";
import { Range, Uri, window, workspace } from "vscode";

import { CFG } from "./config";

/**
 * Given the `search.exclude` configuration object, returns the globs that VS Code uses to exclude files
 * from its native search. We convert the configuration object to an array of globs by prepending a
 * bang to each key. If a value is a function, we ignore it.
 *
 * @returns An array of globs that VS Code uses to exclude files from its native search.
 */
export function getIgnoreGlobs(): string[] {
	const exclude = workspace.getConfiguration("search.exclude");
	const globs: string[] = [];
	for (const [k, v] of Object.entries(exclude)) {
		if (typeof v === "function") {
			continue;
		}
		if (v) {
			globs.push(`!${k}`);
		}
	}
	return globs;
}

/**
 * Given the `search.exclude` configuration object, returns a colon-separated string of globs that VS Code uses to exclude files
 * from its native search. We convert the configuration object to an array of globs by prepending a bang to each key. If a value is
 * a function, we ignore it.
 *
 * @returns A colon-separated string of globs that VS Code uses to exclude files from its native search.
 */
export function getIgnoreString() {
	const globs = getIgnoreGlobs();
	// We separate by colons so we can have spaces in the globs
	return globs?.reduce((x, y) => `${x}${y}:`, "") ?? "";
}

/**
 * Open files in VS Code based on the terminal output
 * @param data - String containing file paths and line numbers
 */
export function openFiles(data: string) {
	const filePaths = data.split("\n").filter((s) => s !== "");
	if (filePaths.length === 0) return;

	for (const p of filePaths) {
		let [file, lineTmp, charTmp] = p.split(":", 3);
		if (platform() === "win32") {
			const re =
				/^\s*(?<file>([a-zA-Z][:])?[^:]+)([:](?<lineTmp>\d+))?\s*([:](?<charTmp>\d+))?.*/;
			const v = p.match(re);
			if (v?.groups) {
				file = v.groups.file;
				lineTmp = v.groups.lineTmp;
				charTmp = v.groups.charTmp;
			} else {
				window.showWarningMessage(
					`Did not match anything in filename: [${p}] could not open file!`,
				);
				continue;
			}
		}
		file = file.trim();
		let selection = undefined;
		if (lineTmp !== undefined) {
			let char = 0;
			if (charTmp !== undefined) {
				char = Number.parseInt(charTmp) - 1; // 1 based in rg, 0 based in VS Code
			}
			const line = Number.parseInt(lineTmp) - 1; // 1 based in rg, 0 based in VS Code
			if (line >= 0 && char >= 0) {
				selection = new Range(line, char, line, char);
			}
		}
		window.showTextDocument(Uri.file(file), {
			preview: CFG.openFileInPreviewEditor,
			selection: selection,
		});
	}
}
