/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton, InstantiationType } from '../../../../../platform/instantiation/common/extensions.js';
import { ISkillConfigService } from './skillConfigServiceTypes.js';
import { SkillConfigService } from './skillConfigService.js';

/**
 * Register skill configuration service as a singleton
 */
registerSingleton(
	ISkillConfigService,
	SkillConfigService,
	InstantiationType.Delayed
);
