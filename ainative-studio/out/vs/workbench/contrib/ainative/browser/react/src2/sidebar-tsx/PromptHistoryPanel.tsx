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
      return prompts.filter((p) =>
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
      className={` void-py-2 void-px-3 void-rounded-md void-text-sm void-cursor-pointer void-bg-zinc-700/5 hover:void-bg-zinc-700/10 dark:void-bg-zinc-300/5 dark:hover:void-bg-zinc-300/10 ${


      isSelected ? "void-ring-1 void-ring-void-border-2" : ""} void-opacity-80 hover:void-opacity-100 void-transition-all `}


      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Prompt: ${prompt.content}`}>

			<div className="void-flex void-flex-col void-gap-1">
				{/* Prompt content */}
				<div className="void-text-void-fg-1 void-line-clamp-2 void-leading-relaxed">
					{prompt.content}
				</div>

				{/* Metadata */}
				<div className="void-flex void-items-center void-gap-2 void-text-xs void-text-void-fg-3 void-opacity-60">
					<span className="void-flex void-items-center void-gap-1">
						<Clock size={10} className="void-flex-shrink-0" />
						{formatTimestamp(prompt.timestamp)}
					</span>

					{prompt.modelName &&
          <>
							<span>•</span>
							<span className="void-truncate">{prompt.modelName}</span>
						</>
          }
				</div>
			</div>
		</div>);

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
    <div className="void-relative">
			<div className="void-absolute void-left-3 void-top-1/2 -void-translate-y-1/2 void-text-void-fg-3 void-pointer-events-none">
				<Search size={14} />
			</div>
			<input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search prompt history..."
        className=" void-w-full void-pl-9 void-pr-8 void-py-2 void-text-sm void-bg-void-bg-1 void-border void-border-void-border-2 void-rounded-md void-text-void-fg-1 void-placeholder-void-fg-3 focus:void-outline-none focus:void-ring-1 focus:void-ring-void-border-2 void-transition-all "






        aria-label="Search prompts" />

			{value &&
      <button
        onClick={onClear}
        className=" void-absolute void-right-2 void-top-1/2 -void-translate-y-1/2 void-text-void-fg-3 hover:void-text-void-fg-1 void-p-1 hover:void-bg-zinc-700/10 dark:hover:void-bg-zinc-300/10 void-rounded void-transition-colors "





        aria-label="Clear search">

					<X size={12} />
				</button>
      }
		</div>);

};

/**
 * Empty state when no prompts are found
 */
const EmptyState: React.FC<{isSearching: boolean;}> = ({ isSearching }) => {
  return (
    <div className="void-flex void-flex-col void-items-center void-justify-center void-py-8 void-text-center">
			<Clock size={32} className="void-text-void-fg-3 void-opacity-40 void-mb-3" />
			<p className="void-text-sm void-text-void-fg-3">
				{isSearching ? 'No prompts found' : 'No prompt history yet'}
			</p>
			<p className="void-text-xs void-text-void-fg-4 void-mt-1 void-px-4">
				{isSearching ?
        'Try a different search term' :
        'Your recent prompts will appear here'
        }
			</p>
		</div>);

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
        setSelectedIndex((prev) =>
        prev === null ? 0 : Math.min(prev + 1, filteredPrompts.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
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
    <div className={`void-flex void-flex-col void-h-full ${className}`}>
			{/* Header */}
			<div className="void-flex void-items-center void-justify-between void-mb-3 void-px-1">
				<div className="void-flex void-items-center void-gap-2">
					<Clock size={16} className="void-text-void-fg-3" />
					<h3 className="void-text-sm void-font-medium void-text-void-fg-1">Prompt History</h3>
				</div>
				{onClose &&
        <button
          onClick={onClose}
          className=" void-text-void-fg-3 hover:void-text-void-fg-1 void-p-1 hover:void-bg-zinc-700/10 dark:hover:void-bg-zinc-300/10 void-rounded void-transition-colors "




          aria-label="Close prompt history">

						<X size={14} />
					</button>
        }
			</div>

			{/* Search box */}
			<div className="void-mb-3">
				<SearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleClearSearch} />

			</div>

			{/* Keyboard hints */}
			{filteredPrompts.length > 0 &&
      <div className="void-flex void-items-center void-gap-3 void-mb-2 void-px-1 void-text-[10px] void-text-void-fg-4 void-opacity-60">
					<span className="void-flex void-items-center void-gap-1">
						<ArrowUp size={10} />
						<ArrowDown size={10} />
						Navigate
					</span>
					<span>Enter to select</span>
				</div>
      }

			{/* Prompt list */}
			<div className="void-flex-1 void-overflow-y-auto void-space-y-2 void-pr-1">
				{isLoading ?
        <div className="void-flex void-items-center void-justify-center void-py-8">
						<div className="void-text-sm void-text-void-fg-3">Loading...</div>
					</div> :
        filteredPrompts.length === 0 ?
        <EmptyState isSearching={searchQuery.length > 0} /> :

        filteredPrompts.map((prompt, index) =>
        <PromptItem
          key={prompt.id}
          prompt={prompt}
          isSelected={selectedIndex === index}
          onSelect={() => setSelectedIndex(index)}
          onClick={() => handlePromptClick(prompt)} />

        )
        }
			</div>

			{/* Footer info */}
			{!isLoading && filteredPrompts.length > 0 &&
      <div className="void-mt-3 void-pt-2 void-border-t void-border-void-border-3">
					<p className="void-text-[10px] void-text-void-fg-4 void-text-center void-opacity-60">
						{filteredPrompts.length} {filteredPrompts.length === 1 ? 'prompt' : 'prompts'}
						{searchQuery && ' found'}
					</p>
				</div>
      }
		</div>);

};

export default PromptHistoryPanel;