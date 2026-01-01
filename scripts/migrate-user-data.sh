#!/bin/bash
# Cross-platform user data migration script
# Migrates data from ~/.void-editor to ~/.ainative-editor

set -e

# Determine directories based on test mode
if [ -n "$TEST_MODE" ]; then
    OLD_DIR="${TEST_OLD_DIR:-$HOME/.void-editor}"
    NEW_DIR="${TEST_NEW_DIR:-$HOME/.ainative-editor}"
else
    OLD_DIR="$HOME/.void-editor"
    NEW_DIR="$HOME/.ainative-editor"
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if old directory exists
if [ ! -d "$OLD_DIR" ]; then
    print_info "No old data to migrate. Directory not found: $OLD_DIR"
    exit 0
fi

# Check if migration already completed
if [ -d "$NEW_DIR" ]; then
    print_warning "Migration already completed or new directory exists: $NEW_DIR"
    exit 0
fi

# Print migration banner
echo ""
echo "=========================================="
echo "AI Native Studio IDE - User Data Migration"
echo "=========================================="
echo ""
print_info "Migrating user data from Void Editor to AI Native Studio IDE"
echo ""
echo "Source:      $OLD_DIR"
echo "Destination: $NEW_DIR"
echo ""

# Count files to migrate
file_count=$(find "$OLD_DIR" -type f | wc -l | tr -d ' ')
dir_count=$(find "$OLD_DIR" -type d | wc -l | tr -d ' ')

print_info "Found $file_count files in $dir_count directories"
echo ""

# Perform migration
print_info "Copying data to new location..."

# Use cp -R for recursive copy, preserving attributes
if cp -R "$OLD_DIR" "$NEW_DIR"; then
    print_success "Data copied successfully"
else
    print_error "Failed to copy data"
    exit 1
fi

# Verify migration
echo ""
print_info "Verifying file integrity..."

# Function to calculate checksum
calculate_checksum() {
    local file="$1"
    if command -v md5sum &> /dev/null; then
        md5sum "$file" | awk '{print $1}'
    elif command -v md5 &> /dev/null; then
        md5 -q "$file"
    else
        # Fallback: just check file size
        stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null
    fi
}

# Verify a sample of files
verification_failed=0
sample_files=()

# Get up to 5 random files for verification
while IFS= read -r file; do
    sample_files+=("$file")
    [ ${#sample_files[@]} -ge 5 ] && break
done < <(find "$OLD_DIR" -type f | sort -R 2>/dev/null || find "$OLD_DIR" -type f)

for old_file in "${sample_files[@]}"; do
    # Get relative path
    rel_path="${old_file#$OLD_DIR/}"
    new_file="$NEW_DIR/$rel_path"

    if [ ! -f "$new_file" ]; then
        print_error "File missing after migration: $rel_path"
        verification_failed=1
        continue
    fi

    # Compare checksums
    old_checksum=$(calculate_checksum "$old_file")
    new_checksum=$(calculate_checksum "$new_file")

    if [ "$old_checksum" != "$new_checksum" ]; then
        print_error "Checksum mismatch for: $rel_path"
        verification_failed=1
    fi
done

if [ $verification_failed -eq 0 ]; then
    print_success "File integrity verified (checked ${#sample_files[@]} sample files)"
else
    print_error "File integrity verification failed"
    exit 1
fi

# Migration complete
echo ""
echo "=========================================="
print_success "Migration completed successfully!"
echo "=========================================="
echo ""
print_info "Your data has been migrated to: $NEW_DIR"
echo ""
print_warning "Old directory preserved at: $OLD_DIR"
print_info "You can safely delete it after verifying everything works:"
echo ""
echo "  rm -rf $OLD_DIR"
echo ""

exit 0
