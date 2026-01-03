/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IMarketplace } from './marketplaceTypes.js';

export const IAnthropicMarketplace = createDecorator<IAnthropicMarketplace>('anthropicMarketplace');

/**
 * GitHub API response for directory listing
 */
export interface GitHubDirectoryItem {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string | null;
	type: 'file' | 'dir';
	_links: {
		self: string;
		git: string;
		html: string;
	};
}

/**
 * GitHub API response for file content
 */
export interface GitHubFileContent {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: 'file';
	content: string; // Base64 encoded
	encoding: 'base64';
	_links: {
		self: string;
		git: string;
		html: string;
	};
}

/**
 * Anthropic Marketplace Service
 * Fetches and installs skills from anthropics/skills GitHub repository
 */
export interface IAnthropicMarketplace extends IMarketplace {
	readonly _serviceBrand: undefined;

	/**
	 * Get the list of skill directories from the GitHub repository
	 * @returns Array of skill directory names
	 */
	getSkillDirectories(): Promise<string[]>;

	/**
	 * Fetch SKILL.md metadata for a specific skill
	 * @param skillName - Name of the skill directory
	 * @returns Parsed skill metadata
	 */
	fetchSkillMetadata(skillName: string): Promise<any>;

	/**
	 * Download a skill as a ZIP archive from GitHub
	 * @param skillName - Name of the skill to download
	 * @param targetPath - Absolute path where skill should be extracted
	 */
	downloadSkill(skillName: string, targetPath: string): Promise<void>;
}
