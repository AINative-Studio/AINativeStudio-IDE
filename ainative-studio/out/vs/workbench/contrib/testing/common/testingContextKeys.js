/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var TestingContextKeys;
(function (TestingContextKeys) {
    TestingContextKeys.providerCount = new RawContextKey('testing.providerCount', 0);
    TestingContextKeys.canRefreshTests = new RawContextKey('testing.canRefresh', false, { type: 'boolean', description: localize('testing.canRefresh', 'Indicates whether any test controller has an attached refresh handler.') });
    TestingContextKeys.isRefreshingTests = new RawContextKey('testing.isRefreshing', false, { type: 'boolean', description: localize('testing.isRefreshing', 'Indicates whether any test controller is currently refreshing tests.') });
    TestingContextKeys.isContinuousModeOn = new RawContextKey('testing.isContinuousModeOn', false, { type: 'boolean', description: localize('testing.isContinuousModeOn', 'Indicates whether continuous test mode is on.') });
    TestingContextKeys.hasDebuggableTests = new RawContextKey('testing.hasDebuggableTests', false, { type: 'boolean', description: localize('testing.hasDebuggableTests', 'Indicates whether any test controller has registered a debug configuration') });
    TestingContextKeys.hasRunnableTests = new RawContextKey('testing.hasRunnableTests', false, { type: 'boolean', description: localize('testing.hasRunnableTests', 'Indicates whether any test controller has registered a run configuration') });
    TestingContextKeys.hasCoverableTests = new RawContextKey('testing.hasCoverableTests', false, { type: 'boolean', description: localize('testing.hasCoverableTests', 'Indicates whether any test controller has registered a coverage configuration') });
    TestingContextKeys.hasNonDefaultProfile = new RawContextKey('testing.hasNonDefaultProfile', false, { type: 'boolean', description: localize('testing.hasNonDefaultConfig', 'Indicates whether any test controller has registered a non-default configuration') });
    TestingContextKeys.hasConfigurableProfile = new RawContextKey('testing.hasConfigurableProfile', false, { type: 'boolean', description: localize('testing.hasConfigurableConfig', 'Indicates whether any test configuration can be configured') });
    TestingContextKeys.supportsContinuousRun = new RawContextKey('testing.supportsContinuousRun', false, { type: 'boolean', description: localize('testing.supportsContinuousRun', 'Indicates whether continous test running is supported') });
    TestingContextKeys.isParentRunningContinuously = new RawContextKey('testing.isParentRunningContinuously', false, { type: 'boolean', description: localize('testing.isParentRunningContinuously', 'Indicates whether the parent of a test is continuously running, set in the menu context of test items') });
    TestingContextKeys.activeEditorHasTests = new RawContextKey('testing.activeEditorHasTests', false, { type: 'boolean', description: localize('testing.activeEditorHasTests', 'Indicates whether any tests are present in the current editor') });
    TestingContextKeys.cursorInsideTestRange = new RawContextKey('testing.cursorInsideTestRange', false, { type: 'boolean', description: localize('testing.cursorInsideTestRange', 'Whether the cursor is currently inside a test range') });
    TestingContextKeys.isTestCoverageOpen = new RawContextKey('testing.isTestCoverageOpen', false, { type: 'boolean', description: localize('testing.isTestCoverageOpen', 'Indicates whether a test coverage report is open') });
    TestingContextKeys.hasPerTestCoverage = new RawContextKey('testing.hasPerTestCoverage', false, { type: 'boolean', description: localize('testing.hasPerTestCoverage', 'Indicates whether per-test coverage is available') });
    TestingContextKeys.isCoverageFilteredToTest = new RawContextKey('testing.isCoverageFilteredToTest', false, { type: 'boolean', description: localize('testing.isCoverageFilteredToTest', 'Indicates whether coverage has been filterd to a single test') });
    TestingContextKeys.coverageToolbarEnabled = new RawContextKey('testing.coverageToolbarEnabled', true, { type: 'boolean', description: localize('testing.coverageToolbarEnabled', 'Indicates whether the coverage toolbar is enabled') });
    TestingContextKeys.inlineCoverageEnabled = new RawContextKey('testing.inlineCoverageEnabled', false, { type: 'boolean', description: localize('testing.inlineCoverageEnabled', 'Indicates whether inline coverage is shown') });
    TestingContextKeys.canGoToRelatedCode = new RawContextKey('testing.canGoToRelatedCode', false, { type: 'boolean', description: localize('testing.canGoToRelatedCode', 'Whether a controller implements a capability to find code related to a test') });
    TestingContextKeys.canGoToRelatedTest = new RawContextKey('testing.canGoToRelatedTest', false, { type: 'boolean', description: localize('testing.canGoToRelatedTest', 'Whether a controller implements a capability to find tests related to code') });
    TestingContextKeys.peekHasStack = new RawContextKey('testing.peekHasStack', false, { type: 'boolean', description: localize('testing.peekHasStack', 'Whether the message shown in a peek view has a stack trace') });
    TestingContextKeys.capabilityToContextKey = {
        [2 /* TestRunProfileBitset.Run */]: TestingContextKeys.hasRunnableTests,
        [8 /* TestRunProfileBitset.Coverage */]: TestingContextKeys.hasCoverableTests,
        [4 /* TestRunProfileBitset.Debug */]: TestingContextKeys.hasDebuggableTests,
        [16 /* TestRunProfileBitset.HasNonDefaultProfile */]: TestingContextKeys.hasNonDefaultProfile,
        [32 /* TestRunProfileBitset.HasConfigurable */]: TestingContextKeys.hasConfigurableProfile,
        [64 /* TestRunProfileBitset.SupportsContinuousRun */]: TestingContextKeys.supportsContinuousRun,
    };
    TestingContextKeys.hasAnyResults = new RawContextKey('testing.hasAnyResults', false);
    TestingContextKeys.viewMode = new RawContextKey('testing.explorerViewMode', "list" /* TestExplorerViewMode.List */);
    TestingContextKeys.viewSorting = new RawContextKey('testing.explorerViewSorting', "location" /* TestExplorerViewSorting.ByLocation */);
    TestingContextKeys.isRunning = new RawContextKey('testing.isRunning', false);
    TestingContextKeys.isInPeek = new RawContextKey('testing.isInPeek', false);
    TestingContextKeys.isPeekVisible = new RawContextKey('testing.isPeekVisible', false);
    TestingContextKeys.peekItemType = new RawContextKey('peekItemType', undefined, {
        type: 'string',
        description: localize('testing.peekItemType', 'Type of the item in the output peek view. Either a "test", "message", "task", or "result".'),
    });
    TestingContextKeys.controllerId = new RawContextKey('controllerId', undefined, {
        type: 'string',
        description: localize('testing.controllerId', 'Controller ID of the current test item')
    });
    TestingContextKeys.testItemExtId = new RawContextKey('testId', undefined, {
        type: 'string',
        description: localize('testing.testId', 'ID of the current test item, set when creating or opening menus on test items')
    });
    TestingContextKeys.testItemHasUri = new RawContextKey('testing.testItemHasUri', false, {
        type: 'boolean',
        description: localize('testing.testItemHasUri', 'Boolean indicating whether the test item has a URI defined')
    });
    TestingContextKeys.testItemIsHidden = new RawContextKey('testing.testItemIsHidden', false, {
        type: 'boolean',
        description: localize('testing.testItemIsHidden', 'Boolean indicating whether the test item is hidden')
    });
    TestingContextKeys.testMessageContext = new RawContextKey('testMessage', undefined, {
        type: 'string',
        description: localize('testing.testMessage', 'Value set in `testMessage.contextValue`, available in editor/content and testing/message/context')
    });
    TestingContextKeys.testResultOutdated = new RawContextKey('testResultOutdated', undefined, {
        type: 'boolean',
        description: localize('testing.testResultOutdated', 'Value available in editor/content and testing/message/context when the result is outdated')
    });
    TestingContextKeys.testResultState = new RawContextKey('testResultState', undefined, {
        type: 'string',
        description: localize('testing.testResultState', 'Value available testing/item/result indicating the state of the item.')
    });
    TestingContextKeys.testProfileContextGroup = new RawContextKey('testing.profile.context.group', undefined, {
        type: 'string',
        description: localize('testing.profile.context.group', 'Type of menu where the configure testing profile submenu exists. Either "run", "debug", or "coverage"')
    });
})(TestingContextKeys || (TestingContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NvbnRleHRLZXlzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9jb21tb24vdGVzdGluZ0NvbnRleHRLZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFJckYsTUFBTSxLQUFXLGtCQUFrQixDQTJFbEM7QUEzRUQsV0FBaUIsa0JBQWtCO0lBQ3JCLGdDQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUQsa0NBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsb0JBQW9CLEVBQUUsd0VBQXdFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDN00sb0NBQWlCLEdBQUcsSUFBSSxhQUFhLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHNFQUFzRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pOLHFDQUFrQixHQUFHLElBQUksYUFBYSxDQUFVLDRCQUE0QixFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSwrQ0FBK0MsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoTixxQ0FBa0IsR0FBRyxJQUFJLGFBQWEsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLEVBQUUsRUFB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