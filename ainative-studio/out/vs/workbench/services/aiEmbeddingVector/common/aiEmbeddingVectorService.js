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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlFbWJlZGRpbmdWZWN0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9haUVtYmVkZGluZ1ZlY3Rvci9jb21tb24vYWlFbWJlZGRpbmdWZWN0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFN0YsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVoSSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVyRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUM7QUFlMUcsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7O2FBR3BCLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQUUsQUFBWixDQUFhLEdBQUMsYUFBYTtJQUkxRCxZQUF5QixVQUF3QztRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBRmhELGVBQVUsR0FBaUMsRUFBRSxDQUFDO0lBRU0sQ0FBQztJQUV0RSxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELGlDQUFpQyxDQUFDLEtBQWEsRUFBRSxRQUFvQztRQUNwRixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMv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