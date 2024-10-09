type WhenCondition = "always" | "never" | "noWorkspaceOnly";
export enum PathOrigin {
	cwd = 1 << 0,
	workspace = 1 << 1,
	settings = 1 << 2,
}

export interface CustomTask {
	name: string;
	command: string;
}

/** Global variable cesspool erm, I mean, Configuration Data Structure! It does the job for now. */
export interface Config {
	extensionName: string | undefined;
	searchPaths: string[];
	searchPathsOrigins: { [key: string]: PathOrigin };
	useEditorSelectionAsQuery: boolean;
	useGitIgnoreExcludes: boolean;
	useWorkspaceSearchExcludes: boolean;
	findFilesPreviewEnabled: boolean;
	findFilesPreviewCommand: string;
	findFilesPreviewWindowConfig: string;
	findWithinFilesPreviewEnabled: boolean;
	findWithinFilesPreviewCommand: string;
	findWithinFilesPreviewWindowConfig: string;
	findWithinFilesFilter: Set<string>;
	workspaceSettings: {
		folders: string[];
	};
	hideTerminalAfterSuccess: boolean;
	hideTerminalAfterFail: boolean;
	clearTerminalAfterUse: boolean;
	showMaximizedTerminal: boolean;
	flightCheckPassed: boolean;
	additionalSearchLocations: string[];
	additionalSearchLocationsWhen: WhenCondition;
	searchCurrentWorkingDirectory: WhenCondition;
	searchWorkspaceFolders: boolean;
	extensionPath: string;
	tempDir: string;
	useTypeFilter: boolean;
	lastCommand: string;
	batTheme: string;
	openFileInPreviewEditor: boolean;
	killTerminalAfterUse: boolean;
	fuzzRgQuery: boolean;
	restoreFocusTerminal: boolean;
	useTerminalInEditor: boolean;
	shellPathForTerminal: string;
	findTodoFixmeSearchPattern: string;
	customTasks: CustomTask[];
	openCommand: string;
}

export const CFG: Config = {
	extensionName: undefined,
	searchPaths: [],
	searchPathsOrigins: {},
	useEditorSelectionAsQuery: true,
	useGitIgnoreExcludes: true,
	useWorkspaceSearchExcludes: true,
	findFilesPreviewEnabled: true,
	findFilesPreviewCommand: "",
	findFilesPreviewWindowConfig: "",
	findWithinFilesPreviewEnabled: true,
	findWithinFilesPreviewCommand: "",
	findWithinFilesPreviewWindowConfig: "",
	findWithinFilesFilter: new Set(),
	workspaceSettings: {
		folders: [],
	},
	hideTerminalAfterSuccess: false,
	hideTerminalAfterFail: false,
	clearTerminalAfterUse: false,
	showMaximizedTerminal: false,
	flightCheckPassed: false,
	additionalSearchLocations: [],
	additionalSearchLocationsWhen: "never",
	searchCurrentWorkingDirectory: "never",
	searchWorkspaceFolders: true,
	extensionPath: "",
	tempDir: "",
	useTypeFilter: false,
	lastCommand: "",
	batTheme: "",
	openFileInPreviewEditor: false,
	killTerminalAfterUse: false,
	fuzzRgQuery: false,
	restoreFocusTerminal: false,
	useTerminalInEditor: false,
	shellPathForTerminal: "",
	findTodoFixmeSearchPattern: "(TODO|FIXME|HACK|FIX):\\s",
	customTasks: [
		{
			name: "zoxide",
			command: "code $(zoxide query --interactive)",
		},
	],
	openCommand: "code -g",
};
