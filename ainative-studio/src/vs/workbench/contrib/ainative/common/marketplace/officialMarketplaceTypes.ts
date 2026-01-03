/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IMarketplace } from './marketplaceTypes.js';

export const IOfficialMarketplace = createDecorator<IOfficialMarketplace>('officialMarketplace');

/**
 * Official Marketplace Service
 * Provides access to @ainative/skill-* packages from NPM registry
 */
export interface IOfficialMarketplace extends IMarketplace {
	readonly _serviceBrand: undefined;

	/**
	 * Update an installed skill to the latest version
	 * @param skillName - Name of the skill (e.g., zerodb-workflows)
	 * @throws Error if skill is not installed or update fails
	 */
	update(skillName: string): Promise<void>;

	/**
	 * Get the cache status
	 * @returns Cache info including age and validity
	 */
	getCacheStatus(): Promise<{ valid: boolean; age: number; lastUpdate: Date | null }>;
}
