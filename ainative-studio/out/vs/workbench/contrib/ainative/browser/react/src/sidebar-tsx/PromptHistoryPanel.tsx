/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Clock, Search, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useAccessor } from '../util/services.js';

/**
 * Interface for prompt history entries
 * Matches the IPromptHistoryService structure
 */
export interface PromptEntry {
	id: string;
	content: string;
	timestamp: number;
	threadId?: string;
	modelName?: string;
	providerName?: string;
}

interface PromptHistoryPanelProps {
	className?: string;
	onPromptSelect?: (prompt: PromptEntry) => void;
	onClose?: () => void;
}

/**
 * Custom hook for prompt history state management
 * Integrates with IPromptHistoryService for persistent storage
 */
export const usePromptHistory = () => {
	const accessor = useAccessor();
	const promptHistoryService = accessor.get('IPromptHistoryService');

	const [prompts, setPrompts] = useState<PromptEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Load initial history and subscribe to updates
	useEffect(() => {
		const loadHistory = async () => {
			try {
				setIsLoading(true);
				const history = await promptHistoryService.getHistory();
				setPrompts(history);
			} catch (error) {
				console.error('Failed to load prompt history:', error);
			} finally {
				setIsLoading(false);
			}
		};

		loadHistory();

		// Subscribe to history changes
		const disposable = promptHistoryService.onDidChangeHistory(() => {
			loadHistory();
		});

		return () => disposable.dispose();
	}, [promptHistoryService]);

	const searchHistory = useCallback(async (query: string): Promise<PromptEntry[]> => {
		if (!query.trim()) {
			// Return all prompts if no search query
			return prompts;
		}

		try {
			// Use the service's semantic search capability
			const results = await promptHistoryService.searchHistory(query);
			return results;
		} catch (error) {
			console.error('Failed to search prompt history:', error);
			// Fallback to client-side filtering
			return prompts.filter(p =>
				p.content.toLowerCase().includes(query.toLowerCase()) ||
				p.modelName?.toLowerCase().includes(query.toLowerCase()) ||
				p.providerName?.toLowerCase().includes(query.toLowerCase())
			);
		}
	}, [promptHistoryService, prompts]);

	return {
		prompts,
		isLoading,
		searchHistory
	};
};

/**
 * Format timestamp to display as relative time or absolute date
 */
const formatTimestamp = (timestamp: number): string => {
	const now = Date.now();
	const diff = now - timestamp;
	const minutes = Math.floor(diff / (1000 * 60));
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days === 1) return 'Yesterday';
	if (days < 7) return `${days}d ago`;

	const date = new Date(timestamp);
	return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
};

/**
 * Individual prompt item in the history list
 */
const PromptItem: React.FC<{
	prompt: PromptEntry;
	isSelected: boolean;
	onSelect: () => void;
	onClick: () => void;
}> = ({ prompt, isSelected, onSelect, onClick }) => {
	return (
		<div
			className={`
				py-2 px-3 rounded-md text-sm cursor-pointer
				bg-zinc-700/5 hover:bg-zinc-700/10 dark:bg-zinc-300/5 dark:hover:bg-zinc-300/10
				${isSelected ? 'ring-1 ring-void-border-2' : ''}
				opacity-80 hover:opacity-100 transition-all
			`}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onClick();
				}
			}}
			tabIndex={0}
			role="button"
			aria-label={`Prompt: ${prompt.content}`}
		>
			<div className="flex flex-col gap-1">
				{/* Prompt content */}
				<div className="text-void-fg-1 line-clamp-2 leading-relaxed">
					{prompt.content}
				</div>

				{/* Metadata */}
				<div className="flex items-center gap-2 text-xs text-void-fg-3 opacity-60">
					<span className="flex items-center gap-1">
						<Clock size={10} className="flex-shrink-0" />
						{formatTimestamp(prompt.timestamp)}
					</span>

					{prompt.modelName && (
						<>
							<span>•</span>
							<span className="truncate">{prompt.modelName}</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

/**
 * Search box component for filtering prompt history
 */
const SearchBox: React.FC<{
	value: string;
	onChange: (value: string) => void;
	onClear: () => void;
}> = ({ value, onChange, onClear }) => {
	return (
		<div className="relative">
			<div className="absolute left-3 top-1/2 -translate-y-1/2 text-void-fg-3 pointer-events-none">
				<Search size={14} />
			</div>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder="Search prompt history..."
				className="
					w-full pl-9 pr-8 py-2 text-sm
					bg-void-bg-1 border border-void-border-2 rounded-md
					text-void-fg-1 placeholder-void-fg-3
					focus:outline-none focus:ring-1 focus:ring-void-border-2
					transition-all
				"
				aria-label="Search prompts"
			/>
			{value && (
				<button
					onClick={onClear}
					className="
						absolute right-2 top-1/2 -translate-y-1/2
						text-void-fg-3 hover:text-void-fg-1
						p-1 hover:bg-zinc-700/10 dark:hover:bg-zinc-300/10 rounded
						transition-colors
					"
					aria-label="Clear search"
				>
					<X size={12} />
				</button>
			)}
		</div>
	);
};

/**
 * Empty state when no prompts are found
 */
const EmptyState: React.FC<{ isSearching: boolean }> = ({ isSearching }) => {
	return (
		<div className="flex flex-col items-center justify-center py-8 text-center">
			<Clock size={32} className="text-void-fg-3 opacity-40 mb-3" />
			<p className="text-sm text-void-fg-3">
				{isSearching ? 'No prompts found' : 'No prompt history yet'}
			</p>
			<p className="text-xs text-void-fg-4 mt-1 px-4">
				{isSearching
					? 'Try a different search term'
					: 'Your recent prompts will appear here'
				}
			</p>
		</div>
	);
};

/**
 * Main Prompt History Panel Component
 *
 * Features:
 * - List of recent prompts with real-time updates
 * - Semantic search via IPromptHistoryService
 * - Click to re-use a prompt
 * - Show metadata (timestamp, model used, thread)
 * - Keyboard navigation (up/down arrows, Enter to select)
 * - Keyboard shortcut (Cmd/Ctrl+H) to toggle panel
 *
 * Integration:
 * - Connected to IPromptHistoryService for persistent storage
 * - Emits onPromptSelect when user clicks a prompt
 * - Integrated as slide-out panel in SidebarChat
 */
export const PromptHistoryPanel: React.FC<PromptHistoryPanelProps> = ({
	className = '',
	onPromptSelect,
	onClose
}) => {
	const { prompts, isLoading, searchHistory } = usePromptHistory();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [filteredPrompts, setFilteredPrompts] = useState<PromptEntry[]>(prompts);

	// Update filtered prompts when search changes
	useEffect(() => {
		const performSearch = async () => {
			const results = await searchHistory(searchQuery);
			setFilteredPrompts(results);
			setSelectedIndex(null);
		};
		performSearch();
	}, [searchQuery, searchHistory]);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!filteredPrompts.length) return;

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex(prev =>
					prev === null ? 0 : Math.min(prev + 1, filteredPrompts.length - 1)
				);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex(prev =>
					prev === null ? filteredPrompts.length - 1 : Math.max(prev - 1, 0)
				);
			} else if (e.key === 'Enter' && selectedIndex !== null) {
				e.preventDefault();
				const selectedPrompt = filteredPrompts[selectedIndex];
				if (selectedPrompt && onPromptSelect) {
					onPromptSelect(selectedPrompt);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [filteredPrompts, selectedIndex, onPromptSelect]);

	const handlePromptClick = useCallback((prompt: PromptEntry) => {
		if (onPromptSelect) {
			onPromptSelect(prompt);
		}
	}, [onPromptSelect]);

	const handleClearSearch = useCallback(() => {
		setSearchQuery('');
		setSelectedIndex(null);
	}, []);

	return (
		<div className={`flex flex-col h-full ${className}`}>
			{/* Header */}
			<div className="flex items-center justify-between mb-3 px-1">
				<div className="flex items-center gap-2">
					<Clock size={16} className="text-void-fg-3" />
					<h3 className="text-sm font-medium text-void-fg-1">Prompt History</h3>
				</div>
				{onClose && (
					<button
						onClick={onClose}
						className="
							text-void-fg-3 hover:text-void-fg-1
							p-1 hover:bg-zinc-700/10 dark:hover:bg-zinc-300/10 rounded
							transition-colors
						"
						aria-label="Close prompt history"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{/* Search box */}
			<div className="mb-3">
				<SearchBox
					value={searchQuery}
					onChange={setSearchQuery}
					onClear={handleClearSearch}
				/>
			</div>

			{/* Keyboard hints */}
			{filteredPrompts.length > 0 && (
				<div className="flex items-center gap-3 mb-2 px-1 text-[10px] text-void-fg-4 opacity-60">
					<span className="flex items-center gap-1">
						<ArrowUp size={10} />
						<ArrowDown size={10} />
						Navigate
					</span>
					<span>Enter to select</span>
				</div>
			)}

			{/* Prompt list */}
			<div className="flex-1 overflow-y-auto space-y-2 pr-1">
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="text-sm text-void-fg-3">Loading...</div>
					</div>
				) : filteredPrompts.length === 0 ? (
					<EmptyState isSearching={searchQuery.length > 0} />
				) : (
					filteredPrompts.map((prompt, index) => (
						<PromptItem
							key={prompt.id}
							prompt={prompt}
							isSelected={selectedIndex === index}
							onSelect={() => setSelectedIndex(index)}
							onClick={() => handlePromptClick(prompt)}
						/>
					))
				)}
			</div>

			{/* Footer info */}
			{!isLoading && filteredPrompts.length > 0 && (
				<div className="mt-3 pt-2 border-t border-void-border-3">
					<p className="text-[10px] text-void-fg-4 text-center opacity-60">
						{filteredPrompts.length} {filteredPrompts.length === 1 ? 'prompt' : 'prompts'}
						{searchQuery && ' found'}
					</p>
				</div>
			)}
		</div>
	);
};

export default PromptHistoryPanel;
