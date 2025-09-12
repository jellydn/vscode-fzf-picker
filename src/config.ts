import { defineConfigObject } from "reactive-vscode";
import * as Meta from "./generated/meta";

export const config = defineConfigObject<Meta.ScopedConfigKeyTypeMap>(
	Meta.scopedConfigs.scope,
	Meta.scopedConfigs.defaults,
);

export interface CustomTask {
	name: string;
	command: string;
}

export interface Config {
	useEditorSelectionAsQuery: boolean;
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
	extensionPath: string;
	useTypeFilter: boolean;
	lastCommand: string;
	batTheme: string;
	findTodoFixmeSearchPattern: string;
	customTasks: CustomTask[];
	openCommand: string;
	cacheDirectory: string;
}

export const CFG: Config = {
	useEditorSelectionAsQuery: true,
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
	extensionPath: "",
	useTypeFilter: false,
	lastCommand: "",
	batTheme: "",
	findTodoFixmeSearchPattern: "(TODO|FIXME|HACK|FIX):\\s",
	customTasks: [],
	openCommand: "code -g",
	cacheDirectory: "",
};
