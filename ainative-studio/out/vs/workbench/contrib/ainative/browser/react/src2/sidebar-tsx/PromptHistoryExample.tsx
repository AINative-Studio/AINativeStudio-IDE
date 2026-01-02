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
    <div className="void-w-full void-h-full void-p-4">
			<PromptHistoryPanel onPromptSelect={handlePromptSelect} />
		</div>);

};

/**
 * Example 2: Toggle between threads and history
 * (Similar to integration in SidebarChat)
 */
export const ToggleViewExample = () => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="void-w-full void-h-full void-flex void-flex-col void-p-4">
			{/* Toggle header */}
			<div className="void-flex void-items-center void-justify-between void-mb-4">
				<h3 className="void-text-void-fg-1">
					{showHistory ? 'Prompt History' : 'Previous Threads'}
				</h3>
				<button
          onClick={() => setShowHistory(!showHistory)}
          className=" void-text-xs void-text-void-fg-3 void-px-2 void-py-1 void-rounded hover:void-bg-zinc-700/10 dark:hover:void-bg-zinc-300/10 ">




					{showHistory ? 'Show Threads' : 'Show History'}
				</button>
			</div>

			{/* Content area */}
			<div className="void-flex-1 void-overflow-hidden">
				{showHistory ?
        <PromptHistoryPanel
          onPromptSelect={(prompt) => {
            console.log('Selected:', prompt.content);
            setShowHistory(false); // Close after selection
          }} /> :


        <div className="void-text-void-fg-3">
						{/* This would be <PastThreadsList /> in real implementation */}
						Previous Threads List Here
					</div>
        }
			</div>
		</div>);

};

/**
 * Example 3: Slide-out panel
 */
export const SlideOutPanelExample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="void-relative void-w-full void-h-full">
			{/* Main content */}
			<div className="void-p-4">
				<button
          onClick={() => setIsOpen(true)}
          className=" void-flex void-items-center void-gap-2 void-px-3 void-py-2 void-rounded void-bg-void-bg-1 void-border void-border-void-border-2 void-text-void-fg-1 hover:void-brightness-95 ">





					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<circle cx="12" cy="12" r="10" strokeWidth="2" />
						<polyline points="12 6 12 12 16 14" strokeWidth="2" />
					</svg>
					Open Prompt History
				</button>
			</div>

			{/* Slide-out overlay */}
			{isOpen &&
      <div
        className=" void-absolute void-inset-0 void-bg-void-bg-2 void-z-50 void-flex void-flex-col void-p-4 void-animate-in void-slide-in-from-right ">





					<PromptHistoryPanel
          onPromptSelect={(prompt) => {
            console.log('Selected:', prompt.content);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)} />

				</div>
      }
		</div>);

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
    <div className="void-w-full void-h-full void-flex void-flex-col void-p-4 void-gap-4">
			{/* Input area */}
			<div className="void-flex-shrink-0">
				<textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your prompt..."
          className=" void-w-full void-p-3 void-rounded void-border void-bg-void-bg-1 void-border-void-border-2 void-text-void-fg-1 void-placeholder-void-fg-3 void-resize-none "





          rows={3} />

				<div className="void-flex void-justify-between void-mt-2">
					<button
            onClick={() => setShowHistory(!showHistory)}
            className="void-text-xs void-text-void-fg-3 hover:void-text-void-fg-1">

						{showHistory ? 'Hide History' : 'Show History'}
					</button>
					<button
            onClick={() => console.log('Send:', inputValue)}
            className="void-px-3 void-py-1 void-rounded void-bg-blue-500 void-text-white void-text-sm">

						Send
					</button>
				</div>
			</div>

			{/* History panel */}
			{showHistory &&
      <div className="void-flex-1 void-overflow-hidden void-border void-border-void-border-2 void-rounded void-p-2">
					<PromptHistoryPanel onPromptSelect={handlePromptSelect} />
				</div>
      }
		</div>);

};

/**
 * Example 5: With custom styling
 */
export const CustomStyledExample = () => {
  return (
    <div className="void-w-96 void-h-[600px] void-bg-void-bg-2 void-rounded-lg void-shadow-xl void-p-4">
			<PromptHistoryPanel
        className="void-custom-history-panel"
        onPromptSelect={(prompt) => {
          alert(`Selected: ${prompt.content.substring(0, 50)}...`);
        }} />

		</div>);

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
      }]
      );
    }, 500);
  }, []);

  return (
    <div className="void-w-full void-h-full void-p-4">
			<h2 className="void-text-lg void-mb-4">Simulated Service Integration</h2>
			<div className="void-text-xs void-text-void-fg-3 void-mb-4">
				Loaded {prompts.length} prompts from "service"
			</div>
			<PromptHistoryPanel
        onPromptSelect={(prompt) => {
          console.log('Selected:', prompt);
          // In real implementation:
          // await promptHistoryService.recordUsage(prompt.id);
        }} />

		</div>);

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
    <div className="void-w-full void-h-full void-p-4">
			{error &&
      <div className="void-mb-4 void-p-3 void-bg-red-100 dark:void-bg-red-900/20 void-rounded void-border void-border-red-500">
					<p className="void-text-sm void-text-red-600 dark:void-text-red-400">{error}</p>
					<button
          onClick={() => setError(null)}
          className="void-text-xs void-underline void-mt-1">

						Dismiss
					</button>
				</div>
      }
			<PromptHistoryPanel onPromptSelect={handlePromptSelect} />
		</div>);

};

// Default export for easy testing
export default BasicPromptHistoryExample;