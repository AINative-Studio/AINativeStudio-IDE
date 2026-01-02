/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Skill, ISkillRegistry } from './skillTypes.js';

/**
 * In-memory registry for managing skills
 */
export class SkillRegistry implements ISkillRegistry {
	private readonly skills = new Map<string, Skill>();
	private readonly tagIndex = new Map<string, Set<string>>();

	/**
	 * Register a skill in the registry
	 */
	registerSkill(skill: Skill): void {
		const name = skill.metadata.name;

		// Remove old skill if it exists
		if (this.skills.has(name)) {
			this.unregisterSkill(name);
		}

		// Store the skill
		this.skills.set(name, skill);

		// Index tags
		if (skill.metadata.tags) {
			for (const tag of skill.metadata.tags) {
				if (!this.tagIndex.has(tag)) {
					this.tagIndex.set(tag, new Set());
				}
				this.tagIndex.get(tag)!.add(name);
			}
		}
	}

	/**
	 * Unregister a skill from the registry
	 */
	unregisterSkill(name: string): void {
		const skill = this.skills.get(name);
		if (!skill) {
			return;
		}

		// Remove from tag index
		if (skill.metadata.tags) {
			for (const tag of skill.metadata.tags) {
				const tagSet = this.tagIndex.get(tag);
				if (tagSet) {
					tagSet.delete(name);
					if (tagSet.size === 0) {
						this.tagIndex.delete(tag);
					}
				}
			}
		}

		// Remove skill
		this.skills.delete(name);
	}

	/**
	 * Get skill by name
	 */
	getSkillByName(name: string): Skill | undefined {
		return this.skills.get(name);
	}

	/**
	 * Get all skills with a specific tag
	 */
	getSkillsByTag(tag: string): Skill[] {
		const skillNames = this.tagIndex.get(tag);
		if (!skillNames || skillNames.size === 0) {
			return [];
		}

		const skills: Skill[] = [];
		for (const name of skillNames) {
			const skill = this.skills.get(name);
			if (skill) {
				skills.push(skill);
			}
		}

		return skills;
	}

	/**
	 * Get skills with all dependencies resolved
	 * Returns array with dependencies first, then the skill itself
	 */
	getSkillsWithDependencies(skillName: string): Skill[] {
		const skill = this.skills.get(skillName);
		if (!skill) {
			return [];
		}

		const resolved: Skill[] = [];
		const visited = new Set<string>();

		const resolveDependencies = (currentSkill: Skill): void => {
			const currentName = currentSkill.metadata.name;

			// Prevent infinite loops (circular dependencies)
			if (visited.has(currentName)) {
				return;
			}
			visited.add(currentName);

			// Recursively resolve dependencies
			if (currentSkill.metadata.dependencies) {
				for (const depName of currentSkill.metadata.dependencies) {
					const depSkill = this.skills.get(depName);
					if (depSkill) {
						resolveDependencies(depSkill);
					}
				}
			}

			// Add this skill if not already in the result
			if (!resolved.some(s => s.metadata.name === currentName)) {
				resolved.push(currentSkill);
			}
		};

		resolveDependencies(skill);

		return resolved;
	}

	/**
	 * Get all registered skills
	 */
	getAllSkills(): Skill[] {
		return Array.from(this.skills.values());
	}

	/**
	 * Check if a skill exists
	 */
	hasSkill(name: string): boolean {
		return this.skills.has(name);
	}

	/**
	 * Get total skill count
	 */
	getSkillCount(): number {
		return this.skills.size;
	}

	/**
	 * Clear all skills
	 */
	clear(): void {
		this.skills.clear();
		this.tagIndex.clear();
	}
}
