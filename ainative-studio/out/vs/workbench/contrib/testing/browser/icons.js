/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize } from '../../../../nls.js';
import { registerIcon, spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { testingColorRunAction, testStatesToIconColors, testStatesToRetiredIconColors } from './theme.js';
export const testingViewIcon = registerIcon('test-view-icon', Codicon.beaker, localize('testViewIcon', 'View icon of the test view.'));
export const testingResultsIcon = registerIcon('test-results-icon', Codicon.checklist, localize('testingResultsIcon', 'Icons for test results.'));
export const testingRunIcon = registerIcon('testing-run-icon', Codicon.run, localize('testingRunIcon', 'Icon of the "run test" action.'));
export const testingRerunIcon = registerIcon('testing-rerun-icon', Codicon.debugRerun, localize('testingRerunIcon', 'Icon of the "rerun tests" action.'));
export const testingRunAllIcon = registerIcon('testing-run-all-icon', Codicon.runAll, localize('testingRunAllIcon', 'Icon of the "run all tests" action.'));
// todo: https://github.com/microsoft/vscode-codicons/issues/72
export const testingDebugAllIcon = registerIcon('testing-debug-all-icon', Codicon.debugAltSmall, localize('testingDebugAllIcon', 'Icon of the "debug all tests" action.'));
export const testingDebugIcon = registerIcon('testing-debug-icon', Codicon.debugAltSmall, localize('testingDebugIcon', 'Icon of the "debug test" action.'));
export const testingCoverageIcon = registerIcon('testing-coverage-icon', Codicon.runCoverage, localize('testingCoverageIcon', 'Icon of the "run test with coverage" action.'));
export const testingCoverageAllIcon = registerIcon('testing-coverage-all-icon', Codicon.runAllCoverage, localize('testingRunAllWithCoverageIcon', 'Icon of the "run all tests with coverage" action.'));
export const testingCancelIcon = registerIcon('testing-cancel-icon', Codicon.debugStop, localize('testingCancelIcon', 'Icon to cancel ongoing test runs.'));
export const testingFilterIcon = registerIcon('testing-filter', Codicon.filter, localize('filterIcon', 'Icon for the \'Filter\' action in the testing view.'));
export const testingHiddenIcon = registerIcon('testing-hidden', Codicon.eyeClosed, localize('hiddenIcon', 'Icon shown beside hidden tests, when they\'ve been shown.'));
export const testingShowAsList = registerIcon('testing-show-as-list-icon', Codicon.listTree, localize('testingShowAsList', 'Icon shown when the test explorer is disabled as a tree.'));
export const testingShowAsTree = registerIcon('testing-show-as-list-icon', Codicon.listFlat, localize('testingShowAsTree', 'Icon shown when the test explorer is disabled as a list.'));
export const testingUpdateProfiles = registerIcon('testing-update-profiles', Codicon.gear, localize('testingUpdateProfiles', 'Icon shown to update test profiles.'));
export const testingRefreshTests = registerIcon('testing-refresh-tests', Codicon.refresh, localize('testingRefreshTests', 'Icon on the button to refresh tests.'));
export const testingTurnContinuousRunOn = registerIcon('testing-turn-continuous-run-on', Codicon.eye, localize('testingTurnContinuousRunOn', 'Icon to turn continuous test runs on.'));
export const testingTurnContinuousRunOff = registerIcon('testing-turn-continuous-run-off', Codicon.eyeClosed, localize('testingTurnContinuousRunOff', 'Icon to turn continuous test runs off.'));
export const testingContinuousIsOn = registerIcon('testing-continuous-is-on', Codicon.eye, localize('testingTurnContinuousRunIsOn', 'Icon when continuous run is on for a test ite,.'));
export const testingCancelRefreshTests = registerIcon('testing-cancel-refresh-tests', Codicon.stop, localize('testingCancelRefreshTests', 'Icon on the button to cancel refreshing tests.'));
export const testingCoverageReport = registerIcon('testing-coverage', Codicon.coverage, localize('testingCoverage', 'Icon representing test coverage'));
export const testingWasCovered = registerIcon('testing-was-covered', Codicon.check, localize('testingWasCovered', 'Icon representing that an element was covered'));
export const testingCoverageMissingBranch = registerIcon('testing-missing-branch', Codicon.question, localize('testingMissingBranch', 'Icon representing a uncovered block without a range'));
export const testingStatesToIcons = new Map([
    [6 /* TestResultState.Errored */, registerIcon('testing-error-icon', Codicon.issues, localize('testingErrorIcon', 'Icon shown for tests that have an error.'))],
    [4 /* TestResultState.Failed */, registerIcon('testing-failed-icon', Codicon.error, localize('testingFailedIcon', 'Icon shown for tests that failed.'))],
    [3 /* TestResultState.Passed */, registerIcon('testing-passed-icon', Codicon.pass, localize('testingPassedIcon', 'Icon shown for tests that passed.'))],
    [1 /* TestResultState.Queued */, registerIcon('testing-queued-icon', Codicon.history, localize('testingQueuedIcon', 'Icon shown for tests that are queued.'))],
    [2 /* TestResultState.Running */, spinningLoading],
    [5 /* TestResultState.Skipped */, registerIcon('testing-skipped-icon', Codicon.debugStepOver, localize('testingSkippedIcon', 'Icon shown for tests that are skipped.'))],
    [0 /* TestResultState.Unset */, registerIcon('testing-unset-icon', Codicon.circleOutline, localize('testingUnsetIcon', 'Icon shown for tests that are in an unset state.'))],
]);
registerThemingParticipant((theme, collector) => {
    for (const [state, icon] of testingStatesToIcons.entries()) {
        const color = testStatesToIconColors[state];
        const retiredColor = testStatesToRetiredIconColors[state];
        if (!color) {
            continue;
        }
        collector.addRule(`.monaco-workbench ${ThemeIcon.asCSSSelector(icon)} {
			color: ${theme.getColor(color)} !important;
		}`);
        if (!retiredColor) {
            continue;
        }
        collector.addRule(`
			.test-explorer .computed-state.retired${ThemeIcon.asCSSSelector(icon)},
			.testing-run-glyph.retired${ThemeIcon.asCSSSelector(icon)}{
				color: ${theme.getColor(retiredColor)} !important;
			}
		`);
    }
    collector.addRule(`
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingRunAllIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugIcon)},
		.monaco-editor .glyph-margin-widgets ${ThemeIcon.asCSSSelector(testingDebugAllIcon)} {
			color: ${theme.getColor(testingColorRunAction)};
		}
	`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2ljb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRzFHLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLDZCQUE2QixDQUFDLENBQUMsQ0FBQztBQUN2SSxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxDQUFDO0FBQ2xKLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO0FBQzFJLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxvQkFB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