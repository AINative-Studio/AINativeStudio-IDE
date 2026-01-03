/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { ISkillsRegistry, RegistryEntry, RegistryFile, SkillSource } from './skillRegistryTypes.js';
import { ISkillParser } from './skillParserTypes.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { basename } from '../../../../../base/common/path.js';

/**
 * Skills Registry Service Implementation
 * Manages installation, uninstallation, and listing of skills
 * Persists registry to ~/.ainative/skills/registry.json
 */
class SkillsRegistry extends Disposable implements ISkillsRegistry {
	_serviceBrand: undefined;

	private readonly skillsDir: URI;
	private readonly registryFile: URI;
	private registryCache: Map<string, RegistryEntry> | null = null;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@ISkillParser private readonly skillParser: ISkillParser,
		@IEnvironmentService private readonly envService: IEnvironmentService
	) {
		super();

		// Set up paths: ~/.ainative/skills/
		const ainativeDir = joinPath(this.envService.userHome, '.ainative');
		this.skillsDir = joinPath(ainativeDir, 'skills');
		this.registryFile = joinPath(this.skillsDir, 'registry.json');
	}

	/**
	 * Install a skill from a local path
	 */
	async install(skillPath: string): Promise<void> {
		// 1. Parse skill to get metadata
		const skillUri = URI.file(skillPath);
		const skillFileUri = joinPath(skillUri, 'SKILL.md');

		const skill = await this.skillParser.parseSkillFile(skillFileUri.fsPath);

		// 2. Load registry and check for duplicates
		const registry = await this.loadRegistry();
		if (registry.has(skill.metadata.name)) {
			throw new Error(`Skill '${skill.metadata.name}' is already installed. Uninstall it first to reinstall.`);
		}

		// 3. Copy skill to ~/.ainative/skills/{skill-name}/
		const targetDir = joinPath(this.skillsDir, skill.metadata.name);

		// Ensure skills directory exists
		await this.ensureDirectoryExists(this.skillsDir);

		// Copy the entire skill directory
		await this.fileService.copy(skillUri, targetDir, true);

		// 4. Add entry to registry
		const entry: RegistryEntry = {
			name: skill.metadata.name,
			version: skill.metadata.version || '1.0.0',
			installedAt: Date.now(),
			source: 'local',
			path: targetDir.fsPath
		};

		registry.set(skill.metadata.name, entry);

		// 5. Persist registry
		await this.saveRegistry(registry);

		// Update cache
		this.registryCache = registry;
	}

	/**
	 * Uninstall a skill by name
	 */
	async uninstall(skillName: string): Promise<void> {
		// 1. Load registry and check if installed
		const registry = await this.loadRegistry();
		const entry = registry.get(skillName);

		if (!entry) {
			throw new Error(`Skill '${skillName}' is not installed.`);
		}

		// 2. Remove skill directory
		const skillDir = URI.file(entry.path);
		await this.fileService.del(skillDir, { recursive: true });

		// 3. Remove from registry
		registry.delete(skillName);

		// 4. Persist registry
		await this.saveRegistry(registry);

		// Update cache
		this.registryCache = registry;
	}

	/**
	 * List all installed skills
	 */
	async list(): Promise<RegistryEntry[]> {
		const registry = await this.loadRegistry();
		return Array.from(registry.values());
	}

	/**
	 * Get a specific skill by name
	 */
	async get(skillName: string): Promise<RegistryEntry | null> {
		const registry = await this.loadRegistry();
		return registry.get(skillName) || null;
	}

	/**
	 * Check if a skill is installed
	 */
	async isInstalled(skillName: string): Promise<boolean> {
		const registry = await this.loadRegistry();
		return registry.has(skillName);
	}

	/**
	 * Load registry from file or create if doesn't exist
	 */
	private async loadRegistry(): Promise<Map<string, RegistryEntry>> {
		// Return cache if available
		if (this.registryCache) {
			return new Map(this.registryCache);
		}

		try {
			// Check if registry file exists
			const stat = await this.fileService.resolve(this.registryFile);
			if (!stat) {
				return new Map();
			}

			// Read registry file
			const content = await this.fileService.readFile(this.registryFile);
			const registryData: RegistryFile = JSON.parse(content.value.toString());

			// Convert to Map
			const registry = new Map<string, RegistryEntry>();
			for (const [name, entry] of Object.entries(registryData)) {
				registry.set(name, entry);
			}

			// Cache the registry
			this.registryCache = registry;

			return new Map(registry);
		} catch (error) {
			// If file doesn't exist or is invalid, return empty registry
			return new Map();
		}
	}

	/**
	 * Save registry to file
	 */
	private async saveRegistry(registry: Map<string, RegistryEntry>): Promise<void> {
		// Ensure skills directory exists
		await this.ensureDirectoryExists(this.skillsDir);

		// Convert Map to plain object
		const registryData: RegistryFile = {};
		for (const [name, entry] of registry.entries()) {
			registryData[name] = entry;
		}

		// Write to file
		const content = JSON.stringify(registryData, null, 2);
		await this.fileService.writeFile(this.registryFile, VSBuffer.fromString(content));
	}

	/**
	 * Ensure a directory exists, create if it doesn't
	 */
	private async ensureDirectoryExists(uri: URI): Promise<void> {
		try {
			const stat = await this.fileService.resolve(uri);
			if (!stat) {
				await this.fileService.createFolder(uri);
			}
		} catch (error) {
			// Directory doesn't exist, create it
			await this.fileService.createFolder(uri);
		}
	}
}

// Register the service with dependency injection
registerSingleton(ISkillsRegistry, SkillsRegistry, InstantiationType.Delayed);
