# AI Model Registry Integration

This document describes the AI Model Registry integration for AINative Studio IDE, enabling users to browse, select, and invoke AI models from the AINative registry.

## Overview

The AI Model Registry integration provides a comprehensive service layer for managing AI models within AINative Studio IDE. It allows developers to:

- **Browse** available AI models with advanced filtering
- **Select** models per project with custom parameters
- **Invoke** models with streaming support
- **Track** usage and quota information
- **Configure** model parameters and defaults

## Architecture

### Components

1. **aiModelRegistryTypes.ts** - TypeScript type definitions
2. **aiModelConfig.ts** - Configuration management
3. **aiModelRegistryService.ts** - Main service implementation
4. **aiModelRegistryExample.ts** - Usage examples

### Service Registration

The service is registered with VS Code's dependency injection system:

```typescript
import { IAIModelRegistryService } from './aiModelRegistryService.js';

// Service is automatically available via DI
constructor(
  @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService
) {}
```

## Features

### 1. Model Listing and Filtering

List all available AI models with comprehensive filtering options:

```typescript
const models = await modelRegistry.listModels({
  provider: 'anthropic',
  capabilities: [ModelCapability.CodeGeneration],
  pricingTier: PricingTier.PayAsYouGo,
  availableOnly: true,
  search: 'claude',
  tags: ['code'],
  maxPrice: 0.01,
  minContextLength: 100000
});
```

**Supported Filters:**
- `provider` - Filter by provider (anthropic, openai, google, etc.)
- `capabilities` - Required capabilities (code_generation, chat, vision, etc.)
- `pricingTier` - Pricing tier (free, pay_as_you_go, subscription, enterprise)
- `availableOnly` - Only show currently available models
- `search` - Search in model name and description
- `tags` - Filter by tags
- `maxPrice` - Maximum price per 1K tokens
- `minContextLength` - Minimum context window size

### 2. Model Selection

Select and configure models per project:

```typescript
await modelRegistry.selectModel(
  'claude-3-5-sonnet-20241022',
  'my-project-id',
  {
    temperature: 0.3,
    maxTokens: 8192,
    topP: 0.9
  }
);

const selected = await modelRegistry.getSelectedModel('my-project-id');
```

### 3. Model Invocation

**Non-streaming invocation:**

```typescript
const response = await modelRegistry.invokeModel({
  modelId: 'claude-3-5-sonnet-20241022',
  prompt: 'Write a TypeScript function',
  parameters: {
    temperature: 0.2,
    maxTokens: 1024
  },
  systemPrompt: 'You are a coding assistant'
});

console.log(response.text);
console.log(`Tokens used: ${response.usage?.totalTokens}`);
```

**Streaming invocation:**

```typescript
await modelRegistry.streamModel(
  {
    modelId: 'claude-3-5-sonnet-20241022',
    prompt: 'Explain async/await',
    stream: true
  },
  (chunk) => {
    console.log(chunk.delta);
    if (chunk.done) {
      console.log('Complete!');
    }
  }
);
```

### 4. Usage and Quota Tracking

Track API usage and check quota limits:

```typescript
const usage = await modelRegistry.getUsageStats();
console.log(`Total calls: ${usage.totalCalls}`);
console.log(`Total tokens: ${usage.totalTokens}`);
console.log(`Total cost: $${usage.totalCost}`);

const quota = await modelRegistry.getQuota();
console.log(`Remaining: ${quota.remaining} tokens`);
console.log(`Exceeded: ${quota.exceeded}`);
```

### 5. Configuration Management

The service includes built-in configuration presets:

```typescript
import { DEFAULT_MODEL_PARAMETERS } from './aiModelConfig.js';

// Conservative parameters for production
DEFAULT_MODEL_PARAMETERS.conservative
// { temperature: 0.3, topP: 0.9, maxTokens: 4096 }

// Balanced parameters for general use
DEFAULT_MODEL_PARAMETERS.balanced
// { temperature: 0.7, topP: 0.95, maxTokens: 4096 }

// Creative parameters for exploration
DEFAULT_MODEL_PARAMETERS.creative
// { temperature: 1.0, topP: 0.98, maxTokens: 4096 }

// Code generation parameters
DEFAULT_MODEL_PARAMETERS.codeGeneration
// { temperature: 0.2, topP: 0.9, maxTokens: 8192 }

// Chat parameters
DEFAULT_MODEL_PARAMETERS.chat
// { temperature: 0.8, topP: 0.95, maxTokens: 2048 }
```

## Type Definitions

### AIModel

```typescript
interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  version?: string;
  capabilities: ModelCapability[];
  pricing: PricingInfo;
  parameters: ModelParameter[];
  maxContextLength?: number;
  maxOutputLength?: number;
  available?: boolean;
  tags?: string[];
}
```

### ModelInvocationRequest

```typescript
interface ModelInvocationRequest {
  modelId: string;
  prompt: string | any[];
  parameters?: Record<string, any>;
  stream?: boolean;
  maxTokens?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  tools?: any[];
}
```

### ModelResponse

```typescript
interface ModelResponse {
  id: string;
  modelId: string;
  text: string;
  finishReason?: 'stop' | 'length' | 'tool_use' | 'error';
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  toolCalls?: any[];
}
```

## Error Handling

The service provides comprehensive error handling:

```typescript
import { ModelRegistryError, ModelRegistryErrorCode } from './aiModelRegistryTypes.js';

try {
  await modelRegistry.invokeModel(request);
} catch (error) {
  if (error instanceof ModelRegistryError) {
    switch (error.code) {
      case ModelRegistryErrorCode.AuthenticationRequired:
        console.log('Please authenticate first');
        break;
      case ModelRegistryErrorCode.QuotaExceeded:
        console.log('Quota exceeded');
        break;
      case ModelRegistryErrorCode.ModelNotFound:
        console.log('Model not found');
        break;
      case ModelRegistryErrorCode.RateLimitExceeded:
        console.log('Rate limit exceeded, retry after delay');
        break;
      default:
        console.log('Unknown error:', error.message);
    }
  }
}
```

**Error Codes:**
- `MODEL_NOT_FOUND` - Requested model doesn't exist
- `QUOTA_EXCEEDED` - Usage quota has been exceeded
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INVALID_PARAMETERS` - Invalid model parameters
- `AUTHENTICATION_REQUIRED` - User must authenticate
- `NETWORK_ERROR` - Network or API error
- `UNKNOWN_ERROR` - Unexpected error

## Authentication

The service integrates with `AINativeAuthService` for authentication:

```typescript
// Models can be listed without authentication
const models = await modelRegistry.listModels();

// Invocation requires authentication
await authService.login(email, password);
const response = await modelRegistry.invokeModel(request);
```

## Storage and Persistence

Model selections and configurations are persisted using VS Code's storage service:

- **Workspace scope** - Model selections per project
- **Application scope** - Default model and global settings
- **Encrypted storage** - Sensitive data is encrypted

## Testing

Comprehensive test suites are provided:

- **aiModelRegistryService.test.ts** - Service functionality tests
- **aiModelConfig.test.ts** - Configuration management tests

Run tests:

```bash
npm run test-node -- --grep "AI Model"
```

## API Integration

### Current Implementation

The service currently uses mock data for development. The mock implementation includes:

- Claude 3.5 Sonnet (Anthropic)
- GPT-4 Turbo (OpenAI)
- Gemini Pro (Google)

### Future Integration

When the AINative API registry endpoints become available, update the following methods in `aiModelRegistryService.ts`:

```typescript
async refreshModels(): Promise<void> {
  // Replace mock data with actual API call
  const response = await this._makeApiRequest('/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  this._cachedModels = data.models;
}
```

## Performance Considerations

- **Caching** - Model list is cached for 5 minutes
- **Retry Logic** - Automatic retry with exponential backoff
- **Rate Limiting** - Respects rate limit headers
- **Streaming** - Efficient for long responses

## Security

- **Token Management** - Uses encrypted storage for auth tokens
- **Input Validation** - All parameters are validated
- **Error Sanitization** - Error messages don't leak sensitive data
- **Rate Limiting** - Built-in protection against abuse

## Usage Examples

See `aiModelRegistryExample.ts` for complete usage examples including:

1. Listing all models
2. Filtering by capabilities
3. Finding the cheapest model
4. Selecting a model for a project
5. Non-streaming invocation
6. Streaming invocation
7. Usage and quota tracking
8. Error handling
9. Complete workflow

## Integration with Existing Services

The AI Model Registry integrates with:

- **AINativeAuthService** - Authentication
- **AINativeSettingsService** - Settings management
- **LLMMessageService** - LLM communication
- **StorageService** - Persistence
- **EncryptionService** - Secure storage

## Future Enhancements

Planned improvements:

1. **Model Comparison** - Side-by-side comparison UI
2. **Cost Estimation** - Estimate cost before invocation
3. **Model Recommendations** - Suggest best model for task
4. **Fine-tuning Support** - Custom model fine-tuning
5. **Batch Processing** - Batch invocation support
6. **Analytics Dashboard** - Usage analytics and insights
7. **Model Playground** - Interactive testing environment

## Files Created

### Core Implementation
- `/src/vs/workbench/contrib/ainative/common/aiModelRegistryTypes.ts` - Type definitions
- `/src/vs/workbench/contrib/ainative/common/aiModelConfig.ts` - Configuration management
- `/src/vs/workbench/contrib/ainative/common/aiModelRegistryService.ts` - Main service
- `/src/vs/workbench/contrib/ainative/common/aiModelRegistryExample.ts` - Usage examples

### Tests
- `/src/vs/workbench/contrib/ainative/test/common/aiModelRegistryService.test.ts` - Service tests
- `/src/vs/workbench/contrib/ainative/test/common/aiModelConfig.test.ts` - Configuration tests

### Documentation
- `/docs/ai-model-registry-integration.md` - This document

### Registration
- Updated `/src/vs/workbench/contrib/ainative/browser/ainative.contribution.ts` - Service registration

## Support

For issues or questions:
1. Check the examples in `aiModelRegistryExample.ts`
2. Review the test files for usage patterns
3. Refer to the type definitions in `aiModelRegistryTypes.ts`
4. Consult the AINative API documentation

## License

Copyright (c) AINative Studio. All rights reserved.
Licensed under the MIT License.
