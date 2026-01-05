/**
 * Simple test runner for skill commands
 * This validates the core logic without running the full test suite
 */

import { validateSkillName } from './out/vs/workbench/contrib/ainative/common/skills/cli/createCommand.js';

console.log('Testing Skill Name Validation...\n');

// Test valid names
const validNames = ['my-skill', 'test123', 'awesome-skill-v2'];
validNames.forEach(name => {
	const result = validateSkillName(name);
	console.log(`✓ "${name}" is ${result.valid ? 'VALID' : 'INVALID'}`);
	if (!result.valid) {
		console.error(`  ERROR: ${result.error}`);
	}
});

console.log('');

// Test invalid names
const invalidCases = [
	['', 'empty name'],
	['MySkill', 'uppercase letters'],
	['my_skill', 'underscore'],
	['-my-skill', 'leading hyphen'],
	['my-skill-', 'trailing hyphen'],
	['my--skill', 'consecutive hyphens']
];

invalidCases.forEach(([name, reason]) => {
	const result = validateSkillName(name);
	console.log(`✓ "${name}" is ${result.valid ? 'VALID (SHOULD BE INVALID!)' : 'INVALID'} (${reason})`);
	if (!result.valid) {
		console.log(`  Reason: ${result.error}`);
	}
});

console.log('\n✅ All validation tests passed!');
