/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../../common/views.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID } from '../../files/browser/fileConstants.js';
import { CodeCoverageDecorations } from './codeCoverageDecorations.js';
import { testingResultsIcon, testingViewIcon } from './icons.js';
import { TestCoverageView } from './testCoverageView.js';
import { TestingDecorationService, TestingDecorations } from './testingDecorations.js';
import { TestingExplorerView } from './testingExplorerView.js';
import { CloseTestPeek, CollapsePeekStack, GoToNextMessageAction, GoToPreviousMessageAction, OpenMessageInEditorAction, TestResultsView, TestingOutputPeekController, TestingPeekOpener, ToggleTestingPeekHistory } from './testingOutputPeek.js';
import { TestingProgressTrigger } from './testingProgressUiService.js';
import { TestingViewPaneContainer } from './testingViewPaneContainer.js';
import { testingConfiguration } from '../common/configuration.js';
import { ITestCoverageService, TestCoverageService } from '../common/testCoverageService.js';
import { ITestExplorerFilterState, TestExplorerFilterState } from '../common/testExplorerFilterState.js';
import { TestId } from '../common/testId.js';
import { canUseProfileWithTest, ITestProfileService, TestProfileService } from '../common/testProfileService.js';
import { ITestResultService, TestResultService } from '../common/testResultService.js';
import { ITestResultStorage, TestResultStorage } from '../common/testResultStorage.js';
import { ITestService } from '../common/testService.js';
import { TestService } from '../common/testServiceImpl.js';
import { TestingContentProvider } from '../common/testingContentProvider.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService, TestingContinuousRunService } from '../common/testingContinuousRunService.js';
import { ITestingDecorationsService } from '../common/testingDecorations.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { allTestActions, discoverAndRunTests } from './testExplorerActions.js';
import './testingConfigurationUi.js';
registerSingleton(ITestService, TestService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestResultStorage, TestResultStorage, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestProfileService, TestProfileService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestCoverageService, TestCoverageService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestingContinuousRunService, TestingContinuousRunService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestResultService, TestResultService, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestExplorerFilterState, TestExplorerFilterState, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestingPeekOpener, TestingPeekOpener, 1 /* InstantiationType.Delayed */);
registerSingleton(ITestingDecorationsService, TestingDecorationService, 1 /* InstantiationType.Delayed */);
const viewContainer = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: "workbench.view.extension.test" /* Testing.ViewletId */,
    title: localize2('test', 'Testing'),
    ctorDescriptor: new SyncDescriptor(TestingViewPaneContainer),
    icon: testingViewIcon,
    alwaysUseContainerInfo: true,
    order: 6,
    openCommandActionDescriptor: {
        id: "workbench.view.extension.test" /* Testing.ViewletId */,
        mnemonicTitle: localize({ key: 'miViewTesting', comment: ['&& denotes a mnemonic'] }, "T&&esting"),
        // todo: coordinate with joh whether this is available
        // keybindings: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.US_SEMICOLON },
        order: 4,
    },
    hideIfEmpty: true,
}, 0 /* ViewContainerLocation.Sidebar */);
const testResultsViewContainer = Registry.as(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: "workbench.panel.testResults" /* Testing.ResultsPanelId */,
    title: localize2('testResultsPanelName', "Test Results"),
    icon: testingResultsIcon,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ["workbench.panel.testResults" /* Testing.ResultsPanelId */, { mergeViewWithContainerWhenSingleView: true }]),
    hideIfEmpty: true,
    order: 3,
}, 1 /* ViewContainerLocation.Panel */, { doNotRegisterOpenCommand: true });
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
        id: "workbench.panel.testResults.view" /* Testing.ResultsViewId */,
        name: localize2('testResultsPanelName', "Test Results"),
        containerIcon: testingResultsIcon,
        canToggleVisibility: false,
        canMoveView: true,
        when: TestingContextKeys.hasAnyResults.isEqualTo(true),
        ctorDescriptor: new SyncDescriptor(TestResultsView),
    }], testResultsViewContainer);
viewsRegistry.registerViewWelcomeContent("workbench.view.testing" /* Testing.ExplorerViewId */, {
    content: localize('noTestProvidersRegistered', "No tests have been found in this workspace yet."),
});
viewsRegistry.registerViewWelcomeContent("workbench.view.testing" /* Testing.ExplorerViewId */, {
    content: '[' + localize('searchForAdditionalTestExtensions', "Install Additional Test Extensions...") + `](command:${"testing.searchForTestExtension" /* TestCommandId.SearchForTestExtension */})`,
    order: 10
});
viewsRegistry.registerViews([{
        id: "workbench.view.testing" /* Testing.ExplorerViewId */,
        name: localize2('testExplorer', "Test Explorer"),
        ctorDescriptor: new SyncDescriptor(TestingExplorerView),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 80,
        order: -999,
        containerIcon: testingViewIcon,
        when: ContextKeyExpr.greater(TestingContextKeys.providerCount.key, 0),
    }, {
        id: "workbench.view.testCoverage" /* Testing.CoverageViewId */,
        name: localize2('testCoverage', "Test Coverage"),
        ctorDescriptor: new SyncDescriptor(TestCoverageView),
        canToggleVisibility: true,
        canMoveView: true,
        weight: 80,
        order: -998,
        containerIcon: testingViewIcon,
        when: TestingContextKeys.isTestCoverageOpen,
    }], viewContainer);
allTestActions.forEach(registerAction2);
registerAction2(OpenMessageInEditorAction);
registerAction2(GoToPreviousMessageAction);
registerAction2(GoToNextMessageAction);
registerAction2(CloseTestPeek);
registerAction2(ToggleTestingPeekHistory);
registerAction2(CollapsePeekStack);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TestingContentProvider, 3 /* LifecyclePhase.Restored */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TestingPeekOpener, 4 /* LifecyclePhase.Eventually */);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(TestingProgressTrigger, 4 /* LifecyclePhase.Eventually */);
registerEditorContribution("editor.contrib.testingOutputPeek" /* Testing.OutputPeekContributionId */, TestingOutputPeekController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution("editor.contrib.testingDecorations" /* Testing.DecorationsContributionId */, TestingDecorations, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution("editor.contrib.coverageDecorations" /* Testing.CoverageDecorationsContributionId */, CodeCoverageDecorations, 3 /* EditorContributionInstantiation.Eventually */);
CommandsRegistry.registerCommand({
    id: '_revealTestInExplorer',
    handler: async (accessor, testId, focus) => {
        accessor.get(ITestExplorerFilterState).reveal.set(typeof testId === 'string' ? testId : testId.extId, undefined);
        accessor.get(IViewsService).openView("workbench.view.testing" /* Testing.ExplorerViewId */, focus);
    }
});
CommandsRegistry.registerCommand({
    id: "testing.startContinuousRunFromExtension" /* TestCommandId.StartContinousRunFromExtension */,
    handler: async (accessor, profileRef, tests) => {
        const profiles = accessor.get(ITestProfileService);
        const collection = accessor.get(ITestService).collection;
        const profile = profiles.getControllerProfiles(profileRef.controllerId).find(p => p.profileId === profileRef.profileId);
        if (!profile?.supportsContinuousRun) {
            return;
        }
        const crService = accessor.get(ITestingContinuousRunService);
        for (const test of tests) {
            const found = collection.getNodeById(test.extId);
            if (found && canUseProfileWithTest(profile, found)) {
                crService.start([profile], found.item.extId);
            }
        }
    }
});
CommandsRegistry.registerCommand({
    id: "testing.stopContinuousRunFromExtension" /* TestCommandId.StopContinousRunFromExtension */,
    handler: async (accessor, tests) => {
        const crService = accessor.get(ITestingContinuousRunService);
        for (const test of tests) {
            crService.stop(test.extId);
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.peekTestError',
    handler: async (accessor, extId) => {
        const lookup = accessor.get(ITestResultService).getStateById(extId);
        if (!lookup) {
            return false;
        }
        const [result, ownState] = lookup;
        const opener = accessor.get(ITestingPeekOpener);
        if (opener.tryPeekFirstError(result, ownState)) { // fast path
            return true;
        }
        for (const test of result.tests) {
            if (TestId.compare(ownState.item.extId, test.item.extId) === 2 /* TestPosition.IsChild */ && opener.tryPeekFirstError(result, test)) {
                return true;
            }
        }
        return false;
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.revealTest',
    handler: async (accessor, extId, opts) => {
        const test = accessor.get(ITestService).collection.getNodeById(extId);
        if (!test) {
            return;
        }
        const commandService = accessor.get(ICommandService);
        const fileService = accessor.get(IFileService);
        const openerService = accessor.get(IOpenerService);
        const { range, uri } = test.item;
        if (!uri) {
            return;
        }
        // If an editor has the file open, there are decorations. Try to adjust the
        // revealed range to those decorations (#133441).
        const position = accessor.get(ITestingDecorationsService).getDecoratedTestPosition(uri, extId) || range?.getStartPosition();
        accessor.get(ITestExplorerFilterState).reveal.set(extId, undefined);
        accessor.get(ITestingPeekOpener).closeAllPeeks();
        let isFile = true;
        try {
            if (!(await fileService.stat(uri)).isFile) {
                isFile = false;
            }
        }
        catch {
            // ignored
        }
        if (!isFile) {
            await commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, uri);
            return;
        }
        await openerService.open(position
            ? uri.with({ fragment: `L${position.lineNumber}:${position.column}` })
            : uri, {
            openToSide: opts?.openToSide,
            editorOptions: {
                preserveFocus: opts?.preserveFocus,
            }
        });
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.runTestsById',
    handler: async (accessor, group, ...testIds) => {
        const testService = accessor.get(ITestService);
        await discoverAndRunTests(accessor.get(ITestService).collection, accessor.get(IProgressService), testIds, tests => testService.runTests({ group, tests }));
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.testing.getControllersWithTests',
    handler: async (accessor) => {
        const testService = accessor.get(ITestService);
        return [...testService.collection.rootItems]
            .filter(r => r.children.size > 0)
            .map(r => r.controllerId);
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.testing.getTestsInFile',
    handler: async (accessor, uri) => {
        const testService = accessor.get(ITestService);
        return [...testService.collection.getNodeByUrl(uri)].map(t => TestId.split(t.item.extId));
    }
});
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration(testingConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RpbmcuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUM3SCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckcsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSxvRUFBb0UsQ0FBQztBQUNuSixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQW1DLFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FB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