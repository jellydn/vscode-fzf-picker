# Change Log

Please refer to Github releases for the latest changes.

## [1.6.1] - 2026-06-13

- chore: sync lockfile with package.json
- chore: add .commandcode to gitignore
- fix: rename agy to agy-ide in openCommand options
- feat: add surf CLI support for Windsurf IDE
- docs: remove outdated open command options from README

## [1.6.0] - 2026-05-24

- feat: add surf CLI support for Windsurf IDE

## [1.5.1] - 2026-05-22

- feat: add support for Antigravity IDE

## [1.5.0] - 2026-05-19

- feat(runtime): add Bun support for faster command execution

## [1.4.0] - 2026-05-12

- refactor: clean up codebase and eliminate technical debt
- feat: add configurable cache directory support

## [1.3.3] - 2026-05-10

- fix: make TODO/FIXME command display relative paths like other commands

## [1.3.2] - 2026-05-09

- docs: update README and enhance debugging features

## [1.3.1] - 2026-05-08

- fix: resolve single file selection parsing in git status and TODO/FIXME commands

## [1.3.0] - 2026-05-06

- feat: add Ctrl+T toggle for gitignore in FZF picker

## [1.2.0] - 2026-05-04

- feat: add Kiro IDE support
- feat: add Claude Code command definitions for project workflows

## [1.1.0] - 2026-05-01

- fix: resolve Windows path handling in cache directory creation
- feat: add architecture decision records for project documentation
- fix: resolve TypeScript and vitest mocking issues in search-cache tests

## [1.0.4] - 2026-04-29

- refactor: unify cache system across all commands for consistent resume functionality
- feat: add comprehensive query persistence and resume functionality for findTodoFixme
- fix: handle file selection via arrow keys without search query in findFiles

## [1.0.3] - 2026-04-27

- fix: handle file paths with special characters and spaces

## [1.0.2] - 2026-04-25

- fix: improve git preview command for files with complex names and special characters

## [1.0.1] - 2026-04-23

- fix: improve git preview handling for untracked files and update settings

## [1.0.0] - 2026-04-21

- Initial release of the fzf-picker fork
- File picker with fzf and rg
- Search within files with fzf and rg
- Git status file picker
- TODO/FIXME comment finder
- Custom tasks support
- Customizable keybindings

[For earlier versions, please refer to the original repository's release notes.]

https://github.com/tomrijndorp/vscode-finditfaster#release-notes
