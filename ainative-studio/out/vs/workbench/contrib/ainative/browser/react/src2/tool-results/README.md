# Tool Results Display Panel

Phase 2 Week 1 Integration - Issue #101

Display tool execution results (code intelligence, web fetch) in dedicated panel within chat messages.

## Overview

The Tool Results Panel automatically detects and displays tool usage in assistant responses, parsing natural language text to extract structured data for display.

### Why Text Parsing?

The backend managed chat API doesn't return tool execution details separately in responses. To provide visibility into tool usage, we parse the assistant's response text for tool mentions and extract relevant data.

## Components

### 1. ToolResultsPanel

Main container component that:
- Automatically parses assistant responses for tool mentions
- Displays appropriate view based on tool type
- Provides copy/export functionality
- Shows execution log

**Usage:**

```tsx
import { ToolResultsPanel } from './tool-results';

<ToolResultsPanel
  messageContent={message.displayContent}
  messageIndex={idx}
  threadId={threadId}
  showLog={true}
/>
```

### 2. CodeIntelligenceView

Displays code analysis results:
- Complexity metrics (cyclomatic, cognitive, maintainability)
- Function complexity breakdown with A-F ranking
- Symbol locations (functions, classes, variables)
- Import analysis
- Reference tracking

**Parsed Data Examples:**

```text
"I've analyzed the code complexity. The average complexity is 5.2.
Function calculate (line 10): complexity 15
Function validate (line 25): complexity 3
Total: 8 functions"
```

### 3. WebFetchView

Displays fetched documentation:
- Rendered markdown content
- Source URL with open-in-browser link
- Content metadata (size, type, truncation status)
- Expandable/collapsible content
- Copy functionality

**Parsed Data Examples:**

```text
"I fetched the documentation from https://docs.python.org/3/library/os.html
Documentation: The os module provides..."
```

### 4. ToolExecutionLog

Debug viewer showing:
- Timeline of tool executions
- Status indicators (pending, running, success, error)
- Execution duration
- Filterable by status

## Integration with Chat

### Option 1: Direct Integration in Message Renderer

Add to `SidebarChat.tsx` after the message content:

```tsx
import { ToolResultsPanel } from './tool-results';

// In message rendering
{message.role === 'assistant' && (
  <ToolResultsPanel
    messageContent={message.displayContent}
    messageIndex={messageIdx}
    threadId={currentThreadId}
  />
)}
```

### Option 2: Conditional Rendering with Hook

Use the `useToolResults` hook to check if tools were used:

```tsx
import { useToolResults, ToolResultsPanel } from './tool-results';

const toolResults = useToolResults(
  message.displayContent,
  messageIdx,
  currentThreadId
);

// Only render if tools were detected
{toolResults.length > 0 && (
  <ToolResultsPanel
    messageContent={message.displayContent}
    messageIndex={messageIdx}
    threadId={currentThreadId}
  />
)}
```

## Parsing Logic

The parser detects tool usage through pattern matching:

### Code Intelligence Detection

Patterns:
- `"analyzed|analyzing|analyze code"`
- `"code_intelligence tool"`
- `"complexity|cyclomatic|cognitive"`
- `"found X functions/symbols/imports"`
- `"AST parsing"`

Extracted Data:
- Operation type (analyze_complexity, parse_ast, etc.)
- Language (python, javascript, typescript)
- Complexity metrics
- Symbol locations
- Import lists

### Web Fetch Detection

Patterns:
- `"fetched|fetching|fetch documentation"`
- `"web_fetch tool"`
- `"retrieved from https://..."`
- `"documentation from domain.com"`

Extracted Data:
- URL
- Title (from domain)
- Content (markdown blocks or text after "documentation:")
- Size (if mentioned)
- Truncation status

## Styling

All styles are in `tool-results.css` and use VS Code theme variables:

```css
--ainative-bg-0     /* Primary background */
--ainative-bg-1     /* Secondary background */
--ainative-bg-2     /* Border color */
--ainative-fg-1     /* Primary text */
--ainative-fg-2     /* Secondary text */
--ainative-fg-3     /* Tertiary text */
```

The panel automatically adapts to dark/light themes.

## Features

### Copy & Export

- **Copy Individual Results**: Copy button on each tool result
- **Copy All**: Copies all results as JSON
- **Export**: Downloads results as JSON file

### Collapsible Sections

All sections can be expanded/collapsed:
- Individual tool results
- Execution log
- Content previews

### Responsive Design

Mobile-friendly layout with:
- Stacked metrics on narrow screens
- Collapsible function details
- Touch-friendly controls

## Future Enhancements

### Backend Integration (when available)

If backend adds tool execution details to responses:

1. Check response metadata for `toolsUsed` array:
```typescript
if (message.metadata?.toolsUsed) {
  // Use structured data instead of parsing
}
```

2. Add `/api/v1/tool-logs` endpoint support:
```typescript
const logs = await fetch(`/api/v1/tool-logs?threadId=${threadId}`);
```

3. Real-time execution status via WebSocket

### Enhanced Parsing

- Improve accuracy with more sophisticated NLP
- Support additional tool types
- Extract more detailed metrics

## Testing

To test the panel:

1. Trigger a code intelligence operation:
```typescript
// In chat
"Analyze the complexity of this Python code: [paste code]"
```

2. Trigger a web fetch operation:
```typescript
// In chat
"Fetch documentation for Python's os module"
```

3. Verify parsing:
```typescript
import { parseToolExecutions } from './tool-results';

const executions = parseToolExecutions(
  assistantResponse,
  messageIndex,
  threadId
);
console.log(executions);
```

## API Reference

### ToolResultsPanel Props

```typescript
interface ToolResultsPanelProps {
  messageContent: string;    // Assistant response text
  messageIndex: number;      // Message index in thread
  threadId: string;         // Current thread ID
  showLog?: boolean;        // Show execution log
  onClose?: () => void;     // Close handler
}
```

### useToolResults Hook

```typescript
function useToolResults(
  messageContent: string,
  messageIndex: number,
  threadId: string
): ParsedToolExecution[]
```

Returns array of parsed tool executions, memoized for performance.

### ParsedToolExecution Type

```typescript
interface ParsedToolExecution {
  toolName: 'code_intelligence' | 'web_fetch' | 'unknown';
  operation?: string;
  timestamp: Date;
  messageIndex: number;
  threadId: string;
  result: CodeIntelligenceResult | WebFetchResult | null;
}
```

## Troubleshooting

### Tool not detected

Check if response text matches patterns in `parseToolResults.ts`. Add custom patterns if needed:

```typescript
const customPatterns = [
  /your custom pattern/i
];
```

### Incorrect parsing

The parser uses heuristics. For complex responses, consider:
1. Adding more specific patterns
2. Improving JSON extraction logic
3. Fallback to raw text display

### Styling issues

Ensure CSS variables are defined in your theme:
```css
:root {
  --ainative-bg-0: #1e1e1e;
  /* ... other variables */
}
```

## Contributing

When adding new tool types:

1. Add type to `types.ts`
2. Add detection patterns to `parseToolResults.ts`
3. Create view component (e.g., `NewToolView.tsx`)
4. Update `ToolResultsPanel.tsx` switch statement
5. Add styles to `tool-results.css`
6. Export from `index.tsx`
7. Update this README

## License

MIT License - Copyright (c) AINative Studio
