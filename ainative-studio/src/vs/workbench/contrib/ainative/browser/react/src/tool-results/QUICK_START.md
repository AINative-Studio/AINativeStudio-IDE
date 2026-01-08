# Tool Results Panel - Quick Start

30-second integration guide for displaying tool execution results.

## Installation

Components are already in the codebase at:
```
src/vs/workbench/contrib/ainative/browser/react/src/tool-results/
```

## Basic Usage

### 1. Import

```tsx
import { ToolResultsPanel } from './tool-results';
```

### 2. Add to Chat

```tsx
{message.role === 'assistant' && (
  <>
    <ChatMarkdownRender string={message.displayContent} {...props} />
    <ToolResultsPanel
      messageContent={message.displayContent}
      messageIndex={messageIdx}
      threadId={currentThreadId}
    />
  </>
)}
```

That's it! The panel automatically detects tool usage and displays results.

## What It Does

✅ Detects code_intelligence tool mentions
✅ Detects web_fetch tool mentions
✅ Extracts complexity metrics
✅ Displays function complexity with A-F ranking
✅ Shows symbols, imports, references
✅ Renders fetched documentation
✅ Provides copy/export functionality

## Example Messages

### Code Intelligence
```
User: "Analyze this code for complexity"
Assistant: "I analyzed the code. Function calculate has complexity 15..."
→ Panel displays: Metrics, function breakdown, complexity ranking
```

### Web Fetch
```
User: "Get Python os module docs"
Assistant: "I fetched from https://docs.python.org..."
→ Panel displays: URL, rendered markdown, metadata
```

## Conditional Rendering

Only show when tools are detected:

```tsx
import { useToolResults, ToolResultsPanel } from './tool-results';

const toolResults = useToolResults(message.displayContent, messageIdx, threadId);

{toolResults.length > 0 && (
  <ToolResultsPanel {...props} />
)}
```

## Props Reference

```typescript
interface ToolResultsPanelProps {
  messageContent: string;    // Required: Assistant response text
  messageIndex: number;      // Required: Message index in thread
  threadId: string;         // Required: Current thread ID
  showLog?: boolean;        // Optional: Show execution log
  onClose?: () => void;     // Optional: Close handler
}
```

## Features

- **Copy**: Copy individual or all results
- **Export**: Download as JSON
- **Expand/Collapse**: All sections collapsible
- **Sort**: Functions by name or complexity
- **Filter**: Execution log by status
- **Responsive**: Works on mobile

## Styling

Automatically uses VS Code theme:

```css
--ainative-bg-0    /* Background */
--ainative-fg-1    /* Text */
```

Custom styling:

```css
.tool-results-panel {
  margin: 2rem 0;
}
```

## Troubleshooting

**Panel not showing?**
- Check console for errors
- Verify imports are correct
- Ensure CSS is loaded

**Tools not detected?**
- Response must mention tool usage
- Check patterns in `parseToolResults.ts`
- Add debug logging

## More Info

- **Full Docs**: See `README.md`
- **Integration**: See `INTEGRATION_GUIDE.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`

## Examples

### Basic
```tsx
<ToolResultsPanel
  messageContent={message.displayContent}
  messageIndex={idx}
  threadId={threadId}
/>
```

### With Log
```tsx
<ToolResultsPanel
  messageContent={message.displayContent}
  messageIndex={idx}
  threadId={threadId}
  showLog={true}
/>
```

### With Close Handler
```tsx
<ToolResultsPanel
  messageContent={message.displayContent}
  messageIndex={idx}
  threadId={threadId}
  onClose={() => setShowPanel(false)}
/>
```

## Testing

Send these messages to test:

```
"Analyze this Python code for complexity: def foo(): return 1"
"Fetch documentation for Python's os module"
```

## Build

```bash
npm run buildreact  # Build React components
npm run compile     # Compile TypeScript
```

---

**Ready to integrate?** Just copy the "Add to Chat" code above into your chat component!
