import { execSync } from "node:child_process";
import { logger } from "../logger";

export type RuntimeType = "auto" | "bun" | "node";

interface RuntimeInfo {
	type: "bun" | "node";
	command: string;
	version?: string;
}

let cachedRuntimeInfo: RuntimeInfo | null = null;

/**
 * Check if Bun is available on the system
 */
function isBunAvailable(): boolean {
	try {
		const version = execSync("bun --version", {
			encoding: "utf-8",
			timeout: 1000,
			stdio: "pipe"
		}).trim();
		logger.info("Bun detected", { version });
		return true;
	} catch {
		logger.info("Bun not available, falling back to Node.js");
		return false;
	}
}

/**
 * Get the best available runtime based on user preference
 */
export function getRuntime(preference: RuntimeType = "auto"): RuntimeInfo {
	// Use cached result if available
	if (cachedRuntimeInfo && preference === "auto") {
		return cachedRuntimeInfo;
	}

	let runtime: RuntimeInfo;

	switch (preference) {
		case "bun":
			if (isBunAvailable()) {
				runtime = { type: "bun", command: "bun" };
			} else {
				logger.warn("Bun requested but not available, falling back to Node.js");
				runtime = { type: "node", command: "node" };
			}
			break;
		case "node":
			runtime = { type: "node", command: "node" };
			break;
		default:
			runtime = isBunAvailable()
				? { type: "bun", command: "bun" }
				: { type: "node", command: "node" };
			break;
	}

	// Cache the result for auto mode
	if (preference === "auto") {
		cachedRuntimeInfo = runtime;
	}

	logger.info("Selected runtime", { type: runtime.type, preference });
	return runtime;
}

/**
 * Clear the cached runtime info (useful for testing or configuration changes)
 */
export function clearRuntimeCache(): void {
	cachedRuntimeInfo = null;
}