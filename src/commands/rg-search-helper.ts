#!/usr/bin/env node

/**
 * Helper script to execute rg search with AND pattern matching.
 * 
 * This script chains multiple `rg` commands via pipes to implement AND search:
 * `rg pattern1 | rg pattern2 | rg pattern3 | ...`
 * Each subsequent `rg` only sees lines that matched previous patterns, naturally
 * enforcing AND logic (all patterns must match).
 * 
 * ## How it's called:
 * 
 * Called from `live-grep.ts` via a shell script that runs in fzf's `--reload` binding.
 * The shell script collects search terms from fzf's query string (split by whitespace),
 * base64-encodes each term, and passes them along with base64-encoded parameters.
 * 
 * ### Command-line arguments:
 * 
 * 1. `paramsB64` (argv[2]): Base64-encoded JSON string containing:
 *    ```json
 *    {
 *      "paths": ["path1", "path2", ...],  // Search paths (files/directories)
 *      "args": ["--column", "--line-number", ...]  // Base rg arguments
 *    }
 *    ```
 * 
 * 2. `wordsB64` (argv[3]): Space-separated base64-encoded search terms.
 *    Each word from the user's query is base64-encoded individually.
 *    Example: if user types "para que", this would be: "cGFyYQ== cXVl" (base64 of "para" and "que")
 * 
 * ### Example invocation:
 * 
 * ```bash
 * # User types "para que" in fzf
 * # Shell script creates:
 * node rg-search-helper.js \
 *   "eyJwYXRocyI6WyIuIl0sImFyZ3MiOlsiLS1jb2x1bW4iLCItLWxpbmUtbnVtYmVyIl19" \
 *   "cGFyYQ== cXVl"
 * 
 * # Which decodes to:
 * # params: { paths: ["."], args: ["--column", "--line-number"] }
 * # words: ["para", "que"]
 * 
 * # Executes: rg --column --line-number -e "para" -- . | rg --column --line-number -e "que" -- -
 * ```
 * 
 * ### Processing flow:
 * 
 * 1. Decode `paramsB64` to get search paths and rg arguments
 * 2. Decode each word in `wordsB64` (split by whitespace, decode each)
 * 3. Escape special regex characters in each word
 * 4. Chain `rg` commands:
 *    - First `rg`: searches files using `params.paths` with first pattern
 *    - Subsequent `rg` commands: read from stdin (`-`) with remaining patterns
 * 5. Pipe stdout of each process to stdin of next
 * 6. Final stdout contains highlighted results where all patterns matched
 * 
 * ### Why this approach:
 * 
 * - **AND matching**: Piping naturally enforces AND logic (all terms must match)
 * - **Highlighting**: Each `rg` highlights its own pattern, so all terms get highlighted
 * - **Security**: Base64 encoding avoids shell escaping issues with user input
 * - **Simplicity**: No complex regex lookaheads needed, just simple chaining
 */

import { spawn } from "node:child_process";

interface SearchParams {
	paths: string[];
	args: string[];
}

/**
 * Escapes special regex characters in a string so it can be used as a literal pattern.
 * Characters escaped: . ^ $ * + ? ( ) [ ] { } |
 * Example: "file.txt" -> "file\.txt" (so "." matches a literal dot, not any character)
 */
function escapeRegexSpecialChars(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escapes and returns patterns for each term.
 * Piping rg commands naturally enforces AND logic: rg term1 | rg term2
 * means lines must match term1 AND term2.
 */
function buildPatterns(words: string[]): string[] {
	if (words.length === 0) {
		return [];
	}
	return words.map(escapeRegexSpecialChars);
}

function main() {
	const paramsB64 = process.argv[2];
	const wordsB64 = process.argv[3];

	if (!paramsB64 || !wordsB64) {
		process.exit(0);
	}

	const paramsJson = Buffer.from(paramsB64, "base64").toString("utf-8");
	const params: SearchParams = JSON.parse(paramsJson);

	const words: string[] = wordsB64
		.trim()
		.split(/\s+/)
		.map((w) => {
			// Decode base64 and strip surrounding quotes if present
			const decoded = Buffer.from(w, "base64").toString("utf-8");
			return decoded.replace(/^['"]|['"]$/g, "");
		})
		.filter((w) => w.length > 0);

	if (words.length === 0) {
		process.exit(0);
	}

	const patterns = buildPatterns(words);
	
	if (patterns.length === 0) {
		process.exit(0);
	}
	
	// Chain rg commands: rg pattern1 | rg pattern2 | rg pattern3 | ...
	// Piping naturally enforces AND logic - each rg only sees lines that matched previous patterns
	let currentProcess: ReturnType<typeof spawn> | null = null;
	const allProcesses: ReturnType<typeof spawn>[] = [];
	
	for (let i = 0; i < patterns.length; i++) {
		const pattern = patterns[i];
		// Only first rg needs --column and --line-number (subsequent ones read formatted output from stdin)
		const baseArgs = i === 0 
			? params.args 
			: params.args.filter((arg) => arg !== "--column" && arg !== "--line-number");
		const rgArgs = [
			...baseArgs,
			"--pcre2",
			"-e",
			pattern,
			"--",
			...(i === 0 ? params.paths : ["-"]), // First rg searches files, rest read from stdin
		];
		
		const rg = spawn("rg", rgArgs, {
			stdio: i === 0 ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
		});
		
		if (currentProcess?.stdout && currentProcess.stderr && rg.stdin) {
			currentProcess.stdout.pipe(rg.stdin);
			currentProcess.stderr.pipe(process.stderr);
		}
		
		allProcesses.push(rg);
		currentProcess = rg;
	}
	
	// Output from the last process goes to stdout
		if (currentProcess?.stdout && currentProcess.stderr) {
			currentProcess.stdout.pipe(process.stdout);
			currentProcess.stderr.pipe(process.stderr);
		}
	
	// Wait for all processes to complete
	let exitCode = 0;
	let completedCount = 0;
	const totalProcesses = allProcesses.length;
	
	const checkComplete = (code: number | null) => {
		if (code !== null && code !== 0) {
			exitCode = code;
		}
		completedCount++;
		if (completedCount === totalProcesses) {
			process.exit(exitCode);
		}
	};
	
	allProcesses.forEach((proc) => {
		proc.on("close", checkComplete);
	});
}

main();

