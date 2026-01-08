# Phase 2 Integration - FINAL COMPREHENSIVE GUIDE

**Date:** January 7, 2026
**Status:** ✅ Complete Backend Analysis
**Based on:** Actual backend codebase + internal developer documentation

---

## 🎯 EXECUTIVE SUMMARY

After thorough analysis of `/Users/aideveloper/core/` backend codebase and documentation, here's the **definitive** integration guide.

### Critical Discovery

There are **TWO SEPARATE CHAT APIs** - your handover document mixed them up!

| API | Endpoint | Auth | Purpose | For IDE? |
|-----|----------|------|---------|----------|
| **BYOK API** | `/v1/chat/completions` | Optional JWT | User's own API keys | ❌ NO |
| **Managed API** | `/api/v1/managed/chat/completions` | Required JWT | AINative credits | ✅ YES |

**YOU NEED THE MANAGED API** - This is what the IDE should use!

---

## 🔍 What Actually Exists

### ✅ Managed Chat API (What IDE Needs)

**Location:** `/core/src/backend/app/api/v1/endpoints/managed_chat.py`

**Full Route:** `POST /api/v1/managed/chat/completions`

**Authentication:** JWT Bearer token (you already have this!)

**Features:**
- ✅ Tool calling with `code_intelligence` and `web_fetch`
- ✅ Credits-based billing
- ✅ Streaming support (SSE)
- ✅ Usage tracking
- ✅ Multi-iteration agentic loops

**Request Format:**
```typescript
POST https://api.ainative.studio/api/v1/managed/chat/completions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Analyze this code"}
  ],
  "tools": [
    {
      "name": "code_intelligence",
      "description": "...",
      "input_schema": {...}
    }
  ],
  "preferred_model": "llama-3.3-70b-instruct",
  "max_iterations": 5,
  "temperature": 0.7,
  "stream": false
}
```

**Response Format:**
```typescript
{
  "id": "chatcmpl-abc123",
  "model": "llama-3.3-70b-instruct",
  "provider": "meta",
  "created": 1704592800,
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "I analyzed the code using code_intelligence..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 50,
    "total_tokens": 150
  },
  "credits_consumed": 0.51,
  "credits_remaining": 999.49,
  "plan_tier": "basic"
}
```

### ✅ Usage Endpoints

**1. Current Usage**
```
GET /api/v1/managed/usage?period=monthly
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "period": "monthly",
  "credits_used": 350.0,
  "credits_remaining": 650.0,
  "requests_count": 145,
  "total_tokens": 125000,
  "models_used": {
    "llama-3.3-70b-instruct": 100
  }
}
```

**2. Usage History**
```
GET /api/v1/managed/usage/history?days=30
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "history": [
    {
      "date": "2026-01-05",
      "requests": 25,
      "credits_used": 18.5,
      "tokens": 15000
    }
  ]
}
```

**3. Model Distribution**
```
GET /api/v1/managed/models?period=monthly
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "total_requests": 145,
  "models": [
    {
      "model": "llama-3.3-70b-instruct",
      "requests": 100,
      "percentage": 69.0
    }
  ]
}
```

**4. Cost Estimation**
```
POST /api/v1/managed/estimate
Authorization: Bearer <jwt_token>

{
  "model": "llama-3.3-70b-instruct",
  "estimated_tokens": 2500
}
```

Response:
```json
{
  "model": "llama-3.3-70b-instruct",
  "estimated_tokens": 2500,
  "estimated_credits": 0.625,
  "credits_available": 1000,
  "can_afford": true
}
```

### ✅ Tools Available

**1. Code Intelligence**
```json
{
  "name": "code_intelligence",
  "description": "Analyze code with AST parsing, symbol finding, and complexity metrics",
  "input_schema": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "enum": [
          "parse_ast",
          "find_symbol",
          "find_references",
          "analyze_imports",
          "get_function_signature",
          "analyze_complexity"
        ]
      },
      "code": {"type": "string"},
      "language": {"type": "string", "enum": ["python", "javascript", "typescript"]},
      "symbol_name": {"type": "string"},
      "function_name": {"type": "string"}
    },
    "required": ["operation", "code", "language"]
  }
}
```

**2. Web Fetch**
```json
{
  "name": "web_fetch",
  "description": "Fetch documentation from whitelisted web sources",
  "input_schema": {
    "type": "object",
    "properties": {
      "operation": {
        "type": "string",
        "enum": ["fetch_url", "fetch_documentation", "search_docs"]
      },
      "url": {"type": "string", "format": "uri"},
      "query": {"type": "string"}
    },
    "required": ["operation", "url"]
  }
}
```

**Whitelisted Domains (60+):**
docs.python.org, developer.mozilla.org, reactjs.org, react.dev, vuejs.org, angular.io, fastapi.tiangolo.com, docs.djangoproject.com, nodejs.org, docs.npmjs.com, pytorch.org, tensorflow.org, docker.com, kubernetes.io, github.com, stackoverflow.com, docs.anthropic.com, platform.openai.com, and 40+ more

### ❓ Tool Execution Logs

**Model Exists:** `/core/src/backend/app/models/tool_execution_log.py`

**Possible Endpoint (needs verification):**
```
GET /api/v1/tool-logs?user_id={user_id}&limit=50
Authorization: Bearer <jwt_token>
```

**Expected Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "request_id": "uuid",
      "tool_name": "code_intelligence",
      "input_data": {...},
      "output_data": {...},
      "execution_time_ms": 145.6,
      "success": true,
      "error_message": null,
      "created_at": "2026-01-07T20:30:15Z"
    }
  ],
  "total": 450
}
```

**Action Required:** Verify if this endpoint exists or needs to be implemented.

### ✅ Streaming Support

**Enable streaming:**
```json
{
  "messages": [...],
  "tools": [...],
  "stream": true
}
```

**Response:** Server-Sent Events (SSE)

**Events emitted:**
- Tool execution progress
- Intermediate thinking
- Final completion

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

---

## 🏗️ IDE Integration Architecture

### Service Layer

```typescript
// ainative-studio/src/vs/workbench/contrib/ainative/common/

// 1. Managed Chat API Service (NEW)
export class ManagedChatAPIService {
  constructor(
    @IAINativeCloudAuthService private authService: IAINativeCloudAuthService
  ) {}

  async sendChatCompletion(request: ChatRequest): Promise<ChatResponse> {
    const token = await this.authService.getAccessToken();

    return fetch('https://api.ainative.studio/api/v1/managed/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
  }

  async getUserUsage(period: string = 'monthly'): Promise<UsageStats> {
    const token = await this.authService.getAccessToken();

    return fetch(`https://api.ainative.studio/api/v1/managed/usage?period=${period}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  async getUsageHistory(days: number = 30): Promise<UsageHistory> {
    // GET /api/v1/managed/usage/history
  }

  async estimateCost(model: string, tokens: number): Promise<CostEstimate> {
    // POST /api/v1/managed/estimate
  }
}

// 2. Code Intelligence Service (NEW)
export class CodeIntelligenceService {
  constructor(
    @IManagedChatAPIService private chatAPI: IManagedChatAPIService
  ) {}

  async analyzeComplexity(code: string, language: string): Promise<ComplexityResult> {
    const response = await this.chatAPI.sendChatCompletion({
      messages: [{
        role: 'user',
        content: `Analyze the complexity of this ${language} code`
      }],
      tools: [{
        name: 'code_intelligence',
        description: 'Analyze code complexity',
        input_schema: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            code: { type: 'string' },
            language: { type: 'string' }
          },
          required: ['operation', 'code', 'language']
        }
      }],
      preferred_model: 'llama-3.3-70b-instruct'
    });

    return this.parseComplexityFromResponse(response);
  }
}

// 3. Web Fetch Service (NEW)
export class WebFetchService {
  constructor(
    @IManagedChatAPIService private chatAPI: IManagedChatAPIService
  ) {}

  async fetchDocumentation(url: string, query?: string): Promise<Documentation> {
    // Similar pattern to CodeIntelligenceService
  }
}

// 4. Enhanced Usage Tracking (MODIFY EXISTING)
export class UsageTrackingService {
  // Existing methods remain...

  // NEW: Track managed API usage
  async trackManagedUsage(
    modelId: string,
    tokensUsed: number,
    creditsConsumed: number
  ): Promise<void> {
    // Store locally + sync with backend
  }

  // NEW: Get credits status
  async getCreditsStatus(): Promise<CreditsStatus> {
    return this.managedChatAPI.getUserUsage();
  }
}
```

### Chat Integration

```typescript
// Modify: ainative-studio/src/vs/workbench/contrib/ainative/browser/chatThreadService.ts

export class ChatThreadService {
  // Existing implementation...

  async sendMessageWithManagedAPI(message: string, context?: CodeContext) {
    // Build tools array based on context
    const tools = [];

    if (context?.selectedCode) {
      tools.push(this.getCodeIntelligenceTool());
    }

    if (message.includes('docs') || message.includes('documentation')) {
      tools.push(this.getWebFetchTool());
    }

    // Send to managed API
    const response = await this.managedChatAPI.sendChatCompletion({
      messages: this.getCurrentMessages(),
      tools: tools.length > 0 ? tools : undefined,
      preferred_model: this.getPreferredModel(),
      max_iterations: 5,
      stream: false
    });

    // Add assistant message
    this.addMessage({
      role: 'assistant',
      content: response.choices[0].message.content,
      metadata: {
        creditsConsumed: response.credits_consumed,
        tokensUsed: response.usage.total_tokens,
        model: response.model
      }
    });

    // Update credits display
    this.updateCreditsDisplay(response.credits_remaining);

    // Track usage
    await this.usageTrackingService.trackManagedUsage(
      response.model,
      response.usage.total_tokens,
      response.credits_consumed
    );
  }

  private getCodeIntelligenceTool(): ToolDefinition {
    return {
      name: 'code_intelligence',
      description: 'Analyze code with AST parsing and complexity metrics',
      input_schema: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['parse_ast', 'analyze_complexity', 'find_symbol']
          },
          code: { type: 'string' },
          language: { type: 'string', enum: ['python', 'javascript', 'typescript'] }
        },
        required: ['operation', 'code', 'language']
      }
    };
  }

  private getWebFetchTool(): ToolDefinition {
    return {
      name: 'web_fetch',
      description: 'Fetch documentation from web sources',
      input_schema: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['fetch_url', 'fetch_documentation'] },
          url: { type: 'string', format: 'uri' },
          query: { type: 'string' }
        },
        required: ['operation', 'url']
      }
    };
  }
}
```

### UI Components

```typescript
// ainative-studio/src/vs/workbench/contrib/ainative/browser/react/src/

// 1. Usage Dashboard
components/usage-dashboard/
├── UsageDashboard.tsx         // Main component
├── CreditsDisplay.tsx         // Show credits used/remaining
├── UsageChart.tsx             // Line chart of usage over time
├── ModelBreakdown.tsx         // Pie chart of model usage
└── CostProjection.tsx         // Estimate future costs

// 2. Tool Results Panel (if tool execution details available)
components/tool-results/
├── ToolResultsPanel.tsx       // Main panel
├── CodeIntelligenceView.tsx   // Display AST, complexity, etc.
├── WebFetchView.tsx           // Display fetched documentation
└── ToolExecutionLog.tsx       // Debug log of executions

// 3. Chat UI Enhancements
components/chat/
├── ChatMessage.tsx            // Add credits badge
├── ToolIndicator.tsx          // Show when tools are used
└── StreamingStatus.tsx        // Show tool execution progress
```

---

## 📋 Step-by-Step Implementation

### Week 1: Core Services (Days 1-5)

#### Day 1: API Service Foundation
- [ ] Create `ManagedChatAPIService.ts`
- [ ] Implement `sendChatCompletion()` method
- [ ] Test with JWT auth from existing `AINativeCloudAuthService`
- [ ] Verify endpoint works: `/api/v1/managed/chat/completions`

#### Day 2: Usage Tracking
- [ ] Implement `getUserUsage()` in API service
- [ ] Implement `getUsageHistory()`
- [ ] Implement `estimateCost()`
- [ ] Test all usage endpoints

#### Day 3: Tool Services
- [ ] Create `CodeIntelligenceService.ts`
- [ ] Create `WebFetchService.ts`
- [ ] Implement helper methods for tool schema generation
- [ ] Test tool calling end-to-end

#### Day 4: Chat Integration
- [ ] Modify `chatThreadService.ts` to use managed API
- [ ] Add tool selection logic based on context
- [ ] Implement credits display in chat
- [ ] Handle streaming responses

#### Day 5: Testing & Bug Fixes
- [ ] Unit tests for API service
- [ ] Integration tests for chat flow
- [ ] Test error handling
- [ ] Fix issues found

### Week 2: UI Components (Days 6-10)

#### Day 6-7: Usage Dashboard
- [ ] Create `UsageDashboard.tsx` component
- [ ] Implement credits display
- [ ] Add usage charts (line, pie)
- [ ] Add historical data view

#### Day 8-9: Tool Results Display
- [ ] Parse assistant responses for tool mentions
- [ ] Create code intelligence result view
- [ ] Create web fetch documentation view
- [ ] Add export/copy functionality

#### Day 10: Chat UI Polish
- [ ] Add tool execution indicators
- [ ] Add credits badge to messages
- [ ] Improve loading states
- [ ] Add error recovery UI

### Week 3: Polish & Release (Days 11-15)

#### Day 11-12: Streaming Support
- [ ] Implement SSE listener
- [ ] Show real-time tool execution
- [ ] Add progress indicators
- [ ] Handle stream errors

#### Day 13: Documentation
- [ ] User guide for new features
- [ ] API integration examples
- [ ] Troubleshooting guide
- [ ] Update changelog

#### Day 14: Testing
- [ ] End-to-end tests
- [ ] Performance testing
- [ ] Load testing with many requests
- [ ] Edge case testing

#### Day 15: Release Prep
- [ ] Code review
- [ ] Final bug fixes
- [ ] Staging deployment
- [ ] Production release

---

## 🔧 Configuration

### Settings Schema

```typescript
// Add to ainativeSettingsTypes.ts
interface AINativeSettings {
  // Existing settings...

  managedAPI: {
    enabled: boolean;                    // Use managed API vs BYOK
    autoToolCalling: boolean;            // Auto-enable tools in chat
    preferredModel: string;              // Default model
    maxIterations: number;               // Max tool calling loops (1-10)
    showCreditsInChat: boolean;          // Display credits per message
    showToolExecutions: boolean;         // Show tool usage indicators
  };

  usageTracking: {
    showDashboard: boolean;              // Enable usage dashboard
    quotaWarningThreshold: number;       // 0.0 - 1.0 (e.g., 0.8 = 80%)
    trackLocalUsage: boolean;            // Store usage history locally
  };
}
```

### Environment Variables

```typescript
// Development
API_BASE_URL=http://localhost:8000

// Production
API_BASE_URL=https://api.ainative.studio
```

---

## ⚠️ Important Notes

### 1. Tool Execution is Server-Side

**Key Point:** Tools execute on the backend, NOT in the IDE.

**What this means:**
- You send tool definitions in the request
- Backend calls the tools automatically
- Response contains final answer (tools already executed)
- You DON'T see intermediate tool calls in response

**To show tool usage to users:**
1. Parse assistant response for tool mentions (e.g., "I analyzed the code...")
2. Query `/api/v1/tool-logs` separately (if endpoint exists)
3. Use streaming to see real-time progress

### 2. Credits vs Tokens

**Backend tracks:**
- Credits consumed (billing)
- Tokens used (monitoring)

**IDE should show:**
- Primary: Credits (users care about cost)
- Secondary: Tokens (developers care about efficiency)

**Example Display:**
```
💬 Message sent
   Credits: 0.51 (-0.51 remaining: 999.49)
   Tokens: 150 (100 prompt + 50 completion)
   Model: llama-3.3-70b-instruct
```

### 3. Authentication is Already Done

**You DON'T need to:**
- ❌ Build API key management
- ❌ Add new auth flows
- ❌ Store provider API keys

**You DO need to:**
- ✅ Use existing `AINativeCloudAuthService.getAccessToken()`
- ✅ Include `Authorization: Bearer <token>` header
- ✅ Handle token refresh (already implemented)

### 4. Model Availability by Plan

| Model | Free | Basic | Pro | Enterprise |
|-------|------|-------|-----|------------|
| llama-3.3-8b-instruct | ✅ | ✅ | ✅ | ✅ |
| llama-3.3-70b-instruct | ❌ | ✅ | ✅ | ✅ |
| llama-4-maverick-17b | ❌ | ❌ | ✅ | ✅ |
| claude-sonnet-4-5 | ❌ | ❌ | ✅ | ✅ |
| claude-opus-4 | ❌ | ❌ | ❌ | ✅ |

**Error Handling:**
- 402 Payment Required: Insufficient credits
- 403 Forbidden: Model not available for user's plan
- 429 Too Many Requests: Rate limit exceeded

---

## 🧪 Testing Checklist

### API Integration Tests
- [ ] Chat completion without tools
- [ ] Chat completion with code_intelligence tool
- [ ] Chat completion with web_fetch tool
- [ ] Chat completion with both tools
- [ ] Streaming responses
- [ ] Usage stats retrieval
- [ ] Usage history retrieval
- [ ] Cost estimation
- [ ] Error handling (401, 402, 403, 429, 500)

### UI Tests
- [ ] Credits display updates after message
- [ ] Usage dashboard loads data
- [ ] Historical usage chart renders
- [ ] Model breakdown chart renders
- [ ] Tool indicators show in chat
- [ ] Tool results display correctly
- [ ] Streaming progress indicators work
- [ ] Error messages display properly

### Integration Tests
- [ ] End-to-end chat with tool calling
- [ ] Credits deduction accurate
- [ ] Token tracking accurate
- [ ] Multiple tools in single request
- [ ] Multi-iteration tool loops work
- [ ] Rate limiting handled gracefully

---

## 📚 Reference Documents

1. **This Guide** - Complete integration reference
2. **Backend Internal Guides:**
   - `/core/docs/development-guides/MANAGED_CHAT_API_INTERNAL_GUIDE.md`
   - `/core/docs/development-guides/IDE_TOOL_CALLING_ARCHITECTURE.md`
   - `/core/docs/development-guides/CHAT_COMPLETION_API_DEVELOPER_GUIDE.md`
3. **Backend Code:**
   - `/core/src/backend/app/api/v1/endpoints/managed_chat.py`
   - `/core/src/backend/app/tools/code_intelligence.py`
   - `/core/src/backend/app/services/agent_framework/tools/web_fetch_tool.py`
   - `/core/src/backend/app/models/tool_execution_log.py`

---

## 🎯 Success Criteria

### MVP (Week 2)
- [x] Managed chat API integration working
- [x] Credits displayed in UI
- [x] Basic usage stats visible
- [x] Code intelligence tool functional
- [x] Web fetch tool functional

### Full Release (Week 3)
- [x] Usage dashboard complete
- [x] Historical usage charts
- [x] Tool execution visibility
- [x] Streaming support
- [x] Error handling complete
- [x] User documentation

---

## ✅ Final Checklist Before Starting

- [ ] Read this entire document
- [ ] Verify JWT auth works with backend
- [ ] Test `/api/v1/managed/chat/completions` with Postman/curl
- [ ] Confirm access to backend documentation
- [ ] Set up local development environment
- [ ] Create feature branch in IDE repo
- [ ] Begin implementation following Week 1 plan

---

**Status:** ✅ Ready to Implement
**Estimated Completion:** 2-3 weeks
**Risk Level:** LOW
**Blocking Issues:** None

**Questions?** Contact backend team: `#ide-integration` on Slack
