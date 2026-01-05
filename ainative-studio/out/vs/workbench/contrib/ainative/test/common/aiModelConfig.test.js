/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { ModelConfigManager, validateModelParameters, mergeWithDefaults, DEFAULT_MODEL_PARAMETERS } from '../../common/aiModelConfig.js';
suite('AI Model Configuration Tests', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let storageService;
    let configManager;
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
            const parameters = { temperature: 'hot' };
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
            const parameters = { stopSequences: 'STOP' };
            const result = validateModelParameters(parameters);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.includes('stopSequences')));
        });
        test('should reject stopSequences with non-strings', () => {
            const parameters = { stopSequences: [1, 2, 3] };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbENvbmZpZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9haU1vZGVsQ29uZmlnLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdEYsT0FBTyxFQUNOLGtCQUFrQixFQUNsQix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLHdCQUF3QixFQUN4QixNQUFNLCtCQUErQixDQUFDO0FBRXZDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxJQUFJLGNBQWtDLENBQUM7SUFDdkMsSUFBSSxhQUFpQyxDQUFDO0lBRXRDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixjQUFjLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQzFDLGFBQWEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtZQUMvQyxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUM7WUFDakMsTUFBTSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7WUFDcEMsTUFBTSxVQUFVLEdBQUcsRUFBRSxXQUFXLEVB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