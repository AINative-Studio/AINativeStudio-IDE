#!/bin/bash

# NPM Publishing Test Script for AINative Skills
# This script tests the packaging of all official skills without actually publishing
# Usage: ./publish-local.sh [skill-name]
#   - Run without arguments to test all skills
#   - Run with skill name to test a specific skill

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# List of official skills
SKILLS=(
  "zerodb-workflows"
  "mcp-development"
  "api-design"
  "testing-patterns"
  "railway-deployment"
)

# Function to print colored output
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate package.json
validate_package_json() {
  local skill_dir=$1
  local package_json="${skill_dir}/package.json"

  print_info "Validating ${skill_dir}/package.json..."

  # Check if package.json exists
  if [ ! -f "$package_json" ]; then
    print_error "package.json not found in ${skill_dir}"
    return 1
  fi

  # Validate JSON syntax
  if ! node -e "JSON.parse(require('fs').readFileSync('${package_json}', 'utf8'))" 2>/dev/null; then
    print_error "Invalid JSON in ${package_json}"
    return 1
  fi

  # Check required fields
  local required_fields=("name" "version" "description" "keywords" "author" "license" "repository" "files")
  for field in "${required_fields[@]}"; do
    if ! node -e "const pkg = require('${package_json}'); if (!pkg.${field}) process.exit(1)" 2>/dev/null; then
      print_error "Missing required field: ${field}"
      return 1
    fi
  done

  # Verify package name format
  local package_name=$(node -e "console.log(require('${package_json}').name)")
  if [[ ! $package_name =~ ^@ainative/skill- ]]; then
    print_warning "Package name should follow @ainative/skill-* convention: ${package_name}"
  fi

  # Verify version is 1.0.0
  local version=$(node -e "console.log(require('${package_json}').version)")
  if [[ "$version" != "1.0.0" ]]; then
    print_warning "Package version is ${version}, expected 1.0.0"
  fi

  # Verify publishConfig.access is public
  if ! node -e "const pkg = require('${package_json}'); if (pkg.publishConfig?.access !== 'public') process.exit(1)" 2>/dev/null; then
    print_warning "publishConfig.access should be 'public'"
  fi

  print_success "package.json validation passed"
  return 0
}

# Function to validate SKILL.md
validate_skill_md() {
  local skill_dir=$1
  local skill_md="${skill_dir}/SKILL.md"

  print_info "Validating ${skill_dir}/SKILL.md..."

  if [ ! -f "$skill_md" ]; then
    print_error "SKILL.md not found in ${skill_dir}"
    return 1
  fi

  # Check file size (should be > 1KB)
  local size=$(stat -f%z "$skill_md" 2>/dev/null || stat -c%s "$skill_md" 2>/dev/null)
  if [ "$size" -lt 1024 ]; then
    print_warning "SKILL.md is very small (${size} bytes)"
  fi

  print_success "SKILL.md validation passed"
  return 0
}

# Function to check references directory
check_references() {
  local skill_dir=$1
  local refs_dir="${skill_dir}/references"

  print_info "Checking references directory..."

  if [ ! -d "$refs_dir" ]; then
    print_error "references/ directory not found in ${skill_dir}"
    return 1
  fi

  # Count markdown files in references
  local md_count=$(find "$refs_dir" -maxdepth 1 -name "*.md" | wc -l)
  print_info "Found ${md_count} reference files"

  print_success "references/ directory check passed"
  return 0
}

# Function to test packaging
test_package() {
  local skill_dir=$1
  local skill_name=$(basename "$skill_dir")

  print_info "========================================"
  print_info "Testing packaging for: ${skill_name}"
  print_info "========================================"

  cd "$skill_dir"

  # Run validations
  validate_package_json "$skill_dir" || return 1
  validate_skill_md "$skill_dir" || return 1
  check_references "$skill_dir" || return 1

  # Create tarball with npm pack
  print_info "Creating tarball with npm pack..."
  local tarball=$(npm pack --dry-run 2>&1 | grep -o 'npm notice [0-9]*\.[0-9]*[kM]B' | tail -1 || echo "")

  if [ -z "$tarball" ]; then
    print_error "npm pack failed for ${skill_name}"
    return 1
  fi

  print_success "Package size: $tarball"

  # Actually create the tarball
  print_info "Creating actual tarball..."
  npm pack > /dev/null 2>&1

  # Find the created tarball
  local tarball_file=$(ls -t ainative-skill-*.tgz 2>/dev/null | head -1)

  if [ -f "$tarball_file" ]; then
    print_success "Tarball created: ${tarball_file}"

    # List contents
    print_info "Tarball contents:"
    tar -tzf "$tarball_file" | head -20

    # Clean up tarball
    rm "$tarball_file"
    print_info "Cleaned up tarball"
  else
    print_error "Tarball not found after npm pack"
    return 1
  fi

  print_success "✓ ${skill_name} is ready for publishing!"
  echo ""

  cd "$SCRIPT_DIR"
  return 0
}

# Main script execution
main() {
  print_info "AINative Skills Publishing Test"
  print_info "================================"
  echo ""

  local specific_skill="$1"
  local failed_skills=()
  local success_count=0

  if [ -n "$specific_skill" ]; then
    # Test specific skill
    if [[ ! " ${SKILLS[@]} " =~ " ${specific_skill} " ]]; then
      print_error "Unknown skill: ${specific_skill}"
      print_info "Available skills: ${SKILLS[*]}"
      exit 1
    fi

    test_package "${SCRIPT_DIR}/${specific_skill}"
    exit $?
  else
    # Test all skills
    for skill in "${SKILLS[@]}"; do
      if test_package "${SCRIPT_DIR}/${skill}"; then
        ((success_count++))
      else
        failed_skills+=("$skill")
      fi
    done

    echo ""
    print_info "========================================"
    print_info "Test Summary"
    print_info "========================================"
    print_success "Successful: ${success_count}/${#SKILLS[@]}"

    if [ ${#failed_skills[@]} -gt 0 ]; then
      print_error "Failed: ${#failed_skills[@]}"
      print_error "Failed skills: ${failed_skills[*]}"
      exit 1
    else
      print_success "All skills are ready for publishing! ✓"
      echo ""
      print_info "Next steps:"
      print_info "1. Review the package.json files"
      print_info "2. Ensure you're logged in to NPM: npm login"
      print_info "3. Publish each skill: cd skills/<skill-name> && npm publish"
      print_info "   OR use the GitHub Actions workflow for automated publishing"
    fi
  fi
}

# Run main function
main "$@"
