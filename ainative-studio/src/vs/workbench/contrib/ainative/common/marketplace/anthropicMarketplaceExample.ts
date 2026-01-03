/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Example Usage: Anthropic Marketplace Integration
 *
 * This file demonstrates how to use the AnthropicMarketplace service
 * to fetch and install skills from the anthropics/skills GitHub repository.
 */

import { IAnthropicMarketplace } from './anthropicMarketplaceTypes.js';

/**
 * Example 1: Fetch all available skills from Anthropic
 */
export async function exampleFetchAllSkills(marketplace: IAnthropicMarketplace): Promise<void> {
	console.log('Fetching all skills from Anthropic marketplace...');
	const skills = await marketplace.fetchSkills();
	console.log(`Found ${skills.length} skills:`);
	skills.forEach(skill => {
		console.log(`  - ${skill.name}: ${skill.description}`);
		console.log(`    Author: ${skill.author}, Version: ${skill.version}`);
		console.log(`    Tags: ${skill.keywords.join(', ')}`);
		console.log(`    URL: ${skill.homepage}`);
	});
}

/**
 * Example 2: Search for MCP-related skills
 */
export async function exampleSearchSkills(marketplace: IAnthropicMarketplace): Promise<void> {
	console.log('Searching for MCP-related skills...');
	const results = await marketplace.search('mcp');
	console.log(`Found ${results.length} matching skills:`);
	results.forEach(skill => {
		console.log(`  - ${skill.name}: ${skill.description}`);
	});
}

/**
 * Example 3: Install a skill
 */
export async function exampleInstallSkill(marketplace: IAnthropicMarketplace): Promise<void> {
	const skillName = 'mcp-builder';
	console.log(`Installing skill: ${skillName}`);
	try {
		await marketplace.install(skillName);
		console.log(`Successfully installed ${skillName}`);
	} catch (error) {
		console.error(`Failed to install ${skillName}:`, error);
	}
}

/**
 * Example 4: Get skill directories
 */
export async function exampleGetDirectories(marketplace: IAnthropicMarketplace): Promise<void> {
	console.log('Fetching skill directories from GitHub...');
	const directories = await marketplace.getSkillDirectories();
	console.log(`Found ${directories.length} skill directories:`);
	directories.forEach(dir => console.log(`  - ${dir}`));
}

/**
 * Example GitHub API Response Examples
 */
export const EXAMPLE_GITHUB_RESPONSES = {
	directoryListing: [
		{
			name: 'mcp-builder',
			path: 'skills/mcp-builder',
			type: 'dir',
			url: 'https://api.github.com/repos/anthropics/skills/contents/skills/mcp-builder'
		}
	],
	skillMdFile: {
		name: 'SKILL.md',
		content: Buffer.from(`---
name: mcp-builder
description: Build and test Model Context Protocol (MCP) servers
version: 1.0.0
author: Anthropic
tags: [mcp, tools, development]
---

## MCP Builder

This skill helps you build and test MCP servers...
`).toString('base64'),
		encoding: 'base64'
	}
};
