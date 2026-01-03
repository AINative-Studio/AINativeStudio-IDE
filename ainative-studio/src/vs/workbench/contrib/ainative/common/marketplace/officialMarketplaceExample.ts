/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Example usage of Official Marketplace Service
 *
 * This file demonstrates how to use the IOfficialMarketplace service
 * to fetch, search, and install skills from the NPM registry.
 */

import { IOfficialMarketplace } from './officialMarketplaceTypes.js';

/**
 * Example: Fetch all available skills from NPM registry
 */
export async function exampleFetchSkills(marketplace: IOfficialMarketplace): Promise<void> {
	console.log('Fetching all @ainative/skill-* packages from NPM...');

	const skills = await marketplace.fetchSkills();

	console.log(`Found ${skills.length} skills:`);
	skills.forEach(skill => {
		console.log(`  - ${skill.name} v${skill.version}`);
		console.log(`    Description: ${skill.description}`);
		console.log(`    Author: ${skill.author}`);
		console.log(`    Source: ${skill.source}`);
		console.log(`    Rating: ${skill.rating?.toFixed(1) || 'N/A'}/5`);
		console.log(`    Keywords: ${skill.keywords.join(', ')}`);
		console.log('');
	});
}

/**
 * Example: Search for skills by keyword
 */
export async function exampleSearchSkills(marketplace: IOfficialMarketplace): Promise<void> {
	console.log('Searching for "zerodb" skills...');

	const results = await marketplace.search('zerodb');

	console.log(`Found ${results.length} matching skills:`);
	results.forEach(skill => {
		console.log(`  - ${skill.name}`);
		console.log(`    ${skill.description}`);
	});
}

/**
 * Example: Install a skill from NPM
 */
export async function exampleInstallSkill(marketplace: IOfficialMarketplace): Promise<void> {
	const skillName = 'zerodb-workflows';

	console.log(`Installing skill: ${skillName}...`);

	try {
		// Install latest version
		await marketplace.install(skillName);
		console.log(`Successfully installed ${skillName}`);

		// Or install specific version
		// await marketplace.install(skillName, '1.2.0');
		// await marketplace.install(skillName, '^1.0.0');
	} catch (error) {
		console.error(`Failed to install ${skillName}:`, error);
	}
}

/**
 * Example: Update an installed skill
 */
export async function exampleUpdateSkill(marketplace: IOfficialMarketplace): Promise<void> {
	const skillName = 'zerodb-workflows';

	console.log(`Updating skill: ${skillName}...`);

	try {
		await marketplace.update(skillName);
		console.log(`Successfully updated ${skillName} to latest version`);
	} catch (error) {
		console.error(`Failed to update ${skillName}:`, error);
	}
}

/**
 * Example: Check cache status
 */
export async function exampleCacheStatus(marketplace: IOfficialMarketplace): Promise<void> {
	const status = await marketplace.getCacheStatus();

	console.log('Cache Status:');
	console.log(`  Valid: ${status.valid}`);
	console.log(`  Age: ${(status.age / 1000 / 60).toFixed(2)} minutes`);
	console.log(`  Last Update: ${status.lastUpdate?.toISOString() || 'Never'}`);
}

/**
 * Example: Clear cache and force refresh
 */
export async function exampleClearCache(marketplace: IOfficialMarketplace): Promise<void> {
	console.log('Clearing cache...');
	await marketplace.clearCache();

	console.log('Cache cleared. Next fetchSkills() will query NPM registry.');

	// Fetch fresh data
	const skills = await marketplace.fetchSkills();
	console.log(`Fetched ${skills.length} fresh skills from NPM`);
}

/**
 * Example: Expected NPM package format
 */
export const exampleNpmResponse = {
	objects: [
		{
			package: {
				name: '@ainative/skill-zerodb-workflows',
				version: '1.0.0',
				description: 'ZeroDB vector database best practices and workflows',
				keywords: ['ainative', 'skill', 'zerodb', 'vector', 'database'],
				date: '2024-01-01T00:00:00.000Z',
				links: {
					npm: 'https://www.npmjs.com/package/@ainative/skill-zerodb-workflows',
					homepage: 'https://ainative.studio',
					repository: 'https://github.com/AINative-Studio/ainative-skills'
				},
				author: {
					name: 'AINative Studio',
					email: 'support@ainative.studio'
				}
			},
			score: {
				final: 0.7,
				detail: {
					popularity: 0.5,
					quality: 0.8,
					maintenance: 0.9
				}
			},
			searchScore: 100000.5
		},
		{
			package: {
				name: '@ainative/skill-google-analytics',
				version: '1.2.0',
				description: 'Google Analytics 4 integration and reporting workflows',
				keywords: ['ainative', 'skill', 'google-analytics', 'ga4', 'analytics'],
				date: '2024-01-15T12:00:00.000Z',
				links: {
					npm: 'https://www.npmjs.com/package/@ainative/skill-google-analytics',
					homepage: 'https://ainative.studio',
					repository: 'https://github.com/AINative-Studio/ainative-skills'
				},
				author: {
					name: 'AINative Studio'
				}
			},
			score: {
				final: 0.85,
				detail: {
					popularity: 0.7,
					quality: 0.9,
					maintenance: 0.95
				}
			},
			searchScore: 95000.2
		}
	],
	total: 2,
	time: '2024-01-01T00:00:00.000Z'
};

/**
 * Example: Expected transformed MarketplaceSkill format
 */
export const exampleMarketplaceSkills = [
	{
		name: '@ainative/skill-zerodb-workflows',
		description: 'ZeroDB vector database best practices and workflows',
		version: '1.0.0',
		source: 'official',
		author: 'AINative Studio',
		keywords: ['ainative', 'skill', 'zerodb', 'vector', 'database'],
		rating: 4.0, // quality * 5 = 0.8 * 5
		downloads: undefined,
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		installCommand: 'npm install -g @ainative/skill-zerodb-workflows@1.0.0',
		homepage: 'https://ainative.studio',
		repository: 'https://github.com/AINative-Studio/ainative-skills'
	},
	{
		name: '@ainative/skill-google-analytics',
		description: 'Google Analytics 4 integration and reporting workflows',
		version: '1.2.0',
		source: 'official',
		author: 'AINative Studio',
		keywords: ['ainative', 'skill', 'google-analytics', 'ga4', 'analytics'],
		rating: 4.5, // quality * 5 = 0.9 * 5
		downloads: undefined,
		updatedAt: new Date('2024-01-15T12:00:00.000Z'),
		installCommand: 'npm install -g @ainative/skill-google-analytics@1.2.0',
		homepage: 'https://ainative.studio',
		repository: 'https://github.com/AINative-Studio/ainative-skills'
	}
];

/**
 * Example: Installation workflow steps
 */
export const exampleInstallWorkflow = `
Installation Workflow for @ainative/skill-zerodb-workflows:

Step 1: Check if already installed
  - Query ISkillsRegistry.isInstalled('zerodb-workflows')
  - If installed, throw error (use update() instead)

Step 2: Install package globally via npm
  - Command: npm install -g @ainative/skill-zerodb-workflows@latest
  - Timeout: 60 seconds
  - Error handling: catch npm errors and provide clear message

Step 3: Find global node_modules location
  - Run: npm root -g
  - macOS/Linux typical path: ~/.nvm/versions/node/v18.0.0/lib/node_modules
  - Windows typical path: %APPDATA%\\npm\\node_modules
  - Fallback to platform-specific defaults if command fails

Step 4: Copy package to local skills directory
  - Source: <global-node_modules>/@ainative/skill-zerodb-workflows/
  - Target: ~/.ainative/skills/zerodb-workflows/
  - Use IFileService to recursively copy all files
  - Preserve directory structure

Step 5: Register with SkillsRegistry
  - Call: ISkillsRegistry.install('~/.ainative/skills/zerodb-workflows/')
  - This parses SKILL.md and adds to registry.json
  - Source is set to 'npm'
  - Timestamp is set to current time

Result:
  - Skill is available in ~/.ainative/skills/zerodb-workflows/
  - Registry entry created in ~/.ainative/skills/registry.json
  - Skill can now be used by the AI assistant
`;
