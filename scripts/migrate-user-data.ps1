# Cross-platform user data migration script (Windows)
# Migrates data from ~/.void-editor to ~/.ainative-editor

param(
    [switch]$TestMode = $false,
    [string]$TestOldDir = "",
    [string]$TestNewDir = ""
)

# Determine directories based on test mode
if ($TestMode -and $TestOldDir -and $TestNewDir) {
    $OLD_DIR = $TestOldDir
    $NEW_DIR = $TestNewDir
} else {
    $OLD_DIR = Join-Path $env:USERPROFILE ".void-editor"
    $NEW_DIR = Join-Path $env:USERPROFILE ".ainative-editor"
}

# Helper functions for colored output
function Print-Info {
    param([string]$Message)
    Write-Host "[i] $Message" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[✓] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[✗] $Message" -ForegroundColor Red
}

# Check if old directory exists
if (-not (Test-Path -Path $OLD_DIR)) {
    Print-Info "No old data to migrate. Directory not found: $OLD_DIR"
    exit 0
}

# Check if migration already completed
if (Test-Path -Path $NEW_DIR) {
    Print-Warning "Migration already completed or new directory exists: $NEW_DIR"
    exit 0
}

# Print migration banner
Write-Host ""
Write-Host "=========================================="
Write-Host "AI Native Studio IDE - User Data Migration"
Write-Host "=========================================="
Write-Host ""
Print-Info "Migrating user data from Void Editor to AI Native Studio IDE"
Write-Host ""
Write-Host "Source:      $OLD_DIR"
Write-Host "Destination: $NEW_DIR"
Write-Host ""

# Count files to migrate
$fileCount = (Get-ChildItem -Path $OLD_DIR -Recurse -File).Count
$dirCount = (Get-ChildItem -Path $OLD_DIR -Recurse -Directory).Count + 1

Print-Info "Found $fileCount files in $dirCount directories"
Write-Host ""

# Perform migration
Print-Info "Copying data to new location..."

try {
    # Copy directory recursively
    Copy-Item -Path $OLD_DIR -Destination $NEW_DIR -Recurse -Force
    Print-Success "Data copied successfully"
} catch {
    Print-Error "Failed to copy data: $_"
    exit 1
}

# Verify migration
Write-Host ""
Print-Info "Verifying file integrity..."

# Function to calculate file hash
function Get-FileChecksum {
    param([string]$FilePath)
    try {
        $hash = Get-FileHash -Path $FilePath -Algorithm MD5
        return $hash.Hash
    } catch {
        # Fallback: just return file size
        return (Get-Item $FilePath).Length
    }
}

# Verify a sample of files
$verificationFailed = $false
$sampleFiles = Get-ChildItem -Path $OLD_DIR -Recurse -File | Select-Object -First 5

foreach ($oldFile in $sampleFiles) {
    # Get relative path
    $relPath = $oldFile.FullName.Substring($OLD_DIR.Length + 1)
    $newFile = Join-Path $NEW_DIR $relPath

    if (-not (Test-Path -Path $newFile)) {
        Print-Error "File missing after migration: $relPath"
        $verificationFailed = $true
        continue
    }

    # Compare checksums
    $oldChecksum = Get-FileChecksum -FilePath $oldFile.FullName
    $newChecksum = Get-FileChecksum -FilePath $newFile

    if ($oldChecksum -ne $newChecksum) {
        Print-Error "Checksum mismatch for: $relPath"
        $verificationFailed = $true
    }
}

if (-not $verificationFailed) {
    Print-Success "File integrity verified (checked $($sampleFiles.Count) sample files)"
} else {
    Print-Error "File integrity verification failed"
    exit 1
}

# Migration complete
Write-Host ""
Write-Host "=========================================="
Print-Success "Migration completed successfully!"
Write-Host "=========================================="
Write-Host ""
Print-Info "Your data has been migrated to: $NEW_DIR"
Write-Host ""
Print-Warning "Old directory preserved at: $OLD_DIR"
Print-Info "You can safely delete it after verifying everything works:"
Write-Host ""
Write-Host "  Remove-Item -Path '$OLD_DIR' -Recurse -Force"
Write-Host ""

exit 0
