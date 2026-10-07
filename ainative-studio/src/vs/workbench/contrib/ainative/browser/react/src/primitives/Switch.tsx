/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

interface SwitchProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	label?: string;
	className?: string;
}

/** 10px-radius toggle switch, per the redesign token spec (radius: Switch 10px). */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, label, className = '' }) => {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={`relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-[10px] transition-colors
				${checked ? 'bg-ainative-accent-solid' : 'bg-ainative-bg-sunken border border-ainative-border-2'}
				${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
				focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ainative-accent
				${className}`}
		>
			<span
				className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform
					${checked ? 'translate-x-[14px]' : 'translate-x-[2px]'}`}
			/>
		</button>
	);
};
