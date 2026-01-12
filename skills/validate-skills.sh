#!/bin/bash
# Skill NPM Publishing Validation Script

echo "================================================"
echo "AINative Skills - NPM Publishing Validation"
echo "================================================"
echo ""

SKILLS=("railway-deployment" "zerodb-workflows" "api-design" "testing-patterns" "mcp-development")
PASS=0
FAIL=0
WARNINGS=0

for skill in "${SKILLS[@]}"; do
    echo "-------------------------------------------"
    echo "Validating: $skill"
    echo "-------------------------------------------"
    
    cd "$skill" || exit 1
    
    # Check package.json exists
    if [ ! -f "package.json" ]; then
        echo "❌ FAIL: package.json not found"
        ((FAIL++))
        cd ..
        continue
    fi
    
    # Check SKILL.md exists
    if [ ! -f "SKILL.md" ]; then
        echo "❌ FAIL: SKILL.md not found"
        ((FAIL++))
        cd ..
        continue
    fi
    
    # Extract package name and version
    PKG_NAME=$(grep '"name"' package.json | head -1 | sed 's/.*"name": "\(.*\)".*/\1/')
    PKG_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    
    echo "  Package: $PKG_NAME"
    echo "  Version: $PKG_VERSION"
    
    # Validate package name format
    if [[ ! "$PKG_NAME" =~ ^@ainative/skill- ]]; then
        echo "⚠️  WARNING: Package name doesn't follow @ainative/skill-* format"
        ((WARNINGS++))
    fi
    
    # Test npm pack
    echo "  Testing npm pack..."
    if npm pack --dry-run > /dev/null 2>&1; then
        echo "✅ PASS: npm pack successful"
        ((PASS++))
    else
        echo "❌ FAIL: npm pack failed"
        ((FAIL++))
    fi
    
    # Check for README
    if [ ! -f "README.md" ]; then
        echo "⚠️  WARNING: README.md not found"
        ((WARNINGS++))
    fi
    
    # Check publishConfig.access
    if grep -q '"access": "public"' package.json; then
        echo "✅ publishConfig.access set to public"
    else
        echo "⚠️  WARNING: publishConfig.access not set to public"
        ((WARNINGS++))
    fi
    
    echo ""
    cd ..
done

echo "================================================"
echo "Validation Summary"
echo "================================================"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "⚠️  Warnings: $WARNINGS"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 All skills are ready for NPM publishing!"
    exit 0
else
    echo "❌ Some skills have issues that need to be fixed"
    exit 1
fi
