/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';

interface ThresholdSliderProps {
	value: number; // 0.1 to 0.5 (10% to 50%)
	onChange: (value: number) => void;
	disabled?: boolean;
	className?: string;
}

export const ManagedAPIThresholdSlider: React.FC<ThresholdSliderProps> = ({
	value,
	onChange,
	disabled = false,
	className = ''
}) => {
	const min = 0.1;
	const max = 0.5;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseFloat(e.target.value);
		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			onChange(newValue);
		}
	};

	const percentage = ((value - min) / (max - min)) * 100;
	const displayPercentage = Math.round(value * 100);

	return (
		<div className={`ainative-flex ainative-flex-col ainative-gap-2 ${className}`}>
			<div className="ainative-flex ainative-items-center ainative-justify-between ainative-text-xs ainative-text-ainative-fg-3">
				<span>Quota Warning Threshold</span>
				<span className="ainative-font-mono ainative-font-medium ainative-text-ainative-fg-1">{displayPercentage}%</span>
			</div>

			<div className="ainative-relative ainative-w-full">
				<input
					type="range"
					min={min}
					max={max}
					step={0.05}
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
							: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${percentage}%, var(--ainative-bg-2) ${percentage}%, var(--ainative-bg-2) 100%)`
					}}
				/>
			</div>

			<div className="ainative-flex ainative-justify-between ainative-text-xs ainative-text-ainative-fg-3">
				<span>10%</span>
				<span>Show warning when usage exceeds threshold</span>
				<span>50%</span>
			</div>

			<style>{`
				input[type="range"].ainative-threshold-slider::-webkit-slider-thumb {
					-webkit-appearance: none;
					appearance: none;
					width: 16px;
					height: 16px;
					border-radius: 50%;
					background: #f59e0b;
					cursor: pointer;
					border: 2px solid white;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
				}

				input[type="range"].ainative-threshold-slider::-moz-range-thumb {
					width: 16px;
					height: 16px;
					border-radius: 50%;
					background: #f59e0b;
					cursor: pointer;
					border: 2px solid white;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
				}

				input[type="range"].ainative-threshold-slider:disabled::-webkit-slider-thumb {
					background: #888;
					cursor: not-allowed;
				}

				input[type="range"].ainative-threshold-slider:disabled::-moz-range-thumb {
					background: #888;
					cursor: not-allowed;
				}

				input[type="range"].ainative-threshold-slider:focus {
					outline: none;
				}

				input[type="range"].ainative-threshold-slider:focus::-webkit-slider-thumb {
					box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
				}

				input[type="range"].ainative-threshold-slider:focus::-moz-range-thumb {
					box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
				}
			`}</style>
		</div>
	);
};
