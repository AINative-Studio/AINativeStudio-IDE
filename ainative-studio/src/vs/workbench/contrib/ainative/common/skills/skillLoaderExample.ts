/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Example usage of SkillLoader service
 * This file demonstrates the progressive disclosure pattern for skill loading
 */

import { ISkillLoader } from './skillLoaderTypes.js';

/**
 * Example 1: Load metadata for all skills (always in context)
 *
 * This is called at startup to populate the skill picker.
 * Total size: ~1000 tokens for 10 skills
 */
async function loadAllMetadataExample(loader: ISkillLoader): Promise<void> {
	console.log('=== Example 1: Load All Metadata ===');

	const startTime = performance.now();
	const allMetadata = await loader.getAllMetadata();
	const elapsed = performance.now() - startTime;

	console.log(`Loaded ${allMetadata.length} skills in ${elapsed.toFixed(2)}ms`);
	console.log('\nSample metadata:');

	// Show first 3 skills
	allMetadata.slice(0, 3).forEach(skill => {
		console.log(`\n${skill.name}:`);
		console.log(`  Description: ${skill.description}`);
		console.log(`  Tags: ${skill.tags?.join(', ') || 'none'}`);
		console.log(`  Category: ${skill.category || 'unknown'}`);
		console.log(`  Location: ${skill.location}`);
	});

	console.log(`\nEstimated context size: ~${allMetadata.length * 100} words`);
}

/**
 * Example 2: Load full skill when invoked
 *
 * This is called when Claude activates a skill (e.g., /git-workflow)
 * The full body is loaded on-demand, not kept in initial context
 */
async function loadFullSkillExample(loader: ISkillLoader): Promise<void> {
	console.log('\n=== Example 2: Load Full Skill ===');

	const skillName = 'git-workflow';
	const startTime = performance.now();
	const fullSkill = await loader.loadFullSkill(skillName);
	const elapsed = performance.now() - startTime;

	console.log(`Loaded full skill '${skillName}' in ${elapsed.toFixed(2)}ms`);
	console.log('\nMetadata:');
	console.log(`  Name: ${fullSkill.metadata.name}`);
	console.log(`  Description: ${fullSkill.metadata.description}`);
	console.log(`  Version: ${fullSkill.metadata.version || 'unknown'}`);

	console.log('\nBody:');
	const bodyPreview = fullSkill.body?.substring(0, 200) || 'No body';
	console.log(`  ${bodyPreview}...`);
	console.log(`  Total length: ${fullSkill.body?.length || 0} characters`);

	console.log('\nResources:');
	fullSkill.resources?.forEach(resource => {
		console.log(`  - ${resource.type}: ${resource.path}`);
	});
}

/**
 * Example 3: Load reference file when requested
 *
 * This is called when Claude needs additional context from a reference file
 * Reference files are not cached and loaded only when explicitly requested
 */
async function loadReferenceExample(loader: ISkillLoader): Promise<void> {
	console.log('\n=== Example 3: Load Reference File ===');

	const skillName = 'git-workflow';
	const referencePath = 'ai-attribution-enforcement.md';

	const startTime = performance.now();
	const content = await loader.loadReference(skillName, referencePath);
	const elapsed = performance.now() - startTime;

	console.log(`Loaded reference file in ${elapsed.toFixed(2)}ms`);
	console.log(`  Skill: ${skillName}`);
	console.log(`  File: ${referencePath}`);
	console.log(`  Size: ${content.length} characters`);
	console.log(`\nContent preview:\n${content.substring(0, 300)}...`);
}

/**
 * Example 4: Preload metadata at startup
 *
 * This warms the cache for enabled skills during workspace initialization
 */
async function preloadExample(loader: ISkillLoader): Promise<void> {
	console.log('\n=== Example 4: Preload Metadata ===');

	const enabledSkills = [
		'git-workflow',
		'mandatory-tdd',
		'code-quality',
		'database-schema-sync',
		'story-workflow'
	];

	await loader.preloadMetadata(enabledSkills);
	console.log('Metadata preloaded successfully');
}

/**
 * Example 5: Cache performance comparison
 *
 * Demonstrates the performance benefit of caching
 */
async function cachePerformanceExample(loader: ISkillLoader): Promise<void> {
	console.log('\n=== Example 5: Cache Performance ===');

	// Clear cache to start fresh
	loader.clearCache();

	const skillName = 'git-workflow';

	// First load (cache miss)
	const start1 = performance.now();
	await loader.loadMetadataOnly(skillName);
	const firstLoad = performance.now() - start1;

	// Second load (cache hit)
	const start2 = performance.now();
	await loader.loadMetadataOnly(skillName);
	const secondLoad = performance.now() - start2;

	console.log(`First load (cache miss): ${firstLoad.toFixed(2)}ms`);
	console.log(`Second load (cache hit): ${secondLoad.toFixed(2)}ms`);
	console.log(`Speedup: ${(firstLoad / secondLoad).toFixed(1)}x`);

	// Get cache statistics
	const stats = (loader as any).getCacheStats();
	console.log('\nCache statistics:');
	console.log(`  Metadata entries: ${stats.metadataCount}`);
	console.log(`  Full skills: ${stats.fullSkillCount}`);
	console.log(`  Memory usage: ${(stats.estimatedMemoryUsage / 1024).toFixed(2)} KB`);
	console.log(`  Hit ratio: ${(stats.hitRatio * 100).toFixed(1)}%`);
}

/**
 * Example 6: Progressive disclosure workflow
 *
 * Demonstrates the complete workflow from discovery to invocation
 */
async function progressiveDisclosureWorkflow(loader: ISkillLoader): Promise<void> {
	console.log('\n=== Example 6: Progressive Disclosure Workflow ===');

	// Phase 1: User opens workspace - load all metadata
	console.log('\nPhase 1: Workspace startup');
	console.log('Loading metadata for all skills...');
	const allMetadata = await loader.getAllMetadata();
	console.log(`✓ Loaded ${allMetadata.length} skill summaries (~${allMetadata.length * 100} words)`);

	// Phase 2: User browses skills - metadata already cached
	console.log('\nPhase 2: User browses skill picker');
	console.log('Available skills:');
	allMetadata.forEach((skill, i) => {
		console.log(`  ${i + 1}. ${skill.name} - ${skill.description.substring(0, 60)}...`);
	});

	// Phase 3: User invokes a skill - load full body
	console.log('\nPhase 3: User invokes skill "git-workflow"');
	const fullSkill = await loader.loadFullSkill('git-workflow');
	console.log(`✓ Loaded full skill body (${fullSkill.body?.length || 0} characters)`);

	// Phase 4: Claude requests reference file - load on demand
	console.log('\nPhase 4: Claude requests reference file');
	const reference = await loader.loadReference('git-workflow', 'ai-attribution-enforcement.md');
	console.log(`✓ Loaded reference file (${reference.length} characters)`);

	console.log('\n✓ Progressive disclosure complete!');
}

/**
 * Run all examples
 */
export async function runAllExamples(loader: ISkillLoader): Promise<void> {
	console.log('╔════════════════════════════════════════════════════════════════╗');
	console.log('║         SkillLoader Progressive Disclosure Examples           ║');
	console.log('╚════════════════════════════════════════════════════════════════╝\n');

	try {
		await loadAllMetadataExample(loader);
		await loadFullSkillExample(loader);
		await loadReferenceExample(loader);
		await preloadExample(loader);
		await cachePerformanceExample(loader);
		await progressiveDisclosureWorkflow(loader);

		console.log('\n✓ All examples completed successfully!');
	} catch (error) {
		console.error('\n✗ Example failed:', error);
	}
}

/**
 * Expected Performance Metrics:
 *
 * Metadata Loading:
 * - Target: < 10ms per skill
 * - Cache hit: < 1ms
 * - All 10 skills: < 50ms total
 *
 * Full Skill Loading:
 * - Target: < 50ms per skill
 * - Cache hit: < 1ms
 *
 * Reference File Loading:
 * - Target: < 100ms per file
 * - No caching
 *
 * Memory Usage:
 * - Metadata cache: ~5KB for 10 skills
 * - Full skill cache: ~50KB max (5 skills)
 * - Total: < 60KB
 *
 * Context Size:
 * - Phase 1 (Metadata): ~1000 tokens (10 skills × 100 words)
 * - Phase 2 (Full Skill): ~2000-5000 tokens per skill
 * - Phase 3 (Reference): ~1000-3000 tokens per file
 */
