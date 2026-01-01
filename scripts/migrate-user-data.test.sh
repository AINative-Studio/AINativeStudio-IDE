#!/bin/bash
# Test suite for user data migration script
# Must be run BEFORE implementation (TDD Red phase)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="$SCRIPT_DIR/migrate-user-data.sh"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test helper functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"

    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  Expected: $expected"
        echo "  Actual: $actual"
        ((TESTS_FAILED++))
    fi
}

assert_file_exists() {
    local file="$1"
    local test_name="$2"

    if [ -e "$file" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  File not found: $file"
        ((TESTS_FAILED++))
    fi
}

assert_directory_exists() {
    local dir="$1"
    local test_name="$2"

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  Directory not found: $dir"
        ((TESTS_FAILED++))
    fi
}

assert_command_succeeds() {
    local command="$1"
    local test_name="$2"

    if $command &>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "  Command failed: $command"
        ((TESTS_FAILED++))
    fi
}

# Setup test environment
setup_test_env() {
    export TEST_MODE=1
    export TEST_OLD_DIR="/tmp/test-void-editor-$$"
    export TEST_NEW_DIR="/tmp/test-ainative-editor-$$"

    # Clean up any previous test runs
    rm -rf "$TEST_OLD_DIR" "$TEST_NEW_DIR"

    # Create test directory structure
    mkdir -p "$TEST_OLD_DIR/extensions"
    mkdir -p "$TEST_OLD_DIR/settings"

    # Create test files with known content
    echo "test config" > "$TEST_OLD_DIR/config.json"
    echo "test settings" > "$TEST_OLD_DIR/settings/user-settings.json"
    echo "extension1" > "$TEST_OLD_DIR/extensions/ext1.vsix"
    echo "extension2" > "$TEST_OLD_DIR/extensions/ext2.vsix"

    # Create a subdirectory with files
    mkdir -p "$TEST_OLD_DIR/workspace/project1"
    echo "project data" > "$TEST_OLD_DIR/workspace/project1/data.txt"
}

# Cleanup test environment
cleanup_test_env() {
    rm -rf "$TEST_OLD_DIR" "$TEST_NEW_DIR"
}

# Print test header
print_header() {
    echo ""
    echo "=========================================="
    echo "User Data Migration - Test Suite"
    echo "=========================================="
    echo ""
}

# Print test summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

# Test 1: Script exists and is executable
test_script_exists() {
    echo -e "${YELLOW}Test 1: Script exists and is executable${NC}"
    assert_file_exists "$MIGRATION_SCRIPT" "Migration script exists"

    if [ -x "$MIGRATION_SCRIPT" ]; then
        echo -e "${GREEN}✓ PASS${NC}: Migration script is executable"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: Migration script is executable"
        ((TESTS_FAILED++))
    fi
}

# Test 2: Script detects old directory
test_detects_old_directory() {
    echo -e "${YELLOW}Test 2: Script detects old directory${NC}"
    setup_test_env

    # Run migration script
    output=$("$MIGRATION_SCRIPT" 2>&1 || true)

    # Check if script detected the old directory
    if echo "$output" | grep -q "Migrating\|Migration"; then
        echo -e "${GREEN}✓ PASS${NC}: Script detects old directory"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: Script does not detect old directory"
        echo "  Output: $output"
        ((TESTS_FAILED++))
    fi

    cleanup_test_env
}

# Test 3: All files copied correctly
test_files_copied() {
    echo -e "${YELLOW}Test 3: All files copied to new directory${NC}"
    setup_test_env

    # Run migration script
    "$MIGRATION_SCRIPT" &>/dev/null || true

    # Check if new directory was created
    assert_directory_exists "$TEST_NEW_DIR" "New directory created"

    # Check if all files were copied
    assert_file_exists "$TEST_NEW_DIR/config.json" "config.json copied"
    assert_file_exists "$TEST_NEW_DIR/settings/user-settings.json" "settings file copied"
    assert_file_exists "$TEST_NEW_DIR/extensions/ext1.vsix" "extension 1 copied"
    assert_file_exists "$TEST_NEW_DIR/extensions/ext2.vsix" "extension 2 copied"
    assert_file_exists "$TEST_NEW_DIR/workspace/project1/data.txt" "nested file copied"

    cleanup_test_env
}

# Test 4: File integrity preserved (checksums match)
test_file_integrity() {
    echo -e "${YELLOW}Test 4: File integrity preserved${NC}"
    setup_test_env

    # Calculate checksums before migration
    if command -v md5sum &> /dev/null; then
        checksum_cmd="md5sum"
    elif command -v md5 &> /dev/null; then
        checksum_cmd="md5 -q"
    else
        echo -e "${YELLOW}⊘ SKIP${NC}: No checksum command available"
        cleanup_test_env
        return
    fi

    original_checksum=$(eval "$checksum_cmd '$TEST_OLD_DIR/config.json'" | awk '{print $1}')

    # Run migration script
    "$MIGRATION_SCRIPT" &>/dev/null || true

    # Calculate checksums after migration
    if [ -f "$TEST_NEW_DIR/config.json" ]; then
        new_checksum=$(eval "$checksum_cmd '$TEST_NEW_DIR/config.json'" | awk '{print $1}')
        assert_equals "$original_checksum" "$new_checksum" "File checksums match"
    else
        echo -e "${RED}✗ FAIL${NC}: File integrity check - file not found"
        ((TESTS_FAILED++))
    fi

    cleanup_test_env
}

# Test 5: Script handles already migrated scenario
test_already_migrated() {
    echo -e "${YELLOW}Test 5: Script handles already migrated scenario${NC}"
    setup_test_env

    # Create new directory to simulate already migrated
    mkdir -p "$TEST_NEW_DIR"

    # Run migration script
    output=$("$MIGRATION_SCRIPT" 2>&1 || true)

    # Check if script detected already migrated
    if echo "$output" | grep -q "already\|exists"; then
        echo -e "${GREEN}✓ PASS${NC}: Script detects already migrated state"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: Script does not handle already migrated state"
        echo "  Output: $output"
        ((TESTS_FAILED++))
    fi

    cleanup_test_env
}

# Run all tests
print_header

test_script_exists
test_detects_old_directory
test_files_copied
test_file_integrity
test_already_migrated

print_summary
exit_code=$?

exit $exit_code
