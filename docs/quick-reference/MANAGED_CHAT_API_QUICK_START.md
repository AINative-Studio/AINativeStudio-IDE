# Managed Chat API Quick Start Guide

> **Quick reference for integrating the Managed Chat API service into AINative Studio**

## 1. Import the Service

```typescript
import { IManagedChatAPIService, ChatRequest, ManagedChatAPIError } from 'vs/workbench/contrib/ainative/common/managedChatAPIService';
```

## 2. Inject via Constructor

```typescript
export class MyService {
	constructor(
		@IManagedChatAPIService private readonly chatAPI: IManagedChatAPIService
	) {}
}
```

## 3. Send a Basic Message

```typescript
async sendMessage(text: string): Promise<string> {
	const response = await this.chatAPI.sendChatCompletion({
		messages: [{ role: 'user', content: text }],
		preferred_model: 'llama-3.3-70b-instruct'
	});

	return response.choices[0].message.content;
}
```

## 4. Handle Errors

```typescript
try {
	const response = await this.chatAPI.sendChatCompletion(request);
} catch (error) {
	if (error instanceof ManagedChatAPIError) {
		if (error.isInsufficientCredits()) {
			// Show upgrade prompt
		} else if (error.isModelNotAvailable()) {
			// Fall back to free model
		}
	}
}
```

## 5. Check Credits Before Sending

```typescript
const estimate = await this.chatAPI.estimateCost('llama-3.3-70b-instruct', 1000);
if (!estimate.can_afford) {
	throw new Error('Insufficient credits');
}
```

## 6. Add Code Analysis Tool

```typescript
const response = await this.chatAPI.sendChatCompletion({
	messages: [{ role: 'user', content: 'Analyze this code' }],
	tools: [{
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
	}],
	preferred_model: 'llama-3.3-70b-instruct'
});
```

## 7. Get Usage Statistics

```typescript
const usage = await this.chatAPI.getUserUsage('monthly');
console.log(`Credits remaining: ${usage.credits_remaining}`);
console.log(`Requests this month: ${usage.requests_count}`);
```

## 8. Stream Responses

```typescript
await this.chatAPI.sendStreamingChatCompletion(
	{
		messages: [{ role: 'user', content: 'Hello' }],
		stream: true
	},
	(event) => {
		if (event.type === 'content') {
			console.log('Chunk:', event.content);
		}
	}
);
```

## Error Types Reference

| Error | Status | Check Method | Action |
|-------|--------|--------------|--------|
| Insufficient Credits | 402 | `isInsufficientCredits()` | Show upgrade prompt |
| Model Not Available | 403 | `isModelNotAvailable()` | Use different model |
| Rate Limited | 429 | `isRateLimited()` | Auto-retries 3x |
| Auth Error | 401 | `isAuthError()` | Auto-refreshes token |

## Available Models

| Model | Plans | Base Cost | Token Cost |
|-------|-------|-----------|------------|
| llama-3.3-8b-instruct | All | 0.1 | 0.01/1K |
| llama-3.3-70b-instruct | Basic+ | 0.5 | 0.05/1K |
| claude-sonnet-4-5 | Pro+ | 2.0 | 0.2/1K |
| claude-opus-4 | Enterprise | 5.0 | 0.5/1K |

## Common Patterns

### Pattern 1: Safe Send with Fallback

```typescript
async safeSend(message: string): Promise<string> {
	try {
		return await this.sendWithModel(message, 'llama-3.3-70b-instruct');
	} catch (error) {
		if (error instanceof ManagedChatAPIError && error.isModelNotAvailable()) {
			return await this.sendWithModel(message, 'llama-3.3-8b-instruct');
		}
		throw error;
	}
}
```

### Pattern 2: Multi-turn Conversation

```typescript
private history: ChatMessage[] = [];

async sendTurn(text: string): Promise<string> {
	this.history.push({ role: 'user', content: text });

	const response = await this.chatAPI.sendChatCompletion({
		messages: this.history,
		preferred_model: 'llama-3.3-70b-instruct'
	});

	const reply = response.choices[0].message.content;
	this.history.push({ role: 'assistant', content: reply });

	return reply;
}
```

### Pattern 3: Cost-Aware Sending

```typescript
async sendWithBudget(message: string, maxCredits: number): Promise<string> {
	const estimate = await this.chatAPI.estimateCost('llama-3.3-70b-instruct', 1000);

	if (estimate.estimated_credits > maxCredits) {
		throw new Error(`Estimated cost (${estimate.estimated_credits}) exceeds budget (${maxCredits})`);
	}

	const response = await this.chatAPI.sendChatCompletion({
		messages: [{ role: 'user', content: message }]
	});

	return response.choices[0].message.content;
}
```

## Full Documentation

- **API Reference:** `/docs/api/MANAGED_CHAT_API_SERVICE.md`
- **Examples:** `/docs/examples/managed-chat-integration-example.ts`
- **Implementation:** `/docs/implementation/MANAGED_CHAT_API_SERVICE_IMPLEMENTATION.md`
- **Backend Guide:** `/docs/PHASE2_FINAL_INTEGRATION_GUIDE.md`
