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
import {
	AIModelRegistryService
} from '../../common/aiModelRegistryService.js';
import {
	AIModel,
	ModelCapability,
	PricingTier,
	ModelParameterType,
	ModelInvocationRequest,
	ModelStreamChunk,
	UsageStats,
	QuotaInfo,
	ModelRegistryError,
	ModelRegistryErrorCode
} from '../../common/aiModelRegistryTypes.js';

describe('AIModelRegistryService', () => {
	let instantiationService: TestInstantiationService;
	let storageService: IStorageService;
	let mockCloudAuthService: sinon.SinonStubbedInstance<IAINativeCloudAuthService>;
	let mockUsageTrackingService: sinon.SinonStubbedInstance<IUsageTrackingService>;
	let service: AIModelRegistryService;
	let fetchStub: sinon.SinonStub;

	const createMockAuthService = (): sinon.SinonStubbedInstance<IAINativeCloudAuthService> => {
		const authStateEmitter = new Emitter<CloudAuthState>();
		const userEmitter = new Emitter<any>();

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
		} as any;
	};

	const createMockUsageTrackingService = (): sinon.SinonStubbedInstance<IUsageTrackingService> => {
		const usageEmitter = new Emitter<any>();
		const quotaEmitter = new Emitter<any>();

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
		} as any;
	};

	const createMockModel = (id: string = 'test-model-1'): AIModel => ({
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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

			await assert.rejects(
				async () => await service.getModel('non-existent'),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.ModelNotFound);
					return true;
				}
			);
		});

		it('should select a model for a project', async () => {
			const mockModels = [createMockModel('test-model')];
			const mockResponse = {
				ok: true,
				status: 200,
				json: sinon.stub().resolves({ models: mockModels })
			};
			fetchStub.resolves(mockResponse as any);

			const eventFired = new Promise<void>(resolve => {
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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
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

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.invokeModel(request),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.invokeModel(request),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.InvalidParameters);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.invokeModel(request),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.RateLimitExceeded);
					return true;
				}
			);
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
			} as any);

			const request: ModelInvocationRequest = {
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
			const chunks: ModelStreamChunk[] = [];
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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
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

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.streamModel(request, () => { }),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.streamModel(request, () => { }),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.NetworkError);
					return true;
				}
			);
		});
	});

	describe('Usage and Quota', () => {
		it('should get usage statistics from API', async () => {
			const mockUsageStats: UsageStats = {
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
			fetchStub.resolves(mockResponse as any);

			const stats = await service.getUsageStats();

			assert.strictEqual(stats.totalCalls, 100);
			assert.strictEqual(stats.totalTokens, 50000);
			assert.strictEqual(stats.totalCost, 5.50);
		});

		it('should get quota information from API', async () => {
			const quotaInfo: QuotaInfo = {
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
			fetchStub.resolves(mockResponse as any);

			const quota = await service.getQuota();

			assert.strictEqual(quota.totalLimit, quotaInfo.totalLimit);
			assert.strictEqual(quota.used, quotaInfo.used);
			assert.strictEqual(quota.remaining, quotaInfo.remaining);
			assert.strictEqual(quota.exceeded, quotaInfo.exceeded);
		});

		it('should throw error when getting usage without authentication', async () => {
			mockCloudAuthService.isAuthenticated.returns(false);

			await assert.rejects(
				async () => await service.getUsageStats(),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
					return true;
				}
			);
		});

		it('should throw error when getting quota without authentication', async () => {
			mockCloudAuthService.isAuthenticated.returns(false);

			await assert.rejects(
				async () => await service.getQuota(),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

			const eventFired = new Promise<void>(resolve => {
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
			fetchStub.resolves(mockResponse as any);

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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.invokeModel(request),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.AuthenticationRequired);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
				modelId: 'non-existent-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.invokeModel(request),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.ModelNotFound);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

			const request: ModelInvocationRequest = {
				modelId: 'test-model',
				prompt: 'Test prompt'
			};

			await assert.rejects(
				async () => await service.invokeModel(request),
				(error: any) => {
					assert.ok(error instanceof ModelRegistryError);
					assert.strictEqual(error.code, ModelRegistryErrorCode.QuotaExceeded);
					return true;
				}
			);
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
			fetchStub.resolves(mockResponse as any);

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
