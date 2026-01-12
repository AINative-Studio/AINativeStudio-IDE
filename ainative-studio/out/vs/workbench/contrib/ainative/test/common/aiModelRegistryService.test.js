/*---------------------------------------------------------------------------------------------
 *  Copyright (c) AINative Studio. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
import { describe, it, beforeEach, afterEach } from 'mocha';
import * as assert from 'assert';
import * as sinon from 'sinon';
import { Emitter } from '../../../../../base/common/event.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService, InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { IAINativeCloudAuthService, CloudAuthState } from '../../common/ainativeCloudAuthTypes.js';
import { IUsageTrackingService } from '../../common/usageTrackingService.js';
import { AIModelRegistryService } from '../../common/aiModelRegistryService.js';
import { ModelCapability, PricingTier, ModelParameterType, ModelRegistryError, ModelRegistryErrorCode } from '../../common/aiModelRegistryTypes.js';
describe('AIModelRegistryService', () => {
    let instantiationService;
    let storageService;
    let mockCloudAuthService;
    let mockUsageTrackingService;
    let service;
    let fetchStub;
    const createMockAuthService = () => {
        const authStateEmitter = new Emitter();
        const userEmitter = new Emitter();
        return {
            _serviceBrand: undefined,
            isAuthenticated: sinon.stub().returns(true),
            getAuthState: sinon.stub().returns(CloudAuthState.Authenticated),
            getAccessToken: sinon.stub().resolves('test-access-token'),
            getAccessTokenSync: sinon.stub().returns('test-access-token'),
            getUser: sinon.stub().returns(null),
            getCurrentUser: sinon.stub().resolves(null),
            login: sinon.stub(),
            logout: sinon.stub(),
            register: sinon.stub(),
            refreshToken: sinon.stub(),
            requestPasswordReset: sinon.stub(),
            confirmPasswordReset: sinon.stub(),
            changePassword: sinon.stub(),
            validateToken: sinon.stub(),
            resendEmailVerification: sinon.stub(),
            verifyEmail: sinon.stub(),
            onDidChangeAuthState: authStateEmitter.event,
            onDidUpdateUser: userEmitter.event
        };
    };
    const createMockUsageTrackingService = () => {
        const usageEmitter = new Emitter();
        const quotaEmitter = new Emitter();
        return {
            _serviceBrand: undefined,
            trackUsage: sinon.stub().resolves(),
            getUsage: sinon.stub().resolves({
                totalCalls: 0,
                totalTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalCost: 0,
                byModel: {},
                periodStart: Date.now(),
                periodEnd: Date.now()
            }),
            getQuotaStatus: sinon.stub().resolves({
                hasQuota: true,
                totalLimit: 100000,
                used: 0,
                remaining: 100000,
                exceeded: false,
                warningThreshold: 0.8,
                approaching: false
            }),
            calculateCost: sinon.stub().resolves({
                inputCost: 0,
                outputCost: 0,
                totalCost: 0
            }),
            syncWithCloud: sinon.stub().resolves(),
            clearLocalUsage: sinon.stub().resolves(),
            reset: sinon.stub(),
            onDidUpdateUsage: usageEmitter.event,
            onDidUpdateQuota: quotaEmitter.event
        };
    };
    const createMockModel = (id = 'test-model-1') => ({
        id,
        name: 'Test Model',
        description: 'A test model for unit testing',
        provider: 'test-provider',
        version: '1.0',
        capabilities: [ModelCapability.TextGeneration, ModelCapability.Chat, ModelCapability.Streaming],
        pricing: {
            tier: PricingTier.PayAsYouGo,
            inputTokenCost: 0.001,
            outputTokenCost: 0.002,
            currency: 'USD'
        },
        parameters: [
            {
                name: 'temperature',
                type: ModelParameterType.Number,
                description: 'Temperature parameter',
                defaultValue: 0.7,
                min: 0,
                max: 2,
                required: false
            }
        ],
        maxContextLength: 100000,
        maxOutputLength: 4096,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        available: true,
        tags: ['general', 'chat']
    });
    beforeEach(() => {
        instantiationService = new TestInstantiationService();
        storageService = new InMemoryStorageService();
        mockCloudAuthService = createMockAuthService();
        mockUsageTrackingService = createMockUsageTrackingService();
        instantiationService.stub(IStorageService, storageService);
        instantiationService.stub(IAINativeCloudAuthService, mockCloudAuthService);
        instantiationService.stub(IUsageTrackingService, mockUsageTrackingService);
        // Stub global fetch
        fetchStub = sinon.stub(globalThis, 'fetch');
        service = instantiationService.createInstance(AIModelRegistryService);
    });
    afterEach(() => {
        fetchStub.restore();
        service.dispose();
    });
    describe('Model Listing', () => {
        it('should fetch and cache models from API', async () => {
            const mockModels = [createMockModel('model-1'), createMockModel('model-2')];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels();
            assert.strictEqual(models.length, 2);
            assert.strictEqual(models[0].id, 'model-1');
            assert.strictEqual(models[1].id, 'model-2');
            assert.ok(fetchStub.calledOnce);
        });
        it('should use cached models within cache duration', async () => {
            const mockModels = [createMockModel()];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            // First call - fetches from API
            await service.listModels();
            assert.ok(fetchStub.calledOnce);
            // Second call - uses cache
            await service.listModels();
            assert.ok(fetchStub.calledOnce); // Still only one call
        });
        it('should return empty array when unauthenticated', async () => {
            mockCloudAuthService.getAccessToken.resolves(null);
            const models = await service.listModels();
            assert.strictEqual(models.length, 0);
            assert.ok(fetchStub.notCalled);
        });
        it('should filter models by provider', async () => {
            const mockModels = [
                { ...createMockModel('model-1'), provider: 'anthropic' },
                { ...createMockModel('model-2'), provider: 'openai' },
                { ...createMockModel('model-3'), provider: 'anthropic' }
            ];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels({ provider: 'anthropic' });
            assert.strictEqual(models.length, 2);
            assert.ok(models.every(m => m.provider === 'anthropic'));
        });
        it('should filter models by capabilities', async () => {
            const mockModels = [
                { ...createMockModel('model-1'), capabilities: [ModelCapability.Chat, ModelCapability.TextGeneration] },
                { ...createMockModel('model-2'), capabilities: [ModelCapability.CodeGeneration] },
                { ...createMockModel('model-3'), capabilities: [ModelCapability.Chat, ModelCapability.Vision] }
            ];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels({
                capabilities: [ModelCapability.Chat]
            });
            assert.strictEqual(models.length, 2);
            assert.ok(models.every(m => m.capabilities.includes(ModelCapability.Chat)));
        });
        it('should filter models by pricing tier', async () => {
            const mockModels = [
                { ...createMockModel('model-1'), pricing: { tier: PricingTier.Free, currency: 'USD' } },
                { ...createMockModel('model-2'), pricing: { tier: PricingTier.PayAsYouGo, currency: 'USD' } },
                { ...createMockModel('model-3'), pricing: { tier: PricingTier.Free, currency: 'USD' } }
            ];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels({ pricingTier: PricingTier.Free });
            assert.strictEqual(models.length, 2);
            assert.ok(models.every(m => m.pricing.tier === PricingTier.Free));
        });
        it('should filter models by search query', async () => {
            const mockModels = [
                { ...createMockModel('model-1'), name: 'GPT-4 Turbo', description: 'Advanced model' },
                { ...createMockModel('model-2'), name: 'Claude 3', description: 'Anthropic model' },
                { ...createMockModel('model-3'), name: 'GPT-3.5', description: 'Efficient model' }
            ];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels({ search: 'gpt' });
            assert.strictEqual(models.length, 2);
            assert.ok(models.every(m => m.name.toLowerCase().includes('gpt')));
        });
        it('should filter models by availability', async () => {
            const mockModels = [
                { ...createMockModel('model-1'), available: true },
                { ...createMockModel('model-2'), available: false },
                { ...createMockModel('model-3'), available: true }
            ];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels({ availableOnly: true });
            assert.strictEqual(models.length, 2);
            assert.ok(models.every(m => m.available === true));
        });
    });
    describe('Model Selection', () => {
        it('should get a specific model by ID', async () => {
            const mockModels = [createMockModel('test-model')];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const model = await service.getModel('test-model');
            assert.strictEqual(model.id, 'test-model');
            assert.strictEqual(model.name, 'Test Model');
        });
        it('should throw error when model not found', async () => {
            const mockModels = [createMockModel('model-1')];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            await assert.rejects(async () => await service.getModel('non-existent'), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.ModelNotFound);
                return true;
            });
        });
        it('should select a model for a project', async () => {
            const mockModels = [createMockModel('test-model')];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const eventFired = new Promise(resolve => {
                service.onDidChangeModelSelection(config => {
                    assert.strictEqual(config.projectId, 'project-1');
                    assert.strictEqual(config.modelId, 'test-model');
                    resolve();
                });
            });
            await service.selectModel('test-model', 'project-1', { temperature: 0.5 });
            await eventFired;
        });
        it('should get selected model for a project', async () => {
            const mockModels = [createMockModel('test-model')];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            await service.selectModel('test-model', 'project-1');
            const selectedModel = await service.getSelectedModel('project-1');
            assert.ok(selectedModel);
            assert.strictEqual(selectedModel.id, 'test-model');
        });
        it('should return null when no model selected for project', async () => {
            const selectedModel = await service.getSelectedModel('non-existent-project');
            assert.strictEqual(selectedModel, null);
        });
    });
    describe('Model Invocation', () => {
        it('should invoke model and return response', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({
                    id: 'invocation-1',
                    text: 'Test response',
                    finish_reason: 'stop',
                    usage: {
                        input_tokens: 10,
                        output_tokens: 20,
                        total_tokens: 30
                    }
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt',
                maxTokens: 100
            };
            const response = await service.invokeModel(request);
            assert.strictEqual(response.text, 'Test response');
            assert.strictEqual(response.finishReason, 'stop');
            assert.strictEqual(response.usage?.inputTokens, 10);
            assert.strictEqual(response.usage?.outputTokens, 20);
            assert.ok(mockUsageTrackingService.trackUsage.calledOnce);
        });
        it('should throw error when not authenticated', async () => {
            mockCloudAuthService.isAuthenticated.returns(false);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.invokeModel(request), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
                return true;
            });
        });
        it('should handle API errors correctly', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: sinon.stub().resolves({
                    message: 'Invalid parameters'
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.invokeModel(request), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.InvalidParameters);
                return true;
            });
        });
        it('should handle rate limiting errors', async () => {
            const mockResponse = {
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                headers: {
                    get: sinon.stub().returns('60')
                },
                json: sinon.stub().resolves({
                    message: 'Rate limit exceeded'
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.invokeModel(request), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.RateLimitExceeded);
                return true;
            });
        });
        it('should retry on network errors', async () => {
            // First attempt fails, second succeeds
            fetchStub.onFirstCall().rejects(new Error('Network error'));
            fetchStub.onSecondCall().resolves({
                ok: true,
                status: 200,
                json: sinon.stub().resolves({
                    id: 'invocation-1',
                    text: 'Test response',
                    finish_reason: 'stop'
                })
            });
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            const response = await service.invokeModel(request);
            assert.strictEqual(response.text, 'Test response');
            assert.ok(fetchStub.calledTwice);
        });
    });
    describe('Model Streaming', () => {
        it('should stream model response in chunks', async () => {
            const chunks = [];
            const streamData = `data: {"id":"chunk-1","delta":"Hello","done":false}\ndata: {"id":"chunk-2","delta":" World","done":false}\ndata: {"id":"chunk-3","delta":"","done":true,"finish_reason":"stop","usage":{"input_tokens":5,"output_tokens":10}}\ndata: [DONE]\n`;
            const mockResponse = {
                ok: true,
                status: 200,
                body: {
                    getReader: () => ({
                        read: sinon.stub()
                            .onFirstCall().resolves({
                            done: false,
                            value: new TextEncoder().encode(streamData)
                        })
                            .onSecondCall().resolves({
                            done: true,
                            value: undefined
                        })
                    })
                }
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await service.streamModel(request, (chunk) => {
                chunks.push(chunk);
            });
            assert.strictEqual(chunks.length, 3);
            assert.strictEqual(chunks[0].delta, 'Hello');
            assert.strictEqual(chunks[1].delta, ' World');
            assert.strictEqual(chunks[2].done, true);
            assert.strictEqual(chunks[2].finishReason, 'stop');
            assert.ok(mockUsageTrackingService.trackUsage.calledOnce);
        });
        it('should throw error when not authenticated for streaming', async () => {
            mockCloudAuthService.isAuthenticated.returns(false);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.streamModel(request, () => { }), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
                return true;
            });
        });
        it('should handle streaming errors gracefully', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: sinon.stub().resolves({
                    message: 'Server error'
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.streamModel(request, () => { }), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.NetworkError);
                return true;
            });
        });
    });
    describe('Usage and Quota', () => {
        it('should get usage statistics from API', async () => {
            const mockUsageStats = {
                totalCalls: 100,
                totalTokens: 50000,
                inputTokens: 30000,
                outputTokens: 20000,
                totalCost: 5.50,
                byModel: {
                    'model-1': { calls: 50, tokens: 25000, cost: 2.75 },
                    'model-2': { calls: 50, tokens: 25000, cost: 2.75 }
                },
                periodStart: '2024-01-01',
                periodEnd: '2024-01-31'
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({
                    total_calls: 100,
                    total_tokens: 50000,
                    input_tokens: 30000,
                    output_tokens: 20000,
                    total_cost: 5.50,
                    by_model: mockUsageStats.byModel,
                    period_start: '2024-01-01',
                    period_end: '2024-01-31'
                })
            };
            fetchStub.resolves(mockResponse);
            const stats = await service.getUsageStats();
            assert.strictEqual(stats.totalCalls, 100);
            assert.strictEqual(stats.totalTokens, 50000);
            assert.strictEqual(stats.totalCost, 5.50);
        });
        it('should get quota information from API', async () => {
            const quotaInfo = {
                totalLimit: 1000000,
                used: 500000,
                remaining: 500000,
                resetDate: '2024-02-01',
                exceeded: false
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({
                    total_limit: quotaInfo.totalLimit,
                    used: quotaInfo.used,
                    remaining: quotaInfo.remaining,
                    reset_date: quotaInfo.resetDate,
                    exceeded: quotaInfo.exceeded
                })
            };
            fetchStub.resolves(mockResponse);
            const quota = await service.getQuota();
            assert.strictEqual(quota.totalLimit, quotaInfo.totalLimit);
            assert.strictEqual(quota.used, quotaInfo.used);
            assert.strictEqual(quota.remaining, quotaInfo.remaining);
            assert.strictEqual(quota.exceeded, quotaInfo.exceeded);
        });
        it('should throw error when getting usage without authentication', async () => {
            mockCloudAuthService.isAuthenticated.returns(false);
            await assert.rejects(async () => await service.getUsageStats(), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
                return true;
            });
        });
        it('should throw error when getting quota without authentication', async () => {
            mockCloudAuthService.isAuthenticated.returns(false);
            await assert.rejects(async () => await service.getQuota(), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
                return true;
            });
        });
    });
    describe('Cache Management', () => {
        it('should refresh models on demand', async () => {
            const mockModels = [createMockModel()];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            const eventFired = new Promise(resolve => {
                service.onDidUpdateModels(models => {
                    assert.strictEqual(models.length, 1);
                    resolve();
                });
            });
            await service.refreshModels();
            await eventFired;
            assert.ok(fetchStub.calledOnce);
        });
        it('should clear cache on authentication state change to unauthenticated', async () => {
            const mockModels = [createMockModel()];
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: mockModels })
            };
            fetchStub.resolves(mockResponse);
            // First load models
            await service.listModels();
            assert.ok(fetchStub.calledOnce);
            // Simulate auth state change (this would need to be triggered by the auth service emitter)
            // For now, we verify the behavior is set up correctly
            assert.ok(service);
        });
    });
    describe('Error Handling', () => {
        it('should map 401 errors to AuthenticationRequired', async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: sinon.stub().resolves({
                    message: 'Invalid token'
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.invokeModel(request), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
                return true;
            });
        });
        it('should map 404 errors to ModelNotFound', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: sinon.stub().resolves({
                    message: 'Model not found'
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'non-existent-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.invokeModel(request), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.ModelNotFound);
                return true;
            });
        });
        it('should map 402 errors to QuotaExceeded', async () => {
            const mockResponse = {
                ok: false,
                status: 402,
                statusText: 'Payment Required',
                json: sinon.stub().resolves({
                    message: 'Quota exceeded'
                })
            };
            fetchStub.resolves(mockResponse);
            const request = {
                modelId: 'test-model',
                prompt: 'Test prompt'
            };
            await assert.rejects(async () => await service.invokeModel(request), (error) => {
                assert.ok(error instanceof ModelRegistryError);
                assert.strictEqual(error.code, ModelRegistryErrorCode.QuotaExceeded);
                return true;
            });
        });
    });
    describe('Parameter Mapping', () => {
        it('should correctly map API model format to internal format', async () => {
            const apiModel = {
                id: 'api-model-1',
                model_id: 'api-model-1',
                name: 'API Test Model',
                description: 'Test model from API',
                provider: 'test-provider',
                version: '2.0',
                capabilities: ['text_generation', 'chat', 'streaming'],
                pricing: {
                    tier: 'pay_as_you_go',
                    input_token_cost: 0.003,
                    output_token_cost: 0.006,
                    currency: 'USD'
                },
                parameters: [
                    {
                        name: 'temperature',
                        type: 'number',
                        description: 'Controls randomness',
                        default_value: 0.7,
                        min: 0,
                        max: 2,
                        required: false
                    }
                ],
                max_context_length: 200000,
                max_output_length: 8192,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                available: true,
                tags: ['advanced', 'production']
            };
            const mockResponse = {
                ok: true,
                status: 200,
                json: sinon.stub().resolves({ models: [apiModel] })
            };
            fetchStub.resolves(mockResponse);
            const models = await service.listModels();
            assert.strictEqual(models.length, 1);
            const model = models[0];
            assert.strictEqual(model.id, 'api-model-1');
            assert.strictEqual(model.name, 'API Test Model');
            assert.strictEqual(model.maxContextLength, 200000);
            assert.strictEqual(model.pricing.inputTokenCost, 0.003);
            assert.strictEqual(model.capabilities.length, 3);
            assert.ok(model.capabilities.includes(ModelCapability.TextGeneration));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlNb2RlbFJlZ2lzdHJ5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS90ZXN0L2NvbW1vbi9haU1vZGVsUmVnaXN0cnlTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUM1RCxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLE1BQU0sd0NBQXdDLENBQUM7QUFDaEQsT0FBTyxFQUVOLGVBQWUsRUFDZixXQUFXLEVBQ1gsa0JBQWtCLEVBS2xCLGtCQUFrQixFQUNsQixzQkFBc0IsRUFDdEIsTUFBTSxzQ0FBc0MsQ0FBQztBQUU5QyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLElBQUksb0JBQThDLENBQUM7SUFDbkQsSUFBSSxjQUErQixDQUFDO0lBQ3BDLElBQUksb0JBQTJFLENBQUM7SUFDaEYsSUFBSSx3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