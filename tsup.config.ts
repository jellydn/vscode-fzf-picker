import { defineConfig } from "tsup";

export default defineConfig({
	entry: [
		"src/extension.ts",
		"src/commands.ts",
		"src/commands/rg-search-helper.ts",
	],
	format: ["cjs"],
	shims: false,
	dts: false,
	external: ["vscode"],
	outDir: "out",
	onSuccess: "cp LICENSE.md LICENSE.txt",
});
