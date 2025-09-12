/**
 * Debug utility for conditional logging based on environment variable
 */
export const DEBUG = process.env.DEBUG_FZF_PICKER === "1";
