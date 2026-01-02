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

// Mock interfaces
export interface ISkill {
	name: string;
	description: string;
	version: string;
	author?: string;
	tags?: string[];
	dependencies?: string[];
	content: string;
}

export interface ISkillRegistry {
	add(skill: ISkill): void;
	remove(name: string): boolean;
	get(name: string): ISkill | undefined;
	has(name: string): boolean;
	list(): ISkill[];
	findByTag(tag: string): ISkill[];
	clear(): void;
	count(): number;
}

/**
 * Utility class for creating mock skills and test data
 */
export class SkillTestUtils {

	/**
	 * Create a mock skill with optional overrides
	 */
	static createMockSkill(overrides?: Partial<ISkill>): ISkill {
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
	static createMockSkills(count: number, baseOverrides?: Partial<ISkill>): ISkill[] {
		const skills: ISkill[] = [];
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
	static createMockSkillWithDeps(name: string, deps: string[]): ISkill {
		return this.createMockSkill({
			name,
			dependencies: deps
		});
	}

	/**
	 * Create a mock registry populated with skills
	 */
	static createMockRegistry(skills: ISkill[]): any {
		const registry = new Map<string, ISkill>();
		skills.forEach(skill => registry.set(skill.name, skill));

		return {
			skills: registry,
			add(skill: ISkill) { this.skills.set(skill.name, skill); },
			get(name: string) { return this.skills.get(name); },
			has(name: string) { return this.skills.has(name); },
			remove(name: string) { return this.skills.delete(name); },
			list() { return Array.from(this.skills.values()); },
			count() { return this.skills.size; },
			clear() { this.skills.clear(); }
		};
	}

	/**
	 * Create a temporary skill file for testing
	 */
	static async createTempSkillFile(
		name: string,
		metadata: Partial<ISkill>,
		content: string = '# Test Content'
	): Promise<string> {
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
	static async cleanupTempFiles(): Promise<void> {
		const tempDir = join(tmpdir(), 'ainative-skills-test');
		try {
			await rm(tempDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore errors during cleanup
		}
	}

	/**
	 * Generate skill content of specified size (for performance testing)
	 */
	static generateLargeSkillContent(sizeKB: number): string {
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
	static mockMarketplaceResponse(skills: ISkill[]): any {
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
	static async wait(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Assert that a promise rejects with specific error
	 */
	static async assertRejects(
		promise: Promise<any>,
		errorPattern: RegExp | string,
		message?: string
	): Promise<void> {
		try {
			await promise;
			throw new Error(message || 'Expected promise to reject');
		} catch (error: any) {
			const errorMessage = error.message || String(error);
			if (errorPattern instanceof RegExp) {
				if (!errorPattern.test(errorMessage)) {
					throw new Error(`Error message "${errorMessage}" does not match pattern ${errorPattern}`);
				}
			} else {
				if (!errorMessage.includes(errorPattern)) {
					throw new Error(`Error message "${errorMessage}" does not include "${errorPattern}"`);
				}
			}
		}
	}

	/**
	 * Measure execution time of a function
	 */
	static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
		const startTime = performance.now();
		const result = await fn();
		const duration = performance.now() - startTime;
		return { result, duration };
	}

	/**
	 * Get path to test fixtures directory
	 */
	static getFixturesPath(): string {
		// Adjust path based on actual test location
		return join(__dirname, '../../../../../../test/fixtures/skills');
	}

	/**
	 * Load test fixture file
	 */
	static getFixturePath(category: 'valid' | 'invalid' | 'edge-cases' | 'mock-marketplace', filename: string): string {
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
	static async benchmark(
		name: string,
		fn: () => Promise<void> | void,
		iterations: number = 1000
	): Promise<{ average: number; min: number; max: number; total: number }> {
		const times: number[] = [];

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
	static assertPerformance(
		actualMs: number,
		thresholdMs: number,
		operation: string
	): void {
		if (actualMs > thresholdMs) {
			throw new Error(
				`Performance threshold exceeded for ${operation}: ${actualMs.toFixed(2)}ms > ${thresholdMs}ms`
			);
		}
	}
}

/**
 * Mock file system watcher for testing
 */
export class MockFileWatcher {
	private listeners: Map<string, Function[]> = new Map();

	on(event: 'add' | 'change' | 'unlink', callback: Function): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)!.push(callback);
	}

	emit(event: 'add' | 'change' | 'unlink', ...args: any[]): void {
		const callbacks = this.listeners.get(event) || [];
		callbacks.forEach(cb => cb(...args));
	}

	removeAllListeners(): void {
		this.listeners.clear();
	}
}

/**
 * Mock storage service for testing
 */
export class MockStorageService {
	private storage: Map<string, any> = new Map();

	async get(key: string): Promise<any> {
		return this.storage.get(key);
	}

	async set(key: string, value: any): Promise<void> {
		this.storage.set(key, value);
	}

	async remove(key: string): Promise<void> {
		this.storage.delete(key);
	}

	clear(): void {
		this.storage.clear();
	}
}

/**
 * Mock network service for testing marketplace
 */
export class MockNetworkService {
	private responses: Map<string, any> = new Map();
	private delays: Map<string, number> = new Map();
	private failures: Set<string> = new Set();

	setResponse(url: string, response: any): void {
		this.responses.set(url, response);
	}

	setDelay(url: string, delayMs: number): void {
		this.delays.set(url, delayMs);
	}

	setFailure(url: string): void {
		this.failures.add(url);
	}

	async fetch(url: string): Promise<any> {
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

	clear(): void {
		this.responses.clear();
		this.delays.clear();
		this.failures.clear();
	}
}
