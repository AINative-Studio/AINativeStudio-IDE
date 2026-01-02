# Prompt History Panel - Integration Guide

## Overview
The `PromptHistoryPanel` component provides a UI for viewing and searching through prompt history. This document explains how to integrate it into the SidebarChat component.

## Component Location
```
/ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/sidebar-tsx/PromptHistoryPanel.tsx
```

## Features
- ✅ List of recent prompts with metadata (timestamp, model, provider)
- ✅ Search box for filtering prompts (text-based, ready for semantic search)
- ✅ Click to re-use a prompt
- ✅ Keyboard navigation (Arrow Up/Down, Enter to select)
- ✅ Responsive design matching AINative UI patterns
- ✅ Empty states for no prompts / no search results
- ✅ Loading states
- ✅ Accessibility support (ARIA labels, keyboard navigation)

## Integration with SidebarChat

### Option 1: Toggle View (Recommended)

Add a button to toggle between "Previous Threads" and "Prompt History":

```tsx
// In SidebarChat.tsx, add state for toggling
const [showPromptHistory, setShowPromptHistory] = useState(false);

// Replace the "Previous Threads" section (around line 3145-3155) with:
{Object.keys(chatThreadsState.allThreads).length > 1 ? (
  <ErrorBoundary>
    <div className="flex items-center justify-between pt-8 mb-2">
      <div className="text-void-fg-3 text-root select-none">
        {showPromptHistory ? 'Prompt History' : 'Previous Threads'}
      </div>
      <button
        onClick={() => setShowPromptHistory(!showPromptHistory)}
        className="
          text-xs text-void-fg-3 opacity-60 hover:opacity-100
          px-2 py-1 rounded hover:bg-zinc-700/10 dark:hover:bg-zinc-300/10
          transition-all
        "
        aria-label={showPromptHistory ? 'Show previous threads' : 'Show prompt history'}
      >
        {showPromptHistory ? 'Show Threads' : 'Show History'}
      </button>
    </div>

    {showPromptHistory ? (
      <PromptHistoryPanel
        onPromptSelect={(prompt) => {
          // Insert the prompt into the input box
          const chatThreadService = accessor.get('IChatThreadService');
          // TODO: Add method to set input text or directly send the prompt
          console.log('Selected prompt:', prompt.content);
        }}
      />
    ) : (
      <PastThreadsList />
    )}
  </ErrorBoundary>
) : (
  <ErrorBoundary>
    <div className='pt-8 mb-2 text-void-fg-3 text-root select-none pointer-events-none'>
      Suggestions
    </div>
    {initiallySuggestedPromptsHTML}
  </ErrorBoundary>
)}
```

### Option 2: Slide-out Panel

Add a button in the sidebar header to open prompt history as a slide-out:

```tsx
// In the header section (around line 347-391), add a button:
import { Clock } from 'lucide-react';

// Add state
const [isPromptHistoryOpen, setIsPromptHistoryOpen] = useState(false);

// In the header, add the button next to other controls:
<button
  onClick={() => setIsPromptHistoryOpen(!isPromptHistoryOpen)}
  className="p-2 hover:bg-zinc-700/10 dark:hover:bg-zinc-300/10 rounded transition-colors"
  aria-label="Show prompt history"
  data-tooltip-id='void-tooltip'
  data-tooltip-content='Prompt History'
  data-tooltip-place='bottom'
>
  <Clock size={16} className="text-void-fg-3" />
</button>

// Add the slide-out panel (can be positioned absolutely or in a modal):
{isPromptHistoryOpen && (
  <div className="
    absolute inset-0 bg-void-bg-2 z-50
    flex flex-col p-4
  ">
    <PromptHistoryPanel
      onPromptSelect={(prompt) => {
        // Handle prompt selection
        console.log('Selected:', prompt.content);
        setIsPromptHistoryOpen(false);
      }}
      onClose={() => setIsPromptHistoryOpen(false)}
    />
  </div>
)}
```

## Service Integration (Future)

When `IPromptHistoryService` is implemented, update the following:

### 1. Add to services.tsx

```typescript
// In /ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/util/services.tsx

import { IPromptHistoryService } from '../../../promptHistoryService.js'; // adjust path

// In getReactAccessor (around line 198-248), add:
IPromptHistoryService: accessor.get(IPromptHistoryService),

// Add state listeners in _registerServices (around line 94-193):
let promptHistoryState: PromptEntry[]
const promptHistoryStateListeners: Set<(entries: PromptEntry[]) => void> = new Set()

// In the service registration:
promptHistoryState = promptHistoryService.getHistory()
disposables.push(
  promptHistoryService.onDidChangeHistory((entries) => {
    promptHistoryState = entries
    promptHistoryStateListeners.forEach(l => l(entries))
  })
)

// Add hook:
export const usePromptHistoryState = () => {
  const [s, ss] = useState(promptHistoryState)
  useEffect(() => {
    ss(promptHistoryState)
    promptHistoryStateListeners.add(ss)
    return () => { promptHistoryStateListeners.delete(ss) }
  }, [ss])
  return s
}
```

### 2. Update PromptHistoryPanel.tsx

```typescript
// Replace the usePromptHistory hook with actual service calls:
export const usePromptHistory = () => {
  const accessor = useAccessor();
  const promptHistoryService = accessor.get('IPromptHistoryService');

  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await promptHistoryService.getHistory();
        setPrompts(history);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();

    const disposable = promptHistoryService.onDidChangeHistory((entries) => {
      setPrompts(entries);
    });

    return () => disposable.dispose();
  }, [promptHistoryService]);

  const searchHistory = useCallback(async (query: string): Promise<PromptEntry[]> => {
    if (!query.trim()) {
      return await promptHistoryService.getHistory();
    }
    return await promptHistoryService.searchHistory(query);
  }, [promptHistoryService]);

  return { prompts, isLoading, searchHistory };
};
```

## Recording Prompts

To automatically record prompts when they're sent, add this to the chat send handler:

```typescript
// In SidebarChat.tsx, in the sendMessage function:
const sendMessage = async (content: string) => {
  const accessor = useAccessor();
  const promptHistoryService = accessor.get('IPromptHistoryService');
  const settingsService = accessor.get('IVoidSettingsService');

  // Get current model selection
  const modelSelection = settingsService.state.modelSelectionOfFeature?.Chat;

  // Record the prompt
  await promptHistoryService.addPrompt(content, {
    threadId: currentThreadId,
    modelName: modelSelection?.modelName,
    providerName: modelSelection?.providerName,
    timestamp: Date.now(),
  });

  // Continue with sending the message...
  // ...
};
```

## Component API

### Props

```typescript
interface PromptHistoryPanelProps {
  className?: string;
  onPromptSelect?: (prompt: PromptEntry) => void;
  onClose?: () => void;
}
```

### PromptEntry Interface

```typescript
interface PromptEntry {
  id: string;
  content: string;
  timestamp: number;
  threadId?: string;
  modelName?: string;
  providerName?: string;
}
```

## Styling

The component uses existing AINative UI color classes:
- `text-void-fg-1` - Primary foreground
- `text-void-fg-3` - Secondary foreground
- `text-void-fg-4` - Tertiary foreground
- `bg-void-bg-1` - Primary background
- `bg-void-bg-2` - Secondary background
- `border-void-border-2` - Border color
- `border-void-border-3` - Secondary border color

## Keyboard Shortcuts

- `↑` / `↓` - Navigate through prompts
- `Enter` - Select highlighted prompt
- `Escape` - Close panel (when onClose is provided)

## Accessibility

- All interactive elements have `aria-label` attributes
- Keyboard navigation is fully supported
- Screen reader friendly with semantic HTML
- Focus management for keyboard users

## Next Steps

1. **Implement IPromptHistoryService** - Create the backend service in:
   - `/ainative-studio/src/vs/workbench/contrib/ainative/common/promptHistoryService.ts`

2. **Add to service registration** - Register the service with dependency injection

3. **Connect to storage** - Use ZeroDB or local storage for persistence

4. **Add semantic search** - Integrate vector search for intelligent prompt finding

5. **Test integration** - Ensure smooth UX when switching between views

## Related Files

- `SidebarChat.tsx` - Main chat sidebar component
- `SidebarThreadSelector.tsx` - Reference for list UI patterns
- `services.tsx` - Service accessor and state management
- `chatThreadService.ts` - Chat thread management (reference)

## Notes

- The component is fully functional with mock data
- All TODOs are marked in the code for easy service integration
- Follows existing patterns from PastThreadsList and other sidebar components
- Ready for immediate testing and iteration
