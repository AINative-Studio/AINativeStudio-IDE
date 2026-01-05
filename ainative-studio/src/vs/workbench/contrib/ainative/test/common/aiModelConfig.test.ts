/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import {
	ModelConfigManager,
	validateModelParameters,
	mergeWithDefaults,
	DEFAULT_MODEL_PARAMETERS
} from '../../common/aiModelConfig.js';

suite('AI Model Configuration Tests', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let storageService: TestStorageService;
	let configManager: ModelConfigManager;

	setup(() => {
		storageService = new TestStorageService();
		configManager = disposables.add(new ModelConfigManager(storageService));
	});

	suite('Model Selection', () => {
		test('should set and get model selection', () => {
			const projectId = 'test-project';
			const modelId = 'claude-3-5-sonnet';
			const parameters = { temperature: 0.7 };

			configManager.setSelectedModel(projectId, modelId, parameters);

			const selection = configManager.getSelectedModel(projectId);
			assert.ok(selection);
			assert.strictEqual(selection.projectId, projectId);
			assert.strictEqual(selection.modelId, modelId);
			assert.deepStrictEqual(selection.parameters, parameters);
		});

		test('should return null for non-existent project', () => {
			const selection = configManager.getSelectedModel('non-existent-project');
			assert.strictEqual(selection, null);
		});

		test('should update existing selection', () => {
			const projectId = 'test-project';
			const modelId1 = 'claude-3-5-sonnet';
			const modelId2 = 'gpt-4-turbo';

			configManager.setSelectedModel(projectId, modelId1);
			configManager.setSelectedModel(projectId, modelId2);

			const selection = configManager.getSelectedModel(projectId);
			assert.ok(selection);
			assert.strictEqual(selection.modelId, modelId2);
		});

		test('should include timestamp in selection', () => {
			const projectId = 'test-project';
			const modelId = 'claude-3-5-sonnet';
			const before = Date.now();

			configManager.setSelectedModel(projectId, modelId);

			const selection = configManager.getSelectedModel(projectId);
			const after = Date.now();

			assert.ok(selection);
			assert.ok(selection.updatedAt);
			assert.ok(selection.updatedAt >= before && selection.updatedAt <= after);
		});

		test('should fire event when model selection changes', (done) => {
			const projectId = 'test-project';
			const modelId = 'claude-3-5-sonnet';

			configManager.onDidChangeModelSelection((config) => {
				assert.strictEqual(config.projectId, projectId);
				assert.strictEqual(config.modelId, modelId);
				done();
			});

			configManager.setSelectedModel(projectId, modelId);
		});
	});

	suite('Model Parameters', () => {
		test('should set and get model parameters', () => {
			const projectId = 'test-project';
			const modelId = 'claude-3-5-sonnet';
			const parameters = {
				temperature: 0.5,
				topP: 0.9,
				maxTokens: 2048
			};

			configManager.setModelParameters(projectId, modelId, parameters);

			const retrieved = configManager.getModelParameters(projectId, modelId);
			assert.deepStrictEqual(retrieved, parameters);
		});

		test('should return null for non-existent parameters', () => {
			const parameters = configManager.getModelParameters('non-existent-project', 'non-existent-model');
			assert.strictEqual(parameters, null);
		});

		test('should handle multiple models in same project', () => {
			const projectId = 'test-project';
			const model1 = 'claude-3-5-sonnet';
			const model2 = 'gpt-4-turbo';
			const params1 = { temperature: 0.3 };
			const params2 = { temperature: 0.9 };

			configManager.setModelParameters(projectId, model1, params1);
			configManager.setModelParameters(projectId, model2, params2);

			assert.deepStrictEqual(configManager.getModelParameters(projectId, model1), params1);
			assert.deepStrictEqual(configManager.getModelParameters(projectId, model2), params2);
		});
	});

	suite('Default Model', () => {
		test('should set and get default model', () => {
			const modelId = 'claude-3-5-sonnet';

			configManager.setDefaultModel(modelId);

			const retrieved = configManager.getDefaultModel();
			assert.strictEqual(retrieved, modelId);
		});

		test('should return null when no default is set', () => {
			const defaultModel = configManager.getDefaultModel();
			assert.strictEqual(defaultModel, null);
		});

		test('should update default model', () => {
			configManager.setDefaultModel('claude-3-5-sonnet');
			configManager.setDefaultModel('gpt-4-turbo');

			const retrieved = configManager.getDefaultModel();
			assert.strictEqual(retrieved, 'gpt-4-turbo');
		});
	});

	suite('Clear Selection', () => {
		test('should clear model selection for a project', () => {
			const projectId = 'test-project';
			const modelId = 'claude-3-5-sonnet';

			configManager.setSelectedModel(projectId, modelId);
			configManager.clearModelSelection(projectId);

			const selection = configManager.getSelectedModel(projectId);
			assert.strictEqual(selection, null);
		});

		test('should clear model parameters when clearing selection', () => {
			const projectId = 'test-project';
			const modelId = 'claude-3-5-sonnet';
			const parameters = { temperature: 0.7 };

			configManager.setSelectedModel(projectId, modelId, parameters);
			configManager.setModelParameters(projectId, modelId, parameters);
			configManager.clearModelSelection(projectId);

			const params = configManager.getModelParameters(projectId, modelId);
			assert.strictEqual(params, null);
		});
	});

	suite('Get All Selections', () => {
		test('should return all model selections', () => {
			configManager.setSelectedModel('project1', 'model1');
			configManager.setSelectedModel('project2', 'model2');

			const all = configManager.getAllModelSelections();

			assert.ok(all['project1']);
			assert.ok(all['project2']);
			assert.strictEqual(all['project1'].modelId, 'model1');
			assert.strictEqual(all['project2'].modelId, 'model2');
		});

		test('should return empty object when no selections', () => {
			const all = configManager.getAllModelSelections();
			assert.deepStrictEqual(all, {});
		});
	});

	suite('Parameter Validation', () => {
		test('should validate correct parameters', () => {
			const parameters = {
				temperature: 0.7,
				topP: 0.95,
				maxTokens: 4096,
				stopSequences: ['STOP', 'END']
			};

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, true);
			assert.strictEqual(result.errors.length, 0);
		});

		test('should reject invalid temperature', () => {
			const parameters = { temperature: 5.0 };

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some(e => e.includes('temperature')));
		});

		test('should reject non-numeric temperature', () => {
			const parameters = { temperature: 'hot' as any };

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some(e => e.includes('temperature')));
		});

		test('should reject invalid topP', () => {
			const parameters = { topP: 1.5 };

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some(e => e.includes('topP')));
		});

		test('should reject invalid maxTokens', () => {
			const parameters = { maxTokens: -10 };

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some(e => e.includes('maxTokens')));
		});

		test('should reject invalid stopSequences', () => {
			const parameters = { stopSequences: 'STOP' as any };

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some(e => e.includes('stopSequences')));
		});

		test('should reject stopSequences with non-strings', () => {
			const parameters = { stopSequences: [1, 2, 3] as any };

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.some(e => e.includes('stopSequences')));
		});

		test('should accumulate multiple errors', () => {
			const parameters = {
				temperature: 5.0,
				topP: 2.0,
				maxTokens: -1
			};

			const result = validateModelParameters(parameters);

			assert.strictEqual(result.valid, false);
			assert.strictEqual(result.errors.length, 3);
		});
	});

	suite('Default Parameters', () => {
		test('should provide conservative parameters', () => {
			const params = DEFAULT_MODEL_PARAMETERS.conservative;

			assert.strictEqual(params.temperature, 0.3);
			assert.strictEqual(params.topP, 0.9);
			assert.strictEqual(params.maxTokens, 4096);
		});

		test('should provide balanced parameters', () => {
			const params = DEFAULT_MODEL_PARAMETERS.balanced;

			assert.strictEqual(params.temperature, 0.7);
			assert.strictEqual(params.topP, 0.95);
			assert.strictEqual(params.maxTokens, 4096);
		});

		test('should provide creative parameters', () => {
			const params = DEFAULT_MODEL_PARAMETERS.creative;

			assert.strictEqual(params.temperature, 1.0);
			assert.strictEqual(params.topP, 0.98);
			assert.strictEqual(params.maxTokens, 4096);
		});

		test('should provide code generation parameters', () => {
			const params = DEFAULT_MODEL_PARAMETERS.codeGeneration;

			assert.strictEqual(params.temperature, 0.2);
			assert.strictEqual(params.topP, 0.9);
			assert.strictEqual(params.maxTokens, 8192);
		});

		test('should provide chat parameters', () => {
			const params = DEFAULT_MODEL_PARAMETERS.chat;

			assert.strictEqual(params.temperature, 0.8);
			assert.strictEqual(params.topP, 0.95);
			assert.strictEqual(params.maxTokens, 2048);
		});
	});

	suite('Merge with Defaults', () => {
		test('should merge user parameters with defaults', () => {
			const defaults = { temperature: 0.7, topP: 0.95, maxTokens: 4096 };
			const userParams = { temperature: 0.5 };

			const merged = mergeWithDefaults(userParams, defaults);

			assert.strictEqual(merged.temperature, 0.5);
			assert.strictEqual(merged.topP, 0.95);
			assert.strictEqual(merged.maxTokens, 4096);
		});

		test('should handle undefined user parameters', () => {
			const defaults = { temperature: 0.7, topP: 0.95 };

			const merged = mergeWithDefaults(undefined, defaults);

			assert.deepStrictEqual(merged, defaults);
		});

		test('should override all defaults when user provides all parameters', () => {
			const defaults = { temperature: 0.7, topP: 0.95 };
			const userParams = { temperature: 0.5, topP: 0.9 };

			const merged = mergeWithDefaults(userParams, defaults);

			assert.deepStrictEqual(merged, userParams);
		});

		test('should add new parameters not in defaults', () => {
			const defaults = { temperature: 0.7 };
			const userParams = { topP: 0.9 };

			const merged = mergeWithDefaults(userParams, defaults);

			assert.strictEqual(merged.temperature, 0.7);
			assert.strictEqual(merged.topP, 0.9);
		});
	});

	suite('Integration Tests', () => {
		test('should persist selections across instances', () => {
			const projectId = 'persistence-test';
			const modelId = 'claude-3-5-sonnet';

			configManager.setSelectedModel(projectId, modelId);

			// Create new instance with same storage
			const newConfigManager = new ModelConfigManager(storageService);

			const selection = newConfigManager.getSelectedModel(projectId);
			assert.ok(selection);
			assert.strictEqual(selection.modelId, modelId);

			newConfigManager.dispose();
		});

		test('should handle complex workflow', () => {
			const projectId = 'workflow-test';
			const modelId = 'claude-3-5-sonnet';
			const parameters = {
				temperature: 0.5,
				topP: 0.9,
				maxTokens: 2048
			};

			// Validate parameters
			const validation = validateModelParameters(parameters);
			assert.strictEqual(validation.valid, true);

			// Merge with defaults
			const merged = mergeWithDefaults(parameters, DEFAULT_MODEL_PARAMETERS.balanced);

			// Set selection
			configManager.setSelectedModel(projectId, modelId, merged);

			// Verify
			const selection = configManager.getSelectedModel(projectId);
			assert.ok(selection);
			assert.strictEqual(selection.modelId, modelId);
			assert.strictEqual(selection.parameters?.temperature, 0.5);
		});
	});
});
