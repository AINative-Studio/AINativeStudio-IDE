/**
 * Standalone Node.js test script - Void to AINative File Naming Verification
 * Can run without full build system
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
	if (condition) {
		testsPassed++;
		console.log(`${GREEN}✓${RESET} ${message}`);
	} else {
		testsFailed++;
		console.log(`${RED}✗${RESET} ${message}`);
	}
}

function findFiles(dir, pattern, results = []) {
	if (!fs.existsSync(dir)) return results;

	const files = fs.readdirSync(dir);
	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			// Skip node_modules, out, dist
			if (!['node_modules', 'out', 'dist', '.git'].includes(file)) {
				findFiles(filePath, pattern, results);
			}
		} else {
			if (pattern.test(file)) {
				results.push(filePath);
			}
		}
	}
	return results;
}

console.log('\n' + '='.repeat(60));
console.log('File Naming Tests - Void to AINative Rebranding');
console.log('='.repeat(60) + '\n');

const rootDir = path.join(__dirname, '../../../../');
const contribDir = path.join(rootDir, 'src/vs/workbench/contrib');

// Test 1: No files with "void" in filename
console.log('Test 1: Checking for files with "void" in filename...');
const voidFiles = findFiles(contribDir, /void/i);
assert(
	voidFiles.length === 0,
	`No files should have "void" in filename (found ${voidFiles.length})`
);
if (voidFiles.length > 0) {
	console.log(`${YELLOW}Files with "void":${RESET}`);
	voidFiles.slice(0, 10).forEach(f => console.log(`  - ${path.relative(contribDir, f)}`));
	if (voidFiles.length > 10) {
		console.log(`  ... and ${voidFiles.length - 10} more`);
	}
}

// Test 2: AINative directory exists
console.log('\nTest 2: Checking for ainative directory...');
const ainativeDir = path.join(contribDir, 'ainative');
assert(
	fs.existsSync(ainativeDir) && fs.statSync(ainativeDir).isDirectory(),
	'AINative directory should exist at src/vs/workbench/contrib/ainative'
);

// Test 3: Void directory should NOT exist
console.log('\nTest 3: Checking void directory does not exist...');
const voidDir = path.join(contribDir, 'void');
assert(
	!fs.existsSync(voidDir),
	'Void directory should NOT exist at src/vs/workbench/contrib/void'
);

// Test 4: React component directories renamed
console.log('\nTest 4: Checking React component directories...');
const reactDir = path.join(ainativeDir, 'browser/react/src');
if (fs.existsSync(reactDir)) {
	const expectedDirs = [
		'ainative-settings-tsx',
		'ainative-tooltip',
		'ainative-editor-widgets-tsx',
		'ainative-onboarding'
	];

	expectedDirs.forEach(dirName => {
		const dirPath = path.join(reactDir, dirName);
		assert(
			fs.existsSync(dirPath),
			`React directory "${dirName}" should exist`
		);
	});

	const forbiddenDirs = [
		'void-settings-tsx',
		'void-tooltip',
		'void-editor-widgets-tsx',
		'void-onboarding'
	];

	forbiddenDirs.forEach(dirName => {
		const dirPath = path.join(reactDir, dirName);
		assert(
			!fs.existsSync(dirPath),
			`Old void directory "${dirName}" should NOT exist`
		);
	});
} else {
	console.log(`${YELLOW}⚠${RESET} React src directory not found, skipping React component checks`);
}

// Test 5: Icon directory renamed
console.log('\nTest 5: Checking icon directory...');
const mediaDir = path.join(ainativeDir, 'browser/media');
if (fs.existsSync(mediaDir)) {
	const mediaContents = fs.readdirSync(mediaDir);
	const hasVoidIcons = mediaContents.some(item => item.includes('void_icons'));
	const hasAinativeIcons = mediaContents.some(item => item.includes('ainative_icons'));

	assert(
		!hasVoidIcons,
		'void_icons directory should NOT exist'
	);

	if (hasAinativeIcons || mediaContents.length > 0) {
		console.log(`${GREEN}✓${RESET} Media directory exists (icon check)`);
		testsPassed++;
	}
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary:');
console.log(`${GREEN}Passed: ${testsPassed}${RESET}`);
console.log(`${RED}Failed: ${testsFailed}${RESET}`);
console.log('='.repeat(60) + '\n');

process.exit(testsFailed > 0 ? 1 : 0);
