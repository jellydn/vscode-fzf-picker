<p align="center">
  <img src="res/icon.png" alt="VS Code Fzf Picker" width="200"/>
</p>
<h1 align="center">Welcome to fzf-picker 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-0.6.0-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/vscode-%5E1.93.0-blue.svg" />
  <a href="https://github.com/jellydn/vscode-fzf-picker#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/jellydn/vscode-fzf-picker/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
</p>

> File Picker with fzf and rg

This project is a fork of the amazing work done by [@tomrijndorp](https://github.com/tomrijndorp/vscode-finditfaster). While the initial intention was to contribute via a pull request, the changes became quite extensive, leading to this separate project.

## About This Fork

This fork aims to extend and enhance the functionality of the original project. We're actively working on incorporating workflows inspired by tools like [fzf-lua](https://github.com/ibhagwan/fzf-lua) to provide a more comprehensive and flexible file picking experience in VS Code.

[![IT Man - Supercharge Your VS Code with VSCode Fzf Picker](https://i.ytimg.com/vi/PIYsa3IV59o/hqdefault.jpg)](https://www.youtube.com/watch?v=PIYsa3IV59o)


## Prerequisites

Ensure you can run `fzf`, `rg`, `bat`, and `sed` directly in your terminal. If those work, this plugin will work as expected.

- [`fzf` ("command-line fuzzy finder")](https://github.com/junegunn/fzf)
- [`rg` ("ripgrep")](https://github.com/BurntSushi/ripgrep)
- [`bat` ("a cat clone with wings")](https://github.com/sharkdp/bat)
- [`nodejs`](https://nodejs.dev) LTS

## Default Key Bindings

- `cmd+shift+j` / `ctrl+shift+j`: Search files
- `cmd+shift+u` / `ctrl+shift+u`: Search for text within files
- `cmd+shift+ctrl+u` / `ctrl+shift+alt+u`: Search for text within files with type pre-filtering
- `cmd+shift+alt+f` / `ctrl+shift+alt+f`: Pick a file from git status
- `cmd+shift+alt+t` / `ctrl+shift+alt+t`: Find TODO/FIXME comments

You can change these using VS Code's keyboard shortcuts.

## Recommended Settings

```json
{
  // Setup fzf-picker extension
  "fzf-picker.customTasks": [
    // Choose folder to open on new window
    {
      "name": "zoxide",
      "command": "cursor $(zoxide query --interactive)"
    }
  ],
  // Allow top open a file with line number
  "fzf-picker.general.openCommand": "code -g"
}
```

## Features

This plugin is useful for:

- Very large projects with lots of files (which makes VS Code's search functionality quite slow)
- Users who love using `fzf` and `rg` and would like to bring those tools inside VS Code

The extension provides five main commands:

1. Search for files and open them
2. Search within files for text and open them
3. Search within files with file type pre-filtering
4. Pick file from git status
5. Find TODO/FIXME comments

## Demo

<details>
<summary>Search files</summary>

[![Search files](https://i.gyazo.com/cea7f590a82a1e29605d98f6d2ca4c8c.gif)](https://gyazo.com/cea7f590a82a1e29605d98f6d2ca4c8c)

</details>

<details>
<summary>Search within files</summary>

[![Search within files](https://i.gyazo.com/6bd31cdcdba38a84e4d5baecd49e8942.gif)](https://gyazo.com/6bd31cdcdba38a84e4d5baecd49e8942)

</details>

<details>
<summary>Search within files with type pre-filtering</summary>

[![Search within files with type](https://i.gyazo.com/bdd0d920ea0f292fc5f5570f63983de2.gif)](https://gyazo.com/bdd0d920ea0f292fc5f5570f63983de2)

</details>

<details>
<summary>Pick file from git status</summary>

![Pick File from Git Status Demo](https://i.gyazo.com/22c49d0ffdade4ba52d2cbf79c64990c.gif)

</details>

<details>
<summary>Find TODO/FIXME comments</summary>

![Find TODO/FIXME Demo](https://i.gyazo.com/d73a096b2bb48d1c8baee692097a5427.gif)

</details>

## Extension Settings

This extension contributes various settings. Please refer to the VS Code settings UI for a complete list and descriptions.

### Commands

<!-- commands -->

| Command                              | Title                                                  |
| ------------------------------------ | ------------------------------------------------------ |
| `fzf-picker.findFiles`               | Find It Faster: search file                            |
| `fzf-picker.findFilesWithType`       | Find It Faster: search file (with type filter)         |
| `fzf-picker.findWithinFiles`         | Find It Faster: search within files                    |
| `fzf-picker.findWithinFilesWithType` | Find It Faster: search within files (with type filter) |
| `fzf-picker.resumeSearch`            | Find It Faster: resume last search                     |
| `fzf-picker.pickFileFromGitStatus`   | Find It Faster: Pick file from git status              |
| `fzf-picker.findTodoFixme`           | Find It Faster: Find TODO/FIXME comments               |
| `fzf-picker.runCustomTask`           | Find It Faster: Run Custom Task                        |

<!-- commands -->

### Settings

<!-- configs -->

| Key                                                    | Description                                                                                                                                                                                                                                                                                                                                                | Type      | Default                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `fzf-picker.general.batTheme`                          | The color theme to use for `bat` (see `bat --list-themes`)                                                                                                                                                                                                                                                                                                 | `string`  | `"1337"`                                                                                 |
| `fzf-picker.general.openFileInPreviewEditor`           | When set to `true` files open in a Preview Editor. Use in conjunction with the `workbench.editor.enablePreivew` setting.                                                                                                                                                                                                                                   | `boolean` | `false`                                                                                  |
| `fzf-picker.findFiles.showPreview`                     | Show a preview window when searching files                                                                                                                                                                                                                                                                                                                 | `boolean` | `true`                                                                                   |
| `fzf-picker.findFiles.previewCommand`                  | When populated: Used by `fzf` to produce the preview. Use `{}` to indicate the filename. Example: `bat {}`.                                                                                                                                                                                                                                                | `string`  | `""`                                                                                     |
| `fzf-picker.findFiles.previewWindowConfig`             | When populated: Used by `fzf` to determine position and look of the preview window. See the `fzf` documentation. Example for a horizontal split: `top,50%`.                                                                                                                                                                                                | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.showPreview`               | Show a preview window when searching within files                                                                                                                                                                                                                                                                                                          | `boolean` | `true`                                                                                   |
| `fzf-picker.findWithinFiles.previewCommand`            | When populated: Used by `fzf` to produce the preview when searching within files. Use `{1}` to indicate the filename, `{2}` for the line number                                                                                                                                                                                                            | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.previewWindowConfig`       | When populated: Used by `fzf` to determine position and look of the preview window. See the `fzf` documentation. Example for a horizontal split: `top,50%,border-bottom,+{2}+3/3,~3`.                                                                                                                                                                      | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.fuzzRipgrepQuery`          | By default, matching in "Find Within Files" is exact. Enabling this option relaxes the matching by slightly fuzzing the query that is sent to `rg`: it treats whitespaces as wildcards (`.*`). For example, when enabled, the query `function bar` will match `function foobar`. Otherwise, it won't. This setting does not work on Windows at the moment. | `boolean` | `false`                                                                                  |
| `fzf-picker.advanced.useEditorSelectionAsQuery`        | By default, if you have an active editor with a text selection, we'll use that to populate the prompt in `fzf` such that it will start filtering text directly. Uncheck to disable.                                                                                                                                                                        | `boolean` | `true`                                                                                   |
| `fzf-picker.general.restoreFocusTerminal`              | When enabled, the extension will restore focus to the previously active terminal after executing a command. This is useful if you frequently switch between the terminal and other parts of VS Code. Note: due to limitations in VS Code, will not focus other panel tabs such as problems/output/etc.                                                     | `boolean` | `false`                                                                                  |
| `fzf-picker.general.useTerminalInEditor`               | When enabled, the extension will create the terminal in the main editor stage.                                                                                                                                                                                                                                                                             | `boolean` | `false`                                                                                  |
| `fzf-picker.general.shellPathForTerminal`              | Set the path for the shell (terminal type) to be used.                                                                                                                                                                                                                                                                                                     | `string`  | `""`                                                                                     |
| `fzf-picker.pickFileFromGitStatus.showPreview`         | Show a preview window when picking a file from git status                                                                                                                                                                                                                                                                                                  | `boolean` | `true`                                                                                   |
| `fzf-picker.pickFileFromGitStatus.previewCommand`      | When populated: Used by `fzf` to produce the preview when picking a file from git status. Use `{}` to indicate the filename. Example: `git diff --color=always -- {}`.                                                                                                                                                                                     | `string`  | `""`                                                                                     |
| `fzf-picker.pickFileFromGitStatus.previewWindowConfig` | When populated: Used by `fzf` to determine position and look of the preview window when picking a file from git status. See the `fzf` documentation. Example: `right:50%:border-left`.                                                                                                                                                                     | `string`  | `""`                                                                                     |
| `fzf-picker.findTodoFixme.previewEnabled`              | Enable preview for TODO/FIXME search results                                                                                                                                                                                                                                                                                                               | `boolean` | `true`                                                                                   |
| `fzf-picker.findTodoFixme.previewCommand`              | Preview command for TODO/FIXME search results                                                                                                                                                                                                                                                                                                              | `string`  | `"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid"` |
| `fzf-picker.findTodoFixme.previewWindowConfig`         | Preview window configuration for TODO/FIXME search results                                                                                                                                                                                                                                                                                                 | `string`  | `"right:border-left:50%:+{2}+3/3:~3"`                                                    |
| `fzf-picker.findTodoFixme.searchPattern`               | Regular expression pattern for searching TODO/FIXME/HACK comments. Matches keywords followed by a colon and optional space.                                                                                                                                                                                                                                | `string`  | `"(TODO|FIXME|HACK|FIX):\\s"`                                                            |
| `fzf-picker.customTasks`                               | Custom tasks that can be executed by the extension                                                                                                                                                                                                                                                                                                         | `array`   | `[]`                                                                                     |
| `fzf-picker.general.openCommand`                       | Select the command to open files base on your current editor                                                                                                                                                                                                                                                                                               | `string`  | `"code -g"`                                                                              |
| `fzf-picker.general.customOpenCommand`                 | Specify a custom command to open files when 'custom' is selected in fzf-picker.general.openCommand.                                                                                                                                                                                                                                                        | `string`  | `""`                                                                                     |

<!-- configs -->

## FAQ

Please refer to the [FAQ.md](FAQ.md) file for known issues and frequently asked questions.

## Contributing

For information on contributing fixes and features, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Release Notes

For detailed release notes, please see the [CHANGELOG.md](CHANGELOG.md) file.

## Future Plans

We're actively exploring ways to incorporate additional workflows and features inspired by other powerful tools like [fzf-lua](https://github.com/ibhagwan/fzf-lua). If you have suggestions or specific workflows you'd like to see implemented, please feel free to open an issue or contribute to the project.

# Author

👤 **Dung Huynh Duc <dung@productsway.com>**

- Website: https://productsway.com/
- Github: [@jellydn](https://github.com/jellydn)

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2024 [Dung Huynh Duc <dung@productsway.com>](https://github.com/jellydn).<br />
This project is [MIT](https://github.com/jellydn/vscode-hurl-runner/blob/master/LICENSE) licensed.

[![kofi](https://img.shields.io/badge/Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/dunghd)
[![paypal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/dunghd)
[![buymeacoffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/dunghd)
