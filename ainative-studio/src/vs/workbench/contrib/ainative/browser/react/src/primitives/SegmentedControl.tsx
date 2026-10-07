/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

export interface SegmentedControlOption<T extends string> {
	value: T;
	label: string;
}

interface SegmentedControlProps<T extends string> {
	options: readonly SegmentedControlOption<T>[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
}

/**
 * Segmented control on the sunken track, per the redesign (e.g. Agent / Gather / Normal
 * above the chat, Vibe/IDE switch in the command center).
 */
export function SegmentedControl<T extends string>({ options, value, onChange, className = '' }: SegmentedControlProps<T>) {
	return (
		<div className={`inline-flex items-center gap-0.5 rounded-lg bg-ainative-bg-sunken p-0.5 ${className}`}>
			{options.map(opt => (
				<button
					key={opt.value}
					type="button"
					aria-pressed={opt.value === value}
					onClick={() => onChange(opt.value)}
					className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors
						focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ainative-accent
						${opt.value === value
							? 'bg-ainative-bg-1 text-ainative-fg-0 shadow-sm'
							: 'text-ainative-fg-2 hover:text-ainative-fg-1'}`}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}
