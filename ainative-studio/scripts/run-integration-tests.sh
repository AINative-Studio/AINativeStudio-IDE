#!/bin/bash

# Script to run Issue #47 integration and E2E tests
# Usage: ./scripts/run-integration-tests.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Change to ainative-studio directory
cd "$(dirname "$0")/.." || exit 1

print_status "Running Integration Tests for Issue #47 - AINative Authentication"
echo ""

# Parse arguments
COVERAGE=false
VERBOSE=false
SUITE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --suite)
            SUITE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --coverage          Run tests with coverage reporting"
            echo "  --verbose, -v       Show verbose output"
            echo "  --suite <name>      Run specific test suite:"
            echo "                        all: All integration tests (default)"
            echo "                        auth: Authentication flow tests only"
            echo "                        model: Model registry flow tests only"
            echo "                        comprehensive: Comprehensive integration tests only"
            echo "  --help, -h          Show this help message"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Determine test pattern based on suite
case $SUITE in
    all)
        TEST_PATTERN="Integration Tests"
        ;;
    auth)
        TEST_PATTERN="Authentication Flow Integration Tests"
        ;;
    model)
        TEST_PATTERN="Model Registry Flow Integration Tests"
        ;;
    comprehensive)
        TEST_PATTERN="Comprehensive Integration Tests"
        ;;
    *)
        print_error "Unknown test suite: $SUITE"
        exit 1
        ;;
esac

print_status "Test Suite: $SUITE"
print_status "Pattern: $TEST_PATTERN"
echo ""

# Build test command
TEST_CMD="npm run test-node -- --grep \"$TEST_PATTERN\""

if [ "$COVERAGE" = true ]; then
    print_status "Coverage reporting enabled"
    TEST_CMD="$TEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
    print_status "Verbose output enabled"
    TEST_CMD="$TEST_CMD --reporter spec"
fi

# Run tests
print_status "Executing tests..."
echo ""

if eval "$TEST_CMD"; then
    echo ""
    print_success "All tests passed!"

    if [ "$COVERAGE" = true ]; then
        print_status "Coverage report available in ./coverage/"
    fi

    exit 0
else
    echo ""
    print_error "Some tests failed!"
    exit 1
fi
