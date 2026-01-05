/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * AI Model Registry Service - Usage Examples
 *
 * This file demonstrates how to use the AI Model Registry Service
 * to list, select, and invoke AI models from the AINative registry.
 */

import { IAIModelRegistryService } from './aiModelRegistryService.js';
import { ModelCapability, PricingTier, ModelInvocationRequest } from './aiModelRegistryTypes.js';

/**
 * Example 1: List all available models
 */
export async function listAllModels(registryService: IAIModelRegistryService) {
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
export async function findCodeGenerationModels(registryService: IAIModelRegistryService) {
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
export async function findCheapestModel(registryService: IAIModelRegistryService) {
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
export async function selectModelForProject(
	registryService: IAIModelRegistryService,
	projectId: string
) {
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
		temperature: 0.3,  // Conservative for code generation
		maxTokens: 8192,   // Large context for code
		topP: 0.9
	});

	console.log(`Selected ${model.name} for project ${projectId}`);

	return model;
}

/**
 * Example 5: Get selected model for a project
 */
export async function getProjectModel(
	registryService: IAIModelRegistryService,
	projectId: string
) {
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
export async function invokeModelExample(
	registryService: IAIModelRegistryService,
	modelId: string
) {
	const request: ModelInvocationRequest = {
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
export async function streamModelExample(
	registryService: IAIModelRegistryService,
	modelId: string
) {
	const request: ModelInvocationRequest = {
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
export async function checkUsageAndQuota(registryService: IAIModelRegistryService) {
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
export async function completeWorkflow(
	registryService: IAIModelRegistryService,
	projectId: string
) {
	console.log('=== AI Model Registry Complete Workflow ===\n');

	// Step 1: List models with filters
	console.log('Step 1: Finding suitable models...');
	const models = await registryService.listModels({
		capabilities: [ModelCapability.CodeGeneration, ModelCapability.Chat],
		pricingTier: PricingTier.PayAsYouGo,
		availableOnly: true,
		maxPrice: 0.02  // Max $0.02 per 1K tokens average
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
export async function errorHandlingExample(registryService: IAIModelRegistryService) {
	try {
		// Try to get a non-existent model
		await registryService.getModel('non-existent-model-id');
	} catch (error: any) {
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
	} catch (error: any) {
		console.log('Caught authentication error:');
		console.log(`Code: ${error.code}`);
		console.log(`Message: ${error.message}`);
	}
}
