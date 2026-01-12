# ManagedChatAPIService Documentation

## Overview

The `ManagedChatAPIService` is a TypeScript wrapper for the AINative Managed Chat API. It provides type-safe access to AI models using subscription credits, with automatic authentication, token refresh, and error handling.

**Location:** `ainative-studio/src/vs/workbench/contrib/ainative/common/managedChatAPIService.ts`

## Features

- **Automatic Authentication**: Uses JWT tokens from `IAINativeCloudAuthService`
- **Token Refresh**: Automatically refreshes expired tokens
- **Retry Logic**: Exponential backoff for rate limiting (429 errors)
- **Type Safety**: Complete TypeScript interfaces for all requests/responses
- **Error Handling**: Comprehensive error handling with specific error types
- **Streaming Support**: Server-Sent Events (SSE) for real-time updates
- **Credit Management**: Track usage and estimate costs

## Installation

The service is automatically registered with VS Code's dependency injection system. Access it via constructor injection:

```typescript
import { IManagedChatAPIService } from 'vs/workbench/contrib/ainative/common/managedChatAPIService';

constructor(
	@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
) {}
```

## API Reference

### Core Methods

#### sendChatCompletion

Send a non-streaming chat completion request.

```typescript
async sendChatCompletion(request: ChatRequest): Promise<ChatResponse>
```

**Example:**

```typescript
const response = await this.managedChatAPI.sendChatCompletion({
	messages: [
		{ role: 'user', content: 'What is the capital of France?' }
	],
	preferred_model: 'llama-3.3-70b-instruct',
	temperature: 0.7,
	max_tokens: 1000
});

console.log(response.choices[0].message.content); // "The capital of France is Paris."
console.log(`Credits consumed: ${response.credits_consumed}`);
console.log(`Credits remaining: ${response.credits_remaining}`);
```

#### sendStreamingChatCompletion

Send a streaming chat completion request with real-time updates.

```typescript
async sendStreamingChatCompletion(
	request: ChatRequest,
	onEvent: (event: any) => void
): Promise<void>
```

**Example:**

```typescript
await this.managedChatAPI.sendStreamingChatCompletion(
	{
		messages: [{ role: 'user', content: 'Analyze this code' }],
		tools: [codeIntelligenceTool],
		stream: true
	},
	(event) => {
		if (event.type === 'tool_execution') {
			console.log(`Executing tool: ${event.tool_name}`);
		} else if (event.type === 'completion') {
			console.log(`Final response: ${event.content}`);
		}
	}
);
```

### Usage Tracking

#### getUserUsage

Get current usage statistics for a time period.

```typescript
async getUserUsage(period?: 'daily' | 'weekly' | 'monthly'): Promise<UsageStats>
```

**Example:**

```typescript
const usage = await this.managedChatAPI.getUserUsage('monthly');

console.log(`Credits used: ${usage.credits_used}`);
console.log(`Credits remaining: ${usage.credits_remaining}`);
console.log(`Total requests: ${usage.requests_count}`);
console.log(`Total tokens: ${usage.total_tokens}`);
```

#### getUsageHistory

Get historical usage data aggregated by day.

```typescript
async getUsageHistory(days?: number): Promise<UsageHistory>
```

**Example:**

```typescript
const history = await this.managedChatAPI.getUsageHistory(30);

history.history.forEach(day => {
	console.log(`${day.date}: ${day.requests} requests, ${day.credits_used} credits`);
});
```

#### getModelDistribution

Get distribution of models used in a period.

```typescript
async getModelDistribution(period?: 'daily' | 'weekly' | 'monthly'): Promise<ModelDistribution>
```

**Example:**

```typescript
const distribution = await this.managedChatAPI.getModelDistribution('monthly');

console.log(`Total requests: ${distribution.total_requests}`);
distribution.models.forEach(model => {
	console.log(`${model.model}: ${model.requests} (${model.percentage}%)`);
});
```

### Cost Management

#### estimateCost

Estimate credit cost before sending a request.

```typescript
async estimateCost(model: string, tokens: number): Promise<CostEstimate>
```

**Example:**

```typescript
const estimate = await this.managedChatAPI.estimateCost('llama-3.3-70b-instruct', 2500);

if (!estimate.can_afford) {
	console.log('Insufficient credits!');
	console.log(`Required: ${estimate.estimated_credits}, Available: ${estimate.credits_available}`);
}
```

#### checkCreditsAvailable

Quick check if user has sufficient credits.

```typescript
async checkCreditsAvailable(estimatedCredits: number): Promise<boolean>
```

**Example:**

```typescript
if (await this.managedChatAPI.checkCreditsAvailable(1.0)) {
	// Proceed with request
} else {
	// Show upgrade prompt
}
```

## Tool Calling

### Code Intelligence Tool

Analyze code with AST parsing, symbol finding, and complexity metrics.

```typescript
const codeIntelligenceTool: ToolDefinition = {
	name: 'code_intelligence',
	description: 'Analyze code with AST parsing and complexity metrics',
	input_schema: {
		type: 'object',
		properties: {
			operation: {
				type: 'string',
				enum: [
					'parse_ast',
					'find_symbol',
					'find_references',
					'analyze_imports',
					'get_function_signature',
					'analyze_complexity'
				]
			},
			code: { type: 'string' },
			language: { type: 'string', enum: ['python', 'javascript', 'typescript'] },
			symbol_name: { type: 'string' },
			function_name: { type: 'string' }
		},
		required: ['operation', 'code', 'language']
	}
};

const response = await this.managedChatAPI.sendChatCompletion({
	messages: [
		{ role: 'user', content: 'Analyze the complexity of this code' }
	],
	tools: [codeIntelligenceTool],
	preferred_model: 'llama-3.3-70b-instruct'
});
```

### Web Fetch Tool

Fetch documentation from whitelisted web sources.

```typescript
const webFetchTool: ToolDefinition = {
	name: 'web_fetch',
	description: 'Fetch documentation from web sources',
	input_schema: {
		type: 'object',
		properties: {
			operation: {
				type: 'string',
				enum: ['fetch_url', 'fetch_documentation', 'search_docs']
			},
			url: { type: 'string', format: 'uri' },
			query: { type: 'string' }
		},
		required: ['operation', 'url']
	}
};

const response = await this.managedChatAPI.sendChatCompletion({
	messages: [
		{ role: 'user', content: 'What is the Python requests library?' }
	],
	tools: [webFetchTool],
	preferred_model: 'llama-3.3-70b-instruct'
});
```

## Error Handling

### Error Types

The service throws `ManagedChatAPIError` instances with specific error detection methods:

```typescript
try {
	const response = await this.managedChatAPI.sendChatCompletion(request);
} catch (error) {
	if (error instanceof ManagedChatAPIError) {
		if (error.isInsufficientCredits()) {
			// Show upgrade prompt
			const upgradeURL = error.getUpgradeURL();
			console.log(`Upgrade at: ${upgradeURL}`);
		} else if (error.isModelNotAvailable()) {
			// Show model not available message
			console.log('Model requires higher plan tier');
		} else if (error.isRateLimited()) {
			// Show rate limit message
			console.log('Too many requests, please slow down');
		} else if (error.isAuthError()) {
			// Trigger re-authentication
			console.log('Authentication required');
		}
	}
}
```

### HTTP Status Codes

| Status | Error Code | Description | Action |
|--------|------------|-------------|--------|
| 401 | `token_expired` | JWT token expired | Automatically refreshed |
| 402 | `insufficient_credits` | Not enough credits | Show upgrade prompt |
| 403 | `model_not_available` | Model not in plan | Show upgrade prompt |
| 429 | `rate_limited` | Too many requests | Automatic retry with backoff |
| 500 | `provider_error` | Backend error | Show error message |

## Complete Example

```typescript
import { IManagedChatAPIService, ChatRequest, ManagedChatAPIError } from 'vs/workbench/contrib/ainative/common/managedChatAPIService';

export class ChatService {
	constructor(
		@IManagedChatAPIService private readonly managedChatAPI: IManagedChatAPIService
	) {}

	async sendMessage(userMessage: string, selectedCode?: string) {
		// Build tools array based on context
		const tools = [];

		if (selectedCode) {
			tools.push({
				name: 'code_intelligence',
				description: 'Analyze code',
				input_schema: {
					type: 'object',
					properties: {
						operation: { type: 'string' },
						code: { type: 'string' },
						language: { type: 'string' }
					},
					required: ['operation', 'code', 'language']
				}
			});
		}

		// Estimate cost first
		const estimate = await this.managedChatAPI.estimateCost(
			'llama-3.3-70b-instruct',
			1000 // Estimated tokens
		);

		if (!estimate.can_afford) {
			throw new Error('Insufficient credits. Please upgrade your plan.');
		}

		// Build request
		const request: ChatRequest = {
			messages: [
				{ role: 'user', content: userMessage }
			],
			tools: tools.length > 0 ? tools : undefined,
			preferred_model: 'llama-3.3-70b-instruct',
			max_iterations: 5,
			temperature: 0.7,
			max_tokens: 2000
		};

		try {
			// Send request
			const response = await this.managedChatAPI.sendChatCompletion(request);

			// Display response
			console.log('Assistant:', response.choices[0].message.content);
			console.log(`Credits: -${response.credits_consumed} (${response.credits_remaining} remaining)`);
			console.log(`Tokens: ${response.usage.total_tokens}`);

			return response;

		} catch (error) {
			if (error instanceof ManagedChatAPIError) {
				if (error.isInsufficientCredits()) {
					// Show upgrade modal
					this.showUpgradeModal(error.getUpgradeURL());
				} else if (error.isModelNotAvailable()) {
					// Fall back to free model
					request.preferred_model = 'llama-3.3-8b-instruct';
					return this.managedChatAPI.sendChatCompletion(request);
				}
			}

			throw error;
		}
	}

	private showUpgradeModal(upgradeURL: string | null) {
		// Implementation
	}
}
```

## Available Models

| Model | Free | Basic | Pro | Enterprise |
|-------|------|-------|-----|------------|
| llama-3.3-8b-instruct | ✅ | ✅ | ✅ | ✅ |
| llama-3.3-70b-instruct | ❌ | ✅ | ✅ | ✅ |
| llama-4-maverick-17b | ❌ | ❌ | ✅ | ✅ |
| claude-sonnet-4-5 | ❌ | ❌ | ✅ | ✅ |
| claude-opus-4 | ❌ | ❌ | ❌ | ✅ |

## Credit Costs

| Model | Base Cost | Per 1K Tokens |
|-------|-----------|---------------|
| LLAMA 3.3-8B | 0.1 | 0.01 |
| LLAMA 3.3-70B | 0.5 | 0.05 |
| LLAMA 4 Maverick | 1.0 | 0.1 |
| Claude Sonnet 4.5 | 2.0 | 0.2 |
| Claude Opus 4 | 5.0 | 0.5 |

## Best Practices

1. **Always estimate cost first** for large requests
2. **Use checkCreditsAvailable()** before critical operations
3. **Handle errors gracefully** with user-friendly messages
4. **Implement tool calling** for code analysis and documentation lookup
5. **Use streaming** for better UX on long-running requests
6. **Track usage locally** to show users their consumption patterns
7. **Cache responses** when appropriate to reduce costs
8. **Fall back to free models** when credits are low
9. **Show upgrade prompts** proactively when approaching limits
10. **Use appropriate models** - don't use expensive models for simple tasks

## Testing

Unit tests are located at:
`ainative-studio/src/vs/workbench/contrib/ainative/test/common/managedChatAPIService.test.ts`

Run tests:
```bash
cd ainative-studio
npm run test-node -- --grep "ManagedChatAPIService"
```

## Related Services

- `IAINativeCloudAuthService` - Authentication and token management
- `UsageTrackingService` - Local usage tracking
- `ChatThreadService` - Chat session management
- `CodeIntelligenceService` - Code analysis integration

## API Endpoints

- **Production:** `https://api.ainative.studio/api/v1/managed`
- **Development:** `http://localhost:8000/api/v1/managed`

## Support

For issues or questions:
- GitHub Issues: [AINativeStudio-IDE/issues](https://github.com/ainativestudio/AINativeStudio-IDE/issues)
- Documentation: `/docs/PHASE2_FINAL_INTEGRATION_GUIDE.md`
- Backend API: `/core/src/backend/app/api/v1/endpoints/managed_chat.py`
