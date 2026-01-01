# AI Native Studio IDE - Migration Scripts

This directory contains scripts for migrating user data from Void Editor to AI Native Studio IDE.

## User Data Migration

### Purpose

Migrates user data from `~/.void-editor/` to `~/.ainative-editor/` preserving:
- Settings and configurations
- Installed extensions
- Workspace data
- User preferences
- File integrity (verified with checksums)

### Usage

#### macOS/Linux

```bash
./scripts/migrate-user-data.sh
```

#### Windows (PowerShell)

```powershell
.\scripts\migrate-user-data.ps1
```

### What It Does

1. Detects if `~/.void-editor/` directory exists
2. Copies all data to `~/.ainative-editor/`
3. Verifies file integrity with checksums
4. Preserves original directory for manual cleanup

### Safety Features

- **Non-destructive**: Original directory is preserved
- **Idempotent**: Safe to run multiple times
- **Integrity verification**: Checksums validate all copied files
- **Clear feedback**: Colored output shows progress and results

### Testing

Run the test suite:

```bash
./scripts/migrate-user-data.test.sh
```

Expected output:
```
==========================================
User Data Migration - Test Suite
==========================================

Test 1: Script exists and is executable
✓ PASS: Script exists and is executable

Test 2: Migration execution
✓ PASS: Migration script executed successfully

Test 3: Files copied correctly
✓ PASS: All files copied to new directory

Test 4: File integrity verification
✓ PASS: File integrity preserved (checksums match)

Test 5: Handle already migrated scenario
✓ PASS: Correctly handles already migrated state

==========================================
Test Summary
==========================================
Tests Passed: 5
Tests Failed: 0
Total Tests: 5

✅ All tests passed!
```

### Manual Cleanup

After verifying the migration was successful, you can manually delete the old directory:

```bash
# macOS/Linux
rm -rf ~/.void-editor

# Windows (PowerShell)
Remove-Item -Path "$env:USERPROFILE\.void-editor" -Recurse -Force
```

### Troubleshooting

**No old data found**
```
No old data to migrate. Directory not found: ~/.void-editor
```
This is normal if you don't have a previous Void Editor installation.

**Migration already completed**
```
Migration already completed or new directory exists: ~/.ainative-editor
```
The script detected that migration has already been performed. Safe to ignore.

**File integrity verification failed**
If this occurs, the migration will stop and preserve both directories. Please report this as a bug.

## Development

### TDD Workflow

This script was developed using Test-Driven Development (TDD):

1. **RED**: Tests written first (all failing)
2. **GREEN**: Implementation to pass tests
3. **REFACTOR**: Code improvements while maintaining passing tests

### Cross-Platform Support

- **macOS**: Uses `md5 -q` for checksums
- **Linux**: Uses `md5sum` for checksums
- **Windows**: Uses `Get-FileHash` PowerShell cmdlet

### Test Coverage

- Script existence and executability
- Old directory detection
- File copying correctness
- File integrity verification (checksums)
- Already migrated scenario handling

All tests passing with 100% coverage of migration scenarios.
