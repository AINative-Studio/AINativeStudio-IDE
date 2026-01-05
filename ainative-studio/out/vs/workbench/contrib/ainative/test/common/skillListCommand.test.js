/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { executeListCommand } from '../../common/skills/cli/listCommand.js';
/**
 * Mock Skills Registry for testing
 */
class MockSkillsRegistry {
    constructor() {
        this.skills = [];
    }
    setSkills(skills) {
        this.skills = skills;
    }
    async list() {
        return this.skills;
    }
}
/**
 * Mock Skill Config Service for testing
 */
class MockSkillConfigService {
    constructor() {
        this.enabledSkills = [];
    }
    setEnabledSkills(skills) {
        this.enabledSkills = skills;
    }
    async getEnabledSkills() {
        return this.enabledSkills;
    }
}
suite('Skill List Command', () => {
    let mockRegistry;
    let mockConfigService;
    setup(() => {
        mockRegistry = new MockSkillsRegistry();
        mockConfigService = new MockSkillConfigService();
    });
    test('should list all installed skills with correct status', async () => {
        // Arrange
        const installedSkills = [
            {
                name: 'git-workflow',
                version: '1.0.0',
                installedAt: Date.now(),
                source: 'local',
                path: '/path/to/git-workflow'
            },
            {
                name: 'mandatory-tdd',
                version: '2.0.0',
                installedAt: Date.now(),
                source: 'npm',
                path: '/path/to/mandatory-tdd'
            },
            {
                name: 'code-quality',
                version: '1.5.0',
                installedAt: Date.now(),
                source: 'git',
                path: '/path/to/code-quality'
            }
        ];
        const enabledSkills = ['git-workflow', 'mandatory-tdd'];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills(enabledSkills);
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService);
        // Assert
        assert.strictEqual(result.totalCount, 3, 'Total count should be 3');
        assert.strictEqual(result.enabledCount, 2, 'Enabled count should be 2');
        assert.strictEqual(result.disabledCount, 1, 'Disabled count should be 1');
        assert.strictEqual(result.skills.length, 3, 'Should return 3 skills');
        // Check individual skills
        const gitWorkflow = result.skills.find(s => s.name === 'git-workflow');
        assert.ok(gitWorkflow, 'git-workflow should be in results');
        assert.strictEqual(gitWorkflow.enabled, true, 'git-workflow should be enabled');
        assert.strictEqual(gitWorkflow.statusIcon, '✅', 'git-workflow should have enabled icon');
        assert.strictEqual(gitWorkflow.source, 'local', 'git-workflow source should be local');
        const codeQuality = result.skills.find(s => s.name === 'code-quality');
        assert.ok(codeQuality, 'code-quality should be in results');
        assert.strictEqual(codeQuality.enabled, false, 'code-quality should be disabled');
        assert.strictEqual(codeQuality.statusIcon, '❌', 'code-quality should have disabled icon');
        assert.strictEqual(codeQuality.source, 'community', 'code-quality source should be community');
    });
    test('should filter enabled skills only', async () => {
        // Arrange
        const installedSkills = [
            { name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' },
            { name: 'skill-2', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/2' },
            { name: 'skill-3', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/3' }
        ];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills(['skill-1', 'skill-3']);
        const options = { enabled: true };
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService, options);
        // Assert
        assert.strictEqual(result.skills.length, 2, 'Should return only 2 enabled skills');
        assert.ok(result.skills.every(s => s.enabled), 'All returned skills should be enabled');
        assert.ok(result.skills.find(s => s.name === 'skill-1'), 'skill-1 should be in results');
        assert.ok(result.skills.find(s => s.name === 'skill-3'), 'skill-3 should be in results');
        assert.ok(!result.skills.find(s => s.name === 'skill-2'), 'skill-2 should not be in results');
    });
    test('should filter disabled skills only', async () => {
        // Arrange
        const installedSkills = [
            { name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' },
            { name: 'skill-2', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/2' },
            { name: 'skill-3', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/3' }
        ];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills(['skill-1']);
        const options = { disabled: true };
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService, options);
        // Assert
        assert.strictEqual(result.skills.length, 2, 'Should return only 2 disabled skills');
        assert.ok(result.skills.every(s => !s.enabled), 'All returned skills should be disabled');
        assert.ok(result.skills.find(s => s.name === 'skill-2'), 'skill-2 should be in results');
        assert.ok(result.skills.find(s => s.name === 'skill-3'), 'skill-3 should be in results');
    });
    test('should handle empty skill list', async () => {
        // Arrange
        mockRegistry.setSkills([]);
        mockConfigService.setEnabledSkills([]);
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService);
        // Assert
        assert.strictEqual(result.totalCount, 0, 'Total count should be 0');
        assert.strictEqual(result.enabledCount, 0, 'Enabled count should be 0');
        assert.strictEqual(result.disabledCount, 0, 'Disabled count should be 0');
        assert.strictEqual(result.skills.length, 0, 'Should return empty array');
        assert.ok(result.output.includes('No skills installed'), 'Output should indicate no skills');
    });
    test('should sort skills with enabled first, then alphabetically', async () => {
        // Arrange
        const installedSkills = [
            { name: 'zebra', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/zebra' },
            { name: 'alpha', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/alpha' },
            { name: 'beta', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/beta' }
        ];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills(['zebra', 'alpha']); // Enable in non-alphabetical order
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService);
        // Assert
        assert.strictEqual(result.skills[0].name, 'alpha', 'First should be alpha (enabled, alphabetically first)');
        assert.strictEqual(result.skills[1].name, 'zebra', 'Second should be zebra (enabled, alphabetically second)');
        assert.strictEqual(result.skills[2].name, 'beta', 'Third should be beta (disabled)');
    });
    test('should format output correctly for all skills', async () => {
        // Arrange
        const installedSkills = [
            { name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' }
        ];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills(['skill-1']);
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService);
        // Assert
        assert.ok(result.output.includes('Installed Skills:'), 'Output should have header');
        assert.ok(result.output.includes('skill-1'), 'Output should include skill name');
        assert.ok(result.output.includes('1.0.0'), 'Output should include version');
        assert.ok(result.output.includes('Total: 1 skill'), 'Output should include summary');
    });
    test('should format output correctly for enabled filter', async () => {
        // Arrange
        const installedSkills = [
            { name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' },
            { name: 'skill-2', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/2' }
        ];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills(['skill-1']);
        const options = { enabled: true };
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService, options);
        // Assert
        assert.ok(result.output.includes('Enabled Skills:'), 'Output should have enabled header');
        assert.ok(result.output.includes('Total: 1 enabled skill'), 'Output should include enabled count');
    });
    test('should handle all disabled skills', async () => {
        // Arrange
        const installedSkills = [
            { name: 'skill-1', version: '1.0.0', installedAt: Date.now(), source: 'local', path: '/path/1' }
        ];
        mockRegistry.setSkills(installedSkills);
        mockConfigService.setEnabledSkills([]); // No enabled skills
        // Act
        const result = await executeListCommand(mockRegistry, mockConfigService);
        // Assert
        assert.strictEqual(result.enabledCount, 0, 'Enabled count should be 0');
        assert.strictEqual(result.disabledCount, 1, 'Disabled count should be 1');
        assert.strictEqual(result.skills[0].enabled, false, 'Skill should be disabled');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMaXN0Q29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9za2lsbExpc3RDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUFzQixNQUFNLHdDQUF3QyxDQUFDO0FBSWhHOztHQUVHO0FBQ0gsTUFBTSxrQkFBa0I7SUFBeEI7UUFDUyxXQUFNLEdBQW9CLEVBQUUsQ0FBQztJQVN0QyxDQUFDO0lBUEEsU0FBUyxDQUFDLE1BQXVCO1FBQ2hDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSTtRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sc0JBQXNCO0lBQTVCO1FBQ1Msa0JBQWEsR0FBYSxFQUFFLENBQUM7SUFTdEMsQ0FBQztJQVBBLGdCQUFnQixDQUFDLE1BQWdCO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO0lBQzdCLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLElBQUksWUFBZ0MsQ0FBQztJQUNyQyxJQUFJLGlCQUF5QyxDQUFDO0lBRTlDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixZQUFZLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQ3hDLGlCQUFp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