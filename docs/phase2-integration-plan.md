# Phase 2 Integration Plan: Advanced Tools & Usage Tracking

**Date:** January 7, 2026
**Status:** In Progress
**Backend Epic:** #625 Complete
**Frontend Epic:** TBD

---

## Overview

This document outlines the integration plan for Phase 2 backend features into AINative Studio IDE. The backend team has completed all APIs for Code Intelligence, Web Fetch tools, and enhanced usage tracking. Our goal is to integrate these capabilities into the existing IDE architecture while maintaining the current user experience.

## Architecture Analysis

### Existing IDE Structure

**Location:** `ainative-studio/src/vs/workbench/contrib/ainative/`

```
ainative/
├── browser/              # Renderer process services (UI-related)
│   ├── chatThreadService.ts
│   ├── toolsService.ts
│   ├── editCodeService.ts
│   └── react/            # React UI components
├── common/               # Shared between main and renderer
│   ├── ainativeCloudAuthService.ts
│   ├── usageTrackingService.ts (existing)
│   ├── sendLLMMessageService.ts
│   └── ainativeSettingsService.ts
└── electron-main/        # Main process (Node.js access)
```

### Integration Points

1. **Authentication Layer** - Extend existing `AINativeCloudAuthService` to support API key authentication
2. **Chat Service** - Integrate with existing `chatThreadService` for tool calling
3. **Usage Tracking** - Enhance existing `usageTrackingService` with tool overhead metrics
4. **Tools Service** - Extend existing `toolsService` with new cloud tools
5. **UI Components** - Add React components for tool results and usage dashboard

---

## Implementation Tasks

### Phase 1: Core Services (Week 1)

#### 1.1 Create AINative Cloud API Client Service

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/common/ainativeCloudAPIService.ts`

**Purpose:** Central service for all Phase 2 backend API calls

**Features:**
- Chat completions with tool calling
- Tool execution (code intelligence, web fetch)
- Usage stats retrieval
- Tool execution logs

**Dependencies:**
- Existing `AINativeCloudAuthService` for authentication
- Existing `usageTrackingService` for local tracking

**Interface:**
```typescript
interface IAINativeCloudAPIService {
  // Chat completion with tool calling
  sendChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  // Tool operations
  executeCodeIntelligence(params: CodeIntelligenceParams): Promise<CodeIntelligenceResult>;
  fetchWebDocumentation(url: string, query?: string): Promise<WebFetchResult>;

  // Usage & Analytics
  getUserUsageStats(period?: string): Promise<UsageStats>;
  getToolOverheadStats(dateRange?: DateRange): Promise<ToolOverheadStats>;
  getToolExecutionLogs(filters?: LogFilters): Promise<ToolExecutionLog[]>;
}
```

#### 1.2 Create Code Intelligence Service

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/common/codeIntelligenceService.ts`

**Purpose:** High-level service for code analysis operations

**Features:**
- Parse code to AST
- Find symbols and references
- Calculate complexity metrics
- Get function signatures

**Integration:** Works as a wrapper around the Cloud API service, provides IDE-friendly interface

#### 1.3 Create Web Fetch Service

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/common/webFetchService.ts`

**Purpose:** Service for fetching documentation from web

**Features:**
- Fetch from whitelisted domains
- Search documentation
- Cache results locally
- Convert HTML to markdown

#### 1.4 Extend Usage Tracking Service

**File:** Modify existing `ainative-studio/src/vs/workbench/contrib/ainative/common/usageTrackingService.ts`

**Enhancements:**
- Add `tool_call_count` tracking
- Add `tool_overhead_tokens` calculation
- Add `tool_schema_tokens` and `tool_result_tokens`
- Add `iteration_count` for agentic loops
- Sync tool usage with cloud API

**New Methods:**
```typescript
interface IUsageTrackingService {
  // Existing methods remain...

  // NEW: Track tool usage with overhead
  trackToolUsage(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    toolOverhead: ToolOverheadMetrics
  ): Promise<void>;

  // NEW: Get tool overhead stats
  getToolOverheadStats(period?: UsagePeriod): Promise<ToolOverheadStats>;
}
```

#### 1.5 Create Tool Execution Log Service

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/common/toolExecutionLogService.ts`

**Purpose:** Track and display tool execution history for debugging

**Features:**
- Log every tool call (local + cloud)
- Filter by tool name, success status, date range
- Display in debug panel
- Export logs for analysis

---

### Phase 2: Chat Integration (Week 2)

#### 2.1 Extend Chat Thread Service

**File:** Modify `ainative-studio/src/vs/workbench/contrib/ainative/browser/chatThreadService.ts`

**Changes:**
- Add support for cloud tool calling in addition to existing builtin tools
- Integrate with `AINativeCloudAPIService` for chat completions
- Track tool executions in chat messages
- Display tool results inline in chat

**New Message Types:**
```typescript
interface ToolCallMessage extends ChatMessage {
  role: 'assistant';
  tool_calls: Array<{
    tool_name: 'code_intelligence' | 'web_fetch';
    input: object;
    output: object;
    success: boolean;
    execution_time_ms: number;
  }>;
}
```

#### 2.2 Update Send LLM Message Service

**File:** Modify `ainative-studio/src/vs/workbench/contrib/ainative/common/sendLLMMessageService.ts`

**Changes:**
- Route requests to cloud API when cloud tools are enabled
- Fall back to existing BYOK flow when cloud tools are disabled
- Track usage with tool overhead metrics
- Handle streaming responses (prepare for future)

---

### Phase 3: UI Components (Week 2-3)

#### 3.1 Code Intelligence Panel (React Component)

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/code-intelligence/`

**Components:**
- `CodeIntelligencePanel.tsx` - Main panel component
- `ComplexityMetrics.tsx` - Display complexity results
- `SymbolFinder.tsx` - Display found symbols
- `ASTViewer.tsx` - Visualize parsed AST

**Features:**
- Show real-time code analysis
- Display complexity metrics with color coding
- Interactive symbol navigation
- Export analysis results

#### 3.2 Web Fetch Documentation Panel

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/web-fetch/`

**Components:**
- `WebFetchPanel.tsx` - Main panel
- `DocumentationViewer.tsx` - Display fetched docs as markdown
- `DomainSelector.tsx` - Whitelisted domain selector
- `SearchBar.tsx` - Search within documentation

**Features:**
- Fetch and display documentation
- Markdown rendering with syntax highlighting
- Search within fetched content
- Cache management

#### 3.3 Usage Dashboard Component

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/usage-dashboard/`

**Components:**
- `UsageDashboard.tsx` - Main dashboard
- `TokenUsageChart.tsx` - Visualize token usage over time
- `ToolOverheadBreakdown.tsx` - Show tool overhead by tool type
- `CostCalculator.tsx` - Estimate costs
- `QuotaStatus.tsx` - Show quota limits and warnings

**Features:**
- Real-time usage statistics
- Tool overhead visualization
- Cost breakdown by model and tool
- Quota warnings
- Export usage reports

#### 3.4 Tool Execution Log Panel

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/tool-logs/`

**Components:**
- `ToolLogPanel.tsx` - Main debug panel
- `LogEntry.tsx` - Individual log entry
- `LogFilters.tsx` - Filter controls
- `LogExporter.tsx` - Export functionality

**Features:**
- Real-time log streaming
- Filter by tool, status, date
- Expandable entries with full details
- Performance metrics display
- Export logs as JSON/CSV

---

### Phase 4: Commands & Shortcuts (Week 3)

#### 4.1 New Commands

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/ainativeCommands.ts`

**Commands:**
```typescript
// Code Intelligence
'ainative.analyzeCodeComplexity'
'ainative.findSymbol'
'ainative.parseAST'

// Web Fetch
'ainative.fetchDocumentation'
'ainative.searchDocumentation'

// Usage & Analytics
'ainative.showUsageDashboard'
'ainative.showToolLogs'
'ainative.exportUsageReport'

// Tool Panels
'ainative.toggleCodeIntelligencePanel'
'ainative.toggleWebFetchPanel'
'ainative.toggleToolLogPanel'
```

#### 4.2 Keyboard Shortcuts

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts`

**Shortcuts:**
```
Cmd/Ctrl + Shift + A    → Analyze Selected Code
Cmd/Ctrl + Shift + D    → Fetch Documentation
Cmd/Ctrl + Shift + U    → Show Usage Dashboard
Cmd/Ctrl + Shift + L    → Show Tool Logs
```

---

### Phase 5: Testing (Week 3-4)

#### 5.1 Unit Tests

**Files:**
```
ainative-studio/src/vs/workbench/contrib/ainative/test/common/
├── ainativeCloudAPIService.test.ts
├── codeIntelligenceService.test.ts
├── webFetchService.test.ts
├── usageTrackingService.test.ts (enhanced)
└── toolExecutionLogService.test.ts
```

**Coverage Goals:**
- Service initialization and configuration
- API request/response handling
- Error handling and retry logic
- Authentication integration
- Usage tracking accuracy

#### 5.2 Integration Tests

**Files:**
```
ainative-studio/src/vs/workbench/contrib/ainative/test/browser/
├── chatThreadWithTools.test.ts
├── toolCallingFlow.test.ts
└── usageDashboard.test.ts
```

**Test Scenarios:**
- Chat with automatic tool calling
- Code analysis workflow
- Documentation fetching workflow
- Usage tracking end-to-end
- Tool execution logging

#### 5.3 UI Component Tests

**Files:**
```
ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/__tests__/
├── CodeIntelligencePanel.test.tsx
├── WebFetchPanel.test.tsx
├── UsageDashboard.test.tsx
└── ToolLogPanel.test.tsx
```

---

## API Integration Details

### Authentication

**Current:** IDE uses `AINativeCloudAuthService` with JWT tokens

**Phase 2 Requirement:** Backend expects `X-API-Key` header

**Solution:**
1. Add API key management to `AINativeCloudAuthService`
2. Store API key in encrypted storage
3. Add UI for users to enter/manage API key
4. Include API key in all Phase 2 API requests

**Storage:**
```typescript
// Add to AINativeCloudAuthService
private static readonly STORAGE_KEY_API_KEY = 'ainative.cloud.auth.apiKey';

async setAPIKey(apiKey: string): Promise<void> {
  const encrypted = await this.encryptionService.encrypt(apiKey);
  this.storageService.store(
    AINativeCloudAuthService.STORAGE_KEY_API_KEY,
    encrypted,
    StorageScope.APPLICATION,
    StorageTarget.MACHINE
  );
}

async getAPIKey(): Promise<string | null> {
  const encrypted = this.storageService.get(
    AINativeCloudAuthService.STORAGE_KEY_API_KEY,
    StorageScope.APPLICATION
  );
  return encrypted ? await this.encryptionService.decrypt(encrypted) : null;
}
```

### Request Headers

**All Phase 2 API Requests:**
```typescript
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': await this.cloudAuthService.getAPIKey()
}
```

### Error Handling

**Common Errors:**
- `401 Unauthorized` - Invalid/missing API key
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Backend error

**Handling Strategy:**
1. Display user-friendly error messages
2. Retry with exponential backoff for 429/500
3. Prompt for API key re-entry on 401
4. Log errors to tool execution log service

---

## Configuration & Settings

### New Settings

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/common/ainativeSettingsTypes.ts`

**Add:**
```typescript
interface AINativeSettings {
  // Existing settings...

  // NEW: Phase 2 Settings
  cloudTools: {
    enabled: boolean;                    // Enable cloud tools
    apiKey: string;                      // User's API key
    autoToolCalling: boolean;            // Auto-enable tools in chat
    preferredTools: ('code_intelligence' | 'web_fetch')[];
    maxToolIterations: number;           // Max iterations (1-10)
    cacheWebFetch: boolean;              // Cache documentation
    showToolLogs: boolean;               // Show debug logs
  };

  usageTracking: {
    trackToolOverhead: boolean;          // Track tool overhead
    showCostEstimates: boolean;          // Show cost in UI
    quotaWarningThreshold: number;       // 0.0 - 1.0
  };
}
```

### Settings UI

**File:** `ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/settings/`

**Add New Settings Panel:**
- Cloud Tools section
- API key input (masked)
- Tool preferences
- Usage tracking preferences

---

## User Experience Flow

### 1. First-Time Setup

```
1. User installs AINative Studio IDE
2. IDE prompts for AINative Cloud account
3. User logs in with email/password (existing flow)
4. IDE displays: "Get API Key for Advanced Features"
5. User clicks "Get API Key" → Opens https://www.ainative.studio/dashboard/api-keys
6. User copies API key
7. IDE prompts for API key → User pastes
8. IDE validates API key → Success
9. Advanced tools now enabled in chat
```

### 2. Using Code Intelligence

```
1. User selects code in editor
2. User opens chat panel (existing)
3. User types: "Analyze this code's complexity"
4. IDE auto-enables code_intelligence tool
5. Chat displays: "🛠️ Using code_intelligence..."
6. Tool executes on backend
7. Results displayed in:
   - Chat message (summary)
   - Code Intelligence panel (detailed)
8. User can:
   - View metrics
   - Find symbols
   - Export results
```

### 3. Fetching Documentation

```
1. User types in chat: "Show me FastAPI dependency injection docs"
2. IDE auto-enables web_fetch tool
3. Chat displays: "🌐 Fetching from fastapi.tiangolo.com..."
4. Documentation fetched and converted to markdown
5. Results displayed in:
   - Chat message (summary + link)
   - Web Fetch panel (full markdown)
6. User can:
   - Search within docs
   - Copy code examples
   - Navigate to source
```

### 4. Monitoring Usage

```
1. User clicks "Usage" button in status bar
2. Usage Dashboard opens showing:
   - Today's token usage
   - Tool overhead breakdown
   - Cost estimates
   - Quota status
3. User can:
   - Filter by date range
   - View by model/tool
   - Export reports
   - Adjust quota warnings
```

### 5. Debugging Tool Calls

```
1. User opens Tool Logs panel (Cmd+Shift+L)
2. Real-time log of all tool executions:
   ✅ code_intelligence | 145ms | Complexity: 5
   ✅ web_fetch | 823ms | 45KB
   ❌ web_fetch | 12ms | Domain not whitelisted
3. User can:
   - Click to see full details
   - Filter by success/failure
   - Export logs for support
```

---

## Migration & Backwards Compatibility

### Existing Users

- All existing functionality remains unchanged
- Phase 2 features are opt-in (require API key)
- BYOK (Bring Your Own Key) model still supported
- Existing chat, autocomplete, edit features work as before

### Storage Migration

- No migration needed (new storage keys)
- Existing usage data preserved
- New tool overhead metrics added separately

### Settings Migration

- Add new settings with defaults
- Existing settings untouched
- Prompt users to enable Phase 2 features

---

## Performance Considerations

### Token Usage Optimization

**Problem:** Tool calling adds overhead (schema + results)

**Solutions:**
1. Use `tool_subset` to limit available tools per request
2. Cache web fetch results locally
3. Show cost estimates before executing
4. Allow users to disable auto-tool-calling

### Response Time

**Expected:**
- Chat with tools: 3-8 seconds
- Code intelligence: < 4 seconds
- Web fetch: < 5 seconds

**UI Improvements:**
- Show progress indicators
- Display "Thinking..." state
- Stream responses when available (future)
- Show tool execution time in logs

### Local Caching

**Cache:**
- Web fetch results (1 hour TTL)
- Code intelligence for unchanged files (30 minutes)
- Usage stats (5 minutes)

**Storage:**
```typescript
// In-memory cache with TTL
class CacheService {
  private cache: Map<string, { data: any; expires: number }>;

  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, { data, expires: Date.now() + ttlMs });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
}
```

---

## Deployment Checklist

### Development

- [ ] Create all service files
- [ ] Implement API client
- [ ] Add authentication support
- [ ] Build React UI components
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test with development API

### Staging

- [ ] Deploy to staging environment
- [ ] Test with staging API keys
- [ ] Verify usage tracking accuracy
- [ ] Test rate limiting
- [ ] Test error handling
- [ ] Performance testing

### Production

- [ ] Update product.json version
- [ ] Create release notes
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Monitor usage/performance
- [ ] Gather user feedback

---

## Success Metrics

### Technical Metrics

- API response time < 5s for 95th percentile
- Error rate < 1% for tool executions
- Usage tracking accuracy 100%
- Test coverage > 80%

### User Experience Metrics

- Time to first tool use < 2 minutes (after setup)
- Tool usage adoption > 30% of active users
- Positive feedback > 80% on new features
- Support tickets < 5% related to Phase 2

### Business Metrics

- API key activation rate > 50% of logged-in users
- Average tools per session > 2
- User retention improvement (baseline vs. Phase 2)
- Cloud API usage growth

---

## Risks & Mitigation

### Risk 1: Backend API Downtime

**Impact:** Users cannot use cloud tools

**Mitigation:**
- Graceful fallback to BYOK mode
- Show clear error messages
- Cache results when possible
- Monitor backend health

### Risk 2: High Token Costs

**Impact:** Users exceed budgets

**Mitigation:**
- Show cost estimates before execution
- Quota warnings at 80% usage
- Allow disabling expensive tools
- Local caching to reduce requests

### Risk 3: Performance Issues

**Impact:** Slow IDE responsiveness

**Mitigation:**
- Async operations with loading states
- Background token usage syncing
- Throttle/debounce UI updates
- Optimize React components

### Risk 4: API Key Security

**Impact:** Key theft or exposure

**Mitigation:**
- Encrypted storage (existing)
- Never log API keys
- Prompt for re-entry on suspicious activity
- Support key rotation

---

## Future Enhancements (Post-Phase 2)

### Streaming Responses

- Real-time token streaming for chat
- Progressive tool result display
- Reduce perceived latency

### Additional Tools

- Terminal execution tool
- File system operations tool
- Git operations tool
- Testing framework tool

### Enhanced Analytics

- Team usage dashboards
- Cost attribution by project
- Tool effectiveness metrics
- A/B testing for tool recommendations

### Offline Mode

- Local code intelligence (without API)
- Cached documentation access
- Offline usage tracking sync

---

## Resources

### Documentation

- Backend API Docs: https://api.ainative.studio/docs-enhanced
- Handover Document: `/docs/development-guides/IDE_TEAM_HANDOVER_PHASE2_TOOLS.md`
- Backend Repo: https://github.com/AINative-Studio/core

### Team Contacts

- Backend Team: `#ide-integration` on Slack
- Product: `#product-ainative` on Slack
- Support: `backend@ainative.studio`

### API Endpoints

- Production: `https://api.ainative.studio`
- Staging: TBD
- Development: `http://localhost:8000`

---

## Timeline Summary

**Total Duration:** 3-4 weeks

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Core Services | API client, Code Intelligence, Web Fetch, Enhanced Usage Tracking |
| 2 | Chat Integration | Extended chat service, Tool calling integration, Message types |
| 2-3 | UI Components | React components for all panels and dashboards |
| 3 | Commands & Polish | Keyboard shortcuts, Commands, Settings UI |
| 3-4 | Testing & QA | Unit tests, Integration tests, E2E tests, Bug fixes |

---

## Conclusion

This plan provides a comprehensive roadmap for integrating Phase 2 backend capabilities into AINative Studio IDE. The architecture is designed to:

1. **Preserve existing functionality** - All current features remain unchanged
2. **Extend gracefully** - New services integrate with existing architecture
3. **Provide value incrementally** - Features can be rolled out in stages
4. **Optimize for performance** - Caching, async operations, cost controls
5. **Ensure quality** - Comprehensive testing at all levels

The integration leverages our existing patterns (dependency injection, service-based architecture, React UI components) while adding powerful new capabilities that enhance the developer experience.

**Next Steps:**
1. Review this plan with the team
2. Create GitHub issues for each major task
3. Begin Week 1 implementation
4. Set up weekly sync meetings to track progress
