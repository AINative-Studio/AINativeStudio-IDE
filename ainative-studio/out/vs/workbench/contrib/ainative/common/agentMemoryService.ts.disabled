/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IAINativeAuthService } from './ainativeAuthService.js';

export const IAgentMemoryService = createDecorator<IAgentMemoryService>('agentMemoryService');

/**
 * Memory entry metadata
 */
export interface MemoryMetadata {
	readonly source?: string;
	readonly timestamp?: string;
	readonly sessionId?: string;
	readonly [key: string]: any;
}

/**
 * Memory entry stored in the system
 */
export interface MemoryEntry {
	readonly content: string;
	readonly role: 'user' | 'assistant' | 'system';
	readonly metadata?: MemoryMetadata;
}

/**
 * Search result with similarity score
 */
export interface MemorySearchResult {
	readonly content: string;
	readonly role: 'user' | 'assistant' | 'system';
	readonly similarity: number;
	readonly metadata?: MemoryMetadata;
}

/**
 * Context window with messages and token count
 */
export interface ContextWindow {
	readonly messages: Array<{ role: string; content: string }>;
	readonly tokenCount: number;
	readonly sessionId: string;
}

/**
 * Agent Memory Service Interface
 * Integrates with AINative Agent Memory APIs for long-term conversation memory
 */
export interface IAgentMemoryService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when memory is stored
	 */
	readonly onDidStoreMemory: Event<MemoryEntry>;

	/**
	 * Store conversation memory
	 * @param content The content to store
	 * @param role The role (user, assistant, system)
	 * @param metadata Optional metadata
	 */
	storeMemory(content: string, role: 'user' | 'assistant' | 'system', metadata?: MemoryMetadata): Promise<void>;

	/**
	 * Search memory semantically
	 * @param query The search query
	 * @param limit Maximum number of results (default: 10)
	 */
	searchMemory(query: string, limit?: number): Promise<MemorySearchResult[]>;

	/**
	 * Get session context window
	 * @param sessionId The session identifier
	 * @param maxTokens Maximum token count (default: 4000)
	 */
	getContext(sessionId: string, maxTokens?: number): Promise<ContextWindow>;
}

/**
 * Agent Memory Service Implementation
 */
export class AgentMemoryService extends Disposable implements IAgentMemoryService {
	readonly _serviceBrand: undefined;

	private static readonly API_BASE = 'https://api.ainative.studio/v1';

	private readonly _onDidStoreMemory = this._register(new Emitter<MemoryEntry>());
	readonly onDidStoreMemory = this._onDidStoreMemory.event;

	constructor(
		@IAINativeAuthService private readonly _authService: IAINativeAuthService
	) {
		super();
	}

	/**
	 * Store memory with metadata
	 */
	async storeMemory(content: string, role: 'user' | 'assistant' | 'system', metadata?: MemoryMetadata): Promise<void> {
		const token = this._authService.getAccessToken();
		if (!token) {
			throw new Error('Not authenticated');
		}

		const enhancedMetadata: MemoryMetadata = {
			...metadata,
			source: 'ainative-ide',
			timestamp: new Date().toISOString()
		};

		const response = await fetch(`${AgentMemoryService.API_BASE}/memory/store`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				content,
				role,
				metadata: enhancedMetadata
			})
		});

		if (!response.ok) {
			throw new Error(`Failed to store memory: ${response.statusText}`);
		}

		// Fire event
		this._onDidStoreMemory.fire({ content, role, metadata: enhancedMetadata });
	}

	/**
	 * Search memory semantically
	 */
	async searchMemory(query: string, limit = 10): Promise<MemorySearchResult[]> {
		const token = this._authService.getAccessToken();
		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(`${AgentMemoryService.API_BASE}/memory/search`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ query, limit })
		});

		if (!response.ok) {
			throw new Error(`Failed to search memory: ${response.statusText}`);
		}

		const data = await response.json();
		return data.results;
	}

	/**
	 * Get context window for session
	 */
	async getContext(sessionId: string, maxTokens = 4000): Promise<ContextWindow> {
		const token = this._authService.getAccessToken();
		if (!token) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(
			`${AgentMemoryService.API_BASE}/memory/context?session_id=${sessionId}&max_tokens=${maxTokens}`,
			{
				headers: {
					'Authorization': `Bearer ${token}`
				}
			}
		);

		if (!response.ok) {
			throw new Error(`Failed to get context: ${response.statusText}`);
		}

		const data = await response.json();
		return data;
	}
}

// Register the service as a singleton
registerSingleton(IAgentMemoryService, AgentMemoryService, InstantiationType.Eager);
