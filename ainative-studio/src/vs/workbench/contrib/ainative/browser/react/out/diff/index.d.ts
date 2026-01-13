/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

export interface DiffChange {
	value: string;
	added?: boolean;
	removed?: boolean;
	count?: number;
}

export function diffLines(oldStr: string, newStr: string): DiffChange[];
