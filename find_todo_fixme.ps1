# Import shared functions
. "$env:EXTENSION_PATH\shared.ps1"

# If we only have one directory to search, invoke commands relative to that directory
$PATHS = $args
$SINGLE_DIR_ROOT = ''
if ($PATHS.Count -eq 1) {
    $SINGLE_DIR_ROOT = $PATHS[0]
    $PATHS = @()
    Set-Location $SINGLE_DIR_ROOT
}

# Get the search pattern from the environment variable or use a default
$SEARCH_PATTERN = if ($env:FIND_TODO_FIXME_SEARCH_PATTERN) { $env:FIND_TODO_FIXME_SEARCH_PATTERN } else { '(TODO|FIXME|HACK|FIX):\s' }

# Set up the ripgrep command
$RG_PREFIX = @(
    "rg",
    "--column",
    "--hidden",
    $(if ($env:USE_GITIGNORE -eq "0") { "--no-ignore" }),
    "--line-number",
    "--no-heading",
    "--color=always",
    "--smart-case",
    "--colors", "match:fg:green",
    "--colors", "path:fg:white",
    "--colors", "path:style:nobold",
    "--glob", "!**/.git/"
)
$RG_PREFIX += $GLOBS
if ($TYPE_FILTER_ARR.Count -gt 0) {
    $RG_PREFIX += $TYPE_FILTER_ARR
}

$PREVIEW_ENABLED = if ($env:FIND_TODO_FIXME_PREVIEW_ENABLED) { $env:FIND_TODO_FIXME_PREVIEW_ENABLED } else { "1" }
$PREVIEW_COMMAND = if ($env:FIND_TODO_FIXME_PREVIEW_COMMAND) { $env:FIND_TODO_FIXME_PREVIEW_COMMAND } else { 'bat --decorations=always --color=always {1} --highlight-line {2} --style=header,grid' }
$PREVIEW_WINDOW = if ($env:FIND_TODO_FIXME_PREVIEW_WINDOW_CONFIG) { $env:FIND_TODO_FIXME_PREVIEW_WINDOW_CONFIG } else { 'right:border-left:50%:+{2}+3/3:~3' }

$PREVIEW_STR = @()
if ($PREVIEW_ENABLED -eq "1") {
    $PREVIEW_STR = @("--preview", $PREVIEW_COMMAND, "--preview-window", $PREVIEW_WINDOW)
}

$RG_PREFIX_STR = $RG_PREFIX -join ' '
$FZF_CMD = "$RG_PREFIX_STR '$SEARCH_PATTERN' $($PATHS -join ' ')"

# Run the initial search and store results in a temporary file
$TEMP_RESULTS = New-TemporaryFile
Invoke-Expression $FZF_CMD | Out-File -FilePath $TEMP_RESULTS -Encoding utf8

# Check if there are any TODO/FIXME comments
if ((Get-Item $TEMP_RESULTS).length -eq 0) {
    Write-Host "No TODO/FIXME comments found in the project."
    "1" | Out-File -FilePath $env:CANARY_FILE -Encoding UTF8
    Remove-Item $TEMP_RESULTS
    exit 1
}

# Use fzf to select multiple TODO/FIXME comments
$selected = Get-Content $TEMP_RESULTS | fzf --ansi `
    --multi `
    --cycle `
    --delimiter : `
    --bind "change:reload:Start-Sleep -Milliseconds 100; Get-Content $TEMP_RESULTS | rg -i {q} || echo ''" `
    @PREVIEW_STR

Remove-Item $TEMP_RESULTS

if ([string]::IsNullOrWhiteSpace($selected)) {
    Write-Host "Canceled"
    "1" | Out-File -FilePath $env:CANARY_FILE -Encoding UTF8
    exit 1
}
else {
    # Process each selected item
    $selected -split "`n" | ForEach-Object {
        $parts = $_ -split ':'
        $FILENAME = "$($parts[0]):$($parts[1]):$($parts[2])"
        if ($SINGLE_DIR_ROOT) {
            "$SINGLE_DIR_ROOT\$FILENAME" | Out-File -FilePath $env:CANARY_FILE -Append -Encoding UTF8
        }
        else {
            $FILENAME | Out-File -FilePath $env:CANARY_FILE -Append -Encoding UTF8
        }
    }
}
