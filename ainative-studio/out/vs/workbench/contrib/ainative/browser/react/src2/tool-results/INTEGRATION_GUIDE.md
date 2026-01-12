# Integration Guide: Tool Results Panel

Quick guide for integrating the Tool Results Panel into the chat interface.

## Quick Start

### Step 1: Import Components

In `SidebarChat.tsx`:

```tsx
import { ToolResultsPanel, useToolResults } from './tool-results';
```

### Step 2: Add to Message Rendering

Find where assistant messages are rendered and add the panel:

```tsx
{message.role === 'assistant' && (
  <>
    {/* Existing message content rendering */}
    <ChatMarkdownRender
      string={message.displayContent}
      chatMessageLocation={chatMessageLocation}
      isApplyEnabled={true}
      isLinkDetectionEnabled={true}
    />

    {/* NEW: Add tool results panel */}
    <ToolResultsPanel
      messageContent={message.displayContent}
      messageIndex={messageIdx}
      threadId={currentThreadId}
    />
  </>
)}
```

### Step 3: (Optional) Add Conditional Rendering

Only show panel when tools are detected:

```tsx
const toolResults = useToolResults(
  message.displayContent,
  messageIdx,
  currentThreadId
);

{message.role === 'assistant' && (
  <>
    <ChatMarkdownRender
      string={message.displayContent}
      chatMessageLocation={chatMessageLocation}
      isApplyEnabled={true}
      isLinkDetectionEnabled={true}
    />

    {/* Only render if tools detected */}
    {toolResults.length > 0 && (
      <ToolResultsPanel
        messageContent={message.displayContent}
        messageIndex={messageIdx}
        threadId={currentThreadId}
        showLog={true}
      />
    )}
  </>
)}
```

## Advanced Integration

### Custom Styling

Override default styles by adding to your component:

```tsx
<div className="custom-tool-results-wrapper">
  <ToolResultsPanel {...props} />
</div>

<style>
.custom-tool-results-wrapper .tool-results-panel {
  margin-top: 2rem;
  border-radius: 8px;
}
</style>
```

### Handling Tool Results Data

Access parsed results programmatically:

```tsx
import { useToolResults, ParsedToolExecution } from './tool-results';

const MyComponent = () => {
  const toolResults = useToolResults(content, idx, threadId);

  // Access code intelligence results
  const codeIntelResults = toolResults.filter(
    r => r.toolName === 'code_intelligence'
  );

  // Access complexity metrics
  codeIntelResults.forEach(result => {
    if (result.result?.type === 'code_intelligence' && result.result.complexity) {
      console.log('Average complexity:', result.result.complexity.averageComplexity);
    }
  });

  return <ToolResultsPanel {...props} />;
};
```

### Custom Copy Handler

Override default copy behavior:

```tsx
const handleCustomCopy = (result: ParsedToolExecution) => {
  const formatted = formatResultForCopy(result);
  navigator.clipboard.writeText(formatted);
  showNotification('Results copied!');
};

// Pass to individual views
<CodeIntelligenceView
  result={result}
  onCopy={() => handleCustomCopy(execution)}
/>
```

### Filtering Messages

Only show panel for specific message types:

```tsx
const shouldShowToolResults = (message: ChatMessage) => {
  // Only show for assistant messages
  if (message.role !== 'assistant') return false;

  // Only show if metadata indicates tools were used
  if (message.metadata?.toolsUsed?.length > 0) return true;

  // Or check content for tool patterns
  const hasToolMention = /code_intelligence|web_fetch/i.test(message.displayContent);
  return hasToolMention;
};

{shouldShowToolResults(message) && (
  <ToolResultsPanel {...props} />
)}
```

## Testing Integration

### 1. Test Code Intelligence Display

Send a message that triggers code analysis:

```
User: "Analyze this Python code for complexity:
def calculate(x, y):
    if x > 0:
        return x * y
    else:
        return 0
"

Expected Assistant Response:
"I've analyzed the code complexity. The function 'calculate' has a
cyclomatic complexity of 2 (line 1). Average complexity: 2.0."
```

Panel should display:
- Complexity metrics card
- Function details with complexity score
- Rank badge (A/B/C/D/E/F)

### 2. Test Web Fetch Display

Send a message requesting documentation:

```
User: "Fetch documentation for Python's os module"

Expected Assistant Response:
"I fetched the documentation from https://docs.python.org/3/library/os.html
The os module provides a portable way of using operating system functionality..."
```

Panel should display:
- URL with external link
- Markdown rendered content
- Metadata (size, type)

### 3. Test Execution Log

Enable log display to see timeline:

```tsx
<ToolResultsPanel
  {...props}
  showLog={true}
/>
```

Should show:
- Timestamp of execution
- Tool name and operation
- Status indicator (success/error)

## Common Integration Patterns

### Pattern 1: Inline with Message

```tsx
<div className="chat-message assistant">
  <div className="message-content">
    <ChatMarkdownRender {...contentProps} />
  </div>
  <ToolResultsPanel {...toolProps} />
</div>
```

### Pattern 2: Collapsible Section

```tsx
<div className="chat-message assistant">
  <ChatMarkdownRender {...contentProps} />

  {toolResults.length > 0 && (
    <details className="tool-results-details">
      <summary>View Tool Results ({toolResults.length})</summary>
      <ToolResultsPanel {...toolProps} />
    </details>
  )}
</div>
```

### Pattern 3: Separate Panel

```tsx
<div className="chat-layout">
  <div className="main-chat">
    <ChatMarkdownRender {...contentProps} />
  </div>

  {toolResults.length > 0 && (
    <aside className="tools-sidebar">
      <ToolResultsPanel {...toolProps} />
    </aside>
  )}
</div>
```

## Performance Considerations

### Memoization

The panel uses `useMemo` internally, but you can optimize further:

```tsx
const memoizedPanel = useMemo(
  () => (
    <ToolResultsPanel
      messageContent={message.displayContent}
      messageIndex={messageIdx}
      threadId={currentThreadId}
    />
  ),
  [message.displayContent, messageIdx, currentThreadId]
);

return memoizedPanel;
```

### Lazy Loading

Load panel only when visible:

```tsx
import { lazy, Suspense } from 'react';

const ToolResultsPanel = lazy(() => import('./tool-results'));

{toolResults.length > 0 && (
  <Suspense fallback={<div>Loading results...</div>}>
    <ToolResultsPanel {...props} />
  </Suspense>
)}
```

### Virtual Scrolling

For threads with many tool results, consider virtualization:

```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={toolResults.length}
  itemSize={200}
>
  {({ index, style }) => (
    <div style={style}>
      <ToolResultView execution={toolResults[index]} />
    </div>
  )}
</FixedSizeList>
```

## Troubleshooting Integration

### Panel Not Appearing

1. Check console for errors
2. Verify imports are correct
3. Ensure CSS is loaded:
```tsx
import './tool-results/tool-results.css';
```

### Styles Not Applied

1. Check CSS variable definitions
2. Verify theme provider wraps component
3. Use browser DevTools to inspect applied styles

### Parser Missing Tools

1. Check response format matches patterns
2. Add debug logging:
```tsx
console.log('Parsing:', message.displayContent);
const results = parseToolExecutions(...);
console.log('Found:', results);
```

3. Add custom patterns in `parseToolResults.ts`

## Migration from Manual Tool Display

If you have existing tool result rendering:

### Before
```tsx
{message.toolExecutions?.map(tool => (
  <div className="tool-result">
    {JSON.stringify(tool.result)}
  </div>
))}
```

### After
```tsx
<ToolResultsPanel
  messageContent={message.displayContent}
  messageIndex={messageIdx}
  threadId={currentThreadId}
/>
```

Benefits:
- Automatic parsing
- Rich formatting
- Interactive UI
- Copy/export built-in

## Next Steps

1. **Test Integration**: Send messages that trigger tools
2. **Customize Styling**: Adjust CSS to match your theme
3. **Add Analytics**: Track tool usage and user interactions
4. **Extend Parser**: Add patterns for your specific use cases
5. **Consider Backend**: Plan for structured tool data when available

## Need Help?

- Check `README.md` for component API
- Review `parseToolResults.ts` for parsing logic
- Examine examples in test files
- Refer to existing chat components for patterns

## Future Backend Integration

When backend provides structured tool data:

```tsx
// Check for structured data first
if (message.metadata?.toolExecutions) {
  return <ToolResultsPanel structured={message.metadata.toolExecutions} />;
}

// Fallback to parsing
return (
  <ToolResultsPanel
    messageContent={message.displayContent}
    messageIndex={messageIdx}
    threadId={currentThreadId}
  />
);
```

This maintains backward compatibility while leveraging new features.
