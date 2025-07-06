/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiEmbeddingVectorService_1;
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { createCancelablePromise, raceCancellablePromises, timeout } from '../../../../base/common/async.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const IAiEmbeddingVectorService = createDecorator('IAiEmbeddingVectorService');
let AiEmbeddingVectorService = class AiEmbeddingVectorService {
    static { AiEmbeddingVectorService_1 = this; }
    static { this.DEFAULT_TIMEOUT = 1000 * 10; } // 10 seconds
    constructor(logService) {
        this.logService = logService;
        this._providers = [];
    }
    isEnabled() {
        return this._providers.length > 0;
    }
    registerAiEmbeddingVectorProvider(model, provider) {
        this._providers.push(provider);
        return {
            dispose: () => {
                const index = this._providers.indexOf(provider);
                if (index >= 0) {
                    this._providers.splice(index, 1);
                }
            }
        };
    }
    async getEmbeddingVector(strings, token) {
        if (this._providers.length === 0) {
            throw new Error('No embedding vector providers registered');
        }
        const stopwatch = StopWatch.create();
        const cancellablePromises = [];
        const timer = timeout(AiEmbeddingVectorService_1.DEFAULT_TIMEOUT);
        const disposable = token.onCancellationRequested(() => {
            disposable.dispose();
            timer.cancel();
        });
        for (const provider of this._providers) {
            cancellablePromises.push(createCancelablePromise(async (t) => {
                try {
                    return await provider.provideAiEmbeddingVector(Array.isArray(strings) ? strings : [strings], t);
                }
                catch (e) {
                    // logged in extension host
                }
                // Wait for the timer to finish to allow for another provider to resolve.
                // Alternatively, if something resolved, or we've timed out, this will throw
                // as expected.
                await timer;
                throw new Error('Embedding vector provider timed out');
            }));
        }
        cancellablePromises.push(createCancelablePromise(async (t) => {
            const disposable = t.onCancellationRequested(() => {
                timer.cancel();
                disposable.dispose();
            });
            await timer;
            throw new Error('Embedding vector provider timed out');
        }));
        try {
            const result = await raceCancellablePromises(cancellablePromises);
            // If we have a single result, return it directly, otherwise return an array.
            // This aligns with the API overloads.
            if (result.length === 1) {
                return result[0];
            }
            return result;
        }
        finally {
            stopwatch.stop();
            this.logService.trace(`[AiEmbeddingVectorService]: getEmbeddingVector took ${stopwatch.elapsed()}ms`);
        }
    }
};
AiEmbeddingVectorService = AiEmbeddingVectorService_1 = __decorate([
    __param(0, ILogService)
], AiEmbeddingVectorService);
export { AiEmbeddingVectorService };
registerSingleton(IAiEmbeddingVectorService, AiEmbeddingVectorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlFbWJlZGRpbmdWZWN0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWlFbWJlZGRpbmdWZWN0b3IvY29tbW9uL2FpRW1iZWRkaW5nVmVjdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFaEksT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwyQkFBMkIsQ0FBQyxDQUFDO0FBZTFHLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCOzthQUdwQixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFFLEFBQVosQ0FBYSxHQUFDLGFBQWE7SUFJMUQsWUFBeUIsVUFBd0M7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUZoRCxlQUFVLEdBQWlDLEVBQUUsQ0FBQztJQUVNLENBQUM7SUFFdEUsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxpQ0FBaUMsQ0FBQyxLQUFhLEVBQUUsUUFBb0M7UUFDcEYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7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