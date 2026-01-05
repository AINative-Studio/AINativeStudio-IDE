/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Template for generating SKILL.md files
 */
export function generateSkillTemplate(skillName: string): string {
	return `---
name: ${skillName}
description: Brief description of the skill
version: 1.0.0
author: Your Name
license: MIT
tags:
  - keyword1
  - keyword2
---

# ${formatSkillName(skillName)}

## Overview

[Describe what this skill does and when to use it]

## When to Use

[Provide specific scenarios where this skill should be applied]

## Examples

### Example 1: Basic Usage

\`\`\`
[Add usage example]
\`\`\`

### Example 2: Advanced Usage

\`\`\`
[Add advanced example]
\`\`\`

## References

- [Reference 1](./references/example.md)
- [Reference 2](./references/guide.md)

## Scripts

- [Script 1](./scripts/example.sh) - Description of what this script does

## Assets

Additional assets like diagrams, screenshots, or data files can be stored in the \`assets/\` directory.
`;
}

/**
 * Template for README.md in references directory
 */
export function generateReferencesReadme(): string {
	return `# References

This directory contains reference materials for the skill:

- Code examples
- API documentation
- Best practices guides
- Configuration templates

## Adding References

1. Create markdown files with descriptive names
2. Link them from the main SKILL.md file
3. Keep references focused and actionable
`;
}

/**
 * Template for README.md in scripts directory
 */
export function generateScriptsReadme(): string {
	return `# Scripts

This directory contains automation scripts for the skill:

- Setup scripts
- Utility scripts
- Testing scripts
- Deployment scripts

## Adding Scripts

1. Make scripts executable: \`chmod +x script.sh\`
2. Add clear comments explaining what each script does
3. Include usage examples in the script header
`;
}

/**
 * Template for README.md in assets directory
 */
export function generateAssetsReadme(): string {
	return `# Assets

This directory contains supporting assets for the skill:

- Diagrams and flowcharts
- Screenshots and images
- Data files
- Configuration templates

## Adding Assets

1. Use descriptive filenames
2. Optimize images for web use
3. Document asset purpose in this README
`;
}

/**
 * Convert skill-name to Skill Name
 */
function formatSkillName(skillName: string): string {
	return skillName
		.split('-')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
