/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Pure formatting step of steering-doc loading (#161): given the already-read {name, content}
 * pairs of every .md file found under a workspace's .ainative/steering/ directory, produce the
 * sorted, concatenated section text to append to the agent's standing instructions. Kept out of
 * convertToLLMMessageService.ts (which does the actual async directory/file I/O against 9
 * injected services, including terminalToolService - whose import chain pulls in DOM-dependent
 * browser modules, making that file impossible to load under the plain-Node test-node harness)
 * so the one piece of real logic here - stable alphabetical ordering, skipping blank files, the
 * "### filename" section format - has real, fast unit test coverage.
 */
export const formatSteeringFileSections = (files: ReadonlyArray<{ name: string; content: string }>): string => {
	return files
		.map(f => ({ name: f.name, content: f.content.trim() }))
		.filter(f => f.content.length > 0)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(f => `### ${f.name}\n${f.content}`)
		.join('\n\n')
		.trim();
}
