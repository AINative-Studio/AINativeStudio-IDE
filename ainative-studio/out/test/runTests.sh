#!/usr/bin/env bash
set -e

# Test runner for AINative IDE rebranding tests
# Refs #12

echo "========================================="
echo "AINative IDE Rebranding Test Suite"
echo "Sprint 1, Sprint 2, and Sprint 3 Tests"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test file
run_test_file() {
    local test_file=$1
    local test_name=$(basename "$test_file")

    echo -e "${YELLOW}Running: ${test_name}${NC}"

    if npm run test-extension -- --grep "${test_name}" 2>&1 | tee /tmp/test_output_${test_name}.log; then
        echo -e "${GREEN}✓ PASSED: ${test_name}${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ FAILED: ${test_name}${NC}"
        ((FAILED_TESTS++))
    fi

    ((TOTAL_TESTS++))
    echo ""
}

echo "=== Sprint 1: File Naming and Branding ==="
echo ""

# Sprint 1 tests
if [ -f "src/test/suite/branding/fileNaming.test.ts" ]; then
    run_test_file "src/test/suite/branding/fileNaming.test.ts"
fi

if [ -f "src/test/suite/branding/cssClasses.test.ts" ]; then
    run_test_file "src/test/suite/branding/cssClasses.test.ts"
fi

echo "=== Sprint 2: Authentication Service ==="
echo ""

# Sprint 2 tests
if [ -f "src/vs/workbench/contrib/ainative/test/common/ainativeAuthService.test.ts" ]; then
    run_test_file "src/vs/workbench/contrib/ainative/test/common/ainativeAuthService.test.ts"
fi

echo "=== Integration Tests ==="
echo ""

# Integration tests
if [ -f "src/test/suite/integration/authFlow.test.ts" ]; then
    run_test_file "src/test/suite/integration/authFlow.test.ts"
fi

if [ -f "src/test/suite/integration/errorHandling.test.ts" ]; then
    run_test_file "src/test/suite/integration/errorHandling.test.ts"
fi

if [ -f "src/test/suite/integration/security.test.ts" ]; then
    run_test_file "src/test/suite/integration/security.test.ts"
fi

echo "=== Performance Tests ==="
echo ""

if [ -f "src/test/suite/performance/performance.test.ts" ]; then
    run_test_file "src/test/suite/performance/performance.test.ts"
fi

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "${GREEN}Passed:       ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed:       ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
