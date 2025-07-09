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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRzlDLE1BQU0sQ0FBTixJQUFrQixPQWFqQjtBQWJELFdBQWtCLE9BQU87SUFDeEIsaUZBQWlGO0lBQ2pGLHNEQUEyQyxDQUFBO0lBQzNDLG9EQUF5QyxDQUFBO0lBQ3pDLHdFQUE2RCxDQUFBO0lBQzdELDBFQUErRCxDQUFBO0lBQy9ELG1GQUF3RSxDQUFBO0lBQ3hFLHlEQUE4QyxDQUFBO0lBRTlDLHlEQUE4QyxDQUFBO0lBQzlDLDZEQUFrRCxDQUFBO0lBRWxELDBEQUErQyxDQUFBO0FBQ2hELENBQUMsRUFiaUIsT0FBTyxLQUFQLE9BQU8sUUFheEI7QUFFRCxNQUFNLENBQU4sSUFBa0Isb0JBR2pCO0FBSEQsV0FBa0Isb0JBQW9CO0lBQ3JDLHFDQUFhLENBQUE7SUFDYixxQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBR3JDO0FBRUQsTUFBTSxDQUFOLElBQWtCLHVCQUlqQjtBQUpELFdBQWtCLHVCQUF1QjtJQUN4QyxrREFBdUIsQ0FBQTtJQUN2Qiw4Q0FBbUIsQ0FBQTtJQUNuQixrREFBdUIsQ0FBQTtBQUN4QixDQUFDLEVBSmlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFJeEM7QUFFRCxNQUFNLGNBQWMsR0FBdUM7SUFDMUQsaUNBQXlCLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQztJQUNuRSxn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