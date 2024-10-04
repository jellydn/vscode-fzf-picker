import { workspace } from "vscode";

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

export function getIgnoreString() {
	const globs = getIgnoreGlobs();
	// We separate by colons so we can have spaces in the globs
	return globs?.reduce((x, y) => `${x}${y}:`, "") ?? "";
}
