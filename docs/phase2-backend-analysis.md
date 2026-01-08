# Phase 2 Backend Analysis: What's Actually Built vs Handover Doc

**Date:** January 7, 2026
**Analysis By:** Claude Code
**Purpose:** Clarify actual backend implementation status for IDE integration

---

## Executive Summary

After reviewing both the **handover document** (`/Users/aideveloper/core/docs/development-guides/IDE_TEAM_HANDOVER_PHASE2_TOOLS.md`) and the **actual backend codebase** (`/Users/aideveloper/core/src/backend/`), here's the reality:

### ✅ What's Actually Built

1. **Code Intelligence Tool** - ✅ FULLY IMPLEMENTED
   - Location: `/core/src/backend/app/tools/code_intelligence.py`
   - AST parsing for Python, JavaScript, TypeScript
   - Symbol finding, complexity analysis
   - Tree-sitter integration

2. **Web Fetch Tool** - ✅ FULLY IMPLEMENTED
   - Location: `/core/src/backend/app/services/agent_framework/tools/web_fetch_tool.py`
   - 60+ whitelisted domains
   - HTML to markdown conversion
   - Query/search support

3. **Tool Execution Logging** - ✅ FULLY IMPLEMENTED
   - Model: `/core/src/backend/app/models/tool_execution_log.py`
   - Database table with proper indexes
   - Tracks input/output, execution time, success status

4. **Managed Chat API** - ✅ FULLY IMPLEMENTED (BUT DIFFERENT FROM HANDOVER DOC)
   - Endpoint: `/core/src/backend/app/api/v1/endpoints/managed_chat.py`
   - Route: `POST /v1/chat/completions`
   - **Uses JWT authentication, NOT API key** (handover doc says X-API-Key)
   - **Uses subscription credits**, not direct API key passthrough
   - Has tool calling support via `tools` parameter
   - Has streaming support via SSE

###  Discrepancies Between Handover Doc & Reality

| Handover Doc Says | Actual Implementation |
|-------------------|----------------------|
| Authentication: `X-API-Key` header | Authentication: JWT token via `get_current_user` |
| Direct API key passthrough to providers | Managed service with subscription credits |
| Usage endpoint: `/v1/usage/stats` | Usage endpoint: `/v1/usage` (different response format) |
| Tool overhead tracking in response | Tool overhead NOT in current response schema |
| Request ID tracking | Request ID exists but not exposed in API response |

---

## Detailed Analysis

### 1. Authentication System

**Handover Doc Claims:**
```typescript
headers: {
  'X-API-Key': userApiKey
}
```

**Actual Implementation:**
```python
# /core/src/backend/app/api/v1/endpoints/managed_chat.py
async def managed_chat_completions(
    request: ManagedChatCompletionRequest,
    current_user: User = Depends(get_current_user),  # JWT auth
    db: Session = Depends(get_db)
):
```

**Reality:** Backend uses **JWT token authentication** via `get_current_user` dependency, NOT raw API keys.

**IDE Impact:**
- IDE already has JWT auth working (via `AINativeCloudAuthService`)
- **No need to implement API key storage/management**
- Can use existing `accessToken` for all requests

---

### 2. Chat Completions API

**Actual Endpoint:** `POST /v1/chat/completions`

**Actual Request Schema:**
```python
class ManagedChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    tools: Optional[List[ToolDefinition]] = None
    preferred_model: Optional[str] = None
    max_iterations: int = 5
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = False
```

**Actual Response Schema:**
```python
{
    "id": "chatcmpl-abc123",
    "model": "llama-3.3-70b-instruct",
    "provider": "meta",
    "created": 1704592800,
    "choices": [{
        "index": 0,
        "message": {
            "role": "assistant",
            "content": "..."
        },
        "finish_reason": "stop"
    }],
    "usage": {
        "prompt_tokens": 15,
        "completion_tokens": 10,
        "total_tokens": 25
    },
    "credits_consumed": 0.51,
    "credits_remaining": 999.49,
    "plan_tier": "basic",
    "finish_reason": "stop"
}
```

**Key Differences from Handover Doc:**
1. Uses `preferred_model` instead of `provider` + `model`
2. Returns `credits_consumed` and `credits_remaining` instead of detailed tool overhead
3. No `tool_call_count`, `tool_schema_tokens`, `tool_result_tokens` in response
4. No `tool_calls` array in response (tool executions happen internally)

---

### 3. Tool Calling Architecture

**How It Actually Works:**

```python
# Backend handles tool calling internally
# 1. User sends chat request with tools: [...]
# 2. ManagedChatService executes completion
# 3. Tools are registered and called automatically
# 4. Response includes final answer, not intermediate tool calls
```

**Handover Doc Assumption:**
```typescript
// Response includes tool execution details
tool_calls?: Array<{
  tool_name: string;
  input: object;
  output: object;
  success: boolean;
  execution_time_ms: number;
}>;
```

**Reality:**
- Tool calls happen server-side
- Client receives **final response only**
- Tool execution logs stored in database, not returned in response
- Can query `/v1/tool-logs` separately (if endpoint exists) for debugging

---

### 4. Usage Tracking

**Actual Endpoints:**

```
GET /v1/usage?period=monthly
GET /v1/usage/history?days=30
GET /v1/models?period=monthly
```

**Actual Response (from managed_chat.py):**
```python
{
    "period": "monthly",
    "credits_used": 350.0,
    "credits_remaining": 650.0,
    "requests_count": 145,
    "total_tokens": 125000,
    "models_used": {
        "llama-3.3-70b-instruct": 100,
        "llama-3.3-8b-instruct": 45
    }
}
```

**What's Missing from Handover Doc:**
- No `tool_call_count` in usage stats
- No `tool_overhead_tokens` breakdown
- No `tool_schema_tokens` or `tool_result_tokens`
- No separate `/v1/usage/tool-overhead` endpoint

**Reality:**
- Backend tracks credits consumed (not detailed token breakdown)
- Tool overhead is factored into credit calculation internally
- IDE will display credits, not raw token counts

---

### 5. Tool Execution Logs

**Database Model Exists:**
```python
# /core/src/backend/app/models/tool_execution_log.py
class ToolExecutionLog:
    id: UUID
    request_id: UUID  # Correlation to chat request
    tool_name: str
    input_data: JSON
    output_data: JSON
    execution_time_ms: float
    success: bool
    error_message: str | None
    user_id: UUID
    session_id: str | None
    created_at: datetime
```

**API Endpoint Status:**
- **Unknown if `/v1/tool-logs` endpoint exists**
- Need to check: `/core/src/backend/app/api/v1/endpoints/` for tool logs route
- Model is ready, but may need endpoint implementation

---

### 6. Tools Available

**Code Intelligence Tool:**
```python
# Operations:
- parse_ast
- find_symbol
- find_references
- analyze_imports
- get_function_signature
- analyze_complexity

# Languages:
- Python
- JavaScript
- TypeScript
```

**Web Fetch Tool:**
```python
# Operations:
- fetch_url
- fetch_documentation
- search_docs

# Domains:
- 60+ whitelisted (docs.python.org, react.dev, etc.)
```

**Tool Schema (for chat request):**
```python
tools = [
    {
        "name": "code_intelligence",
        "description": "Analyze code with AST parsing and complexity metrics",
        "input_schema": {
            "type": "object",
            "properties": {
                "operation": {"type": "string"},
                "code": {"type": "string"},
                "language": {"type": "string"}
            },
            "required": ["operation", "code", "language"]
        }
    },
    {
        "name": "web_fetch",
        "description": "Fetch documentation from web sources",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "format": "uri"},
                "query": {"type": "string"}
            },
            "required": ["url"]
        }
    }
]
```

---

## What IDE Integration Actually Needs

### ✅ Already Works (No Changes Needed)

1. **Authentication** - IDE has JWT auth via `AINativeCloudAuthService`
2. **User Management** - Users already log in, get tokens
3. **Storage** - Encrypted token storage already implemented

### 🔧 What IDE Needs to Build

#### 1. Chat Integration with Tools

**Use Existing:** `/v1/chat/completions` endpoint

**Request Format:**
```typescript
const response = await fetch('https://api.ainative.studio/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,  // NOT X-API-Key
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Analyze this code' }
    ],
    tools: [
      {
        name: 'code_intelligence',
        description: 'Analyze code...',
        input_schema: { /* ... */ }
      }
    ],
    preferred_model: 'llama-3.3-70b-instruct',
    max_iterations: 5,
    temperature: 0.7,
    stream: false
  })
});
```

**Response Handling:**
```typescript
{
  id: string;
  model: string;
  provider: string;
  choices: [{
    message: {
      role: 'assistant';
      content: string;  // Final response (tool calls already executed)
    };
    finish_reason: 'stop' | 'length' | 'max_iterations';
  }];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  credits_consumed: number;
  credits_remaining: number;
  plan_tier: string;
}
```

#### 2. Usage Dashboard

**Endpoints to Use:**
```
GET /v1/usage?period=monthly
GET /v1/usage/history?days=30
GET /v1/models?period=monthly
```

**Display:**
- Credits used/remaining (not raw tokens)
- Requests count
- Total tokens
- Model distribution

#### 3. Tool Results Display

**Problem:** Backend doesn't return tool execution details in chat response

**Solutions:**

**Option A:** Parse assistant response for tool usage mentions
```typescript
// Assistant might say: "I analyzed the code using code_intelligence..."
// Parse content to detect tool usage
```

**Option B:** Query tool execution logs separately
```typescript
// After chat completes, fetch logs:
GET /v1/tool-logs?request_id={chat_request_id}

// If endpoint exists, get:
[
  {
    tool_name: 'code_intelligence',
    input_data: { /* ... */ },
    output_data: { /* ... */ },
    execution_time_ms: 145,
    success: true
  }
]
```

**Option C:** Use streaming to see tool executions in real-time
```typescript
// Set stream: true
// Listen for SSE events during execution
// Events may include tool execution progress
```

#### 4. Tool Execution Debug Panel

**If `/v1/tool-logs` endpoint exists:**
```typescript
GET /v1/tool-logs?user_id={current_user}&limit=50
```

**If not:** Need backend to implement this endpoint

---

## Action Items for IDE Team

### Immediate (Week 1)

1. **Test Existing Chat API**
   - Verify JWT auth works with `/v1/chat/completions`
   - Test tool calling with `code_intelligence` and `web_fetch`
   - Check streaming support

2. **Check Missing Endpoints**
   - Does `/v1/tool-logs` exist?
   - Does `/v1/usage/tool-overhead` exist?
   - What other endpoints are available?

3. **Update Integration Plan**
   - Remove API key management (not needed)
   - Focus on JWT auth (already working)
   - Adjust usage tracking to credits-based system
   - Plan for tool execution visibility

### Short Term (Week 2-3)

4. **Implement Chat UI with Tool Support**
   - Send tool schemas in request
   - Display final responses
   - Show credits consumed
   - Handle streaming for progress

5. **Build Usage Dashboard**
   - Display credits (not detailed tokens)
   - Show requests and model usage
   - Historical charts

6. **Add Tool Results Parsing**
   - Extract tool mentions from responses
   - OR query separate tool logs endpoint
   - Display in sidebar panel

### Clarification Needed from Backend Team

1. **Tool Execution Logs API**
   - Does `/v1/tool-logs` endpoint exist?
   - What's the actual route and response format?
   - Can we query by user, request, or time range?

2. **Tool Overhead Tracking**
   - Is tool overhead calculated and stored?
   - Can we get breakdown of tool tokens vs base tokens?
   - Or is it just factored into credit cost?

3. **Streaming Tool Events**
   - What SSE events are emitted during streaming?
   - Do they include tool execution progress?
   - Format of tool-related events?

4. **API Documentation**
   - Is there OpenAPI/Swagger docs at `/docs`?
   - Can we get complete endpoint list?

---

## Corrected Integration Approach

### Before (Based on Handover Doc)

```typescript
// ❌ This won't work - backend doesn't use API keys
headers: {
  'X-API-Key': userApiKey
}
```

### After (Based on Actual Backend)

```typescript
// ✅ This works - use existing JWT auth
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### Architecture

```
IDE (TypeScript)
├── AINativeCloudAuthService (existing) ──> JWT tokens
├── AINativeCloudAPIService (NEW) ──────> Chat API wrapper
│   ├── sendChatCompletion()
│   ├── getUserUsage()
│   ├── getUsageHistory()
│   └── getToolLogs() [if endpoint exists]
├── Chat UI (React) ───> Display responses & credits
├── Usage Dashboard (React) ───> Display credits & stats
└── Tool Log Panel (React) ───> Display tool executions [if data available]
```

---

## Timeline Revision

Based on actual backend implementation:

**Week 1: Core Integration (3-5 days)**
- ✅ No API key management needed (saved 2 days)
- Implement `AINativeCloudAPIService` wrapper
- Test chat completions with tools
- Verify streaming support

**Week 2: UI Components (5-7 days)**
- Chat panel with tool support
- Usage dashboard (credits-based)
- Tool results display (parse from response or separate query)

**Week 3: Polish & Testing (3-4 days)**
- Error handling
- Loading states
- Integration tests
- User feedback

**Total: 2-3 weeks** (unchanged, but less complexity than handover doc suggested)

---

## Conclusion

### Good News

1. **Simpler Auth** - No need for separate API key management, JWT already works
2. **Tools Work** - Code Intelligence and Web Fetch are fully implemented
3. **Logging Exists** - Tool execution tracking is in database
4. **Credits System** - Easier for users than managing their own API keys

### Challenges

1. **Tool Visibility** - Need to figure out how to show tool executions to users
2. **Usage Metrics** - Credits-based, not detailed token breakdown
3. **Documentation Gap** - Handover doc doesn't match implementation
4. **Missing Endpoints** - Need to verify tool logs API exists

### Next Steps

1. Test actual backend API endpoints
2. Verify streaming and tool calling behavior
3. Check if `/v1/tool-logs` endpoint exists
4. Update integration plan based on findings
5. Begin implementation with corrected architecture

---

**Document Status:** ✅ Complete
**Next Action:** Test backend APIs and verify endpoints
**Contact:** Backend team on Slack #ide-integration
