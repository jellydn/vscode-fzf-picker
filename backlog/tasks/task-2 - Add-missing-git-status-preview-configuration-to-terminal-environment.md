---
id: task-2
title: Add missing git status preview configuration to terminal environment
status: Done
assignee:
  - '@claude'
created_date: '2025-07-11'
updated_date: '2025-07-11'
labels: []
dependencies:
  - task-1
---

## Description

The git status preview settings defined in package.json are not being passed to the terminal environment, causing the preview configuration to not work properly.

## Acceptance Criteria

- [x] Git status preview settings are loaded from VSCode configuration
- [x] Environment variables for git status preview are passed to terminal
- [x] Configuration changes are immediately reflected without restart

## Implementation Plan

1. Add git status preview properties to Config interface in config.ts\n2. Update updateConfigWithUserSettings in extension.ts to load git status preview settings\n3. Add environment variables for git status preview to terminalOptions in extension.ts\n4. Verify settings are properly passed to the git-status command

## Implementation Notes

Added the missing git status preview configuration to the extension's configuration system. The settings were already defined in package.json but weren't being loaded or passed to the terminal environment.\n\nModified files:\n- src/config.ts: Added pickFileFromGitStatusPreviewEnabled, pickFileFromGitStatusPreviewCommand, and pickFileFromGitStatusPreviewWindowConfig to Config interface and CFG object\n- src/extension.ts: Updated updateConfigWithUserSettings() to load git status preview settings\n- src/extension.ts: Added PICK_FILE_FROM_GIT_STATUS_PREVIEW_* environment variables to terminalOptions
