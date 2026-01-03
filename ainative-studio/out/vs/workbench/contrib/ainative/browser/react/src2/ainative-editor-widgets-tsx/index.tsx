/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { mountFnGenerator } from '../util/mountFnGenerator.js';
import { VoidCommandBarMain } from './AINativeCommandBar.js';
import { VoidSelectionHelperMain } from './AINativeSelectionHelper.js';

export const mountAINativeCommandBar = mountFnGenerator(VoidCommandBarMain);

export const mountAINativeSelectionHelper = mountFnGenerator(VoidSelectionHelperMain);