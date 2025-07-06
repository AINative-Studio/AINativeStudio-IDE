/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { localize } from '../../../../nls.js';
export var Testing;
(function (Testing) {
    // marked as "extension" so that any existing test extensions are assigned to it.
    Testing["ViewletId"] = "workbench.view.extension.test";
    Testing["ExplorerViewId"] = "workbench.view.testing";
    Testing["OutputPeekContributionId"] = "editor.contrib.testingOutputPeek";
    Testing["DecorationsContributionId"] = "editor.contrib.testingDecorations";
    Testing["CoverageDecorationsContributionId"] = "editor.contrib.coverageDecorations";
    Testing["CoverageViewId"] = "workbench.view.testCoverage";
    Testing["ResultsPanelId"] = "workbench.panel.testResults";
    Testing["ResultsViewId"] = "workbench.panel.testResults.view";
    Testing["MessageLanguageId"] = "vscodeInternalTestMessage";
})(Testing || (Testing = {}));
export var TestExplorerViewMode;
(function (TestExplorerViewMode) {
    TestExplorerViewMode["List"] = "list";
    TestExplorerViewMode["Tree"] = "true";
})(TestExplorerViewMode || (TestExplorerViewMode = {}));
export var TestExplorerViewSorting;
(function (TestExplorerViewSorting) {
    TestExplorerViewSorting["ByLocation"] = "location";
    TestExplorerViewSorting["ByStatus"] = "status";
    TestExplorerViewSorting["ByDuration"] = "duration";
})(TestExplorerViewSorting || (TestExplorerViewSorting = {}));
const testStateNames = {
    [6 /* TestResultState.Errored */]: localize('testState.errored', 'Errored'),
    [4 /* TestResultState.Failed */]: localize('testState.failed', 'Failed'),
    [3 /* TestResultState.Passed */]: localize('testState.passed', 'Passed'),
    [1 /* TestResultState.Queued */]: localize('testState.queued', 'Queued'),
    [2 /* TestResultState.Running */]: localize('testState.running', 'Running'),
    [5 /* TestResultState.Skipped */]: localize('testState.skipped', 'Skipped'),
    [0 /* TestResultState.Unset */]: localize('testState.unset', 'Not yet run'),
};
export const labelForTestInState = (label, state) => localize({
    key: 'testing.treeElementLabel',
    comment: ['label then the unit tests state, for example "Addition Tests (Running)"'],
}, '{0} ({1})', stripIcons(label), testStateNames[state]);
export const testConfigurationGroupNames = {
    [4 /* TestRunProfileBitset.Debug */]: localize('testGroup.debug', 'Debug'),
    [2 /* TestRunProfileBitset.Run */]: localize('testGroup.run', 'Run'),
    [8 /* TestRunProfileBitset.Coverage */]: localize('testGroup.coverage', 'Coverage'),
};
export var TestCommandId;
(function (TestCommandId) {
    TestCommandId["CancelTestRefreshAction"] = "testing.cancelTestRefresh";
    TestCommandId["CancelTestRunAction"] = "testing.cancelRun";
    TestCommandId["ClearTestResultsAction"] = "testing.clearTestResults";
    TestCommandId["CollapseAllAction"] = "testing.collapseAll";
    TestCommandId["ConfigureTestProfilesAction"] = "testing.configureProfile";
    TestCommandId["ContinousRunUsingForTest"] = "testing.continuousRunUsingForTest";
    TestCommandId["CoverageAtCursor"] = "testing.coverageAtCursor";
    TestCommandId["CoverageByUri"] = "testing.coverage.uri";
    TestCommandId["CoverageClear"] = "testing.coverage.close";
    TestCommandId["CoverageCurrentFile"] = "testing.coverageCurrentFile";
    TestCommandId["CoverageFilterToTest"] = "testing.coverageFilterToTest";
    TestCommandId["CoverageFilterToTestInEditor"] = "testing.coverageFilterToTestInEditor";
    TestCommandId["CoverageLastRun"] = "testing.coverageLastRun";
    TestCommandId["CoverageSelectedAction"] = "testing.coverageSelected";
    TestCommandId["CoverageToggleToolbar"] = "testing.coverageToggleToolbar";
    TestCommandId["CoverageViewChangeSorting"] = "testing.coverageViewChangeSorting";
    TestCommandId["DebugAction"] = "testing.debug";
    TestCommandId["DebugAllAction"] = "testing.debugAll";
    TestCommandId["DebugAtCursor"] = "testing.debugAtCursor";
    TestCommandId["DebugByUri"] = "testing.debug.uri";
    TestCommandId["DebugCurrentFile"] = "testing.debugCurrentFile";
    TestCommandId["DebugFailedTests"] = "testing.debugFailTests";
    TestCommandId["DebugLastRun"] = "testing.debugLastRun";
    TestCommandId["DebugSelectedAction"] = "testing.debugSelected";
    TestCommandId["FilterAction"] = "workbench.actions.treeView.testExplorer.filter";
    TestCommandId["GetExplorerSelection"] = "_testing.getExplorerSelection";
    TestCommandId["GetSelectedProfiles"] = "testing.getSelectedProfiles";
    TestCommandId["GoToTest"] = "testing.editFocusedTest";
    TestCommandId["GoToRelatedTest"] = "testing.goToRelatedTest";
    TestCommandId["PeekRelatedTest"] = "testing.peekRelatedTest";
    TestCommandId["GoToRelatedCode"] = "testing.goToRelatedCode";
    TestCommandId["PeekRelatedCode"] = "testing.peekRelatedCode";
    TestCommandId["HideTestAction"] = "testing.hideTest";
    TestCommandId["OpenCoverage"] = "testing.openCoverage";
    TestCommandId["OpenOutputPeek"] = "testing.openOutputPeek";
    TestCommandId["RefreshTestsAction"] = "testing.refreshTests";
    TestCommandId["ReRunFailedTests"] = "testing.reRunFailTests";
    TestCommandId["ReRunLastRun"] = "testing.reRunLastRun";
    TestCommandId["RunAction"] = "testing.run";
    TestCommandId["RunAllAction"] = "testing.runAll";
    TestCommandId["RunAllWithCoverageAction"] = "testing.coverageAll";
    TestCommandId["RunAtCursor"] = "testing.runAtCursor";
    TestCommandId["RunByUri"] = "testing.run.uri";
    TestCommandId["RunCurrentFile"] = "testing.runCurrentFile";
    TestCommandId["RunSelectedAction"] = "testing.runSelected";
    TestCommandId["RunUsingProfileAction"] = "testing.runUsing";
    TestCommandId["RunWithCoverageAction"] = "testing.coverage";
    TestCommandId["SearchForTestExtension"] = "testing.searchForTestExtension";
    TestCommandId["SelectDefaultTestProfiles"] = "testing.selectDefaultTestProfiles";
    TestCommandId["ShowMostRecentOutputAction"] = "testing.showMostRecentOutput";
    TestCommandId["StartContinousRun"] = "testing.startContinuousRun";
    TestCommandId["StartContinousRunFromExtension"] = "testing.startContinuousRunFromExtension";
    TestCommandId["StopContinousRunFromExtension"] = "testing.stopContinuousRunFromExtension";
    TestCommandId["StopContinousRun"] = "testing.stopContinuousRun";
    TestCommandId["TestingSortByDurationAction"] = "testing.sortByDuration";
    TestCommandId["TestingSortByLocationAction"] = "testing.sortByLocation";
    TestCommandId["TestingSortByStatusAction"] = "testing.sortByStatus";
    TestCommandId["TestingViewAsListAction"] = "testing.viewAsList";
    TestCommandId["TestingViewAsTreeAction"] = "testing.viewAsTree";
    TestCommandId["ToggleContinousRunForTest"] = "testing.toggleContinuousRunForTest";
    TestCommandId["ToggleInlineTestOutput"] = "testing.toggleInlineTestOutput";
    TestCommandId["UnhideAllTestsAction"] = "testing.unhideAllTests";
    TestCommandId["UnhideTestAction"] = "testing.unhideTest";
})(TestCommandId || (TestCommandId = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi9jb25zdGFudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUc5QyxNQUFNLENBQU4sSUFBa0IsT0FhakI7QUFiRCxXQUFrQixPQUFPO0lBQ3hCLGlGQUFpRjtJQUNqRixzREFBMkMsQ0FBQTtJQUMzQyxvREFBeUMsQ0FBQTtJQUN6Qyx3RUFBNkQsQ0FBQTtJQUM3RCwwRUFBK0QsQ0FBQTtJQUMvRCxtRkFBd0UsQ0FBQTtJQUN4RSx5REFBOEMsQ0FBQTtJQUU5Qyx5REFBOEMsQ0FBQTtJQUM5Qyw2REFBa0QsQ0FBQTtJQUVsRCwwREFBK0MsQ0FBQTtBQUNoRCxDQUFDLEVBYmlCLE9BQU8sS0FBUCxPQUFPLFFBYXhCO0FBRUQsTUFBTSxDQUFOLElBQWtCLG9CQUdqQjtBQUhELFdBQWtCLG9CQUFvQjtJQUNyQyxxQ0FBYSxDQUFBO0lBQ2IscUNBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUdyQztBQUVELE1BQU0sQ0FBTixJQUFrQix1QkFJakI7QUFKRCxXQUFrQix1QkFBdUI7SUFDeEMsa0RBQXVCLENBQUE7SUFDdkIsOENBQW1CLENBQUE7SUFDbkIsa0RBQXVCLENBQUE7QUFDeEIsQ0FBQyxFQUppQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBSXhDO0FBRUQsTUFBTSxjQUFjLEdBQXVDO0lBQzFELGlDQUF5QixFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUM7SUFDbkUsZ0NBQXdCLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLFFBQVEsQ0FBQztJQUNoRSxnQ0FBd0IsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDO0lBQ2hFLGdDQUF3QixFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLENBQUM7SUFDaEUsaUNBQXlCLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQztJQUNuRSxpQ0FBeUIsRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDO0lBQ25FLCtCQUF1QixFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUM7Q0FDbkUsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsS0FBYSxFQUFFLEtBQXNCLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQztJQUN0RixHQUFHLEVBQUUsMEJBQTBCO0lBQy9CLE9BQU8sRUFBRSxDQUFDLHlFQUF5RSxDQUFDO0NBQ3BGLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUUxRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBOEQ7SUFDckcsb0NBQTRCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQztJQUNsRSxrQ0FBMEIsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQztJQUM1RCx1Q0FBK0IsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDO0NBQzNFLENBQUM7QUFFRixNQUFNLENBQU4sSUFBa0IsYUFnRWpCO0FBaEVELFdBQWtCLGFBQWE7SUFDOUIsc0VBQXFELENBQUE7SUFDckQsMERBQXlDLENBQUE7SUFDekMsb0VBQW1ELENBQUE7SUFDbkQsMERBQXlDLENBQUE7SUFDekMseUVBQXdELENBQUE7SUFDeEQsK0VBQThELENBQUE7SUFDOUQsOERBQTZDLENBQUE7SUFDN0MsdURBQXNDLENBQUE7SUFDdEMseURBQXdDLENBQUE7SUFDeEMsb0VBQW1ELENBQUE7SUFDbkQsc0VBQXFELENBQUE7SUFDckQsc0ZBQXFFLENBQUE7SUFDckUsNERBQTJDLENBQUE7SUFDM0Msb0VBQW1ELENBQUE7SUFDbkQsd0VBQXVELENBQUE7SUFDdkQsZ0ZBQStELENBQUE7SUFDL0QsOENBQTZCLENBQUE7SUFDN0Isb0RBQW1DLENBQUE7SUFDbkMsd0RBQXVDLENBQUE7SUFDdkMsaURBQWdDLENBQUE7SUFDaEMsOERBQTZDLENBQUE7SUFDN0MsNERBQTJDLENBQUE7SUFDM0Msc0RBQXFDLENBQUE7SUFDckMsOERBQTZDLENBQUE7SUFDN0MsZ0ZBQStELENBQUE7SUFDL0QsdUVBQXNELENBQUE7SUFDdEQsb0VBQW1ELENBQUE7SUFDbkQscURBQW9DLENBQUE7SUFDcEMsNERBQTJDLENBQUE7SUFDM0MsNERBQTJDLENBQUE7SUFDM0MsNERBQTJDLENBQUE7SUFDM0MsNERBQTJDLENBQUE7SUFDM0Msb0RBQW1DLENBQUE7SUFDbkMsc0RBQXFDLENBQUE7SUFDckMsMERBQXlDLENBQUE7SUFDekMsNERBQTJDLENBQUE7SUFDM0MsNERBQTJDLENBQUE7SUFDM0Msc0RBQXFDLENBQUE7SUFDckMsMENBQXlCLENBQUE7SUFDekIsZ0RBQStCLENBQUE7SUFDL0IsaUVBQWdELENBQUE7SUFDaEQsb0RBQW1DLENBQUE7SUFDbkMsNkNBQTRCLENBQUE7SUFDNUIsMERBQXlDLENBQUE7SUFDekMsMERBQXlDLENBQUE7SUFDekMsMkRBQTBDLENBQUE7SUFDMUMsMkRBQTBDLENBQUE7SUFDMUMsMEVBQXlELENBQUE7SUFDekQsZ0ZBQStELENBQUE7SUFDL0QsNEVBQTJELENBQUE7SUFDM0QsaUVBQWdELENBQUE7SUFDaEQsMkZBQTBFLENBQUE7SUFDMUUseUZBQXdFLENBQUE7SUFDeEUsK0RBQThDLENBQUE7SUFDOUMsdUVBQXNELENBQUE7SUFDdEQsdUVBQXNELENBQUE7SUFDdEQsbUVBQWtELENBQUE7SUFDbEQsK0RBQThDLENBQUE7SUFDOUMsK0RBQThDLENBQUE7SUFDOUMsaUZBQWdFLENBQUE7SUFDaEUsMEVBQXlELENBQUE7SUFDekQsZ0VBQStDLENBQUE7SUFDL0Msd0RBQXVDLENBQUE7QUFDeEMsQ0FBQyxFQWhFaUIsYUFBYSxLQUFiLGFBQWEsUUFnRTlCIn0=