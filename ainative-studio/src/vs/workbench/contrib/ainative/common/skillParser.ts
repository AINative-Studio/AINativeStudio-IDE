/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Skill, SkillMetadata, SkillParseResult } from './skillTypes.js';

/**
 * Result of frontmatter extraction
 */
interface FrontmatterExtractionResult {
	success: boolean;
	frontmatter?: string;
	content?: string;
	error?: string;
}

/**
 * Result of frontmatter parsing
 */
interface FrontmatterParseResult {
	success: boolean;
	metadata?: SkillMetadata;
	error?: string;
}

/**
 * Extract frontmatter from markdown content
 * Frontmatter is expected to be between --- delimiters at the start of the file
 */
export function extractFrontmatter(content: string): FrontmatterExtractionResult {
	if (!content || content.trim().length === 0) {
		return {
			success: false,
			error: 'Content is empty'
		};
	}

	const trimmed = content.trim();
	if (!trimmed.startsWith('---')) {
		return {
			success: false,
			error: 'No frontmatter found (must start with ---)'
		};
	}

	// Find the closing --- delimiter
	const lines = trimmed.split('\n');
	let closingIndex = -1;

	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === '---') {
			closingIndex = i;
			break;
		}
	}

	if (closingIndex === -1) {
		return {
			success: false,
			error: 'Frontmatter not closed (missing closing ---)'
		};
	}

	// Extract frontmatter (between the --- delimiters)
	const frontmatter = lines.slice(1, closingIndex).join('\n');

	// Extract content (after the closing ---)
	const contentLines = lines.slice(closingIndex + 1);
	const extractedContent = contentLines.join('\n');

	return {
		success: true,
		frontmatter,
		content: extractedContent
	};
}

/**
 * Simple YAML parser for skill frontmatter
 * Handles basic YAML syntax for our skill metadata needs
 */
export function parseFrontmatter(yamlContent: string): FrontmatterParseResult {
	try {
		const metadata: Partial<SkillMetadata> = {};
		const lines = yamlContent.split('\n');
		let currentKey: string | null = null;
		let currentArray: string[] = [];
		let inArray = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Skip empty lines and comments
			if (!trimmed || trimmed.startsWith('#')) {
				continue;
			}

			// Check if this is an array item
			if (trimmed.startsWith('- ')) {
				if (!inArray || !currentKey) {
					return {
						success: false,
						error: `Unexpected array item at line ${i + 1}`
					};
				}
				currentArray.push(trimmed.substring(2).trim());
				continue;
			}

			// If we were building an array, save it
			if (inArray && currentKey) {
				(metadata as any)[currentKey] = currentArray;
				currentArray = [];
				inArray = false;
				currentKey = null;
			}

			// Parse key-value pair
			const colonIndex = line.indexOf(':');
			if (colonIndex === -1) {
				continue; // Skip malformed lines
			}

			const key = line.substring(0, colonIndex).trim();
			const value = line.substring(colonIndex + 1).trim();

			if (!value || value === '[]') {
				// Empty value or empty array
				if (value === '[]') {
					(metadata as any)[key] = [];
				} else {
					// Might be starting an array
					inArray = true;
					currentKey = key;
					currentArray = [];
				}
			} else {
				// Simple key-value
				(metadata as any)[key] = value;
			}
		}

		// Save last array if we were building one
		if (inArray && currentKey) {
			(metadata as any)[currentKey] = currentArray;
		}

		// Validate required fields
		if (!metadata.name || typeof metadata.name !== 'string') {
			return {
				success: false,
				error: 'Required field "name" is missing or invalid'
			};
		}

		if (!metadata.description || typeof metadata.description !== 'string') {
			return {
				success: false,
				error: 'Required field "description" is missing or invalid'
			};
		}

		if (!metadata.location || typeof metadata.location !== 'string') {
			return {
				success: false,
				error: 'Required field "location" is missing or invalid'
			};
		}

		// Validate location value
		if (metadata.location !== 'managed' && metadata.location !== 'project') {
			return {
				success: false,
				error: 'Field "location" must be either "managed" or "project"'
			};
		}

		return {
			success: true,
			metadata: metadata as SkillMetadata
		};
	} catch (error) {
		return {
			success: false,
			error: `YAML parsing failed: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

/**
 * Parse a complete skill file
 */
export function parseSkillFile(
	content: string,
	filePath: string,
	lastModified: number
): SkillParseResult {
	// Extract frontmatter
	const extractionResult = extractFrontmatter(content);
	if (!extractionResult.success) {
		return {
			success: false,
			error: `Failed to extract frontmatter: ${extractionResult.error}`
		};
	}

	// Parse frontmatter
	const parseResult = parseFrontmatter(extractionResult.frontmatter!);
	if (!parseResult.success) {
		return {
			success: false,
			error: `Failed to parse frontmatter: ${parseResult.error}`
		};
	}

	// Create skill object
	const skill: Skill = {
		metadata: parseResult.metadata!,
		content,
		instructions: extractionResult.content || '',
		filePath,
		lastModified
	};

	return {
		success: true,
		skill
	};
}
