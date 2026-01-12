/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ModelOption {
	id: string;
	name: string;
	description?: string;
	pricing?: string;
}

interface ModelSelectorProps {
	value: string;
	onChange: (modelId: string) => void;
	disabled?: boolean;
	className?: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
	{
		id: 'llama-3.3-70b-instruct',
		name: 'Llama 3.3 70B Instruct',
		description: 'Meta\'s powerful instruction-following model',
		pricing: 'Budget-friendly'
	},
	{
		id: 'gpt-4o',
		name: 'GPT-4o',
		description: 'OpenAI\'s flagship multimodal model',
		pricing: 'Premium'
	},
	{
		id: 'claude-3-5-sonnet',
		name: 'Claude 3.5 Sonnet',
		description: 'Anthropic\'s balanced model for coding',
		pricing: 'Mid-tier'
	},
	{
		id: 'gpt-4o-mini',
		name: 'GPT-4o Mini',
		description: 'Efficient and fast OpenAI model',
		pricing: 'Budget-friendly'
	},
	{
		id: 'claude-3-5-haiku',
		name: 'Claude 3.5 Haiku',
		description: 'Anthropic\'s fastest model',
		pricing: 'Budget-friendly'
	},
	{
		id: 'deepseek-chat',
		name: 'DeepSeek Chat',
		description: 'High-performance reasoning model',
		pricing: 'Budget-friendly'
	}
];

export const ManagedAPIModelSelector: React.FC<ModelSelectorProps> = ({
	value,
	onChange,
	disabled = false,
	className = ''
}) => {
	const [isOpen, setIsOpen] = useState(false);

	const selectedModel = AVAILABLE_MODELS.find(m => m.id === value) || AVAILABLE_MODELS[0];

	return (
		<div className={`ainative-relative ${className}`}>
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`
					ainative-w-full ainative-flex ainative-items-center ainative-justify-between
					ainative-px-3 ainative-py-2 ainative-rounded ainative-border
					ainative-bg-ainative-bg-1 ainative-border-ainative-border-1
					ainative-text-ainative-fg-1 ainative-text-sm
					${disabled ? 'ainative-opacity-50 ainative-cursor-not-allowed' : 'hover:ainative-bg-ainative-bg-2 ainative-cursor-pointer'}
					ainative-transition-colors
				`}
			>
				<span className="ainative-truncate">{selectedModel.name}</span>
				<ChevronDown className={`ainative-size-4 ainative-ml-2 ainative-transition-transform ${isOpen ? 'ainative-rotate-180' : ''}`} />
			</button>

			{isOpen && (
				<>
					<div
						className="ainative-fixed ainative-inset-0 ainative-z-10"
						onClick={() => setIsOpen(false)}
					/>
					<div className="ainative-absolute ainative-z-20 ainative-w-full ainative-mt-1 ainative-rounded ainative-border ainative-border-ainative-border-1 ainative-bg-ainative-bg-1 ainative-shadow-lg ainative-max-h-80 ainative-overflow-y-auto">
						{AVAILABLE_MODELS.map((model) => (
							<button
								key={model.id}
								type="button"
								onClick={() => {
									onChange(model.id);
									setIsOpen(false);
								}}
								className={`
									ainative-w-full ainative-px-3 ainative-py-2 ainative-text-left
									ainative-border-b ainative-border-ainative-border-1 last:ainative-border-b-0
									${model.id === value ? 'ainative-bg-ainative-bg-3' : 'hover:ainative-bg-ainative-bg-2'}
									ainative-transition-colors
								`}
							>
								<div className="ainative-flex ainative-flex-col ainative-gap-1">
									<div className="ainative-flex ainative-items-center ainative-justify-between">
										<span className="ainative-text-sm ainative-font-medium ainative-text-ainative-fg-1">
											{model.name}
										</span>
										{model.pricing && (
											<span className="ainative-text-xs ainative-text-ainative-fg-3 ainative-px-2 ainative-py-0.5 ainative-rounded ainative-bg-ainative-bg-2">
												{model.pricing}
											</span>
										)}
									</div>
									{model.description && (
										<span className="ainative-text-xs ainative-text-ainative-fg-3">
											{model.description}
										</span>
									)}
								</div>
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
};
