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
var WorkerBasedDocumentDiffProvider_1;
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { LineRange } from '../../../common/core/lineRange.js';
import { DetailedLineRangeMapping, RangeMapping } from '../../../common/diff/rangeMapping.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
export const IDiffProviderFactoryService = createDecorator('diffProviderFactoryService');
let WorkerBasedDiffProviderFactoryService = class WorkerBasedDiffProviderFactoryService {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    createDiffProvider(options) {
        return this.instantiationService.createInstance(WorkerBasedDocumentDiffProvider, options);
    }
};
WorkerBasedDiffProviderFactoryService = __decorate([
    __param(0, IInstantiationService)
], WorkerBasedDiffProviderFactoryService);
export { WorkerBasedDiffProviderFactoryService };
registerSingleton(IDiffProviderFactoryService, WorkerBasedDiffProviderFactoryService, 1 /* InstantiationType.Delayed */);
let WorkerBasedDocumentDiffProvider = class WorkerBasedDocumentDiffProvider {
    static { WorkerBasedDocumentDiffProvider_1 = this; }
    static { this.diffCache = new Map(); }
    constructor(options, editorWorkerService, telemetryService) {
        this.editorWorkerService = editorWorkerService;
        this.telemetryService = telemetryService;
        this.onDidChangeEventEmitter = new Emitter();
        this.onDidChange = this.onDidChangeEventEmitter.event;
        this.diffAlgorithm = 'advanced';
        this.diffAlgorithmOnDidChangeSubscription = undefined;
        this.setOptions(options);
    }
    dispose() {
        this.diffAlgorithmOnDidChangeSubscription?.dispose();
    }
    async computeDiff(original, modified, options, cancellationToken) {
        if (typeof this.diffAlgorithm !== 'string') {
            return this.diffAlgorithm.computeDiff(original, modified, options, cancellationToken);
        }
        if (original.isDisposed() || modified.isDisposed()) {
            // TODO@hediet
            return {
                changes: [],
                identical: true,
                quitEarly: false,
                moves: [],
            };
        }
        // This significantly speeds up the case when the original file is empty
        if (original.getLineCount() === 1 && original.getLineMaxColumn(1) === 1) {
            if (modified.getLineCount() === 1 && modified.getLineMaxColumn(1) === 1) {
                return {
                    changes: [],
                    identical: true,
                    quitEarly: false,
                    moves: [],
                };
            }
            return {
                changes: [
                    new DetailedLineRangeMapping(new LineRange(1, 2), new LineRange(1, modified.getLineCount() + 1), [
                        new RangeMapping(original.getFullModelRange(), modified.getFullModelRange())
                    ])
                ],
                identical: false,
                quitEarly: false,
                moves: [],
            };
        }
        const uriKey = JSON.stringify([original.uri.toString(), modified.uri.toString()]);
        const context = JSON.stringify([original.id, modified.id, original.getAlternativeVersionId(), modified.getAlternativeVersionId(), JSON.stringify(options)]);
        const c = WorkerBasedDocumentDiffProvider_1.diffCache.get(uriKey);
        if (c && c.context === context) {
            return c.result;
        }
        const sw = StopWatch.create();
        const result = await this.editorWorkerService.computeDiff(original.uri, modified.uri, options, this.diffAlgorithm);
        const timeMs = sw.elapsed();
        this.telemetryService.publicLog2('diffEditor.computeDiff', {
            timeMs,
            timedOut: result?.quitEarly ?? true,
            detectedMoves: options.computeMoves ? (result?.moves.length ?? 0) : -1,
        });
        if (cancellationToken.isCancellationRequested) {
            // Text models might be disposed!
            return {
                changes: [],
                identical: false,
                quitEarly: true,
                moves: [],
            };
        }
        if (!result) {
            throw new Error('no diff result available');
        }
        // max 10 items in cache
        if (WorkerBasedDocumentDiffProvider_1.diffCache.size > 10) {
            WorkerBasedDocumentDiffProvider_1.diffCache.delete(WorkerBasedDocumentDiffProvider_1.diffCache.keys().next().value);
        }
        WorkerBasedDocumentDiffProvider_1.diffCache.set(uriKey, { result, context });
        return result;
    }
    setOptions(newOptions) {
        let didChange = false;
        if (newOptions.diffAlgorithm) {
            if (this.diffAlgorithm !== newOptions.diffAlgorithm) {
                this.diffAlgorithmOnDidChangeSubscription?.dispose();
                this.diffAlgorithmOnDidChangeSubscription = undefined;
                this.diffAlgorithm = newOptions.diffAlgorithm;
                if (typeof newOptions.diffAlgorithm !== 'string') {
                    this.diffAlgorithmOnDidChangeSubscription = newOptions.diffAlgorithm.onDidChange(() => this.onDidChangeEventEmitter.fire());
                }
                didChange = true;
            }
        }
        if (didChange) {
            this.onDidChangeEventEmitter.fire();
        }
    }
};
WorkerBasedDocumentDiffProvider = WorkerBasedDocumentDiffProvider_1 = __decorate([
    __param(1, IEditorWorkerService),
    __param(2, ITelemetryService)
], WorkerBasedDocumentDiffProvider);
export { WorkerBasedDocumentDiffProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZlByb3ZpZGVyRmFjdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9kaWZmUHJvdmlkZXJGYWN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVwSCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFOUYsT0FBTyxFQUFxQixvQkFBb0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXZGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FBOEIsNEJBQTRCLENBQUMsQ0FBQztBQVcvRyxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFxQztJQUdqRCxZQUN5QyxvQkFBMkM7UUFBM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUNoRixDQUFDO0lBRUwsa0JBQWtCLENBQUMsT0FBb0M7UUFDdEQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzNGLENBQUM7Q0FD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