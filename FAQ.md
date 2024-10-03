# Frequently Asked Questions (FAQ)

## How do I control the fuzzy finder view?

Whatever defaults are present on your system (and read by VS Code) are used. For `fzf`, this means <Ctrl+K> moves the selection up, <Ctrl+J> moves down, and <Enter> selects. You can also use the up and down arrows. <TAB> for multiple select when available. Read the `fzf` [documentation](https://github.com/junegunn/fzf#readme) to learn more.

## I'm on Linux and I can't use Ctrl+K to navigate upwards in `fzf`.

Probably VS Code is waiting for you to complete a multi-step keyboard shortcut (chord). Change the following setting in your preferences to disable chords:

```
"terminal.integrated.allowChords": false
```

## There's a file that cannot be found / searched through?

This extension enables you to search through multiple directories: the process working directory, the workspace directories, and any additional directories you specify in the extension settings. What paths are included is configured through the settings. There's a `listSearchLocations` command that can show you which paths are currently being indexed.

## I found a bug!

Please file a Github issue. Provide detailed information including:

- OS
- VS Code version
- Does it happen after you reset to default settings (if relevant)?
- Anything special about your configuration / workspace

## Known Issues

### Windows

There are two ways of running this extension on Windows:

1. **Natively using Powershell**: This feature is experimental. Please file an issue on Github if you find one.
2. **Through WSL** (Windows Subsystem for Linux): You can run this extension inside a Remote-WSL workspace.

### NixOS

The bash scripts use a shebang that conflicts with NixOS: `#!/bin/bash`. As bash isn't available in `/bin`, a workaround is to follow the instructions in [Issue #44](https://github.com/tomrijndorp/vscode-finditfaster/issues/44) and change the shebangs manually. After this, the extension should work normally.
