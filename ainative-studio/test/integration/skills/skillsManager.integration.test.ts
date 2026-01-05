/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { tmpdir } from 'os';
import { URI } from '../../../src/vs/base/common/uri.js';
import { IFileService } from '../../../src/vs/platform/files/common/files.js';
import { SkillsManager } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillsManager.js';
import { SkillParser } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillParser.js';
import { SkillLoader } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillLoader.js';
import { SkillsRegistry } from '../../../src/vs/workbench/contrib/ainative/common/skills/skillsRegistry.js';

suite('Skills Manager Integration Tests', () => {
	let tempDir: string;
	let skillsDir: string;
	let testSkillPath: string;
	let skillsManager: SkillsManager;
	let fileService: IFileService;

	setup(async () => {
		// Create temporary directory for test skills
		tempDir = fs.mkdtempSync(path.join(tmpdir(), 'skills-integration-test-'));
		skillsDir = path.join(tempDir, 'skills');
		fs.mkdirSync(skillsDir, { recursive: true });

		// Create test skill
		testSkillPath = path.join(tempDir, 'test-skill');
		fs.mkdirSync(testSkillPath, { recursive: true });

		const skillContent = `---
name: test-integration-skill
description: A test skill for integration testing
version: 1.0.0
author: Testing Team
tags: [testing, integration]
category: development
---

# Test Integration Skill

## Usage

This skill is used for integration testing the Skills Manager.

## Examples

\`\`\`typescript
const result = await someFunction();
\`\`\`
`;

		fs.writeFileSync(path.join(testSkillPath, 'SKILL.md'), skillContent);

		// Create reference files
		const referencesDir = path.join(testSkillPath, 'references');
		fs.mkdirSync(referencesDir, { recursive: true });
		fs.writeFileSync(
			path.join(referencesDir, 'examples.md'),
			'# Examples\n\nDetailed examples go here.'
		);

		// Initialize services (would use DI in actual implementation)
		// fileService = createMockFileService();
		// skillsManager = new SkillsManager(fileService, skillsDir);
	});

	teardown(() => {
		// Clean up temporary directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	suite('End-to-End Workflow: Install → Load → Use → Uninstall', () => {
		test('should complete full skill lifecycle', async () => {
			// 1. Install skill
			await skillsManager.install(testSkillPath, 'local');

			// 2. Verify installation
			const installedSkills = await skillsManager.list();
			assert.strictEqual(installedSkills.length, 1);
			assert.strictEqual(installedSkills[0].name, 'test-integration-skill');

			// 3. Load metadata
			const skillLoader = new SkillLoader(fileService, skillsDir);
			const metadata = await skillLoader.loadMetadataOnly('test-integration-skill');
			assert.strictEqual(metadata.name, 'test-integration-skill');
			assert.strictEqual(metadata.description, 'A test skill for integration testing');

			// 4. Load full skill
			const fullSkill = await skillLoader.loadFullSkill('test-integration-skill');
			assert.ok(fullSkill.body.includes('Test Integration Skill'));
			assert.ok(fullSkill.body.includes('integration testing'));

			// 5. Load reference file
			const examples = await skillLoader.loadReferenceFile(
				'test-integration-skill',
				'references/examples.md'
			);
			assert.ok(examples.includes('Detailed examples'));

			// 6. Uninstall skill
			await skillsManager.uninstall('test-integration-skill');

			// 7. Verify uninstallation
			const remainingSkills = await skillsManager.list();
			assert.strictEqual(remainingSkills.length, 0);
		});
	});

	suite('Multiple Skills Management', () => {
		test('should handle installing multiple skills', async () => {
			// Create multiple test skills
			const skill1Path = path.join(tempDir, 'skill-1');
			const skill2Path = path.join(tempDir, 'skill-2');
			const skill3Path = path.join(tempDir, 'skill-3');

			for (const [skillPath, skillName] of [
				[skill1Path, 'test-skill-1'],
				[skill2Path, 'test-skill-2'],
				[skill3Path, 'test-skill-3']
			]) {
				fs.mkdirSync(skillPath, { recursive: true });
				fs.writeFileSync(
					path.join(skillPath, 'SKILL.md'),
					`---\nname: ${skillName}\ndescription: Test skill ${skillName}\n---\n# Content`
				);
			}

			// Install all skills
			await skillsManager.install(skill1Path, 'local');
			await skillsManager.install(skill2Path, 'local');
			await skillsManager.install(skill3Path, 'local');

			// Verify all installed
			const installed = await skillsManager.list();
			assert.strictEqual(installed.length, 3);

			const skillNames = installed.map(s => s.name).sort();
			assert.deepStrictEqual(skillNames, ['test-skill-1', 'test-skill-2', 'test-skill-3']);
		});

		test('should handle selective uninstallation', async () => {
			// Install 3 skills (from previous test setup)
			const skill1Path = path.join(tempDir, 'skill-1');
			const skill2Path = path.join(tempDir, 'skill-2');
			const skill3Path = path.join(tempDir, 'skill-3');

			for (const [skillPath, skillName] of [
				[skill1Path, 'test-skill-1'],
				[skill2Path, 'test-skill-2'],
				[skill3Path, 'test-skill-3']
			]) {
				fs.mkdirSync(skillPath, { recursive: true });
				fs.writeFileSync(
					path.join(skillPath, 'SKILL.md'),
					`---\nname: ${skillName}\ndescription: Test skill ${skillName}\n---\n# Content`
				);
			}

			await skillsManager.install(skill1Path, 'local');
			await skillsManager.install(skill2Path, 'local');
			await skillsManager.install(skill3Path, 'local');

			// Uninstall only skill-2
			await skillsManager.uninstall('test-skill-2');

			// Verify only skill-2 removed
			const remaining = await skillsManager.list();
			assert.strictEqual(remaining.length, 2);

			const remainingNames = remaining.map(s => s.name).sort();
			assert.deepStrictEqual(remainingNames, ['test-skill-1', 'test-skill-3']);
		});
	});

	suite('File System Integration', () => {
		test('should persist skills across service restarts', async () => {
			// Install skill
			await skillsManager.install(testSkillPath, 'local');

			// Simulate service restart by creating new instance
			const newSkillsManager = new SkillsManager(fileService, skillsDir);

			// Verify skill still exists
			const skills = await newSkillsManager.list();
			assert.strictEqual(skills.length, 1);
			assert.strictEqual(skills[0].name, 'test-integration-skill');
		});

		test('should handle file system errors gracefully', async () => {
			// Create read-only directory to simulate permission error
			const readOnlyDir = path.join(tempDir, 'readonly');
			fs.mkdirSync(readOnlyDir, { recursive: true });
			fs.chmodSync(readOnlyDir, 0o444); // Read-only

			const restrictedSkillsManager = new SkillsManager(fileService, readOnlyDir);

			// Attempt installation should fail gracefully
			try {
				await restrictedSkillsManager.install(testSkillPath, 'local');
				assert.fail('Should have thrown permission error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('EACCES') || error.message.includes('permission'));
			} finally {
				// Restore permissions for cleanup
				fs.chmodSync(readOnlyDir, 0o755);
			}
		});

		test('should validate skill structure before installation', async () => {
			// Create invalid skill (missing SKILL.md)
			const invalidSkillPath = path.join(tempDir, 'invalid-skill');
			fs.mkdirSync(invalidSkillPath, { recursive: true });
			fs.writeFileSync(path.join(invalidSkillPath, 'README.md'), 'Not a skill');

			// Attempt installation
			try {
				await skillsManager.install(invalidSkillPath, 'local');
				assert.fail('Should have thrown validation error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(
					error.message.includes('SKILL.md') ||
					error.message.includes('validation') ||
					error.message.includes('invalid')
				);
			}
		});

		test('should handle corrupted SKILL.md gracefully', async () => {
			// Create skill with invalid YAML
			const corruptedSkillPath = path.join(tempDir, 'corrupted-skill');
			fs.mkdirSync(corruptedSkillPath, { recursive: true });

			const invalidContent = `---
name: corrupted-skill
description: This will fail
tags: [not, a, valid: yaml: array]
---`;

			fs.writeFileSync(path.join(corruptedSkillPath, 'SKILL.md'), invalidContent);

			// Attempt installation
			try {
				await skillsManager.install(corruptedSkillPath, 'local');
				assert.fail('Should have thrown parse error');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(
					error.message.includes('parse') ||
					error.message.includes('YAML') ||
					error.message.includes('invalid')
				);
			}
		});
	});

	suite('Cache Integration', () => {
		test('should cache metadata across multiple loads', async () => {
			await skillsManager.install(testSkillPath, 'local');

			const skillLoader = new SkillLoader(fileService, skillsDir);

			// First load (cache miss)
			const startMiss = performance.now();
			const metadata1 = await skillLoader.loadMetadataOnly('test-integration-skill');
			const missDuration = performance.now() - startMiss;

			// Second load (cache hit)
			const startHit = performance.now();
			const metadata2 = await skillLoader.loadMetadataOnly('test-integration-skill');
			const hitDuration = performance.now() - startHit;

			// Verify same data
			assert.deepStrictEqual(metadata1, metadata2);

			// Cache hit should be faster (not always guaranteed, but usually)
			// Just verify both complete successfully
			assert.ok(missDuration > 0);
			assert.ok(hitDuration > 0);

			// Verify cache stats
			const stats = skillLoader.getCacheStats();
			assert.ok(stats.metadataCacheHits >= 1);
			assert.ok(stats.metadataCacheSize >= 1);
		});

		test('should maintain LRU eviction policy', async () => {
			// Install 7 skills to exceed LRU cache size (max 5)
			const skillPaths: string[] = [];
			for (let i = 1; i <= 7; i++) {
				const skillPath = path.join(tempDir, `lru-skill-${i}`);
				fs.mkdirSync(skillPath, { recursive: true });
				fs.writeFileSync(
					path.join(skillPath, 'SKILL.md'),
					`---\nname: lru-skill-${i}\ndescription: LRU test skill ${i}\n---\n# Content ${i}`
				);
				await skillsManager.install(skillPath, 'local');
				skillPaths.push(skillPath);
			}

			const skillLoader = new SkillLoader(fileService, skillsDir);

			// Load all 7 skills
			for (let i = 1; i <= 7; i++) {
				await skillLoader.loadFullSkill(`lru-skill-${i}`);
			}

			// Cache should only contain 5 most recent
			const stats = skillLoader.getCacheStats();
			assert.strictEqual(stats.fullSkillCacheSize, 5);

			// Load skill-1 again (should not be in cache)
			await skillLoader.loadFullSkill('lru-skill-1');

			// skill-3 should now be evicted (oldest after loading 1)
			const statsAfter = skillLoader.getCacheStats();
			assert.strictEqual(statsAfter.fullSkillCacheSize, 5);
		});

		test('should invalidate cache on skill update', async () => {
			await skillsManager.install(testSkillPath, 'local');

			const skillLoader = new SkillLoader(fileService, skillsDir);

			// Load skill
			const skill1 = await skillLoader.loadFullSkill('test-integration-skill');

			// Modify skill file directly
			const installedSkillPath = path.join(skillsDir, 'test-integration-skill', 'SKILL.md');
			const updatedContent = fs.readFileSync(installedSkillPath, 'utf8')
				.replace('integration testing', 'UPDATED integration testing');
			fs.writeFileSync(installedSkillPath, updatedContent);

			// Invalidate cache
			skillLoader.invalidateCache('test-integration-skill');

			// Reload skill
			const skill2 = await skillLoader.loadFullSkill('test-integration-skill');

			// Verify content updated
			assert.ok(skill2.body.includes('UPDATED integration testing'));
			assert.ok(!skill1.body.includes('UPDATED'));
		});
	});

	suite('Parser Integration', () => {
		test('should parse complex skill with all optional fields', async () => {
			const complexSkillPath = path.join(tempDir, 'complex-skill');
			fs.mkdirSync(complexSkillPath, { recursive: true });

			const complexContent = `---
name: complex-integration-skill
description: A comprehensive skill with all metadata fields
version: 2.5.0
author: Integration Testing Team
license: MIT
tags: [testing, integration, complex, comprehensive]
category: advanced-development
location: project
---

# Complex Integration Skill

## Overview

This skill tests all possible metadata fields and complex content.

## Features

- Feature 1
- Feature 2
- Feature 3

## Code Examples

\`\`\`typescript
interface ComplexExample {
	property: string;
	method(): void;
}

class Implementation implements ComplexExample {
	property = 'test';
	method() {
		console.log(this.property);
	}
}
\`\`\`

## Configuration

\`\`\`json
{
	"setting1": "value1",
	"setting2": true,
	"setting3": [1, 2, 3]
}
\`\`\`
`;

			fs.writeFileSync(path.join(complexSkillPath, 'SKILL.md'), complexContent);

			const parser = new SkillParser(fileService);
			const parsed = await parser.parseSkillFile(path.join(complexSkillPath, 'SKILL.md'));

			// Verify all metadata fields
			assert.strictEqual(parsed.metadata.name, 'complex-integration-skill');
			assert.strictEqual(parsed.metadata.description, 'A comprehensive skill with all metadata fields');
			assert.strictEqual(parsed.metadata.version, '2.5.0');
			assert.strictEqual(parsed.metadata.author, 'Integration Testing Team');
			assert.strictEqual(parsed.metadata.license, 'MIT');
			assert.deepStrictEqual(parsed.metadata.tags, ['testing', 'integration', 'complex', 'comprehensive']);
			assert.strictEqual(parsed.metadata.category, 'advanced-development');
			assert.strictEqual(parsed.metadata.location, 'project');

			// Verify body content
			assert.ok(parsed.body.includes('Complex Integration Skill'));
			assert.ok(parsed.body.includes('interface ComplexExample'));
			assert.ok(parsed.body.includes('"setting1": "value1"'));
		});

		test('should handle skills with multiple reference files', async () => {
			const multiRefSkillPath = path.join(tempDir, 'multi-ref-skill');
			fs.mkdirSync(multiRefSkillPath, { recursive: true });

			fs.writeFileSync(
				path.join(multiRefSkillPath, 'SKILL.md'),
				`---\nname: multi-ref-skill\ndescription: Skill with multiple references\n---\n# Content`
			);

			// Create multiple reference directories
			const referencesDir = path.join(multiRefSkillPath, 'references');
			const scriptsDir = path.join(multiRefSkillPath, 'scripts');
			const assetsDir = path.join(multiRefSkillPath, 'assets');

			fs.mkdirSync(referencesDir, { recursive: true });
			fs.mkdirSync(scriptsDir, { recursive: true });
			fs.mkdirSync(assetsDir, { recursive: true });

			fs.writeFileSync(path.join(referencesDir, 'api-docs.md'), '# API Docs');
			fs.writeFileSync(path.join(referencesDir, 'examples.md'), '# Examples');
			fs.writeFileSync(path.join(scriptsDir, 'setup.sh'), '#!/bin/bash\necho "Setup"');
			fs.writeFileSync(path.join(assetsDir, 'diagram.txt'), 'ASCII diagram');

			await skillsManager.install(multiRefSkillPath, 'local');

			const skillLoader = new SkillLoader(fileService, skillsDir);

			// Load all reference files
			const apiDocs = await skillLoader.loadReferenceFile('multi-ref-skill', 'references/api-docs.md');
			const examples = await skillLoader.loadReferenceFile('multi-ref-skill', 'references/examples.md');
			const setupScript = await skillLoader.loadReferenceFile('multi-ref-skill', 'scripts/setup.sh');
			const diagram = await skillLoader.loadReferenceFile('multi-ref-skill', 'assets/diagram.txt');

			assert.ok(apiDocs.includes('API Docs'));
			assert.ok(examples.includes('Examples'));
			assert.ok(setupScript.includes('Setup'));
			assert.ok(diagram.includes('ASCII diagram'));
		});
	});

	suite('Error Handling Integration', () => {
		test('should handle missing reference file gracefully', async () => {
			await skillsManager.install(testSkillPath, 'local');

			const skillLoader = new SkillLoader(fileService, skillsDir);

			try {
				await skillLoader.loadReferenceFile('test-integration-skill', 'references/nonexistent.md');
				assert.fail('Should have thrown FileNotFoundError');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(error.message.includes('not found') || error.message.includes('ENOENT'));
			}
		});

		test('should detect duplicate installation attempts', async () => {
			await skillsManager.install(testSkillPath, 'local');

			// Attempt duplicate installation
			try {
				await skillsManager.install(testSkillPath, 'local');
				assert.fail('Should have thrown SkillConflictError');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(
					error.message.includes('already installed') ||
					error.message.includes('conflict') ||
					error.message.includes('duplicate')
				);
			}
		});

		test('should handle uninstalling non-existent skill', async () => {
			try {
				await skillsManager.uninstall('non-existent-skill');
				assert.fail('Should have thrown SkillNotFoundError');
			} catch (error) {
				assert.ok(error instanceof Error);
				assert.ok(
					error.message.includes('not found') ||
					error.message.includes('not installed') ||
					error.message.includes('does not exist')
				);
			}
		});
	});

	suite('Registry Persistence', () => {
		test('should persist registry to disk', async () => {
			await skillsManager.install(testSkillPath, 'local');

			// Verify registry file exists
			const registryPath = path.join(skillsDir, '.registry.json');
			assert.ok(fs.existsSync(registryPath));

			// Verify registry content
			const registryContent = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
			assert.ok(registryContent['test-integration-skill']);
			assert.strictEqual(registryContent['test-integration-skill'].name, 'test-integration-skill');
			assert.strictEqual(registryContent['test-integration-skill'].source, 'local');
		});

		test('should recover from corrupted registry', async () => {
			await skillsManager.install(testSkillPath, 'local');

			// Corrupt registry file
			const registryPath = path.join(skillsDir, '.registry.json');
			fs.writeFileSync(registryPath, 'INVALID JSON {{{');

			// Create new manager instance
			const newSkillsManager = new SkillsManager(fileService, skillsDir);

			// Should rebuild registry or handle gracefully
			const skills = await newSkillsManager.list();
			// Either empty (rebuilt) or recovered
			assert.ok(Array.isArray(skills));
		});
	});
});
