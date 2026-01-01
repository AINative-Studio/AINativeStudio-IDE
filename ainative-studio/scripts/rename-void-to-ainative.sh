#!/bin/bash
set -e

# Script to rename all Void files and directories to AINative
# Part of Issue #59 - Void to AINative Rebranding

echo "=========================================="
echo "Void to AINative File Renaming Script"
echo "=========================================="
echo ""

cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)
CONTRIB_DIR="$ROOT_DIR/src/vs/workbench/contrib"
VOID_DIR="$CONTRIB_DIR/void"

if [ ! -d "$VOID_DIR" ]; then
    echo "Error: Void directory not found at $VOID_DIR"
    exit 1
fi

echo "Working directory: $ROOT_DIR"
echo "Void directory: $VOID_DIR"
echo ""

# Step 1: Rename the main directory
echo "Step 1: Renaming main directory void → ainative..."
mv "$VOID_DIR" "$CONTRIB_DIR/ainative"
echo "✓ Renamed contrib/void to contrib/ainative"
echo ""

AINATIVE_DIR="$CONTRIB_DIR/ainative"

# Step 2: Rename React component directories
echo "Step 2: Renaming React component directories..."
REACT_SRC_DIR="$AINATIVE_DIR/browser/react/src"

if [ -d "$REACT_SRC_DIR" ]; then
    cd "$REACT_SRC_DIR"

    # Rename each React component directory
    [ -d "void-settings-tsx" ] && mv void-settings-tsx ainative-settings-tsx && echo "✓ Renamed void-settings-tsx → ainative-settings-tsx"
    [ -d "void-tooltip" ] && mv void-tooltip ainative-tooltip && echo "✓ Renamed void-tooltip → ainative-tooltip"
    [ -d "void-editor-widgets-tsx" ] && mv void-editor-widgets-tsx ainative-editor-widgets-tsx && echo "✓ Renamed void-editor-widgets-tsx → ainative-editor-widgets-tsx"
    [ -d "void-onboarding" ] && mv void-onboarding ainative-onboarding && echo "✓ Renamed void-onboarding → ainative-onboarding"

    cd "$ROOT_DIR"
else
    echo "⚠ React src directory not found, skipping"
fi
echo ""

# Step 3: Rename all TypeScript/TSX files
echo "Step 3: Renaming TypeScript/TSX files (void* → ainative*)..."

cd "$AINATIVE_DIR"

# Find and rename all files with "void" prefix
file_count=0
while IFS= read -r -d '' file; do
    dir=$(dirname "$file")
    filename=$(basename "$file")
    new_filename=$(echo "$filename" | sed 's/void/ainative/g')

    if [ "$filename" != "$new_filename" ]; then
        mv "$file" "$dir/$new_filename"
        echo "✓ Renamed $filename → $new_filename"
        ((file_count++))
    fi
done < <(find . -type f \( -name "void*.ts" -o -name "void*.tsx" -o -name "void*.css" \) -print0)

echo "✓ Renamed $file_count files"
echo ""

# Step 4: Rename icon directory if exists
echo "Step 4: Renaming icon directory..."
MEDIA_DIR="$AINATIVE_DIR/browser/media"
if [ -d "$MEDIA_DIR/void_icons" ]; then
    mv "$MEDIA_DIR/void_icons" "$MEDIA_DIR/ainative_icons"
    echo "✓ Renamed void_icons → ainative_icons"
elif [ -d "$MEDIA_DIR" ]; then
    echo "⚠ void_icons directory not found in media"
else
    echo "⚠ Media directory not found"
fi
echo ""

cd "$ROOT_DIR"

echo "=========================================="
echo "File renaming complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Renamed main directory: contrib/void → contrib/ainative"
echo "  - Renamed React component directories (4 directories)"
echo "  - Renamed TypeScript/TSX files: $file_count files"
echo "  - Renamed icon directory (if existed)"
echo ""
echo "Next steps:"
echo "  1. Run verification test: node src/test/suite/branding/verify-naming.cjs"
echo "  2. Update import statements in code (separate step)"
echo "  3. Test compilation"
echo ""
