/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IMarketplace } from './marketplaceTypes.js';

export const IAnthropicMarketplace = createDecorator<IAnthropicMarketplace>('anthropicMarketplace');

/**
 * Anthropic Marketplace Service
 * Provides access to skills from the Anthropic GitHub repository
 */
export interface IAnthropicMarketplace extends IMarketplace {
	readonly _serviceBrand: undefined;

	/**
	 * Get the cache status
	 * @returns Cache info including age and validity
	 */
	getCacheStatus(): Promise<{ valid: boolean; age: number; lastUpdate: Date | null }>;
}
