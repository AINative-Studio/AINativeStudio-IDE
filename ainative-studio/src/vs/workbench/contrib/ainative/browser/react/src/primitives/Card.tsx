/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	/** Accent border + accent-bg tint, used for the selected/configured/current state. */
	selected?: boolean;
	/** Interactive card (onboarding path cards, MCP add-server card) - adds hover affordance. */
	interactive?: boolean;
}

/** 10-12px radius card, per the redesign token spec. */
export const Card: React.FC<CardProps> = ({ selected, interactive, className = '', children, ...rest }) => {
	return (
		<div
			className={`rounded-xl border p-4 transition-colors
				${selected ? 'border-ainative-accent bg-ainative-accent-bg' : 'border-ainative-border-1 bg-ainative-bg-2'}
				${interactive ? 'cursor-pointer hover:bg-ainative-bg-3' : ''}
				${className}`}
			{...rest}
		>
			{children}
		</div>
	);
};
