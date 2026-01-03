/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * EXAMPLE FILE - Demonstrates how to integrate PromptHistoryPanel
 * This file is for reference only and should not be imported in production
 */

import React, { useState } from 'react';
import { PromptHistoryPanel, PromptEntry } from './PromptHistoryPanel.js';

/**
 * Example 1: Basic usage with callback
 */
export const BasicPromptHistoryExample = () => {
	const handlePromptSelect = (prompt: PromptEntry) => {
		console.log('User selected prompt:', prompt.content);
		// In real implementation, this would:
		// 1. Set the input textarea value to prompt.content
		// 2. Focus the textarea
		// 3. Optionally auto-send the prompt
	};

	return (
		<div className="w-full h-full p-4">
			<PromptHistoryPanel onPromptSelect={handlePromptSelect} />
		</div>
	);
};

/**
 * Example 2: Toggle between threads and history
 * (Similar to integration in SidebarChat)
 */
export const ToggleViewExample = () => {
	const [showHistory, setShowHistory] = useState(false);

	return (
		<div className="w-full h-full flex flex-col p-4">
			{/* Toggle header */}
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-void-fg-1">
					{showHistory ? 'Prompt History' : 'Previous Threads'}
				</h3>
				<button
					onClick={() => setShowHistory(!showHistory)}
					className="
						text-xs text-void-fg-3 px-2 py-1 rounded
						hover:bg-zinc-700/10 dark:hover:bg-zinc-300/10
					"
				>
					{showHistory ? 'Show Threads' : 'Show History'}
				</button>
			</div>

			{/* Content area */}
			<div className="flex-1 overflow-hidden">
				{showHistory ? (
					<PromptHistoryPanel
						onPromptSelect={(prompt) => {
							console.log('Selected:', prompt.content);
							setShowHistory(false); // Close after selection
						}}
					/>
				) : (
					<div className="text-void-fg-3">
						{/* This would be <PastThreadsList /> in real implementation */}
						Previous Threads List Here
					</div>
				)}
			</div>
		</div>
	);
};

/**
 * Example 3: Slide-out panel
 */
export const SlideOutPanelExample = () => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="relative w-full h-full">
			{/* Main content */}
			<div className="p-4">
				<button
					onClick={() => setIsOpen(true)}
					className="
						flex items-center gap-2 px-3 py-2 rounded
						bg-void-bg-1 border border-void-border-2
						text-void-fg-1 hover:brightness-95
					"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<circle cx="12" cy="12" r="10" strokeWidth="2" />
						<polyline points="12 6 12 12 16 14" strokeWidth="2" />
					</svg>
					Open Prompt History
				</button>
			</div>

			{/* Slide-out overlay */}
			{isOpen && (
				<div
					className="
						absolute inset-0 bg-void-bg-2 z-50
						flex flex-col p-4
						animate-in slide-in-from-right
					"
				>
					<PromptHistoryPanel
						onPromptSelect={(prompt) => {
							console.log('Selected:', prompt.content);
							setIsOpen(false);
						}}
						onClose={() => setIsOpen(false)}
					/>
				</div>
			)}
		</div>
	);
};

/**
 * Example 4: Integration with input box
 * Shows how to actually populate the input when a prompt is selected
 */
export const InputIntegrationExample = () => {
	const [inputValue, setInputValue] = useState('');
	const [showHistory, setShowHistory] = useState(false);

	const handlePromptSelect = (prompt: PromptEntry) => {
		setInputValue(prompt.content);
		setShowHistory(false);

		// In real implementation, you would also:
		// 1. Focus the textarea
		// 2. Scroll to bottom
		// 3. Maybe trigger send automatically
	};

	return (
		<div className="w-full h-full flex flex-col p-4 gap-4">
			{/* Input area */}
			<div className="flex-shrink-0">
				<textarea
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					placeholder="Type your prompt..."
					className="
						w-full p-3 rounded border
						bg-void-bg-1 border-void-border-2
						text-void-fg-1 placeholder-void-fg-3
						resize-none
					"
					rows={3}
				/>
				<div className="flex justify-between mt-2">
					<button
						onClick={() => setShowHistory(!showHistory)}
						className="text-xs text-void-fg-3 hover:text-void-fg-1"
					>
						{showHistory ? 'Hide History' : 'Show History'}
					</button>
					<button
						onClick={() => console.log('Send:', inputValue)}
						className="px-3 py-1 rounded bg-blue-500 text-white text-sm"
					>
						Send
					</button>
				</div>
			</div>

			{/* History panel */}
			{showHistory && (
				<div className="flex-1 overflow-hidden border border-void-border-2 rounded p-2">
					<PromptHistoryPanel onPromptSelect={handlePromptSelect} />
				</div>
			)}
		</div>
	);
};

/**
 * Example 5: With custom styling
 */
export const CustomStyledExample = () => {
	return (
		<div className="w-96 h-[600px] bg-void-bg-2 rounded-lg shadow-xl p-4">
			<PromptHistoryPanel
				className="custom-history-panel"
				onPromptSelect={(prompt) => {
					alert(`Selected: ${prompt.content.substring(0, 50)}...`);
				}}
			/>
		</div>
	);
};

/**
 * Example 6: Simulating real service integration
 * Shows what the component would look like with actual backend
 */
export const SimulatedServiceExample = () => {
	const [prompts, setPrompts] = useState<PromptEntry[]>([]);

	// Simulate loading prompts from service
	React.useEffect(() => {
		// In real implementation, this would be:
		// const history = await promptHistoryService.getHistory();
		// setPrompts(history);

		setTimeout(() => {
			setPrompts([
				{
					id: '1',
					content: 'Explain React hooks',
					timestamp: Date.now() - 1000 * 60 * 5,
					modelName: 'Claude 3.7 Sonnet',
					providerName: 'Anthropic'
				},
				{
					id: '2',
					content: 'Debug TypeScript error',
					timestamp: Date.now() - 1000 * 60 * 30,
					modelName: 'GPT-4',
					providerName: 'OpenAI'
				}
			]);
		}, 500);
	}, []);

	return (
		<div className="w-full h-full p-4">
			<h2 className="text-lg mb-4">Simulated Service Integration</h2>
			<div className="text-xs text-void-fg-3 mb-4">
				Loaded {prompts.length} prompts from "service"
			</div>
			<PromptHistoryPanel
				onPromptSelect={(prompt) => {
					console.log('Selected:', prompt);
					// In real implementation:
					// await promptHistoryService.recordUsage(prompt.id);
				}}
			/>
		</div>
	);
};

/**
 * Example 7: Error handling
 */
export const ErrorHandlingExample = () => {
	const [error, setError] = React.useState<string | null>(null);

	const handlePromptSelect = (prompt: PromptEntry) => {
		try {
			// Simulate some operation that might fail
			if (prompt.content.length > 1000) {
				throw new Error('Prompt too long');
			}
			console.log('Selected:', prompt.content);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
		}
	};

	return (
		<div className="w-full h-full p-4">
			{error && (
				<div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 rounded border border-red-500">
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					<button
						onClick={() => setError(null)}
						className="text-xs underline mt-1"
					>
						Dismiss
					</button>
				</div>
			)}
			<PromptHistoryPanel onPromptSelect={handlePromptSelect} />
		</div>
	);
};

// Default export for easy testing
export default BasicPromptHistoryExample;
