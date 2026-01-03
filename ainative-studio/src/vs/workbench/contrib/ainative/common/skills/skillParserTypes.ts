/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { Skill } from './skillTypes.js';

export const ISkillParser = createDecorator<ISkillParser>('skillParser');

/**
 * Service for parsing SKILL.md files following the Agent Skills specification
 */
export interface ISkillParser {
	readonly _serviceBrand: undefined;

	/**
	 * Parse a SKILL.md file and extract metadata, body, and resources
	 * @param filePath Absolute path to SKILL.md file
	 * @returns Parsed skill object
	 * @throws SkillParseError if file is invalid or missing required fields
	 */
	parseSkillFile(filePath: string): Promise<Skill>;

	/**
	 * Validate that a file follows the SKILL.md format
	 * @param filePath Absolute path to file
	 * @returns True if file is valid SKILL.md format
	 */
	validateSkillFormat(filePath: string): Promise<boolean>;
}
