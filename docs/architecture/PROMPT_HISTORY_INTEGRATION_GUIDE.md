# Prompt History - Integration Guide for Parallel Agents

**Date**: January 2, 2026
**Issue**: #29
**Purpose**: Coordinate implementation across backend, ZeroDB, and frontend teams

---

## Quick Reference for Implementation Teams

### 1. Backend Service Agent

**Your Scope**: `PromptHistoryService` implementation

**Files You Own**:
- `/ainative-studio/src/vs/workbench/contrib/ainative/common/promptHistoryService.ts`
- `/ainative-studio/src/vs/workbench/contrib/ainative/test/common/promptHistoryService.test.ts`

**Key Interfaces to Implement**:

```typescript
export interface IPromptHistoryService {
	readonly _serviceBrand: undefined;
	readonly onDidAddPrompt: Event<PromptEntry>;
	readonly onDidClearHistory: Event<void>;

	addPrompt(content: string, metadata: PromptMetadata): Promise<PromptEntry>;
	getHistory(limit?: number, offset?: number): Promise<PromptEntry[]>;
	searchHistory(query: string, filters?: PromptSearchFilters): Promise<PromptEntry[]>;
	deletePrompt(id: string): Promise<void>;
	clearHistory(options?: ClearHistoryOptions): Promise<void>;
	exportHistory(): Promise<string>;
	getCount(): Promise<number>;
}

export interface PromptEntry {
	readonly id: string;
	readonly content: string;
	readonly timestamp: number;
	readonly metadata: PromptMetadata;
}

export interface PromptMetadata {
	readonly threadId?: string;
	readonly modelName?: string;
	readonly providerName?: string;
	readonly tags?: string[];
	readonly contextFiles?: string[];
}
```

**Dependencies You Need**:
```typescript
constructor(
	@IStorageService private readonly _storageService: IStorageService,
	@IAgentMemoryService private readonly _memoryService: IAgentMemoryService,
	@IAINativeAuthService private readonly _authService: IAINativeAuthService
)
```

**Storage Key** (add to `/ainative-studio/src/vs/workbench/contrib/ainative/common/storageKeys.ts`):
```typescript
export const PROMPT_HISTORY_STORAGE_KEY = 'ainative.promptHistory';
```

**Registration** (add to `/ainative-studio/src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts`):
```typescript
import '../common/promptHistoryService.js'
```

**Integration Point** (modify `/ainative-studio/src/vs/workbench/contrib/ainative/browser/chatThreadService.ts`):
```typescript
// Add dependency injection in constructor
@IPromptHistoryService private readonly _promptHistoryService: IPromptHistoryService

// In sendMessage() method, after creating user message:
const userContent = this._extractUserContent(userMessage);
if (userContent) {
	await this._promptHistoryService.addPrompt(userContent, {
		threadId: thread.id,
		modelName: modelSelection.modelName,
		providerName: modelSelection.providerName,
	}).catch(err => {
		console.error('Failed to save prompt to history', err);
	});
}
```

**Critical Requirements**:
1. Implement in-memory LRU cache (max 100 entries)
2. Synchronous write to IStorageService (< 100ms)
3. Fire `onDidAddPrompt` event after successful storage
4. Handle `QuotaExceededError` with LRU eviction
5. Validate prompt content (max 50,000 chars)
6. Register as singleton with `InstantiationType.Eager`

**Testing Checklist**:
- [ ] Unit test: Add prompt and retrieve
- [ ] Unit test: Persist across service restart
- [ ] Unit test: Handle storage quota exceeded
- [ ] Unit test: LRU cache eviction works
- [ ] Unit test: Event firing on add/clear
- [ ] Integration test: Works with mocked IStorageService

**Hand-off to ZeroDB Agent**:
Your service exposes `addPrompt()` which the ZeroDB agent will hook into for background sync.

---

### 2. ZeroDB Integration Agent

**Your Scope**: Background sync and semantic search

**Files You Own**:
- Extend `/ainative-studio/src/vs/workbench/contrib/ainative/common/promptHistoryService.ts`
- `/ainative-studio/test/integration/promptHistoryZeroDB.test.ts`

**ZeroDB APIs to Use**:

**Store Prompt**:
```typescript
// Use AgentMemoryService (already exists)
await this._memoryService.storeMemory(
	entry.content,
	'user',
	{
		source: 'ainative-ide-prompt-history',
		timestamp: new Date(entry.timestamp).toISOString(),
		sessionId: entry.metadata.threadId,
		promptId: entry.id,
		modelName: entry.metadata.modelName,
		providerName: entry.metadata.providerName
	}
);
```

**Search Prompts**:
```typescript
const results = await this._memoryService.searchMemory(query, limit);
// Map MemorySearchResult[] to PromptEntry[]
```

**Slash Commands Available**:
- `/zerodb-memory-store` - Store prompt with vector embedding
- `/zerodb-memory-search` - Semantic search with similarity scores
- `/zerodb-memory-context` - Get session context

**Implementation Strategy**:

```typescript
export class PromptHistoryService extends Disposable implements IPromptHistoryService {
	// ... existing local storage code from Backend Agent ...

	private _syncQueue: PromptEntry[] = [];
	private _isSyncing = false;
	private _zeroDbAvailable = true;

	constructor(
		@IStorageService private readonly _storageService: IStorageService,
		@IAgentMemoryService private readonly _memoryService: IAgentMemoryService,
		@IAINativeAuthService private readonly _authService: IAINativeAuthService
	) {
		super();
		this._loadFromStorage();
		this._startBackgroundSync(); // YOUR CODE HERE
	}

	private _startBackgroundSync(): void {
		// Process sync queue every 5 seconds
		setInterval(() => this._processSyncQueue(), 5000);
	}

	private async _processSyncQueue(): Promise<void> {
		if (this._isSyncing || this._syncQueue.length === 0) return;
		if (!this._zeroDbAvailable) {
			await this._checkZeroDbAvailability();
			return;
		}

		this._isSyncing = true;
		const entry = this._syncQueue.shift()!;

		try {
			await this._memoryService.storeMemory(
				entry.content,
				'user',
				{
					source: 'ainative-ide-prompt-history',
					timestamp: new Date(entry.timestamp).toISOString(),
					sessionId: entry.metadata.threadId || 'unknown',
					promptId: entry.id,
					modelName: entry.metadata.modelName,
					providerName: entry.metadata.providerName
				}
			);
			console.log('[PromptHistory] Synced to ZeroDB:', entry.id);
		} catch (err) {
			console.error('[PromptHistory] ZeroDB sync failed:', err);
			// Retry logic with exponential backoff
			this._retrySync(entry);
		} finally {
			this._isSyncing = false;
		}
	}

	async searchHistory(query: string, filters?: PromptSearchFilters): Promise<PromptEntry[]> {
		// Try ZeroDB semantic search first
		if (this._zeroDbAvailable) {
			try {
				const results = await this._memoryService.searchMemory(query, 50);
				return this._mapMemoryResultsToPrompts(results);
			} catch (err) {
				console.warn('[PromptHistory] ZeroDB search failed, falling back to local', err);
				this._zeroDbAvailable = false;
			}
		}

		// Fallback to local text search
		return this._localTextSearch(query, filters);
	}
}
```

**Critical Requirements**:
1. Background sync - never block `addPrompt()`
2. Retry failed syncs with exponential backoff (max 3 retries)
3. Detect ZeroDB unavailability and set flag
4. Fallback to local search if ZeroDB fails
5. Map `MemorySearchResult` to `PromptEntry` format
6. Handle authentication errors gracefully

**Testing Checklist**:
- [ ] Integration test: Prompt syncs to ZeroDB
- [ ] Integration test: Semantic search returns results
- [ ] Integration test: Fallback to local when ZeroDB offline
- [ ] Integration test: Retry logic works
- [ ] Unit test: Sync queue processing
- [ ] Unit test: Error handling

**Hand-off to Frontend Agent**:
Your implementation provides `searchHistory()` which the frontend will call for semantic search.

---

### 3. Frontend UI Agent

**Your Scope**: React component for prompt history panel

**Files You Own**:
- `/ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/PromptHistoryPanel.tsx`
- `/ainative-studio/src/vs/workbench/contrib/ainative/browser/promptHistoryActions.ts`

**Service You Consume**:

```typescript
import { IPromptHistoryService, PromptEntry } from '../../../../common/promptHistoryService.js';

// In component
const accessor = useAccessor();
const promptHistoryService = accessor.get(IPromptHistoryService);
```

**Component Interface**:

```typescript
interface PromptHistoryPanelProps {
	onSelectPrompt: (content: string) => void;
	onClose: () => void;
}

export const PromptHistoryPanel: React.FC<PromptHistoryPanelProps> = ({
	onSelectPrompt,
	onClose
}) => {
	// YOUR IMPLEMENTATION
}
```

**Required Features**:

1. **List View**:
   - Display prompts in reverse chronological order (newest first)
   - Show timestamp (relative: "2 hours ago")
   - Show model/provider badge
   - Truncate long prompts with "..." and expand on hover
   - Virtual scrolling for performance (use existing patterns)

2. **Search Bar**:
   - Debounced input (300ms)
   - Show loading spinner during search
   - Clear button (X icon)
   - Placeholder: "Search prompts..."

3. **Keyboard Navigation**:
   - `Up/Down`: Navigate list
   - `Enter`: Select prompt and insert
   - `Esc`: Close panel
   - `Cmd/Ctrl+K`: Focus search bar

4. **Loading States**:
   - Skeleton loader for initial load
   - Inline spinner for search
   - Empty state: "No prompts yet. Start a conversation!"

5. **Error Handling**:
   - Show error message if load fails
   - Retry button
   - Graceful degradation

**Styling** (match existing sidebar):
```tsx
<div className="prompt-history-panel" style={{
	display: 'flex',
	flexDirection: 'column',
	height: '100%',
	backgroundColor: 'var(--vscode-sideBar-background)'
}}>
	<div className="search-bar" style={{ padding: '8px' }}>
		{/* Search input */}
	</div>
	<div className="prompt-list" style={{
		flex: 1,
		overflowY: 'auto'
	}}>
		{prompts.map((p, i) => (
			<PromptItem
				key={p.id}
				prompt={p}
				selected={i === selectedIndex}
				onClick={() => handleSelect(p)}
			/>
		))}
	</div>
</div>
```

**Keyboard Shortcuts Registration**:

File: `/ainative-studio/src/vs/workbench/contrib/ainative/browser/promptHistoryActions.ts`

```typescript
import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { KeybindingWeight } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { localize2 } from '../../../../nls.js';

export const AINATIVE_OPEN_PROMPT_HISTORY_ACTION_ID = 'ainative.promptHistory.open';

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: AINATIVE_OPEN_PROMPT_HISTORY_ACTION_ID,
			f1: true,
			title: localize2('ainativePromptHistory', 'AINative Studio: Open Prompt History'),
			keybinding: {
				primary: KeyMod.CtrlCmd | KeyCode.KeyH,
				weight: KeybindingWeight.WorkbenchContrib
			}
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		// Show prompt history panel
		// Implementation: Toggle panel visibility in sidebar
	}
});
```

**Integration with Sidebar**:

Modify `/ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/Sidebar.tsx`:

```typescript
const [showPromptHistory, setShowPromptHistory] = useState(false);

// Listen for keyboard shortcut
useEffect(() => {
	const commandService = accessor.get(ICommandService);
	const disposable = commandService.onWillExecuteCommand(e => {
		if (e.commandId === AINATIVE_OPEN_PROMPT_HISTORY_ACTION_ID) {
			setShowPromptHistory(true);
		}
	});
	return () => disposable.dispose();
}, []);

return (
	<div>
		{showPromptHistory ? (
			<PromptHistoryPanel
				onSelectPrompt={(content) => {
					// Insert into chat input
					setInputValue(content);
					setShowPromptHistory(false);
				}}
				onClose={() => setShowPromptHistory(false)}
			/>
		) : (
			<SidebarChat />
		)}
	</div>
);
```

**Critical Requirements**:
1. Virtualized list for performance (> 1000 prompts)
2. Debounced search (300ms)
3. Keyboard navigation with focus management
4. Loading states for async operations
5. Error boundaries for crash recovery
6. Accessibility (ARIA labels, keyboard nav)

**Testing Checklist**:
- [ ] Component test: Renders list correctly
- [ ] Component test: Search filters results
- [ ] Component test: Keyboard navigation works
- [ ] Component test: Select inserts prompt
- [ ] E2E test: Open with Cmd+H
- [ ] E2E test: Search and select prompt
- [ ] E2E test: Close with Esc

---

## Coordination Points

### Data Contract (All Agents)

**PromptEntry Interface** (shared):
```typescript
export interface PromptEntry {
	readonly id: string;                    // UUID v4
	readonly content: string;               // User prompt text
	readonly timestamp: number;             // Unix timestamp (ms)
	readonly metadata: PromptMetadata;
}

export interface PromptMetadata {
	readonly threadId?: string;             // Chat thread ID
	readonly modelName?: string;            // e.g., "claude-3-5-sonnet-20241022"
	readonly providerName?: string;         // e.g., "Anthropic"
	readonly tags?: string[];               // Future: user-defined tags
	readonly contextFiles?: string[];       // File URIs in context
}
```

### Event Communication

**Backend → Frontend**:
```typescript
// Backend fires event when prompt added
onDidAddPrompt.fire(entry);

// Frontend listens (if panel is open)
useEffect(() => {
	const disposable = promptHistoryService.onDidAddPrompt(entry => {
		setPrompts(prev => [entry, ...prev]);
	});
	return () => disposable.dispose();
}, []);
```

### Error Handling Strategy (All Agents)

| Error | Handler | User Impact |
|-------|---------|-------------|
| Storage quota exceeded | Backend: LRU eviction | Transparent |
| ZeroDB offline | ZeroDB: Set flag, fallback | Search limited to text |
| Search timeout | Frontend: Show error + retry | Retry button shown |
| Parse error | Backend: Reset storage | Notification shown |

---

## Testing Strategy

### Unit Tests (Backend Agent)
- Test prompt addition and retrieval
- Test cache eviction
- Test event firing
- Test storage quota handling

### Integration Tests (ZeroDB Agent)
- Test ZeroDB sync
- Test semantic search
- Test fallback behavior
- Test retry logic

### Component Tests (Frontend Agent)
- Test list rendering
- Test search functionality
- Test keyboard navigation
- Test prompt selection

### E2E Tests (All Agents Collaborate)
1. **Happy Path**: Send prompt → Open history → Search → Select → Insert
2. **Offline Mode**: Disable ZeroDB → Search still works (text fallback)
3. **Performance**: Load 1000 prompts → Scroll smoothly (60 FPS)

---

## Timeline

**Phase 1 (Day 1)**: Backend Service
- Backend Agent: Implement `PromptHistoryService` with local storage
- Deliverable: Service with in-memory cache + IStorageService persistence

**Phase 2 (Day 2)**: ZeroDB Integration
- ZeroDB Agent: Implement background sync and semantic search
- Deliverable: Cloud sync working, semantic search functional

**Phase 3 (Day 3)**: Frontend UI
- Frontend Agent: Build React component
- Deliverable: Working UI with list view and search

**Phase 4 (Day 4)**: Polish & Testing
- All Agents: E2E tests, bug fixes, performance optimization
- Deliverable: Production-ready feature

---

## Communication Protocol

### Daily Sync (15 minutes)
1. Backend Agent: Report on service implementation progress
2. ZeroDB Agent: Report on sync/search progress
3. Frontend Agent: Report on UI progress
4. Blockers discussion
5. Interface changes discussion

### Hand-offs
- **Backend → ZeroDB**: Service exposes `addPrompt()` for hooking
- **ZeroDB → Frontend**: `searchHistory()` returns ranked results
- **Frontend → Backend**: `getHistory()` for initial load

### Shared Resources
- **TypeScript Interfaces**: `/common/promptHistoryService.ts`
- **Storage Key**: `/common/storageKeys.ts`
- **Architecture Doc**: `/docs/architecture/PROMPT_HISTORY_ARCHITECTURE.md`

---

## Success Criteria (All Agents)

- [ ] Prompts captured 100% of the time
- [ ] Storage latency < 100ms
- [ ] Search latency < 500ms
- [ ] UI responsive at 60 FPS
- [ ] Zero data loss on restart
- [ ] Graceful degradation when offline
- [ ] 80%+ test coverage
- [ ] No TypeScript errors
- [ ] Passes E2E smoke tests

---

**Ready to Start?**
1. Review this guide
2. Read main architecture doc
3. Claim your agent role
4. Begin Phase 1 implementation

**Questions?**
Refer to `/docs/architecture/PROMPT_HISTORY_ARCHITECTURE.md` for detailed specifications.
