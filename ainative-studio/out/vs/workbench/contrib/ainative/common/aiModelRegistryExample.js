/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { ModelCapability, PricingTier } from './aiModelRegistryTypes.js';
/**
 * Example 1: List all available models
 */
export async function listAllModels(registryService) {
    const models = await registryService.listModels();
    console.log(`Found ${models.length} models:`);
    models.forEach(model => {
        console.log(`- ${model.name} (${model.provider})`);
        console.log(`  Capabilities: ${model.capabilities.join(', ')}`);
        console.log(`  Pricing: $${model.pricing.inputTokenCost}/1K input, $${model.pricing.outputTokenCost}/1K output`);
    });
}
/**
 * Example 2: Filter models by capabilities
 */
export async function findCodeGenerationModels(registryService) {
    const models = await registryService.listModels({
        capabilities: [ModelCapability.CodeGeneration],
        availableOnly: true
    });
    console.log(`Found ${models.length} code generation models:`);
    models.forEach(model => {
        console.log(`- ${model.name}: ${model.description}`);
    });
    return models;
}
/**
 * Example 3: Find the most affordable model
 */
export async function findCheapestModel(registryService) {
    const models = await registryService.listModels({
        pricingTier: PricingTier.PayAsYouGo,
        availableOnly: true
    });
    // Sort by average cost
    const sorted = models.sort((a, b) => {
        const avgCostA = ((a.pricing.inputTokenCost ?? 0) + (a.pricing.outputTokenCost ?? 0)) / 2;
        const avgCostB = ((b.pricing.inputTokenCost ?? 0) + (b.pricing.outputTokenCost ?? 0)) / 2;
        return avgCostA - avgCostB;
    });
    const cheapest = sorted[0];
    console.log(`Most affordable model: ${cheapest.name}`);
    console.log(`Average cost: $${((cheapest.pricing.inputTokenCost ?? 0) + (cheapest.pricing.outputTokenCost ?? 0)) / 2}/1K tokens`);
    return cheapest;
}
/**
 * Example 4: Select a model for a project
 */
export async function selectModelForProject(registryService, projectId) {
    // Find Claude models for code generation
    const models = await registryService.listModels({
        search: 'claude',
        capabilities: [ModelCapability.CodeGeneration],
        availableOnly: true
    });
    if (models.length === 0) {
        throw new Error('No suitable models found');
    }
    // Select the first Claude model
    const model = models[0];
    // Configure with custom parameters
    await registryService.selectModel(model.id, projectId, {
        temperature: 0.3, // Conservative for code generation
        maxTokens: 8192, // Large context for code
        topP: 0.9
    });
    console.log(`Selected ${model.name} for project ${projectId}`);
    return model;
}
/**
 * Example 5: Get selected model for a project
 */
export async function getProjectModel(registryService, projectId) {
    const model = await registryService.getSelectedModel(projectId);
    if (!model) {
        console.log(`No model selected for project ${projectId}`);
        return null;
    }
    console.log(`Project ${projectId} is using: ${model.name}`);
    console.log(`Provider: ${model.provider}`);
    console.log(`Capabilities: ${model.capabilities.join(', ')}`);
    return model;
}
/**
 * Example 6: Invoke a model (non-streaming)
 */
export async function invokeModelExample(registryService, modelId) {
    const request = {
        modelId,
        prompt: 'Write a TypeScript function to reverse a string',
        parameters: {
            temperature: 0.2,
            maxTokens: 1024
        },
        systemPrompt: 'You are a helpful coding assistant.'
    };
    const response = await registryService.invokeModel(request);
    console.log('Model response:');
    console.log(response.text);
    console.log(`\nTokens used: ${response.usage?.totalTokens ?? 'N/A'}`);
    return response;
}
/**
 * Example 7: Invoke a model with streaming
 */
export async function streamModelExample(registryService, modelId) {
    const request = {
        modelId,
        prompt: 'Explain how async/await works in JavaScript',
        stream: true,
        parameters: {
            temperature: 0.7,
            maxTokens: 2048
        }
    };
    let fullText = '';
    await registryService.streamModel(request, (chunk) => {
        // Process each chunk as it arrives
        fullText += chunk.delta;
        process.stdout.write(chunk.delta);
        if (chunk.done) {
            console.log('\n\nStream complete!');
            if (chunk.usage) {
                console.log(`Tokens used: ${chunk.usage.totalTokens}`);
            }
        }
    });
    return fullText;
}
/**
 * Example 8: Check usage and quota
 */
export async function checkUsageAndQuota(registryService) {
    // Get usage statistics
    const usage = await registryService.getUsageStats();
    console.log('Usage Statistics:');
    console.log(`Total calls: ${usage.totalCalls}`);
    console.log(`Total tokens: ${usage.totalTokens.toLocaleString()}`);
    console.log(`Total cost: $${usage.totalCost.toFixed(2)}`);
    if (usage.byModel) {
        console.log('\nBy model:');
        Object.entries(usage.byModel).forEach(([modelId, stats]) => {
            console.log(`- ${modelId}: ${stats.calls} calls, ${stats.tokens.toLocaleString()} tokens, $${stats.cost.toFixed(2)}`);
        });
    }
    // Get quota information
    const quota = await registryService.getQuota();
    console.log('\nQuota Information:');
    console.log(`Limit: ${quota.totalLimit.toLocaleString()} tokens`);
    console.log(`Used: ${quota.used.toLocaleString()} tokens`);
    console.log(`Remaining: ${quota.remaining.toLocaleString()} tokens`);
    console.log(`Exceeded: ${quota.exceeded ? 'Yes' : 'No'}`);
    if (quota.resetDate) {
        console.log(`Resets: ${new Date(quota.resetDate).toLocaleString()}`);
    }
    return { usage, quota };
}
/**
 * Example 9: Complete workflow
 */
export async function completeWorkflow(registryService, projectId) {
    console.log('=== AI Model Registry Complete Workflow ===\n');
    // Step 1: List models with filters
    console.log('Step 1: Finding suitable models...');
    const models = await registryService.listModels({
        capabilities: [ModelCapability.CodeGeneration, ModelCapability.Chat],
        pricingTier: PricingTier.PayAsYouGo,
        availableOnly: true,
        maxPrice: 0.02 // Max $0.02 per 1K tokens average
    });
    console.log(`Found ${models.length} suitable models\n`);
    // Step 2: Select a model
    console.log('Step 2: Selecting model...');
    const selectedModel = models[0];
    await registryService.selectModel(selectedModel.id, projectId, {
        temperature: 0.5,
        maxTokens: 4096,
        topP: 0.95
    });
    console.log(`Selected: ${selectedModel.name}\n`);
    // Step 3: Verify selection
    console.log('Step 3: Verifying selection...');
    const verifiedModel = await registryService.getSelectedModel(projectId);
    console.log(`Verified: ${verifiedModel?.name}\n`);
    // Step 4: Invoke the model
    console.log('Step 4: Invoking model...');
    const response = await registryService.invokeModel({
        modelId: selectedModel.id,
        prompt: 'Write a hello world function in TypeScript',
        parameters: {
            temperature: 0.3,
            maxTokens: 512
        }
    });
    console.log('Response received!\n');
    console.log(response.text);
    console.log(`\nTokens: ${response.usage?.totalTokens}\n`);
    // Step 5: Check usage
    console.log('Step 5: Checking usage...');
    const { usage, quota } = await checkUsageAndQuota(registryService);
    console.log('\n=== Workflow Complete ===');
    return {
        model: selectedModel,
        response,
        usage,
        quota
    };
}
/**
 * Example 10: Error handling
 */
export async function errorHandlingExample(registryService) {
    try {
        // Try to get a non-existent model
        await registryService.getModel('non-existent-model-id');
    }
    catch (error) {
        console.log('Caught expected error:');
        console.log(`Code: ${error.code}`);
        console.log(`Message: ${error.message}`);
    }
    try {
        // Try to invoke without authentication
        await registryService.invokeModel({
            modelId: 'some-model',
            prompt: 'Test'
        });
    }
    catch (error) {
        console.log('Caught authentication error:');
        console.log(`Code: ${error.code}`);
        console.log(`Message: ${error.message}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbFJlZ2lzdHJ5RXhhbXBsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FpZGV2ZWxvcGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWluYXRpdmUvY29tbW9uL2FpTW9kZWxSZWdpc3RyeUV4YW1wbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQTBCLE1BQU0sMkJBQTJCLENBQUM7QUFFakc7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGFBQWEsQ0FBQyxlQUF3QztJQUMzRSxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUVsRCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsTUFBTSxDQUFDLE1BQU0sVUFBVSxDQUFDLENBQUM7SUFDOUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNuRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxlQUFlLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxZQUFZLENBQUMsQ0FBQztJQUNsSCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsd0JBQXdCLENBQUMsZUFBd0M7SUFDdEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUMsVUFBVSxD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