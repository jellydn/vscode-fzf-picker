import { describe, expect, it } from "vitest";
import { normalizeRgPath, resolveFilePath } from "./path";

describe("normalizeRgPath", () => {
	it("strips leading ./ prefix", () => {
		expect(normalizeRgPath("./file.py")).toBe("file.py");
	});

	it("strips multiple ./ prefixes", () => {
		expect(normalizeRgPath("././file.py")).toBe("file.py");
	});

	it("returns path unchanged if no ./ prefix", () => {
		expect(normalizeRgPath("src/file.py")).toBe("src/file.py");
	});

	it("handles empty string", () => {
		expect(normalizeRgPath("")).toBe("");
	});
});

describe("resolveFilePath", () => {
	it("prepends root and strips ./ prefix", () => {
		expect(resolveFilePath("./file.py", "/home/user")).toBe(
			"/home/user/file.py",
		);
	});

	it("prepends root for path without ./ prefix", () => {
		expect(resolveFilePath("src/file.py", "/home/user")).toBe(
			"/home/user/src/file.py",
		);
	});

	it("handles empty file string", () => {
		expect(resolveFilePath("", "/home/user")).toBe("/home/user/");
	});
});
