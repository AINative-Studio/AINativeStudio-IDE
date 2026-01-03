/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../../base/common/uri.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ISkillParser } from './skillParserTypes.js';
import { Skill, SkillMetadata, SkillResource, SkillParseError } from './skillTypes.js';
import * as path from '../../../../../base/common/path.js';

/**
 * Service for parsing SKILL.md files following the Agent Skills specification
 */
export class SkillParser extends Disposable implements ISkillParser {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IFileService private readonly fileService: IFileService
	) {
		super();
	}

	/**
	 * Parse a SKILL.md file and extract metadata, body, and resources
	 */
	async parseSkillFile(filePath: string): Promise<Skill> {
		const uri = URI.file(filePath);

		// Read file contents
		let content: string;
		try {
			const fileContent = await this.fileService.readFile(uri);
			content = fileContent.value.toString();
		} catch (error) {
			throw new SkillParseError(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`, filePath);
		}

		// Extract frontmatter and body
		const { metadata, body } = this.extractFrontmatter(content, filePath);

		// Validate required fields
		this.validateMetadata(metadata, filePath);

		// Discover resources in the skill directory
		const skillDir = path.dirname(filePath);
		const resources = await this.discoverResources(skillDir);

		return {
			metadata,
			body,
			resources,
			fullPath: filePath
		};
	}

	/**
	 * Validate that a file follows the SKILL.md format
	 */
	async validateSkillFormat(filePath: string): Promise<boolean> {
		try {
			await this.parseSkillFile(filePath);
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Extract YAML frontmatter from file content
	 */
	private extractFrontmatter(content: string, filePath: string): { metadata: SkillMetadata; body: string } {
		// Check for frontmatter delimiters
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			throw new SkillParseError('Invalid SKILL.md format: missing YAML frontmatter delimiters (---)', filePath);
		}

		const frontmatterText = match[1];
		const body = match[2];

		// Parse YAML frontmatter manually (simple key: value format)
		const metadata: Partial<SkillMetadata> = {};

		try {
			const lines = frontmatterText.split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) {
					continue; // Skip empty lines and comments
				}

				const colonIndex = trimmed.indexOf(':');
				if (colonIndex === -1) {
					continue; // Skip invalid lines
				}

				const key = trimmed.substring(0, colonIndex).trim();
				let value = trimmed.substring(colonIndex + 1).trim();

				// Remove quotes if present
				if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
					value = value.substring(1, value.length - 1);
				}

				// Handle array values (tags)
				if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
					const arrayContent = value.substring(1, value.length - 1);
					metadata.tags = arrayContent.split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
				} else {
					// Handle simple string values
					switch (key) {
						case 'name':
							metadata.name = value;
							break;
						case 'description':
							metadata.description = value;
							break;
						case 'version':
							metadata.version = value;
							break;
						case 'author':
							metadata.author = value;
							break;
						case 'license':
							metadata.license = value;
							break;
					}
				}
			}
		} catch (error) {
			throw new SkillParseError(`Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`, filePath);
		}

		return {
			metadata: metadata as SkillMetadata,
			body: body.trim()
		};
	}

	/**
	 * Discover bundled resources in skill directory
	 */
	private async discoverResources(skillDir: string): Promise<SkillResource[]> {
		const resources: SkillResource[] = [];
		const dirUri = URI.file(skillDir);

		try {
			const dirStat = await this.fileService.resolve(dirUri);
			if (!dirStat.children) {
				return resources;
			}

			// Check for references/, scripts/, and assets/ directories
			const resourceDirs = [
				{ name: 'references', type: 'reference' as const },
				{ name: 'scripts', type: 'script' as const },
				{ name: 'assets', type: 'asset' as const }
			];

			for (const resourceDir of resourceDirs) {
				const resourceDirChild = dirStat.children.find(child => child.name === resourceDir.name && child.isDirectory);
				if (resourceDirChild) {
					// Resolve the resource directory to get its children
					const resourceDirStat = await this.fileService.resolve(resourceDirChild.resource);
					if (resourceDirStat.children) {
						for (const file of resourceDirStat.children) {
							if (!file.isDirectory) {
								resources.push({
									type: resourceDir.type,
									path: file.resource.fsPath,
									name: file.name
								});
							}
						}
					}
				}
			}
		} catch (error) {
			// If directory doesn't exist or can't be read, just return empty resources
			// This is not a critical error
		}

		return resources;
	}

	/**
	 * Validate required metadata fields
	 */
	private validateMetadata(metadata: Partial<SkillMetadata>, filePath: string): void {
		if (!metadata.name || metadata.name.trim() === '') {
			throw new SkillParseError('Missing required field: name', filePath);
		}

		if (!metadata.description || metadata.description.trim() === '') {
			throw new SkillParseError('Missing required field: description', filePath);
		}
	}
}

// Register the service as a singleton
registerSingleton(ISkillParser, SkillParser, InstantiationType.Delayed);
