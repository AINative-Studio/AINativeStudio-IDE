/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MarketplaceCommand } from '../../common/skills/cli/marketplaceCommand.js';
import { MarketplaceFormatter } from '../../common/skills/cli/marketplaceFormatter.js';
import { MarketplaceSkill, MarketplaceSource } from '../../common/marketplace/marketplaceTypes.js';
import { IOfficialMarketplace } from '../../common/marketplace/officialMarketplaceTypes.js';
import { IAnthropicMarketplace } from '../../common/marketplace/anthropicMarketplaceTypes.js';
import { ICommunityMarketplace } from '../../common/marketplace/communityMarketplaceTypes.js';
import { ISkillSearchService } from '../../common/marketplace/searchServiceTypes.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';

// Mock marketplace implementations
class MockOfficialMarketplace implements IOfficialMarketplace {
	readonly _serviceBrand: undefined;
	private skills: MarketplaceSkill[] = [];
	private cacheValid = true;

	constructor(skills: MarketplaceSkill[] = []) {
		this.skills = skills;
	}

	async fetchSkills(forceRefresh?: boolean): Promise<MarketplaceSkill[]> {
		return this.skills;
	}

	async install(skillName: string, version?: string): Promise<void> {
		// Mock implementation
	}

	async update(skillName: string): Promise<void> {
		// Mock implementation
	}

	async search(query: string): Promise<MarketplaceSkill[]> {
		const lowerQuery = query.toLowerCase();
		return this.skills.filter(s =>
			s.name.toLowerCase().includes(lowerQuery) ||
			s.description.toLowerCase().includes(lowerQuery)
		);
	}

	async getSkillDetails(skillName: string): Promise<MarketplaceSkill | null> {
		return this.skills.find(s => s.name === skillName) || null;
	}

	async isCacheValid(): Promise<boolean> {
		return this.cacheValid;
	}

	async clearCache(): Promise<void> {
		// Mock implementation
	}

	async getCacheStatus(): Promise<{ valid: boolean; age: number; lastUpdate: Date | null }> {
		return {
			valid: this.cacheValid,
			age: 60000,
			lastUpdate: new Date()
		};
	}
}

class MockAnthropicMarketplace implements IAnthropicMarketplace {
	readonly _serviceBrand: undefined;
	private skills: MarketplaceSkill[] = [];
	private cacheValid = true;

	constructor(skills: MarketplaceSkill[] = []) {
		this.skills = skills;
	}

	async fetchSkills(forceRefresh?: boolean): Promise<MarketplaceSkill[]> {
		return this.skills;
	}

	async install(skillName: string, version?: string): Promise<void> {
		// Mock implementation
	}

	async search(query: string): Promise<MarketplaceSkill[]> {
		const lowerQuery = query.toLowerCase();
		return this.skills.filter(s =>
			s.name.toLowerCase().includes(lowerQuery) ||
			s.description.toLowerCase().includes(lowerQuery)
		);
	}

	async getSkillDetails(skillName: string): Promise<MarketplaceSkill | null> {
		return this.skills.find(s => s.name === skillName) || null;
	}

	async isCacheValid(): Promise<boolean> {
		return this.cacheValid;
	}

	async clearCache(): Promise<void> {
		// Mock implementation
	}

	async getCacheStatus(): Promise<{ valid: boolean; age: number; lastUpdate: Date | null }> {
		return {
			valid: this.cacheValid,
			age: 120000,
			lastUpdate: new Date()
		};
	}
}

class MockCommunityMarketplace implements ICommunityMarketplace {
	readonly _serviceBrand: undefined;
	private skills: MarketplaceSkill[] = [];
	private cacheValid = true;

	constructor(skills: MarketplaceSkill[] = []) {
		this.skills = skills;
	}

	async fetchSkills(forceRefresh?: boolean): Promise<MarketplaceSkill[]> {
		return this.skills;
	}

	async install(skillName: string, version?: string): Promise<void> {
		// Mock implementation
	}

	async submit(skillPath: string): Promise<any> {
		// Mock implementation
		return { id: 'test-id', status: 'pending', message: 'Submitted' };
	}

	async rate(skillId: string, rating: number): Promise<void> {
		// Mock implementation
	}

	async search(query: string): Promise<MarketplaceSkill[]> {
		const lowerQuery = query.toLowerCase();
		return this.skills.filter(s =>
			s.name.toLowerCase().includes(lowerQuery) ||
			s.description.toLowerCase().includes(lowerQuery)
		);
	}

	async getSkillDetails(skillName: string): Promise<MarketplaceSkill | null> {
		return this.skills.find(s => s.name === skillName) || null;
	}

	async isCacheValid(): Promise<boolean> {
		return this.cacheValid;
	}

	async clearCache(): Promise<void> {
		// Mock implementation
	}

	async isAuthenticated(): Promise<boolean> {
		return true;
	}

	setAuthToken(token: string): void {
		// Mock implementation
	}
}

class MockSkillSearchService implements ISkillSearchService {
	readonly _serviceBrand: undefined;
	private allSkills: MarketplaceSkill[] = [];

	constructor(allSkills: MarketplaceSkill[] = []) {
		this.allSkills = allSkills;
	}

	async search(query: string, filters?: any): Promise<any[]> {
		const lowerQuery = query.toLowerCase();
		return this.allSkills
			.filter(s =>
				s.name.toLowerCase().includes(lowerQuery) ||
				s.description.toLowerCase().includes(lowerQuery)
			)
			.map(s => ({ ...s, relevanceScore: 1.0, matchedFields: ['name'] }));
	}

	async searchOfficial(query: string): Promise<MarketplaceSkill[]> {
		return this.allSkills.filter(s => s.source === 'official');
	}

	async searchAnthropic(query: string): Promise<MarketplaceSkill[]> {
		return this.allSkills.filter(s => s.source === 'anthropic');
	}

	async searchCommunity(query: string): Promise<MarketplaceSkill[]> {
		return this.allSkills.filter(s => s.source === 'community');
	}

	getLastSearchStats(): any {
		return null;
	}
}

// Test data
const createMockSkill = (
	name: string,
	source: MarketplaceSource,
	description: string,
	keywords: string[] = []
): MarketplaceSkill => ({
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

	let officialMarketplace: MockOfficialMarketplace;
	let anthropicMarketplace: MockAnthropicMarketplace;
	let communityMarketplace: MockCommunityMarketplace;
	let searchService: MockSkillSearchService;
	let logService: ILogService;
	let command: MarketplaceCommand;

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

		command = new MarketplaceCommand(
			officialMarketplace,
			anthropicMarketplace,
			communityMarketplace,
			searchService,
			logService
		);
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

			const commandWithFailure = new MarketplaceCommand(
				failingOfficial,
				anthropicMarketplace,
				communityMarketplace,
				searchService,
				logService
			);

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

			const commandWithFailure = new MarketplaceCommand(
				failingOfficial,
				failingAnthropic,
				failingCommunity,
				searchService,
				logService
			);

			await assert.rejects(
				() => commandWithFailure.browse(),
				/Failed to fetch skills from all marketplace sources/,
				'Should throw when all sources fail'
			);
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

	const mockSkills: MarketplaceSkill[] = [
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
