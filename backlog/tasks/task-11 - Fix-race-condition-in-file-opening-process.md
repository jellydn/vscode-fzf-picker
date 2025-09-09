---
id: task-11
title: Fix race condition in file opening process
status: Done
assignee: []
created_date: '2025-09-09 07:38'
updated_date: '2025-09-09 08:17'
labels: []
dependencies: []
---

## Description

File opening commands were exiting before async file opening operations completed. The process would write the PID file and exit immediately after starting the file opening promises, causing files to not actually open.

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] File opening operations complete before process exit
- [x] Git status file opening works correctly
- [x] All file opening commands wait for completion
- [x] No race conditions in async operations
<!-- AC:END -->


## Implementation Notes

Root Cause: Race condition in src/commands.ts:113-124. The code was doing Promise.all(openPromises).catch() (fire and forget) then immediately writing PID file and exiting. Fix Applied: Changed to await Promise.all(openPromises) with proper try/catch to ensure all file opening operations complete before process terminates. This fixes git status and other commands not actually opening files.
