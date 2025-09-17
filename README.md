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

> [!TIP]
> Installing prerequisites with mise

You can easily install all the required tools globally using [mise](https://mise.jdx.dev/). Here's how:

1. First, install mise by following the [mise installation guide](https://mise.jdx.dev/getting-started.html).

2. Then, install the required tools globally:

   ```sh
   mise use -g fzf@latest
   mise use -g ripgrep@latest
   mise use -g bat@latest
   mise use -g node@lts
   ```

3. Activate mise in your shell:
   ```sh
   eval "$(mise activate bash)" # or zsh, fish, etc.
   ```

This will ensure you have all the necessary tools installed globally and available in your environment.

For more information on global installations, refer to the [mise install documentation](https://mise.jdx.dev/cli/install.html).

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

All commands now support toggling the preview window using `Ctrl+G` while in the fzf interface.

## Cache Configuration

The extension caches search queries to improve user experience by allowing you to resume previous searches. The cache directory is configurable for systems with special filesystem requirements:

### Default Cache Locations (OS-specific)

- **Windows**: `%APPDATA%\fzf-picker` (e.g., `C:\Users\YourName\AppData\Roaming\fzf-picker`)
- **macOS**: `~/Library/Caches/fzf-picker` (e.g., `/Users/YourName/Library/Caches/fzf-picker`)  
- **Linux**: `~/.cache/fzf-picker` (or `$XDG_CACHE_HOME/fzf-picker` if XDG is configured)

### Configuration Options

```json
{
  // Custom cache directory (optional) - uses OS default if empty
  "fzf-picker.cache.directory": "/custom/path/to/cache"
}
```

### Environment Variable Override

You can also set the cache directory via environment variable:

```bash
export FZF_PICKER_CACHE_DIR="/custom/cache/directory"
```

### For NixOS Users

On systems with immutable extension directories (like NixOS), set a writable cache directory:

```json
{
  "fzf-picker.cache.directory": "/home/user/.cache/fzf-picker"
}
```

Or disable caching entirely:


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

## Debugging and Troubleshooting

When encountering issues or bugs, enable debug mode by setting `fzf-picker.general.debugMode` to `true` in your VS Code settings. This will create a `fzf.log` file in your current working directory with detailed logging information.

The debug log is invaluable for:

- Troubleshooting extension behavior
- Reporting bugs with detailed context
- Understanding command execution flow
- Debugging file opening issues

> **Note**: The `fzf.log` file contains sensitive information about file paths and search queries. Review the contents before sharing when reporting issues.

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

| Key                                                    | Description                                                                                                                                                                                                                                                                                                                                       | Type      | Default                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `fzf-picker.general.batTheme`                          | The color theme to use for `bat` (see `bat --list-themes`)                                                                                                                                                                                                                                                                                        | `string`  | `"1337"`                                                                                 |
| `fzf-picker.findFiles.showPreview`                     | Show a preview window when searching files                                                                                                                                                                                                                                                                                                        | `boolean` | `true`                                                                                   |
| `fzf-picker.findFiles.previewCommand`                  | When populated: Used by `fzf` to produce the preview. Use `{}` to indicate the filename. Example: `bat {}`.                                                                                                                                                                                                                                       | `string`  | `""`                                                                                     |
| `fzf-picker.findFiles.previewWindowConfig`             | When populated: Used by `fzf` to determine position and look of the preview window. See the `fzf` documentation. Example for a horizontal split: `top,50%`.                                                                                                                                                                                       | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.showPreview`               | Show a preview window when searching within files                                                                                                                                                                                                                                                                                                 | `boolean` | `true`                                                                                   |
| `fzf-picker.findWithinFiles.previewCommand`            | When populated: Used by `fzf` to produce the preview when searching within files. Use `{1}` to indicate the filename, `{2}` for the line number                                                                                                                                                                                                   | `string`  | `""`                                                                                     |
| `fzf-picker.findWithinFiles.previewWindowConfig`       | When populated: Used by `fzf` to determine position and look of the preview window. See the `fzf` documentation. Example for a horizontal split: `top,50%,border-bottom,+{2}+3/3,~3`.                                                                                                                                                             | `string`  | `""`                                                                                     |
| `fzf-picker.advanced.useEditorSelectionAsQuery`        | By default, if you have an active editor with a text selection, we'll use that to populate the prompt in `fzf` such that it will start filtering text directly. Uncheck to disable.                                                                                                                                                               | `boolean` | `true`                                                                                   |
| `fzf-picker.pickFileFromGitStatus.showPreview`         | Show a preview window when picking a file from git status                                                                                                                                                                                                                                                                                         | `boolean` | `true`                                                                                   |
| `fzf-picker.pickFileFromGitStatus.previewCommand`      | When populated: Used by `fzf` to produce the preview when picking a file from git status. Use `{}` to indicate the filename. Example: `git diff --color=always -- {}`.                                                                                                                                                                            | `string`  | `""`                                                                                     |
| `fzf-picker.pickFileFromGitStatus.previewWindowConfig` | When populated: Used by `fzf` to determine position and look of the preview window when picking a file from git status. See the `fzf` documentation. Example: `right:50%:border-left`.                                                                                                                                                            | `string`  | `""`                                                                                     |
| `fzf-picker.findTodoFixme.previewEnabled`              | Enable preview for TODO/FIXME search results                                                                                                                                                                                                                                                                                                      | `boolean` | `true`                                                                                   |
| `fzf-picker.findTodoFixme.previewCommand`              | Preview command for TODO/FIXME search results                                                                                                                                                                                                                                                                                                     | `string`  | `"bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid"` |
| `fzf-picker.findTodoFixme.previewWindowConfig`         | Preview window configuration for TODO/FIXME search results                                                                                                                                                                                                                                                                                        | `string`  | `"right:border-left:50%:+{2}+3/3:~3"`                                                    |
| `fzf-picker.findTodoFixme.searchPattern`               | Regular expression pattern for searching TODO/FIXME/HACK comments. Matches keywords followed by a colon and optional space.                                                                                                                                                                                                                       | `string`  | `"(TODO|FIXME|HACK|FIX):\\s"`                                                            |
| `fzf-picker.customTasks`                               | Custom tasks that can be executed by the extension                                                                                                                                                                                                                                                                                                | `array`   | `[]`                                                                                     |
| `fzf-picker.general.openCommand`                       | Select the command to open files base on your current editor                                                                                                                                                                                                                                                                                      | `string`  | `"code -g"`                                                                              |
| `fzf-picker.cache.directory`                           | Custom directory for cache storage. If empty, uses OS-specific default: Windows: %APPDATA%\fzf-picker, macOS: ~/Library/Caches/fzf-picker, Linux: ~/.cache/fzf-picker (or $XDG_CACHE_HOME/fzf-picker). Set this for systems with immutable extension directories (e.g., NixOS). Environment variable FZF_PICKER_CACHE_DIR overrides this setting. | `string`  | `""`                                                                                     |
| `fzf-picker.general.debugMode`                         | Enable debug mode for the extension. This will log additional information to the console.                                                                                                                                                                                                                                                         | `boolean` | `false`                                                                                  |
| `fzf-picker.general.runtime`                           | Select the JavaScript runtime to use for command execution. Bun provides faster startup times which improves performance in large projects.                                                                                                                                                                                                       | `string`  | `"auto"`                                                                                 |

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
