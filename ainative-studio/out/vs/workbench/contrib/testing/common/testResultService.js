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
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { Disposable, DisposableStore, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { ITestProfileService } from './testProfileService.js';
import { LiveTestResult } from './testResult.js';
import { ITestResultStorage, RETAIN_MAX_RESULTS } from './testResultStorage.js';
const isRunningTests = (service) => service.results.length > 0 && service.results[0].completedAt === undefined;
export const ITestResultService = createDecorator('testResultService');
let TestResultService = class TestResultService extends Disposable {
    /**
     * @inheritdoc
     */
    get results() {
        this.loadResults();
        return this._results;
    }
    constructor(contextKeyService, storage, testProfiles, telemetryService) {
        super();
        this.storage = storage;
        this.testProfiles = testProfiles;
        this.telemetryService = telemetryService;
        this.changeResultEmitter = this._register(new Emitter());
        this._results = [];
        this._resultsDisposables = [];
        this.testChangeEmitter = this._register(new Emitter());
        this.insertOrderCounter = 0;
        /**
         * @inheritdoc
         */
        this.onResultsChanged = this.changeResultEmitter.event;
        /**
         * @inheritdoc
         */
        this.onTestChanged = this.testChangeEmitter.event;
        this.loadResults = createSingleCallFunction(() => this.storage.read().then(loaded => {
            for (let i = loaded.length - 1; i >= 0; i--) {
                this.push(loaded[i]);
            }
        }));
        this.persistScheduler = new RunOnceScheduler(() => this.persistImmediately(), 500);
        this._register(toDisposable(() => dispose(this._resultsDisposables)));
        this.isRunning = TestingContextKeys.isRunning.bindTo(contextKeyService);
        this.hasAnyResults = TestingContextKeys.hasAnyResults.bindTo(contextKeyService);
    }
    /**
     * @inheritdoc
     */
    getStateById(extId) {
        for (const result of this.results) {
            const lookup = result.getStateById(extId);
            if (lookup && lookup.computedState !== 0 /* TestResultState.Unset */) {
                return [result, lookup];
            }
        }
        return undefined;
    }
    /**
     * @inheritdoc
     */
    createLiveResult(req) {
        if ('targets' in req) {
            const id = generateUuid();
            return this.push(new LiveTestResult(id, true, req, this.insertOrderCounter++, this.telemetryService));
        }
        let profile;
        if (req.profile) {
            const profiles = this.testProfiles.getControllerProfiles(req.controllerId);
            profile = profiles.find(c => c.profileId === req.profile.id);
        }
        const resolved = {
            preserveFocus: req.preserveFocus,
            targets: [],
            exclude: req.exclude,
            continuous: req.continuous,
            group: profile?.group ?? 2 /* TestRunProfileBitset.Run */,
        };
        if (profile) {
            resolved.targets.push({
                profileId: profile.profileId,
                controllerId: req.controllerId,
                testIds: req.include,
            });
        }
        return this.push(new LiveTestResult(req.id, req.persist, resolved, this.insertOrderCounter++, this.telemetryService));
    }
    /**
     * @inheritdoc
     */
    push(result) {
        if (result.completedAt === undefined) {
            this.results.unshift(result);
        }
        else {
            const index = findFirstIdxMonotonousOrArrLen(this.results, r => r.completedAt !== undefined && r.completedAt <= result.completedAt);
            this.results.splice(index, 0, result);
            this.persistScheduler.schedule();
        }
        this.hasAnyResults.set(true);
        if (this.results.length > RETAIN_MAX_RESULTS) {
            this.results.pop();
            this._resultsDisposables.pop()?.dispose();
        }
        const ds = new DisposableStore();
        this._resultsDisposables.push(ds);
        if (result instanceof LiveTestResult) {
            ds.add(result);
            ds.add(result.onComplete(() => this.onComplete(result)));
            ds.add(result.onChange(this.testChangeEmitter.fire, this.testChangeEmitter));
            this.isRunning.set(true);
            this.changeResultEmitter.fire({ started: result });
        }
        else {
            this.changeResultEmitter.fire({ inserted: result });
            // If this is not a new result, go through each of its tests. For each
            // test for which the new result is the most recently inserted, fir
            // a change event so that UI updates.
            for (const item of result.tests) {
                for (const otherResult of this.results) {
                    if (otherResult === result) {
                        this.testChangeEmitter.fire({ item, result, reason: 0 /* TestResultItemChangeReason.ComputedStateChange */ });
                        break;
                    }
                    else if (otherResult.getStateById(item.item.extId) !== undefined) {
                        break;
                    }
                }
            }
        }
        return result;
    }
    /**
     * @inheritdoc
     */
    getResult(id) {
        return this.results.find(r => r.id === id);
    }
    /**
     * @inheritdoc
     */
    clear() {
        const keep = [];
        const removed = [];
        for (const result of this.results) {
            if (result.completedAt !== undefined) {
                removed.push(result);
            }
            else {
                keep.push(result);
            }
        }
        this._results = keep;
        this.persistScheduler.schedule();
        if (keep.length === 0) {
            this.hasAnyResults.set(false);
        }
        this.changeResultEmitter.fire({ removed });
    }
    onComplete(result) {
        this.resort();
        this.updateIsRunning();
        this.persistScheduler.schedule();
        this.changeResultEmitter.fire({ completed: result });
    }
    resort() {
        this.results.sort((a, b) => {
            // Running tests should always be sorted higher:
            if (!!a.completedAt !== !!b.completedAt) {
                return a.completedAt === undefined ? -1 : 1;
            }
            // Otherwise sort by insertion order, hydrated tests are always last:
            const aComp = a instanceof LiveTestResult ? a.insertOrder : -1;
            const bComp = b instanceof LiveTestResult ? b.insertOrder : -1;
            return bComp - aComp;
        });
    }
    updateIsRunning() {
        this.isRunning.set(isRunningTests(this));
    }
    async persistImmediately() {
        // ensure results are loaded before persisting to avoid deleting once
        // that we don't have yet.
        await this.loadResults();
        this.storage.persist(this.results);
    }
};
TestResultService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITestResultStorage),
    __param(2, ITestProfileService),
    __param(3, ITelemetryService)
], TestResultService);
export { TestResultService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0UmVzdWx0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFlLGNBQWMsRUFBb0QsTUFBTSxpQkFBaUIsQ0FBQztBQUNoSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQW9EaEYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxPQUEyQixFQUFFLEVBQUUs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