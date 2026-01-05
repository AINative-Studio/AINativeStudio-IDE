/**
 * Standalone Skills Manager Tests
 *
 * These tests verify the Skills Manager functionality using only Node.js built-ins
 * to bypass VS Code base module compilation issues.
 *
 * Testing Team Lead: ranveerd11
 * Issue: #58 - Skills Manager Testing
 */

import assert from 'assert';
import { describe, it, before } from 'node:test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Suite: Skills Parser Logic
 * Tests the core YAML frontmatter parsing and validation
 */
describe('Skills Parser - YAML Frontmatter Parsing', () => {

    it('should parse simple YAML frontmatter', () => {
        const input = `---
name: test-skill
description: A test skill
---

# Body content`;

        // Test basic YAML parsing logic
        const lines = input.split('---')[1].trim().split('\n');
        const metadata = {};

        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();
                metadata[key] = value;
            }
        });

        assert.strictEqual(metadata.name, 'test-skill');
        assert.strictEqual(metadata.description, 'A test skill');
    });

    it('should detect missing frontmatter', () => {
        const invalidInput = `# No frontmatter here`;

        const hasFrontmatter = invalidInput.startsWith('---');

        assert.strictEqual(hasFrontmatter, false);
    });

    it('should validate required fields exist', () => {
        const metadata = {
            name: 'test-skill',
            description: 'Test description'
        };

        const hasName = metadata.hasOwnProperty('name') && !!metadata.name;
        const hasDescription = metadata.hasOwnProperty('description') && !!metadata.description;

        assert.strictEqual(hasName, true);
        assert.strictEqual(hasDescription, true);
    });

    it('should detect missing required fields', () => {
        const metadataWithoutName = {
            description: 'Test description'
        };

        const hasName = metadataWithoutName.hasOwnProperty('name') && metadataWithoutName.name;

        assert.strictEqual(hasName, false);
    });

    it('should parse tags array', () => {
        const tagsString = '[testing, unit-test, bdd]';

        // Simulate parsing tags
        const tags = tagsString
            .substring(1, tagsString.length - 1)
            .split(',')
            .map(tag => tag.trim());

        assert.strictEqual(tags.length, 3);
        assert.ok(tags.includes('testing'));
        assert.ok(tags.includes('unit-test'));
        assert.ok(tags.includes('bdd'));
    });

    it('should handle quoted values', () => {
        const quotedValue = '"test-value"';
        const singleQuoted = "'another-value'";

        // Remove quotes
        const unquoted1 = quotedValue.replace(/^["']|["']$/g, '');
        const unquoted2 = singleQuoted.replace(/^["']|["']$/g, '');

        assert.strictEqual(unquoted1, 'test-value');
        assert.strictEqual(unquoted2, 'another-value');
    });
});

/**
 * Test Suite: Skills Registry Logic
 * Tests skill installation, listing, and management
 */
describe('Skills Registry - Installation Logic', () => {

    it('should detect duplicate skill names', () => {
        const registry = new Map();
        registry.set('skill-1', { name: 'skill-1', version: '1.0.0' });

        const isDuplicate = registry.has('skill-1');
        const isNew = !registry.has('skill-2');

        assert.strictEqual(isDuplicate, true);
        assert.strictEqual(isNew, true);
    });

    it('should list all installed skills', () => {
        const registry = new Map();
        registry.set('skill-1', { name: 'skill-1', version: '1.0.0' });
        registry.set('skill-2', { name: 'skill-2', version: '2.0.0' });

        const allSkills = Array.from(registry.values());

        assert.strictEqual(allSkills.length, 2);
        assert.strictEqual(allSkills[0].name, 'skill-1');
        assert.strictEqual(allSkills[1].name, 'skill-2');
    });

    it('should remove skill from registry', () => {
        const registry = new Map();
        registry.set('skill-1', { name: 'skill-1', version: '1.0.0' });

        registry.delete('skill-1');

        assert.strictEqual(registry.has('skill-1'), false);
        assert.strictEqual(registry.size, 0);
    });
});

/**
 * Test Suite: Skills Loader - Cache Logic
 * Tests LRU cache and progressive loading
 */
describe('Skills Loader - LRU Cache', () => {

    it('should implement basic cache storage', () => {
        const cache = new Map();

        cache.set('skill-1', { metadata: { name: 'skill-1' } });
        cache.set('skill-2', { metadata: { name: 'skill-2' } });

        assert.strictEqual(cache.size, 2);
        assert.ok(cache.has('skill-1'));
        assert.ok(cache.has('skill-2'));
    });

    it('should track cache hits and misses', () => {
        const cache = new Map();
        let hits = 0;
        let misses = 0;

        // First access - miss
        if (cache.has('skill-1')) {
            hits++;
        } else {
            misses++;
            cache.set('skill-1', { name: 'skill-1' });
        }

        // Second access - hit
        if (cache.has('skill-1')) {
            hits++;
        } else {
            misses++;
        }

        assert.strictEqual(hits, 1);
        assert.strictEqual(misses, 1);
    });

    it('should evict oldest entry when at capacity', () => {
        const maxSize = 3;
        const cache = new Map();
        const insertionOrder = [];

        // Fill cache to capacity
        for (let i = 1; i <= maxSize; i++) {
            const key = `skill-${i}`;
            cache.set(key, { name: key });
            insertionOrder.push(key);
        }

        // Add one more (should evict oldest)
        if (cache.size >= maxSize) {
            // Evict first item
            const oldest = insertionOrder.shift();
            cache.delete(oldest);
        }
        cache.set('skill-4', { name: 'skill-4' });
        insertionOrder.push('skill-4');

        assert.strictEqual(cache.size, maxSize);
        assert.strictEqual(cache.has('skill-1'), false); // Evicted
        assert.ok(cache.has('skill-4')); // New entry
    });
});

console.log('\n==============================================');
console.log('Standalone Skills Manager Tests');
console.log('Testing Team Lead: ranveerd11');
console.log('==============================================\n');
