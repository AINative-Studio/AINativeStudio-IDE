/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

interface IterationSliderProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	disabled?: boolean;
	className?: string;
}

export const ManagedAPIIterationSlider: React.FC<IterationSliderProps> = ({
	value,
	onChange,
	min = 1,
	max = 10,
	disabled = false,
	className = ''
}) => {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(e.target.value, 10);
		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			onChange(newValue);
		}
	};

	const percentage = ((value - min) / (max - min)) * 100;

	return (
		<div className={`ainative-flex ainative-flex-col ainative-gap-2 ${className}`}>
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-text-xs ainative-text-ainative-fg-3">
				<span>Max Tool Iterations</span>
				<span className="ainative-font-mono ainative-font-medium ainative-text-ainative-fg-1">{value}</span>
			</div>

			<div className="ainative-relative ainative-w-full">
				<input
					type="range"
					min={min}
					max={max}
					value={value}
					onChange={handleChange}
					disabled={disabled}
					className={`
						ainative-w-full ainative-h-2 ainative-rounded-full ainative-appearance-none
						ainative-bg-ainative-bg-2
						${disabled ? 'ainative-opacity-50 ainative-cursor-not-allowed' : 'ainative-cursor-pointer'}
					`}
					style={{
						background: disabled
							? undefined
							: `linear-gradient(to right, #0e70c0 0%, #0e70c0 ${percentage}%, var(--ainative-bg-2) ${percentage}%, var(--ainative-bg-2) 100%)`
					}}
				/>
			</div>

			<div className="ainative-flex ainative-justify-between ainative-text-xs ainative-text-ainative-fg-3">
				<span>{min}</span>
				<span>iterations</span>
				<span>{max}</span>
			</div>

			<style>{`
				input[type="range"]::-webkit-slider-thumb {
					-webkit-appearance: none;
					appearance: none;
					width: 16px;
					height: 16px;
					border-radius: 50%;
					background: #0e70c0;
					cursor: pointer;
					border: 2px solid white;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
				}

				input[type="range"]::-moz-range-thumb {
					width: 16px;
					height: 16px;
					border-radius: 50%;
					background: #0e70c0;
					cursor: pointer;
					border: 2px solid white;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
				}

				input[type="range"]:disabled::-webkit-slider-thumb {
					background: #888;
					cursor: not-allowed;
				}

				input[type="range"]:disabled::-moz-range-thumb {
					background: #888;
					cursor: not-allowed;
				}

				input[type="range"]:focus {
					outline: none;
				}

				input[type="range"]:focus::-webkit-slider-thumb {
					box-shadow: 0 0 0 3px rgba(14, 112, 192, 0.2);
				}

				input[type="range"]:focus::-moz-range-thumb {
					box-shadow: 0 0 0 3px rgba(14, 112, 192, 0.2);
				}
			`}</style>
		</div>
	);
};
