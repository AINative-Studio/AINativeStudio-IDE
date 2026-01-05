/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Template for generating SKILL.md files
 */
export function generateSkillTemplate(skillName) {
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
export function generateReferencesReadme() {
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
export function generateScriptsReadme() {
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
export function generateAssetsReadme() {
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
function formatSkillName(skillName) {
    return skillName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL2NsaS90ZW1wbGF0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsU0FBaUI7SUFDdEQsT0FBTztRQUNBLFNBQVM7Ozs7Ozs7Ozs7SUFVYixlQUFlLENBQUMsU0FBUyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FvQzdCLENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsd0JBQXdCO0lBQ3ZDLE9BQU87Ozs7Ozs7Ozs7Ozs7O0NBY1AsQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsT0FBTzs7Ozs7Ozs7Ozs7Ozs7Q0FjUCxDQUFDO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQjtJQUNuQyxPQUFPOzs7Ozs7Ozs7Ozs7OztDQWNQLENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGVBQWUsQ0FBQyxTQUFpQjtJQUN6QyxPQUFPLFNBQVM7U0FDZCxLQUFLLENBQUMsR0FBRyxDQUFDO1NBQ1YsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNiLENBQUMifQ==