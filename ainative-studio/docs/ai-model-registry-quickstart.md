# AI Model Registry - Quick Start Guide

Get started with the AI Model Registry in under 5 minutes.

## Installation

The service is already registered and available via dependency injection. No installation needed!

## Basic Usage

### 1. Inject the Service

```typescript
import { IAIModelRegistryService } from 'vs/workbench/contrib/ainative/common/aiModelRegistryService';

class MyService {
  constructor(
    @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService
  ) {}
}
```

### 2. List Available Models

```typescript
async listModels() {
  const models = await this.modelRegistry.listModels();

  models.forEach(model => {
    console.log(`${model.name} - ${model.provider}`);
  });
}
```

### 3. Filter Models

```typescript
import { ModelCapability } from 'vs/workbench/contrib/ainative/common/aiModelRegistryTypes';

async findCodeModels() {
  const models = await this.modelRegistry.listModels({
    capabilities: [ModelCapability.CodeGeneration],
    availableOnly: true
  });

  return models;
}
```

### 4. Select a Model

```typescript
async selectModel() {
  const projectId = 'my-project';
  const modelId = 'claude-3-5-sonnet-20241022';

  await this.modelRegistry.selectModel(modelId, projectId, {
    temperature: 0.3,
    maxTokens: 4096
  });
}
```

### 5. Invoke a Model

```typescript
async invokeModel() {
  const response = await this.modelRegistry.invokeModel({
    modelId: 'claude-3-5-sonnet-20241022',
    prompt: 'Write a hello world function',
    parameters: {
      temperature: 0.2,
      maxTokens: 1024
    }
  });

  console.log(response.text);
  console.log(`Tokens used: ${response.usage?.totalTokens}`);
}
```

### 6. Stream Responses

```typescript
async streamModel() {
  await this.modelRegistry.streamModel(
    {
      modelId: 'claude-3-5-sonnet-20241022',
      prompt: 'Explain TypeScript',
      stream: true
    },
    (chunk) => {
      console.log(chunk.delta);

      if (chunk.done) {
        console.log('Done!');
      }
    }
  );
}
```

## Common Patterns

### Check if User is Authenticated

```typescript
import { IAINativeAuthService } from 'vs/workbench/contrib/ainative/common/ainativeAuthService';

constructor(
  @IAINativeAuthService private readonly authService: IAINativeAuthService,
  @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService
) {}

async invoke() {
  if (!this.authService.isAuthenticated()) {
    console.log('Please log in first');
    return;
  }

  // Proceed with invocation
  const response = await this.modelRegistry.invokeModel({...});
}
```

### Handle Errors

```typescript
import { ModelRegistryError, ModelRegistryErrorCode } from 'vs/workbench/contrib/ainative/common/aiModelRegistryTypes';

async safeInvoke() {
  try {
    const response = await this.modelRegistry.invokeModel({...});
    return response;
  } catch (error) {
    if (error instanceof ModelRegistryError) {
      switch (error.code) {
        case ModelRegistryErrorCode.AuthenticationRequired:
          console.log('Please authenticate');
          break;
        case ModelRegistryErrorCode.QuotaExceeded:
          console.log('Quota exceeded');
          break;
        default:
          console.log('Error:', error.message);
      }
    }
  }
}
```

### Use Default Parameters

```typescript
import { DEFAULT_MODEL_PARAMETERS } from 'vs/workbench/contrib/ainative/common/aiModelConfig';

// For code generation
const codeParams = DEFAULT_MODEL_PARAMETERS.codeGeneration;
// { temperature: 0.2, topP: 0.9, maxTokens: 8192 }

// For chat
const chatParams = DEFAULT_MODEL_PARAMETERS.chat;
// { temperature: 0.8, topP: 0.95, maxTokens: 2048 }

await this.modelRegistry.selectModel(modelId, projectId, codeParams);
```

### Get Selected Model

```typescript
async getCurrentModel(projectId: string) {
  const model = await this.modelRegistry.getSelectedModel(projectId);

  if (!model) {
    console.log('No model selected');
    return null;
  }

  console.log(`Using: ${model.name}`);
  return model;
}
```

### Check Usage

```typescript
async checkUsage() {
  const usage = await this.modelRegistry.getUsageStats();

  console.log(`Calls: ${usage.totalCalls}`);
  console.log(`Tokens: ${usage.totalTokens}`);
  console.log(`Cost: $${usage.totalCost}`);
}
```

## Complete Example

```typescript
import { IAIModelRegistryService } from 'vs/workbench/contrib/ainative/common/aiModelRegistryService';
import { IAINativeAuthService } from 'vs/workbench/contrib/ainative/common/ainativeAuthService';
import { ModelCapability } from 'vs/workbench/contrib/ainative/common/aiModelRegistryTypes';
import { DEFAULT_MODEL_PARAMETERS } from 'vs/workbench/contrib/ainative/common/aiModelConfig';

export class CodeAssistant {
  constructor(
    @IAINativeAuthService private readonly authService: IAINativeAuthService,
    @IAIModelRegistryService private readonly modelRegistry: IAIModelRegistryService
  ) {}

  async generateCode(projectId: string, prompt: string): Promise<string> {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      throw new Error('Please log in first');
    }

    // Get or select model
    let model = await this.modelRegistry.getSelectedModel(projectId);

    if (!model) {
      // Find best code generation model
      const models = await this.modelRegistry.listModels({
        capabilities: [ModelCapability.CodeGeneration],
        search: 'claude',
        availableOnly: true
      });

      if (models.length === 0) {
        throw new Error('No suitable models found');
      }

      // Select the model
      await this.modelRegistry.selectModel(
        models[0].id,
        projectId,
        DEFAULT_MODEL_PARAMETERS.codeGeneration
      );

      model = models[0];
    }

    // Invoke the model
    const response = await this.modelRegistry.invokeModel({
      modelId: model.id,
      prompt,
      parameters: DEFAULT_MODEL_PARAMETERS.codeGeneration,
      systemPrompt: 'You are an expert TypeScript developer.'
    });

    console.log(`Generated ${response.usage?.outputTokens} tokens`);

    return response.text;
  }
}
```

## Tips

1. **Always check authentication** before invoking models
2. **Use default parameters** as starting points
3. **Handle errors gracefully** with try-catch
4. **Cache model lists** when possible (already done by service)
5. **Validate parameters** before invocation
6. **Monitor usage** to stay within quotas

## Resources

- Full documentation: `/docs/ai-model-registry-integration.md`
- Examples: `/src/vs/workbench/contrib/ainative/common/aiModelRegistryExample.ts`
- Tests: `/src/vs/workbench/contrib/ainative/test/common/aiModelRegistryService.test.ts`
- Types: `/src/vs/workbench/contrib/ainative/common/aiModelRegistryTypes.ts`

## Next Steps

1. Try the examples above
2. Read the full documentation
3. Check the test files for more patterns
4. Review the example file for complete workflows

Happy coding! 🚀
