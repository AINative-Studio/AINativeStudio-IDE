#!/bin/bash
# AINative Skills - NPM Publishing Script

set -e  # Exit on error

echo "================================================"
echo "AINative Skills - NPM Publishing"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if logged into NPM
if ! npm whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not logged into NPM${NC}"
    echo "Please run: npm login"
    exit 1
fi

NPM_USER=$(npm whoami)
echo -e "${GREEN}✅ Logged in as: $NPM_USER${NC}"
echo ""

# Skills to publish
SKILLS=("railway-deployment" "zerodb-workflows" "api-design" "testing-patterns" "mcp-development")

# Dry run mode by default
DRY_RUN=true
if [ "$1" == "--publish" ]; then
    DRY_RUN=false
    echo -e "${YELLOW}⚠️  LIVE PUBLISHING MODE${NC}"
    echo "This will publish packages to NPM registry"
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        echo "Publishing cancelled"
        exit 0
    fi
else
    echo -e "${GREEN}🔍 DRY RUN MODE${NC}"
    echo "Use --publish flag to actually publish packages"
fi

echo ""
echo "-------------------------------------------"

# Counter for success/failure
PUBLISHED=0
FAILED=0
SKIPPED=0

for skill in "${SKILLS[@]}"; do
    echo ""
    echo "================================================"
    echo "Processing: $skill"
    echo "================================================"
    
    cd "$skill" || { echo -e "${RED}❌ Failed to enter directory${NC}"; ((FAILED++)); continue; }
    
    PKG_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
    PKG_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    
    echo "Package: $PKG_NAME@$PKG_VERSION"
    
    # Check if package version already exists
    if npm view "$PKG_NAME@$PKG_VERSION" version > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Version $PKG_VERSION already published, skipping${NC}"
        ((SKIPPED++))
        cd ..
        continue
    fi
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${GREEN}✅ Would publish: $PKG_NAME@$PKG_VERSION${NC}"
        ((PUBLISHED++))
    else
        echo "Publishing to NPM..."
        if npm publish --access public; then
            echo -e "${GREEN}✅ Successfully published: $PKG_NAME@$PKG_VERSION${NC}"
            ((PUBLISHED++))
        else
            echo -e "${RED}❌ Failed to publish: $PKG_NAME@$PKG_VERSION${NC}"
            ((FAILED++))
        fi
    fi
    
    cd ..
done

echo ""
echo "================================================"
echo "Publishing Summary"
echo "================================================"
if [ "$DRY_RUN" = true ]; then
    echo "Mode: DRY RUN (no packages actually published)"
    echo "✅ Would publish: $PUBLISHED"
else
    echo "Mode: LIVE PUBLISHING"
    echo "✅ Published: $PUBLISHED"
fi
echo "⚠️  Skipped (already published): $SKIPPED"
echo "❌ Failed: $FAILED"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}🎉 All packages ready to publish!${NC}"
    echo -e "${YELLOW}Run with --publish flag to actually publish${NC}"
elif [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All packages published successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify packages on npmjs.com"
    echo "2. Test installation: npm install -g @ainative/skill-<name>"
    echo "3. Verify OfficialMarketplace discovers packages"
    echo "4. Update documentation with installation instructions"
else
    echo -e "${RED}❌ Some packages failed to publish${NC}"
    exit 1
fi
