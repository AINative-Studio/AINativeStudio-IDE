/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { Skill, SkillPreferences } from './skillTypes.js';
import { SkillRegistry } from './skillRegistry.js';
import { parseSkillFile } from './skillParser.js';
import { SKILLS_PREFERENCES_KEY } from './storageKeys.js';

export const ISkillsManagerService = createDecorator<ISkillsManagerService>('skillsManagerService');

/**
 * Service interface for managing skills
 */
export interface ISkillsManagerService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when skills change
	 */
	readonly onDidChangeSkills: Event<void>;

	/**
	 * Load a skill from a file
	 */
	loadSkillFromFile(uri: URI): Promise<void>;

	/**
	 * Get skill by name
	 */
	getSkillByName(name: string): Skill | undefined;

	/**
	 * Get skills by tag
	 */
	getSkillsByTag(tag: string): Skill[];

	/**
	 * Get skills with dependencies resolved
	 */
	getSkillsWithDependencies(skillName: string): Skill[];

	/**
	 * Get all skills
	 */
	getAllSkills(): Skill[];

	/**
	 * Check if skill exists
	 */
	hasSkill(name: string): boolean;

	/**
	 * Get skill count
	 */
	getSkillCount(): number;

	/**
	 * Remove a skill
	 */
	removeSkill(name: string): void;

	/**
	 * Get user preferences
	 */
	getPreferences(): SkillPreferences;

	/**
	 * Mark skill as installed
	 */
	markSkillAsInstalled(name: string): void;

	/**
	 * Increment skill usage count
	 */
	incrementSkillUsage(name: string): void;

	/**
	 * Disable a skill
	 */
	disableSkill(name: string): void;

	/**
	 * Enable a skill
	 */
	enableSkill(name: string): void;
}

/**
 * Skills Manager Service implementation
 */
export class SkillsManagerService extends Disposable implements ISkillsManagerService {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeSkills = this._register(new Emitter<void>());
	readonly onDidChangeSkills = this._onDidChangeSkills.event;

	private readonly registry: SkillRegistry;
	private preferences: SkillPreferences;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IFileService private readonly fileService: IFileService
	) {
		super();

		this.registry = new SkillRegistry();
		this.preferences = this.loadPreferences();
	}

	/**
	 * Load preferences from storage
	 */
	private loadPreferences(): SkillPreferences {
		const stored = this.storageService.get(SKILLS_PREFERENCES_KEY, StorageScope.PROFILE);

		if (stored) {
			try {
				return JSON.parse(stored);
			} catch (error) {
				// Invalid JSON, return defaults
			}
		}

		return {
			installedSkills: [],
			usageStats: {},
			disabledSkills: [],
			lastUpdated: Date.now()
		};
	}

	/**
	 * Save preferences to storage
	 */
	private savePreferences(): void {
		this.preferences.lastUpdated = Date.now();
		this.storageService.store(
			SKILLS_PREFERENCES_KEY,
			JSON.stringify(this.preferences),
			StorageScope.PROFILE,
			StorageTarget.USER
		);
	}

	/**
	 * Load a skill from a file
	 */
	async loadSkillFromFile(uri: URI): Promise<void> {
		try {
			// Check if file exists
			const exists = await this.fileService.exists(uri);
			if (!exists) {
				return;
			}

			// Read file content
			const fileContent = await this.fileService.readFile(uri);
			const content = fileContent.value.toString();

			// Get file stats for lastModified
			const stat = await this.fileService.stat(uri);
			const lastModified = stat.mtime;

			// Parse skill
			const parseResult = parseSkillFile(content, uri.toString(), lastModified);

			if (parseResult.success && parseResult.skill) {
				// Register skill
				this.registry.registerSkill(parseResult.skill);
				this._onDidChangeSkills.fire();
			}
		} catch (error) {
			// Silently fail - malformed or inaccessible skills won't crash the service
			console.error(`Failed to load skill from ${uri.toString()}:`, error);
		}
	}

	/**
	 * Get skill by name
	 */
	getSkillByName(name: string): Skill | undefined {
		return this.registry.getSkillByName(name);
	}

	/**
	 * Get skills by tag
	 */
	getSkillsByTag(tag: string): Skill[] {
		return this.registry.getSkillsByTag(tag);
	}

	/**
	 * Get skills with dependencies resolved
	 */
	getSkillsWithDependencies(skillName: string): Skill[] {
		return this.registry.getSkillsWithDependencies(skillName);
	}

	/**
	 * Get all skills
	 */
	getAllSkills(): Skill[] {
		return this.registry.getAllSkills();
	}

	/**
	 * Check if skill exists
	 */
	hasSkill(name: string): boolean {
		return this.registry.hasSkill(name);
	}

	/**
	 * Get skill count
	 */
	getSkillCount(): number {
		return this.registry.getSkillCount();
	}

	/**
	 * Remove a skill
	 */
	removeSkill(name: string): void {
		this.registry.unregisterSkill(name);

		// Remove from installed list
		const index = this.preferences.installedSkills.indexOf(name);
		if (index !== -1) {
			this.preferences.installedSkills.splice(index, 1);
			this.savePreferences();
		}

		this._onDidChangeSkills.fire();
	}

	/**
	 * Get user preferences
	 */
	getPreferences(): SkillPreferences {
		return { ...this.preferences };
	}

	/**
	 * Mark skill as installed
	 */
	markSkillAsInstalled(name: string): void {
		if (!this.preferences.installedSkills.includes(name)) {
			this.preferences.installedSkills.push(name);
			this.savePreferences();
		}
	}

	/**
	 * Increment skill usage count
	 */
	incrementSkillUsage(name: string): void {
		if (!this.preferences.usageStats[name]) {
			this.preferences.usageStats[name] = 0;
		}
		this.preferences.usageStats[name]++;
		this.savePreferences();
	}

	/**
	 * Disable a skill
	 */
	disableSkill(name: string): void {
		if (!this.preferences.disabledSkills.includes(name)) {
			this.preferences.disabledSkills.push(name);
			this.savePreferences();
		}
	}

	/**
	 * Enable a skill
	 */
	enableSkill(name: string): void {
		const index = this.preferences.disabledSkills.indexOf(name);
		if (index !== -1) {
			this.preferences.disabledSkills.splice(index, 1);
			this.savePreferences();
		}
	}
}

// Register the service
registerSingleton(ISkillsManagerService, SkillsManagerService, InstantiationType.Delayed);
