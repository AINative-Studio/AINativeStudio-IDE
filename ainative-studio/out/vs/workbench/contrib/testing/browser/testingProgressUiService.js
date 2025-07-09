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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ1Byb2dyZXNzVWlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0aW5nUHJvZ3Jlc3NVaVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pFLE9BQU8sRUFBbUIsdUJBQXVCLEVBQXFCLE1BQU0sNEJBQTRCLENBQUM7QUFFekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRTNELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUUvRSxvRkFBb0Y7QUFDN0UsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBQ3JELFlBQ3FCLGFBQWlDLEVBQy9CLG1CQUF5QyxFQUN2QixvQkFBMkMsRUFDbkQsWUFBMkI7UUFFM0QsS0FBSyxFQUFFLENBQUM7UUFIZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FB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