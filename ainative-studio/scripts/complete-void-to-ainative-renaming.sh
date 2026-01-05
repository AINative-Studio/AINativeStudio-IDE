#!/bin/bash
set -e

# ============================================================
# Complete Void to AINative File Renaming Script
# Issue #59 - TASK-001: Void → AINative File Renaming
# ============================================================
#
# This script performs comprehensive renaming of all void-related
# files and directories to ainative equivalents.
#
# IMPORTANT: This script is IDEMPOTENT - it can be run multiple
# times safely. It will only perform renames if needed.
#
# Usage:
#   ./scripts/complete-void-to-ainative-renaming.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be renamed without making changes
#
# ============================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${YELLOW}=========================================="
    echo "DRY RUN MODE - No changes will be made"
    echo -e "==========================================${NC}"
    echo ""
fi

# Navigate to script directory
cd "$(dirname "$0")/.."
ROOT_DIR=$(pwd)

echo -e "${BLUE}=========================================="
echo "Void to AINative Complete File Renaming"
echo "Issue #59 - TASK-001"
echo "==========================================${NC}"
echo ""
echo "Working directory: $ROOT_DIR"
echo ""

# ============================================================
# PHASE 1: Rename void_icons directory
# ============================================================
echo -e "${BLUE}PHASE 1: Renaming icon directories${NC}"
echo "-------------------------------------------"

VOID_ICONS_DIR="$ROOT_DIR/void_icons"
AINATIVE_ICONS_DIR="$ROOT_DIR/ainative_icons"

if [ -d "$VOID_ICONS_DIR" ]; then
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN]${NC} Would rename: void_icons → ainative_icons"
    else
        mv "$VOID_ICONS_DIR" "$AINATIVE_ICONS_DIR"
        echo -e "${GREEN}✓${NC} Renamed: void_icons → ainative_icons"
    fi
else
    echo -e "${YELLOW}⚠${NC} void_icons directory not found (may already be renamed)"
fi

# ============================================================
# PHASE 2: Rename slice_of_void.png files
# ============================================================
echo ""
echo -e "${BLUE}PHASE 2: Renaming icon files${NC}"
echo "-------------------------------------------"

# Check in both directories
for dir in "$ROOT_DIR/void_icons" "$ROOT_DIR/ainative_icons" "$ROOT_DIR/original_icons_backup"; do
    if [ -d "$dir" ]; then
        if [ -f "$dir/slice_of_void.png" ]; then
            if [ "$DRY_RUN" = true ]; then
                echo -e "${YELLOW}[DRY RUN]${NC} Would rename: $dir/slice_of_void.png → slice_of_ainative.png"
            else
                mv "$dir/slice_of_void.png" "$dir/slice_of_ainative.png"
                echo -e "${GREEN}✓${NC} Renamed: $(basename $dir)/slice_of_void.png → slice_of_ainative.png"
            fi
        fi
    fi
done

# ============================================================
# PHASE 3: Update .ainativerules file
# ============================================================
echo ""
echo -e "${BLUE}PHASE 3: Updating configuration files${NC}"
echo "-------------------------------------------"

AINATIVERULES="$ROOT_DIR/.ainativerules"

if [ -f "$AINATIVERULES" ]; then
    if grep -q "contrib/void" "$AINATIVERULES" 2>/dev/null; then
        if [ "$DRY_RUN" = true ]; then
            echo -e "${YELLOW}[DRY RUN]${NC} Would update: .ainativerules (contrib/void → contrib/ainative)"
        else
            # Update the file
            sed -i.bak 's|contrib/void|contrib/ainative|g' "$AINATIVERULES"
            rm -f "$AINATIVERULES.bak"
            echo -e "${GREEN}✓${NC} Updated: .ainativerules"
        fi
    else
        echo -e "${YELLOW}⚠${NC} .ainativerules already updated or no void references found"
    fi
else
    echo -e "${YELLOW}⚠${NC} .ainativerules not found"
fi

# ============================================================
# PHASE 4: Summary and Verification
# ============================================================
echo ""
echo -e "${BLUE}=========================================="
echo "Summary"
echo "==========================================${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN COMPLETE - No changes were made${NC}"
    echo ""
    echo "To perform actual renaming, run:"
    echo "  ./scripts/complete-void-to-ainative-renaming.sh"
else
    echo -e "${GREEN}File renaming complete!${NC}"
    echo ""
    echo "Files renamed:"
    [ -d "$AINATIVE_ICONS_DIR" ] && echo "  ✓ void_icons → ainative_icons"
    [ -f "$AINATIVE_ICONS_DIR/slice_of_ainative.png" ] && echo "  ✓ slice_of_void.png → slice_of_ainative.png (in ainative_icons/)"
    [ -f "$ROOT_DIR/original_icons_backup/slice_of_ainative.png" ] && echo "  ✓ slice_of_void.png → slice_of_ainative.png (in original_icons_backup/)"
    [ -f "$AINATIVERULES" ] && echo "  ✓ .ainativerules updated"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Run verification: npm run test:branding"
echo "  2. Check for broken imports: npm run compile"
echo "  3. Review changes: git status"
echo "  4. Commit changes: git add . && git commit -m 'refactor: Complete void to ainative file renaming'"
echo ""
