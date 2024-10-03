# TODO: Need to make sure this works on Windows
$ErrorActionPreference = "Stop"

. "$Env:EXTENSION_PATH\shared.ps1"

$PREVIEW_ENABLED = if ($Env:PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED) { $Env:PICK_FILE_FROM_GIT_STATUS_PREVIEW_ENABLED } else { "1" }
$PREVIEW_COMMAND = if ($Env:PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND) { $Env:PICK_FILE_FROM_GIT_STATUS_PREVIEW_COMMAND } else { 'git diff --color=always -- {}' }
$PREVIEW_WINDOW = if ($Env:PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG) { $Env:PICK_FILE_FROM_GIT_STATUS_PREVIEW_WINDOW_CONFIG } else { 'right:50%:border-left' }
$CANARY_FILE = if ($Env:CANARY_FILE) { $Env:CANARY_FILE } else { "$Env:TEMP\canaryFile" }

# Change to the root directory of the git repository
$repo_root = git rev-parse --show-toplevel
Set-Location $repo_root

$git_status = git status --porcelain

if ([string]::IsNullOrWhiteSpace($git_status)) {
    Write-Host "No changes in the git repository."
    "1" | Out-File -FilePath $CANARY_FILE -Encoding UTF8
    exit 1
}

$PREVIEW_STR = @()
if ($PREVIEW_ENABLED -eq "1") {
    $PREVIEW_STR = @("--preview", $PREVIEW_COMMAND, "--preview-window", $PREVIEW_WINDOW)
}

$selected_file = $git_status | ForEach-Object { $_.Substring(3) } | fzf --cycle --multi @PREVIEW_STR

if ([string]::IsNullOrWhiteSpace($selected_file)) {
    Write-Host "No file selected."
    "1" | Out-File -FilePath $CANARY_FILE -Encoding UTF8
    exit 1
} else {
    # Use the full path of the selected file
    $full_path = Join-Path $repo_root $selected_file
    $full_path | Out-File -FilePath $CANARY_FILE -Encoding UTF8
}