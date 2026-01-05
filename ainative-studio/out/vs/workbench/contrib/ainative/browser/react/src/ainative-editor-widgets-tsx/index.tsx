/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { mountFnGenerator } from '../util/mountFnGenerator.js'
import { AINativeCommandBarMain } from './AINativeCommandBar.js'
import { AINativeSelectionHelperMain } from './AINativeSelectionHelper.js'

export const mountAINativeCommandBar = mountFnGenerator(AINativeCommandBarMain)

export const mountAINativeSelectionHelper = mountFnGenerator(AINativeSelectionHelperMain)

