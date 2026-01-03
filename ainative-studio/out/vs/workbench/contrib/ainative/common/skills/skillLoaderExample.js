/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Example 1: Load metadata for all skills (always in context)
 *
 * This is called at startup to populate the skill picker.
 * Total size: ~1000 tokens for 10 skills
 */
async function loadAllMetadataExample(loader) {
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
async function loadFullSkillExample(loader) {
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
async function loadReferenceExample(loader) {
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
async function preloadExample(loader) {
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
async function cachePerformanceExample(loader) {
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
    const stats = loader.getCacheStats();
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
async function progressiveDisclosureWorkflow(loader) {
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
export async function runAllExamples(loader) {
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
    }
    catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxMb2FkZXJFeGFtcGxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9jb21tb24vc2tpbGxzL3NraWxsTG9hZGVyRXhhbXBsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRzs7Ozs7R0FLRztBQUNILEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxNQUFvQjtJQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFFcEQsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3BDLE1BQU0sV0FBVyxHQUFHLE1BQU0sTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ2xELE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7SUFFOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLFdBQVcsQ0FBQyxNQUFNLGNBQWMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBRWxDLHNCQUFzQjtJQUN0QixXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJ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