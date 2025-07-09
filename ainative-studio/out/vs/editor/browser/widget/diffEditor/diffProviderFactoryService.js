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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZlByb3ZpZGVyRmFjdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZGlmZlByb3ZpZGVyRmFjdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFcEgsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRTlGLE9BQU8sRUFBcUIsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyxlQUFlLENBQThCLDRCQUE0QixDQUFDLENBQUM7QUFXL0csSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7SUFHakQsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDaEYsQ0FBQztJQUVMLGtCQUFrQixDQUFDLE9BQW9DO1FBQ3RELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzRixDQUFDO0NB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