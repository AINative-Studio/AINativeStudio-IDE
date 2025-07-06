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
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExplorerTestCoverageBars } from './testCoverageBars.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { isFailedState } from '../common/testingStates.js';
import { ITestResultService } from '../common/testResultService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
/** Workbench contribution that triggers updates in the TestingProgressUi service */
let TestingProgressTrigger = class TestingProgressTrigger extends Disposable {
    constructor(resultService, testCoverageService, configurationService, viewsService) {
        super();
        this.configurationService = configurationService;
        this.viewsService = viewsService;
        this._register(resultService.onResultsChanged((e) => {
            if ('started' in e) {
                this.attachAutoOpenForNewResults(e.started);
            }
        }));
        const barContributionRegistration = autorun(reader => {
            const hasCoverage = !!testCoverageService.selected.read(reader);
            if (!hasCoverage) {
                return;
            }
            barContributionRegistration.dispose();
            ExplorerTestCoverageBars.register();
        });
        this._register(barContributionRegistration);
    }
    attachAutoOpenForNewResults(result) {
        if (result.request.preserveFocus === true) {
            return;
        }
        const cfg = getTestingConfiguration(this.configurationService, "testing.automaticallyOpenTestResults" /* TestingConfigKeys.OpenResults */);
        if (cfg === "neverOpen" /* AutoOpenTesting.NeverOpen */) {
            return;
        }
        if (cfg === "openExplorerOnTestStart" /* AutoOpenTesting.OpenExplorerOnTestStart */) {
            return this.openExplorerView();
        }
        if (cfg === "openOnTestStart" /* AutoOpenTesting.OpenOnTestStart */) {
            return this.openResultsView();
        }
        // open on failure
        const disposable = new DisposableStore();
        disposable.add(result.onComplete(() => disposable.dispose()));
        disposable.add(result.onChange(e => {
            if (e.reason === 1 /* TestResultItemChangeReason.OwnStateChange */ && isFailedState(e.item.ownComputedState)) {
                this.openResultsView();
                disposable.dispose();
            }
        }));
    }
    openExplorerView() {
        this.viewsService.openView("workbench.view.testing" /* Testing.ExplorerViewId */, false);
    }
    openResultsView() {
        this.viewsService.openView("workbench.panel.testResults.view" /* Testing.ResultsViewId */, false);
    }
};
TestingProgressTrigger = __decorate([
    __param(0, ITestResultService),
    __param(1, ITestCoverageService),
    __param(2, IConfigurationService),
    __param(3, IViewsService)
], TestingProgressTrigger);
export { TestingProgressTrigger };
export const collectTestStateCounts = (isRunning, results) => {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let running = 0;
    let queued = 0;
    for (const result of results) {
        const count = result.counts;
        failed += count[6 /* TestResultState.Errored */] + count[4 /* TestResultState.Failed */];
        passed += count[3 /* TestResultState.Passed */];
        skipped += count[5 /* TestResultState.Skipped */];
        running += count[2 /* TestResultState.Running */];
        queued += count[1 /* TestResultState.Queued */];
    }
    return {
        isRunning,
        passed,
        failed,
        runSoFar: passed + failed,
        totalWillBeRun: passed + failed + queued + running,
        skipped,
    };
};
export const getTestProgressText = ({ isRunning, passed, runSoFar, totalWillBeRun, skipped, failed }) => {
    let percent = passed / runSoFar * 100;
    if (failed > 0) {
        // fix: prevent from rounding to 100 if there's any failed test
        percent = Math.min(percent, 99.9);
    }
    else if (runSoFar === 0) {
        percent = 0;
    }
    if (isRunning) {
        if (runSoFar === 0) {
            return localize('testProgress.runningInitial', 'Running tests...');
        }
        else if (skipped === 0) {
            return localize('testProgress.running', 'Running tests, {0}/{1} passed ({2}%)', passed, totalWillBeRun, percent.toPrecision(3));
        }
        else {
            return localize('testProgressWithSkip.running', 'Running tests, {0}/{1} tests passed ({2}%, {3} skipped)', passed, totalWillBeRun, percent.toPrecision(3), skipped);
        }
    }
    else {
        if (skipped === 0) {
            return localize('testProgress.completed', '{0}/{1} tests passed ({2}%)', passed, runSoFar, percent.toPrecision(3));
        }
        else {
            return localize('testProgressWithSkip.completed', '{0}/{1} tests passed ({2}%, {3} skipped)', passed, runSoFar, percent.toPrecision(3), skipped);
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1Byb2dyZXNzVWlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RpbmdQcm9ncmVzc1VpU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakUsT0FBTyxFQUFtQix1QkFBdUIsRUFBcUIsTUFBTSw0QkFBNEIsQ0FBQztBQUV6RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9FLG9GQUFvRjtBQUM3RSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFDckQsWUFDcUIsYUFBaUMsRUFDL0IsbUJBQXlDLEVBQ3ZCLG9CQUEyQyxFQUNuRCxZQUEyQjtRQUUzRCxLQUFLLEVBQUUsQ0FBQztRQUhnQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFl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