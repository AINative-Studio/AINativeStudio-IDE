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
var AiRelatedInformationService_1;
import { createCancelablePromise, raceTimeout } from '../../../../base/common/async.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAiRelatedInformationService } from './aiRelatedInformation.js';
let AiRelatedInformationService = class AiRelatedInformationService {
    static { AiRelatedInformationService_1 = this; }
    static { this.DEFAULT_TIMEOUT = 1000 * 10; } // 10 seconds
    constructor(logService) {
        this.logService = logService;
        this._providers = new Map();
    }
    isEnabled() {
        return this._providers.size > 0;
    }
    registerAiRelatedInformationProvider(type, provider) {
        const providers = this._providers.get(type) ?? [];
        providers.push(provider);
        this._providers.set(type, providers);
        return {
            dispose: () => {
                const providers = this._providers.get(type) ?? [];
                const index = providers.indexOf(provider);
                if (index !== -1) {
                    providers.splice(index, 1);
                }
                if (providers.length === 0) {
                    this._providers.delete(type);
                }
            }
        };
    }
    async getRelatedInformation(query, types, token) {
        if (this._providers.size === 0) {
            throw new Error('No related information providers registered');
        }
        // get providers for each type
        const providers = [];
        for (const type of types) {
            const typeProviders = this._providers.get(type);
            if (typeProviders) {
                providers.push(...typeProviders);
            }
        }
        if (providers.length === 0) {
            throw new Error('No related information providers registered for the given types');
        }
        const stopwatch = StopWatch.create();
        const cancellablePromises = providers.map((provider) => {
            return createCancelablePromise(async (t) => {
                try {
                    const result = await provider.provideAiRelatedInformation(query, t);
                    // double filter just in case
                    return result.filter(r => types.includes(r.type));
                }
                catch (e) {
                    // logged in extension host
                }
                return [];
            });
        });
        try {
            const results = await raceTimeout(Promise.allSettled(cancellablePromises), AiRelatedInformationService_1.DEFAULT_TIMEOUT, () => {
                cancellablePromises.forEach(p => p.cancel());
                this.logService.warn('[AiRelatedInformationService]: Related information provider timed out');
            });
            if (!results) {
                return [];
            }
            const result = results
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => r.value);
            return result;
        }
        finally {
            stopwatch.stop();
            this.logService.trace(`[AiRelatedInformationService]: getRelatedInformation took ${stopwatch.elapsed()}ms`);
        }
    }
};
AiRelatedInformationService = AiRelatedInformationService_1 = __decorate([
    __param(0, ILogService)
], AiRelatedInformationService);
export { AiRelatedInformationService };
registerSingleton(IAiRelatedInformationService, AiRelatedInformationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9haVJlbGF0ZWRJbmZvcm1hdGlvbi9jb21tb24vYWlSZWxhdGVkSW5mb3JtYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSw0QkFBNEIsRUFBbUYsTUFBTSwyQkFBMkIsQ0FBQztBQUVuSixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjs7YUFHdkIsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBRSxBQUFaLENBQWEsR0FBQyxhQUFhO0lBSTFELFlBQXlCLFVBQXdDO1FBQXZCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFGaEQsZUFBVSxHQUFpRSxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBRWpDLENBQUM7SUFFdEUsU0FBUztRQUNSLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxvQ0FBb0MsQ0FBQyxJQUE0QixFQUFFLFFBQXVDO1FBQ3pHLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsRCxTQUFTLENBQUMsSUFBSSxDQUFDLFFB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