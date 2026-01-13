/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { ServicesAccessor } from '../../../../../../../editor/browser/editorExtensions.js';

export interface MountResult {
	dispose: () => void;
}

export function mountAINativeSettings(container: HTMLElement, accessor: ServicesAccessor): MountResult | undefined;
