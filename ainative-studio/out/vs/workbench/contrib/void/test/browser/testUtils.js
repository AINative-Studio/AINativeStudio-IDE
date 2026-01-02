/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
/**
 * Test utilities for Skills Manager
 *
 * Provides reusable test helpers, mocks, and utilities for testing
 * the Skills Manager system across all phases.
 */
import { join } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
/**
 * Utility class for creating mock skills and test data
 */
export class SkillTestUtils {
    /**
     * Create a mock skill with optional overrides
     */
    static createMockSkill(overrides) {
        return {
            name: 'mock-skill',
            description: 'Mock skill for testing',
            version: '1.0.0',
            author: 'AINative Studio QA Team',
            content: '# Mock Content\n\nThis is mock skill content.',
            tags: ['test', 'mock'],
            dependencies: [],
            ...overrides
        };
    }
    /**
     * Create multiple mock skills
     */
    static createMockSkills(count, baseOverrides) {
        const skills = [];
        for (let i = 0; i < count; i++) {
            skills.push(this.createMockSkill({
                name: `mock-skill-${i}`,
                description: `Mock skill ${i}`,
                ...baseOverrides
            }));
        }
        return skills;
    }
    /**
     * Create a mock skill with dependencies
     */
    static createMockSkillWithDeps(name, deps) {
        return this.createMockSkill({
            name,
            dependencies: deps
        });
    }
    /**
     * Create a mock registry populated with skills
     */
    static createMockRegistry(skills) {
        const registry = new Map();
        skills.forEach(skill => registry.set(skill.name, skill));
        return {
            skills: registry,
            add(skill) { this.skills.set(skill.name, skill); },
            get(name) { return this.skills.get(name); },
            has(name) { return this.skills.has(name); },
            remove(name) { return this.skills.delete(name); },
            list() { return Array.from(this.skills.values()); },
            count() { return this.skills.size; },
            clear() { this.skills.clear(); }
        };
    }
    /**
     * Create a temporary skill file for testing
     */
    static async createTempSkillFile(name, metadata, content = '# Test Content') {
        const tempDir = join(tmpdir(), 'ainative-skills-test');
        await mkdir(tempDir, { recursive: true });
        const skillContent = `---
name: ${name}
description: ${metadata.description || 'Test skill'}
version: ${metadata.version || '1.0.0'}
${metadata.author ? `author: ${metadata.author}` : ''}
${metadata.tags ? `tags: [${metadata.tags.join(', ')}]` : 'tags: []'}
${metadata.dependencies ? `dependencies: [${metadata.dependencies.join(', ')}]` : 'dependencies: []'}
---

${content}
`;
        const filePath = join(tempDir, `${name}.md`);
        await writeFile(filePath, skillContent, 'utf-8');
        return filePath;
    }
    /**
     * Clean up temporary test files
     */
    static async cleanupTempFiles() {
        const tempDir = join(tmpdir(), 'ainative-skills-test');
        try {
            await rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore errors during cleanup
        }
    }
    /**
     * Generate skill content of specified size (for performance testing)
     */
    static generateLargeSkillContent(sizeKB) {
        const chunkSize = 100; // bytes per chunk
        const chunks = (sizeKB * 1024) / chunkSize;
        let content = '# Large Skill Content\n\n';
        for (let i = 0; i < chunks; i++) {
            content += `Section ${i}: ${'x'.repeat(chunkSize - 20)}\n`;
        }
        return content;
    }
    /**
     * Create mock marketplace response
     */
    static mockMarketplaceResponse(skills) {
        return {
            skills: skills.map(skill => ({
                ...skill,
                downloadUrl: `https://marketplace.ainative.studio/skills/${skill.name}/${skill.version}.md`,
                checksum: `sha256:${Math.random().toString(36)}`,
                size: Math.floor(Math.random() * 50000) + 5000,
                downloads: Math.floor(Math.random() * 10000),
                rating: 4 + Math.random(),
                lastUpdated: new Date().toISOString()
            })),
            total: skills.length,
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Wait for a specified duration (for async testing)
     */
    static async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Assert that a promise rejects with specific error
     */
    static async assertRejects(promise, errorPattern, message) {
        try {
            await promise;
            throw new Error(message || 'Expected promise to reject');
        }
        catch (error) {
            const errorMessage = error.message || String(error);
            if (errorPattern instanceof RegExp) {
                if (!errorPattern.test(errorMessage)) {
                    throw new Error(`Error message "${errorMessage}" does not match pattern ${errorPattern}`);
                }
            }
            else {
                if (!errorMessage.includes(errorPattern)) {
                    throw new Error(`Error message "${errorMessage}" does not include "${errorPattern}"`);
                }
            }
        }
    }
    /**
     * Measure execution time of a function
     */
    static async measureTime(fn) {
        const startTime = performance.now();
        const result = await fn();
        const duration = performance.now() - startTime;
        return { result, duration };
    }
    /**
     * Get path to test fixtures directory
     */
    static getFixturesPath() {
        // Adjust path based on actual test location
        return join(__dirname, '../../../../../../test/fixtures/skills');
    }
    /**
     * Load test fixture file
     */
    static getFixturePath(category, filename) {
        return join(this.getFixturesPath(), category, filename);
    }
}
/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
    /**
     * Benchmark a function execution
     */
    static async benchmark(name, fn, iterations = 1000) {
        const times = [];
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            const end = performance.now();
            times.push(end - start);
        }
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        const total = times.reduce((a, b) => a + b, 0);
        return { average, min, max, total };
    }
    /**
     * Assert performance benchmark meets threshold
     */
    static assertPerformance(actualMs, thresholdMs, operation) {
        if (actualMs > thresholdMs) {
            throw new Error(`Performance threshold exceeded for ${operation}: ${actualMs.toFixed(2)}ms > ${thresholdMs}ms`);
        }
    }
}
/**
 * Mock file system watcher for testing
 */
export class MockFileWatcher {
    constructor() {
        this.listeners = new Map();
    }
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    emit(event, ...args) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(...args));
    }
    removeAllListeners() {
        this.listeners.clear();
    }
}
/**
 * Mock storage service for testing
 */
export class MockStorageService {
    constructor() {
        this.storage = new Map();
    }
    async get(key) {
        return this.storage.get(key);
    }
    async set(key, value) {
        this.storage.set(key, value);
    }
    async remove(key) {
        this.storage.delete(key);
    }
    clear() {
        this.storage.clear();
    }
}
/**
 * Mock network service for testing marketplace
 */
export class MockNetworkService {
    constructor() {
        this.responses = new Map();
        this.delays = new Map();
        this.failures = new Set();
    }
    setResponse(url, response) {
        this.responses.set(url, response);
    }
    setDelay(url, delayMs) {
        this.delays.set(url, delayMs);
    }
    setFailure(url) {
        this.failures.add(url);
    }
    async fetch(url) {
        // Simulate network delay
        const delay = this.delays.get(url) || 0;
        if (delay > 0) {
            await SkillTestUtils.wait(delay);
        }
        // Simulate failure
        if (this.failures.has(url)) {
            throw new Error(`Network error: Failed to fetch ${url}`);
        }
        // Return mock response
        const response = this.responses.get(url);
        if (!response) {
            throw new Error(`No mock response configured for ${url}`);
        }
        return response;
    }
    clear() {
        this.responses.clear();
        this.delays.clear();
        this.failures.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL3Rlc3QvYnJvd3Nlci90ZXN0VXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7O0dBS0c7QUFFSCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBd0I1Qjs7R0FFRztBQUNILE1BQU0sT0FBTyxjQUFjO0lBRTFCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUEyQjtRQUNqRCxPQUFPO1lBQ04sSUFBSSxFQUFFLFlBQVk7WUFDbEIsV0FBVyxFQUFFLHdCQUF3QjtZQUNyQyxPQUFPLEVBQUUsT0FBTztZQUNoQixNQUFNLEVBQUUseUJBQXlCO1lBQ2pDLE9BQU8sRUFBRSwrQ0FBK0M7WUFDeEQsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztZQUN0QixZQUFZLEVBQUUsRUFBRTtZQUNoQixHQUFHLFNBQVM7U0FDWixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQWEsRUFBRSxhQUErQjtRQUNyRSxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7UUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztnQkFDaEMsSUFBSSxFQUFFLGNBQWMs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