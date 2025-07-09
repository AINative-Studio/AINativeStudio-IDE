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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { observableValue, transaction } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { bindContextKey, observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { ITestResultService } from './testResultService.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
export const ITestCoverageService = createDecorator('testCoverageService');
let TestCoverageService = class TestCoverageService extends Disposable {
    constructor(contextKeyService, resultService, configService, viewsService) {
        super();
        this.viewsService = viewsService;
        this.lastOpenCts = this._register(new MutableDisposable());
        this.selected = observableValue('testCoverage', undefined);
        this.filterToTest = observableValue('filterToTest', undefined);
        this.showInline = observableValue('inlineCoverage', false);
        const toolbarConfig = observableConfigValue("testing.coverageToolbarEnabled" /* TestingConfigKeys.CoverageToolbarEnabled */, true, configService);
        this._register(bindContextKey(TestingContextKeys.coverageToolbarEnabled, contextKeyService, reader => toolbarConfig.read(reader)));
        this._register(bindContextKey(TestingContextKeys.inlineCoverageEnabled, contextKeyService, reader => this.showInline.read(reader)));
        this._register(bindContextKey(TestingContextKeys.isTestCoverageOpen, contextKeyService, reader => !!this.selected.read(reader)));
        this._register(bindContextKey(TestingContextKeys.hasPerTestCoverage, contextKeyService, reader => !Iterable.isEmpty(this.selected.read(reader)?.allPerTestIDs())));
        this._register(bindContextKey(TestingContextKeys.isCoverageFilteredToTest, contextKeyService, reader => !!this.filterToTest.read(reader)));
        this._register(resultService.onResultsChanged(evt => {
            if ('completed' in evt) {
                const coverage = evt.completed.tasks.find(t => t.coverage.get());
                if (coverage) {
                    this.openCoverage(coverage, false);
                }
                else {
                    this.closeCoverage();
                }
            }
            else if ('removed' in evt && this.selected.get()) {
                const taskId = this.selected.get()?.fromTaskId;
                if (evt.removed.some(e => e.tasks.some(t => t.id === taskId))) {
                    this.closeCoverage();
                }
            }
        }));
    }
    /** @inheritdoc */
    async openCoverage(task, focus = true) {
        this.lastOpenCts.value?.cancel();
        const cts = this.lastOpenCts.value = new CancellationTokenSource();
        const coverage = task.coverage.get();
        if (!coverage) {
            return;
        }
        transaction(tx => {
            // todo: may want to preserve this if coverage for that test in the new run?
            this.filterToTest.set(undefined, tx);
            this.selected.set(coverage, tx);
        });
        if (focus && !cts.token.isCancellationRequested) {
            this.viewsService.openView("workbench.view.testCoverage" /* Testing.CoverageViewId */, true);
        }
    }
    /** @inheritdoc */
    closeCoverage() {
        this.selected.set(undefined, undefined);
    }
};
TestCoverageService = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITestResultService),
    __param(2, IConfigurationService),
    __param(3, IViewsService)
], TestCoverageService);
export { TestCoverageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0Q292ZXJhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFvQyxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQU0xSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFDO0FBZ0MxRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFRbEQsWUFDcUIsaUJBQXFDLEVBQ3JDLGFBQWlD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