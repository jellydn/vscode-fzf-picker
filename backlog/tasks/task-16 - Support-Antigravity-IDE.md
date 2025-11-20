---
id: task-16
title: Support Antigravity IDE
status: Done
assignee: []
created_date: '2025-11-20 02:32'
updated_date: '2025-11-20 03:11'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add support for the new Antigravity IDE from Google.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Antigravity is added to package.json,Antigravity is added to src/config.ts,Antigravity is added to README.md
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added support for the new Antigravity IDE from Google (https://antigravity.google/).

**Changes made:**
- Updated `package.json` to add `agy -g` to the `fzf-picker.general.openCommand` enum and added "Antigravity" to the enumDescriptions
- Updated `README.md` to include `agy -g` in the configuration options table
- Regenerated meta files using `npm run update`

**Note:** Initially used `antigravity -g` but corrected to `agy -g` based on user feedback that this is the correct CLI command for Antigravity IDE.

**Verification:**
- All tests passed (54 tests)
- Linting passed with no errors
<!-- SECTION:NOTES:END -->
