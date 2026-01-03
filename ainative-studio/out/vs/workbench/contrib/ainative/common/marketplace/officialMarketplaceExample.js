/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Example: Fetch all available skills from NPM registry
 */
export async function exampleFetchSkills(marketplace) {
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
export async function exampleSearchSkills(marketplace) {
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
export async function exampleInstallSkill(marketplace) {
    const skillName = 'zerodb-workflows';
    console.log(`Installing skill: ${skillName}...`);
    try {
        // Install latest version
        await marketplace.install(skillName);
        console.log(`Successfully installed ${skillName}`);
        // Or install specific version
        // await marketplace.install(skillName, '1.2.0');
        // await marketplace.install(skillName, '^1.0.0');
    }
    catch (error) {
        console.error(`Failed to install ${skillName}:`, error);
    }
}
/**
 * Example: Update an installed skill
 */
export async function exampleUpdateSkill(marketplace) {
    const skillName = 'zerodb-workflows';
    console.log(`Updating skill: ${skillName}...`);
    try {
        await marketplace.update(skillName);
        console.log(`Successfully updated ${skillName} to latest version`);
    }
    catch (error) {
        console.error(`Failed to update ${skillName}:`, error);
    }
}
/**
 * Example: Check cache status
 */
export async function exampleCacheStatus(marketplace) {
    const status = await marketplace.getCacheStatus();
    console.log('Cache Status:');
    console.log(`  Valid: ${status.valid}`);
    console.log(`  Age: ${(status.age / 1000 / 60).toFixed(2)} minutes`);
    console.log(`  Last Update: ${status.lastUpdate?.toISOString() || 'Never'}`);
}
/**
 * Example: Clear cache and force refresh
 */
export async function exampleClearCache(marketplace) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmaWNpYWxNYXJrZXRwbGFjZUV4YW1wbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2NvbW1vbi9tYXJrZXRwbGFjZS9vZmZpY2lhbE1hcmtldHBsYWNlRXhhbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsa0JBQWtCLENBQUMsV0FBaUM7SUFDekUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO0lBRW5FLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRS9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxNQUFNLENBQUMsTUFBTSxVQUFVLENBQUMsQ0FBQztJQUM5QyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3JELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUMzQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDbEUsT0FBTyxDQUFDLEdBQUcsQ0FB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