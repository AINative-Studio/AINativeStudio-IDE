/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg text-root font-medium leading-none transition-colors px-3.5 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ainative-accent disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<ButtonVariant, string> = {
	primary: 'bg-ainative-accent-solid hover:bg-ainative-accent-solid-hover text-white',
	outline: 'bg-transparent border border-ainative-border-2 text-ainative-fg-1 hover:bg-ainative-bg-3',
	ghost: 'bg-transparent text-ainative-fg-1 hover:text-ainative-fg-0 hover:bg-ainative-bg-3',
};

/**
 * Primary / outline / ghost button, per the redesign (docs/design/handoff). None of the
 * three variants outranks another visually unless `variant='primary'` is explicit - several
 * screens (onboarding step 2's three provider cards) intentionally use only outline buttons
 * so no path looks preferred.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'outline', className = '', ...rest }, ref) => {
	return (
		<button
			ref={ref}
			className={`${base} ${variantClasses[variant]} ${className}`}
			{...rest}
		/>
	);
});
Button.displayName = 'Button';
