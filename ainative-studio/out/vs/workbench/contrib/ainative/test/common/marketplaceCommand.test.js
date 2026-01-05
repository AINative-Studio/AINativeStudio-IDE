/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MarketplaceCommand } from '../../common/skills/cli/marketplaceCommand.js';
import { MarketplaceFormatter } from '../../common/skills/cli/marketplaceFormatter.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
// Mock marketplace implementations
class MockOfficialMarketplace {
    constructor(skills = []) {
        this.skills = [];
        this.cacheValid = true;
        this.skills = skills;
    }
    async fetchSkills(forceRefresh) {
        return this.skills;
    }
    async install(skillName, version) {
        // Mock implementation
    }
    async update(skillName) {
        // Mock implementation
    }
    async search(query) {
        const lowerQuery = query.toLowerCase();
        return this.skills.filter(s => s.name.toLowerCase().includes(lowerQuery) ||
            s.description.toLowerCase().includes(lowerQuery));
    }
    async getSkillDetails(skillName) {
        return this.skills.find(s => s.name === skillName) || null;
    }
    async isCacheValid() {
        return this.cacheValid;
    }
    async clearCache() {
        // Mock implementation
    }
    async getCacheStatus() {
        return {
            valid: this.cacheValid,
            age: 60000,
            lastUpdate: new Date()
        };
    }
}
class MockAnthropicMarketplace {
    constructor(skills = []) {
        this.skills = [];
        this.cacheValid = true;
        this.skills = skills;
    }
    async fetchSkills(forceRefresh) {
        return this.skills;
    }
    async install(skillName, version) {
        // Mock implementation
    }
    async search(query) {
        const lowerQuery = query.toLowerCase();
        return this.skills.filter(s => s.name.toLowerCase().includes(lowerQuery) ||
            s.description.toLowerCase().includes(lowerQuery));
    }
    async getSkillDetails(skillName) {
        return this.skills.find(s => s.name === skillName) || null;
    }
    async isCacheValid() {
        return this.cacheValid;
    }
    async clearCache() {
        // Mock implementation
    }
    async getCacheStatus() {
        return {
            valid: this.cacheValid,
            age: 120000,
            lastUpdate: new Date()
        };
    }
}
class MockCommunityMarketplace {
    constructor(skills = []) {
        this.skills = [];
        this.cacheValid = true;
        this.skills = skills;
    }
    async fetchSkills(forceRefresh) {
        return this.skills;
    }
    async install(skillName, version) {
        // Mock implementation
    }
    async submit(skillPath) {
        // Mock implementation
        return { id: 'test-id', status: 'pending', message: 'Submitted' };
    }
    async rate(skillId, rating) {
        // Mock implementation
    }
    async search(query) {
        const lowerQuery = query.toLowerCase();
        return this.skills.filter(s => s.name.toLowerCase().includes(lowerQuery) ||
            s.description.toLowerCase().includes(lowerQuery));
    }
    async getSkillDetails(skillName) {
        return this.skills.find(s => s.name === skillName) || null;
    }
    async isCacheValid() {
        return this.cacheValid;
    }
    async clearCache() {
        // Mock implementation
    }
    async isAuthenticated() {
        return true;
    }
    setAuthToken(token) {
        // Mock implementation
    }
}
class MockSkillSearchService {
    constructor(allSkills = []) {
        this.allSkills = [];
        this.allSkills = allSkills;
    }
    async search(query, filters) {
        const lowerQuery = query.toLowerCase();
        return this.allSkills
            .filter(s => s.name.toLowerCase().includes(lowerQuery) ||
            s.description.toLowerCase().includes(lowerQuery))
            .map(s => ({ ...s, relevanceScore: 1.0, matchedFields: ['name'] }));
    }
    async searchOfficial(query) {
        return this.allSkills.filter(s => s.source === 'official');
    }
    async searchAnthropic(query) {
        return this.allSkills.filter(s => s.source === 'anthropic');
    }
    async searchCommunity(query) {
        return this.allSkills.filter(s => s.source === 'community');
    }
    getLastSearchStats() {
        return null;
    }
}
// Test data
const createMockSkill = (name, source, description, keywords = []) => ({
    name,
    description,
    version: '1.0.0',
    source,
    author: 'Test Author',
    keywords,
    rating: 4.5,
    downloads: 100,
    updatedAt: new Date('2024-01-01'),
    installCommand: `install ${name}`,
    homepage: `https://example.com/${name}`,
    repository: `https://github.com/test/${name}`
});
suite('MarketplaceCommand', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let officialMarketplace;
    let anthropicMarketplace;
    let communityMarketplace;
    let searchService;
    let logService;
    let command;
    setup(() => {
        const officialSkills = [
            createMockSkill('zerodb-workflows', 'official', 'ZeroDB best practices', ['database', 'zerodb']),
            createMockSkill('railway-deployment', 'official', 'Railway deploy patterns', ['deployment', 'railway'])
        ];
        const anthropicSkills = [
            createMockSkill('mcp-builder', 'anthropic', 'Create high-quality MCP servers', ['mcp', 'tools']),
            createMockSkill('skill-creator', 'anthropic', 'Guide for creating skills', ['development', 'skills'])
        ];
        const communitySkills = [
            createMockSkill('mongodb-patterns', 'community', 'MongoDB best practices', ['database', 'mongodb']),
            createMockSkill('aws-deployment', 'community', 'AWS deployment workflows', ['deployment', 'aws'])
        ];
        officialMarketplace = new MockOfficialMarketplace(officialSkills);
        anthropicMarketplace = new MockAnthropicMarketplace(anthropicSkills);
        communityMarketplace = new MockCommunityMarketplace(communitySkills);
        searchService = new MockSkillSearchService([...officialSkills, ...anthropicSkills, ...communitySkills]);
        logService = new NullLogService();
        command = new MarketplaceCommand(officialMarketplace, anthropicMarketplace, communityMarketplace, searchService, logService);
    });
    suite('Basic Browse', () => {
        test('should fetch skills from all three marketplaces', async () => {
            const result = await command.browse();
            assert.strictEqual(result.skills.length, 6, 'Should return all skills from all marketplaces');
            assert.strictEqual(result.totalSkills, 6, 'Total skills should match');
            // Verify each source is represented
            const sources = new Set(result.skills.map(s => s.source));
            assert.strictEqual(sources.size, 3, 'Should have skills from all 3 sources');
            assert.ok(sources.has('official'), 'Should have official skills');
            assert.ok(sources.has('anthropic'), 'Should have Anthropic skills');
            assert.ok(sources.has('community'), 'Should have community skills');
        });
        test('should format output correctly', async () => {
            const result = await command.browse();
            assert.ok(result.output.length > 0, 'Should generate output');
            assert.ok(result.output.includes('Available Skills'), 'Should include header');
            assert.ok(result.output.includes('Total: 6 skill'), 'Should include total count');
        });
        test('should sort skills by source and name', async () => {
            const result = await command.browse();
            // Official skills should come first
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const firstOfficialIndex = result.skills.findIndex(s => s.source === 'official');
            const lastOfficialIndex = result.skills.map(s => s.source).lastIndexOf('official');
            const firstAnthropicIndex = result.skills.findIndex(s => s.source === 'anthropic');
            const firstCommunityIndex = result.skills.findIndex(s => s.source === 'community');
            assert.ok(lastOfficialIndex < firstAnthropicIndex, 'Official skills should come before Anthropic');
            assert.ok(firstAnthropicIndex < firstCommunityIndex, 'Anthropic skills should come before Community');
        });
    });
    suite('Search Filtering', () => {
        test('should filter by search term in name', async () => {
            const result = await command.browse({ searchTerm: 'zerodb' });
            assert.strictEqual(result.skills.length, 1, 'Should find 1 skill matching "zerodb"');
            assert.strictEqual(result.skills[0].name, 'zerodb-workflows');
        });
        test('should filter by search term in description', async () => {
            const result = await command.browse({ searchTerm: 'deployment' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 skills with "deployment" in description');
            const names = result.skills.map(s => s.name);
            assert.ok(names.includes('railway-deployment'));
            assert.ok(names.includes('aws-deployment'));
        });
        test('should filter by search term in keywords', async () => {
            const result = await command.browse({ searchTerm: 'database' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 skills with "database" keyword');
            const names = result.skills.map(s => s.name);
            assert.ok(names.includes('zerodb-workflows'));
            assert.ok(names.includes('mongodb-patterns'));
        });
        test('should return empty results for non-matching search', async () => {
            const result = await command.browse({ searchTerm: 'nonexistent' });
            assert.strictEqual(result.skills.length, 0, 'Should return no results');
            assert.ok(result.output.includes('No skills found'), 'Should show empty message');
        });
    });
    suite('Category Filtering', () => {
        test('should filter by category', async () => {
            const result = await command.browse({ category: 'database' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 database skills');
            const names = result.skills.map(s => s.name);
            assert.ok(names.includes('zerodb-workflows'));
            assert.ok(names.includes('mongodb-patterns'));
        });
        test('should filter by deployment category', async () => {
            const result = await command.browse({ category: 'deployment' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 deployment skills');
            const names = result.skills.map(s => s.name);
            assert.ok(names.includes('railway-deployment'));
            assert.ok(names.includes('aws-deployment'));
        });
    });
    suite('Provider Filtering', () => {
        test('should filter by official provider', async () => {
            const result = await command.browse({ provider: 'official' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 official skills');
            assert.ok(result.skills.every(s => s.source === 'official'), 'All skills should be official');
        });
        test('should filter by anthropic provider', async () => {
            const result = await command.browse({ provider: 'anthropic' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 Anthropic skills');
            assert.ok(result.skills.every(s => s.source === 'anthropic'), 'All skills should be from Anthropic');
        });
        test('should filter by community provider', async () => {
            const result = await command.browse({ provider: 'community' });
            assert.strictEqual(result.skills.length, 2, 'Should find 2 community skills');
            assert.ok(result.skills.every(s => s.source === 'community'), 'All skills should be from community');
        });
    });
    suite('Combined Filtering', () => {
        test('should combine search term and provider filter', async () => {
            const result = await command.browse({
                searchTerm: 'deployment',
                provider: 'official'
            });
            assert.strictEqual(result.skills.length, 1, 'Should find 1 skill matching both filters');
            assert.strictEqual(result.skills[0].name, 'railway-deployment');
        });
        test('should combine category and provider filter', async () => {
            const result = await command.browse({
                category: 'database',
                provider: 'community'
            });
            assert.strictEqual(result.skills.length, 1, 'Should find 1 skill matching both filters');
            assert.strictEqual(result.skills[0].name, 'mongodb-patterns');
        });
        test('should combine all filters', async () => {
            const result = await command.browse({
                searchTerm: 'mongodb',
                category: 'database',
                provider: 'community'
            });
            assert.strictEqual(result.skills.length, 1, 'Should find 1 skill matching all filters');
            assert.strictEqual(result.skills[0].name, 'mongodb-patterns');
        });
    });
    suite('Cache Management', () => {
        test('should use cache by default', async () => {
            const result = await command.browse();
            assert.strictEqual(result.fromCache, true, 'Should use cache by default');
        });
        test('should force refresh when requested', async () => {
            const result = await command.browse({ forceRefresh: true });
            assert.strictEqual(result.fromCache, false, 'Should not use cache when force refresh');
        });
        test('should show cache status', async () => {
            const result = await command.browse({ showCacheStatus: true });
            assert.ok(result.output.includes('Cache Status'), 'Should show cache status header');
            assert.ok(result.output.includes('Official'), 'Should show official cache status');
            assert.ok(result.output.includes('Anthropic'), 'Should show Anthropic cache status');
            assert.ok(result.output.includes('Community'), 'Should show community cache status');
        });
        test('should clear all caches', async () => {
            await command.clearCache();
            // No assertion needed, just verify it doesn't throw
        });
    });
    suite('Error Handling', () => {
        test('should handle partial marketplace failures gracefully', async () => {
            // Create marketplaces where one fails
            const failingOfficial = new MockOfficialMarketplace([]);
            failingOfficial.fetchSkills = async () => {
                throw new Error('Network error');
            };
            const commandWithFailure = new MarketplaceCommand(failingOfficial, anthropicMarketplace, communityMarketplace, searchService, logService);
            const result = await commandWithFailure.browse();
            // Should still return results from other sources
            assert.ok(result.skills.length > 0, 'Should return skills from working sources');
            assert.ok(result.skills.every(s => s.source !== 'official'), 'Should not have official skills');
        });
        test('should throw when all marketplaces fail', async () => {
            // Create marketplaces that all fail
            const failingOfficial = new MockOfficialMarketplace([]);
            const failingAnthropic = new MockAnthropicMarketplace([]);
            const failingCommunity = new MockCommunityMarketplace([]);
            failingOfficial.fetchSkills = async () => { throw new Error('Network error'); };
            failingAnthropic.fetchSkills = async () => { throw new Error('Network error'); };
            failingCommunity.fetchSkills = async () => { throw new Error('Network error'); };
            const commandWithFailure = new MarketplaceCommand(failingOfficial, failingAnthropic, failingCommunity, searchService, logService);
            await assert.rejects(() => commandWithFailure.browse(), /Failed to fetch skills from all marketplace sources/, 'Should throw when all sources fail');
        });
    });
    suite('Advanced Search', () => {
        test('should use search service for advanced queries', async () => {
            const result = await command.search('database');
            assert.ok(result.skills.length > 0, 'Should return search results');
            assert.ok(result.output.includes('database'), 'Should include search term in output');
        });
        test('should support filters in search', async () => {
            const result = await command.search('deployment', {
                provider: 'community'
            });
            assert.strictEqual(result.skills.length, 1, 'Should filter search results');
            assert.strictEqual(result.skills[0].source, 'community');
        });
    });
});
suite('MarketplaceFormatter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const mockSkills = [
        createMockSkill('test-skill-1', 'official', 'Test skill 1'),
        createMockSkill('test-skill-2', 'anthropic', 'Test skill 2'),
        createMockSkill('test-skill-3', 'community', 'Test skill 3')
    ];
    test('should format browse results with all sources', () => {
        const output = MarketplaceFormatter.formatBrowseResults(mockSkills);
        assert.ok(output.includes('Available Skills'), 'Should include header');
        assert.ok(output.includes('Official AINative Skills'), 'Should include official section');
        assert.ok(output.includes('Anthropic Skills'), 'Should include Anthropic section');
        assert.ok(output.includes('Community Skills'), 'Should include community section');
        assert.ok(output.includes('Total: 3 skills'), 'Should include total count');
    });
    test('should format empty results', () => {
        const output = MarketplaceFormatter.formatBrowseResults([]);
        assert.ok(output.includes('No skills found'), 'Should show empty message');
    });
    test('should format results with search term', () => {
        const output = MarketplaceFormatter.formatBrowseResults(mockSkills, 'test');
        assert.ok(output.includes('search: "test"'), 'Should show search term');
    });
    test('should format results with filters', () => {
        const output = MarketplaceFormatter.formatBrowseResults(mockSkills, undefined, {
            category: 'database',
            provider: 'official'
        });
        assert.ok(output.includes('category: database'), 'Should show category filter');
        assert.ok(output.includes('provider: official'), 'Should show provider filter');
    });
    test('should format error messages', () => {
        const error = new Error('Network timeout');
        const output = MarketplaceFormatter.formatError(error);
        assert.ok(output.includes('Error browsing marketplace'), 'Should include error header');
        assert.ok(output.includes('Network timeout'), 'Should include error message');
    });
    test('should format cache status', () => {
        const cacheInfo = {
            official: { valid: true, age: 60000, lastUpdate: new Date() },
            anthropic: { valid: true, age: 120000, lastUpdate: new Date() },
            community: { valid: false, age: 300000, lastUpdate: new Date() }
        };
        const output = MarketplaceFormatter.formatCacheStatus(cacheInfo);
        assert.ok(output.includes('Cache Status'), 'Should include header');
        assert.ok(output.includes('Official'), 'Should include official status');
        assert.ok(output.includes('Anthropic'), 'Should include Anthropic status');
        assert.ok(output.includes('Community'), 'Should include community status');
        assert.ok(output.includes('--force-refresh'), 'Should include refresh hint');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2VDb21tYW5kLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL3Rlc3QvY29tbW9uL21hcmtldHBsYWNlQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBTXZGLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV4RixtQ0FBbUM7QUFDbkMsTUFBTSx1QkFBdUI7SUFLNUIsWUFBWSxTQUE2QixFQUFFO1FBSG5DLFdBQU0sR0FBdUIsRUFBRSxDQUFDO1FBQ2hDLGVBQVUsR0FBRyxJQUFJLENBQUM7UUFHekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLENBQUMsWUFBc0I7UUFDdkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQWlCLEVBQUUsT0FBZ0I7UUFDaEQsc0JBQXNCO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQWlCO1FBQzdCLHNCQUFzQjtJQUN2QixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFhO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN2QyxPQUFPLElB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