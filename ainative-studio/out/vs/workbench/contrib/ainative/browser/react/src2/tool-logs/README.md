# Tool Logs Panel

Comprehensive tool execution logging and debugging UI for AINative Studio IDE.

## Overview

The Tool Logs Panel provides complete visibility into tool executions including code intelligence operations, web fetches, file operations, and search queries. It offers powerful filtering, sorting, pagination, and export capabilities for analyzing and debugging tool usage.

## Features

### Core Functionality
- **Real-time Log Viewing**: View all tool executions with detailed information
- **Advanced Filtering**: Filter by tool type, status, date range, and search queries
- **Multi-column Sorting**: Sort by timestamp, duration, tool type, or status
- **Pagination**: Handle large datasets with configurable page sizes
- **Detailed View**: Inspect full execution details including input/output/errors
- **Statistics Dashboard**: View aggregated metrics and success rates
- **Export Capabilities**: Export logs to JSON, CSV, or text formats

### Tool Types Supported
- **Code Intelligence**: Complexity analysis, AST parsing, symbol finding
- **Web Fetch**: Documentation retrieval, URL fetching
- **File Operations**: File reading, writing, directory operations
- **Search**: Code search, file search

### Execution Statuses
- `success`: Completed successfully
- `error`: Failed with error
- `timeout`: Execution timed out
- `cancelled`: Manually cancelled
- `pending`: Waiting to execute
- `running`: Currently executing

## Installation & Usage

### Basic Usage

```tsx
import { ToolLogsPanel } from './tool-logs';

function MyComponent() {
  return (
    <ToolLogsPanel
      showStatistics={true}
      height="600px"
    />
  );
}
```

### With Thread Filter

```tsx
<ToolLogsPanel
  threadId="thread-123"
  initialFilter={{
    toolTypes: ['code_intelligence'],
    statuses: ['success']
  }}
/>
```

### Custom Height

```tsx
<ToolLogsPanel height="100vh" />
```

## Backend Integration

### Expected Endpoint: `/api/v1/tool-logs`

#### GET Request Parameters

```typescript
GET /api/v1/tool-logs?page=1&pageSize=25&sortBy=timestamp&sortDirection=desc

Query Parameters:
- page: number (default: 1)
- pageSize: number (default: 25)
- sortBy: 'timestamp' | 'duration' | 'toolType' | 'status'
- sortDirection: 'asc' | 'desc'
- toolTypes: string (comma-separated)
- statuses: string (comma-separated)
- startDate: ISO 8601 date string
- endDate: ISO 8601 date string
- threadId: string
- search: string
- minDuration: number (milliseconds)
- maxDuration: number (milliseconds)
```

#### Expected Response Format

```typescript
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-123",
        "toolType": "code_intelligence",
        "operation": "analyze_complexity",
        "status": "success",
        "timestamp": "2026-01-08T12:00:00Z",
        "duration": 1234,
        "threadId": "thread-456",
        "messageIndex": 5,
        "input": {
          "parameters": { /* operation-specific */ },
          "sizeBytes": 5000
        },
        "output": {
          "data": { /* operation-specific */ },
          "sizeBytes": 15000,
          "contentType": "application/json"
        },
        "tokens": {
          "input": 500,
          "output": 1200,
          "total": 1700
        },
        "cost": 0.034,
        "model": "gpt-4"
      }
    ],
    "total": 156,
    "page": 1,
    "pageSize": 25,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "statistics": {
    "totalExecutions": 156,
    "successfulExecutions": 142,
    "failedExecutions": 14,
    "averageDuration": 2340,
    "totalTokens": 45678,
    "totalCost": 12.34,
    "byToolType": {
      "code_intelligence": {
        "count": 78,
        "successRate": 0.92,
        "averageDuration": 1800
      }
    }
  }
}
```

### Fallback Behavior

If the `/api/v1/tool-logs` endpoint is not available, the panel automatically falls back to **mock data generation** for development and testing purposes.

To check endpoint availability:
```bash
curl -I https://api.ainative.studio/api/v1/tool-logs/health
```

## Component Structure

```
tool-logs/
├── types.ts                    # TypeScript type definitions
├── toolLogsService.ts          # Data fetching and mock generation
├── utils.ts                    # Utility functions
├── ToolLogsPanel.tsx           # Main container component
├── ToolLogsFilter.tsx          # Filter UI
├── ToolLogsTable.tsx           # Table view with sorting/pagination
├── ToolLogDetails.tsx          # Detailed log entry view
├── ToolLogsStatistics.tsx      # Statistics dashboard
├── ExportDialog.tsx            # Export dialog
├── tool-logs.css               # Styles
├── index.tsx                   # Module exports
└── README.md                   # This file
```

## API Reference

### ToolLogsPanel Props

```typescript
interface ToolLogsPanelProps {
  /**
   * Optional initial filter
   */
  initialFilter?: ToolLogsFilter;

  /**
   * Optional thread ID to filter by
   */
  threadId?: string;

  /**
   * Show statistics panel (default: true)
   */
  showStatistics?: boolean;

  /**
   * Height of the panel (default: '100%')
   */
  height?: string;
}
```

### ToolLogsFilter Type

```typescript
interface ToolLogsFilter {
  toolTypes?: ToolType[];
  statuses?: ExecutionStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  threadId?: string;
  searchQuery?: string;
  minDuration?: number;
  maxDuration?: number;
}
```

### ToolExecutionLog Type

```typescript
interface ToolExecutionLog {
  id: string;
  toolType: ToolType;
  operation: string;
  status: ExecutionStatus;
  timestamp: Date;
  duration?: number;
  threadId: string;
  messageIndex: number;
  input: ToolInput;
  output?: ToolOutput;
  error?: ToolError;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  model?: string;
  metadata?: Record<string, any>;
}
```

## Service Functions

### fetchToolLogs

Fetch paginated tool logs with filtering and sorting.

```typescript
async function fetchToolLogs(
  filter?: ToolLogsFilter,
  sort?: ToolLogsSortOptions,
  pagination?: PaginationOptions
): Promise<PaginatedToolLogs>
```

### fetchToolLogsStatistics

Fetch aggregated statistics for tool executions.

```typescript
async function fetchToolLogsStatistics(
  filter?: ToolLogsFilter
): Promise<ToolLogsStatistics>
```

### exportToolLogs

Export logs to specified format.

```typescript
function exportToolLogs(
  logs: ToolExecutionLog[],
  format: 'json' | 'csv' | 'text'
): string
```

### downloadFile

Trigger browser download of content.

```typescript
function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void
```

## Styling

The panel uses VS Code theme variables for consistent styling:

```css
--ainative-bg-0     /* Primary background */
--ainative-bg-1     /* Secondary background */
--ainative-bg-2     /* Border color */
--ainative-fg-1     /* Primary text */
--ainative-fg-2     /* Secondary text */
--vscode-*          /* All VS Code theme variables */
```

Custom CSS classes follow BEM naming convention:
- `.tool-logs-panel`
- `.tool-logs-header`
- `.tool-logs-filter`
- `.tool-logs-table`
- `.tool-log-details`
- etc.

## Features in Detail

### 1. Filtering

Users can filter logs by:
- **Tool Types**: Select one or more tool types
- **Status**: Filter by execution status
- **Date Range**: Specify start and end dates
- **Search**: Full-text search across all fields
- **Duration**: Filter by execution time range

### 2. Sorting

Click column headers to sort by:
- Timestamp (default: newest first)
- Duration
- Tool Type
- Status

Toggle between ascending/descending order.

### 3. Pagination

- Configurable page sizes: 10, 25, 50, 100
- Previous/Next navigation
- Page indicator with total pages
- Results count display

### 4. Detail View

Click any log entry to view:
- Full execution overview
- Input parameters (with JSON viewer)
- Output/result data (with JSON viewer)
- Error details (if failed)
- Token usage metrics
- Cost information
- Metadata

### 5. Statistics Dashboard

Displays:
- Total executions
- Success/failure counts
- Success rate percentage
- Average execution duration
- Total tokens used
- Total cost
- Per-tool-type breakdown

### 6. Export

Export logs in three formats:
- **JSON**: Complete structured data
- **CSV**: Spreadsheet-compatible format
- **Text**: Human-readable plain text

### 7. Auto-refresh

Toggle auto-refresh to update logs every 5 seconds for real-time monitoring.

## Development

### Mock Data

When the backend endpoint is unavailable, the service generates realistic mock data with:
- 100 sample log entries
- Random tool types and statuses
- Realistic timestamps (last 7 days)
- Proper input/output structures
- Token counts and costs

### Testing

```typescript
import { fetchToolLogs, fetchToolLogsStatistics } from './toolLogsService';

// Test data fetching
const logs = await fetchToolLogs();
console.log(logs);

// Test with filters
const filtered = await fetchToolLogs({
  toolTypes: ['code_intelligence'],
  statuses: ['success']
});

// Test statistics
const stats = await fetchToolLogsStatistics();
console.log(stats);
```

### Customization

To add new tool types:

1. Update `ToolType` in `types.ts`
2. Add icon mapping in `utils.ts` (`getToolTypeIcon`)
3. Add mock data generation in `toolLogsService.ts`
4. Update backend API to support new type

## Browser Compatibility

- Modern browsers with ES2020+ support
- Requires CSS Grid and Flexbox
- Uses Fetch API for network requests
- Clipboard API for copy functionality

## Performance

- Virtualized table rendering for large datasets
- Debounced search input
- Memoized filter/sort operations
- Lazy-loaded detail panels
- Optimized re-renders with React.memo

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Screen reader compatible
- High contrast mode support
- Focus indicators

## Troubleshooting

### No logs displayed
1. Check backend endpoint availability
2. Verify authentication
3. Check browser console for errors
4. Review filter settings

### Slow performance
1. Reduce page size
2. Narrow date range filter
3. Clear browser cache
4. Check network latency

### Export fails
1. Check browser pop-up blocker
2. Verify file permissions
3. Try different export format

## Future Enhancements

### Planned Features
- Real-time updates via WebSocket/SSE
- Advanced analytics dashboard
- Custom date range presets
- Saved filter configurations
- Log comparison view
- Performance trend charts
- Alerts for failed executions

### Backend Integration TODO
- Implement `/api/v1/tool-logs` endpoint
- Add `/api/v1/tool-logs/statistics` endpoint
- Add `/api/v1/tool-logs/health` health check
- Support Server-Sent Events for real-time updates
- Add batch export endpoint for large datasets

## License

MIT License - Copyright (c) AINative Studio

## Contributing

1. Follow existing code structure and naming conventions
2. Add TypeScript types for all new interfaces
3. Write unit tests for service functions
4. Update this README for new features
5. Ensure accessibility compliance
6. Test with both mock and real backend data

## Support

For issues or questions:
- File a GitHub issue
- Check existing documentation
- Review backend API specification
- Contact AINative Studio support
