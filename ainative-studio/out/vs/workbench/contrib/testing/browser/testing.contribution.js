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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdGluZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzdILE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQ25KLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBbUMsVUFBVSxJQUFJLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdEgsT0FBTyxFQUEyQyxVQUFVLElBQUksdUJBQXVCLEVBQXlCLE1BQU0sMEJBQTBCLENBQUM7QUFDakosT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN2RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSwyQkFBMkIsRUFBRSxpQkFBaUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xQLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxNQUFNLEVBQWdCLE1BQU0scUJBQXFCLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUUzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNySCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9FLE9BQU8sNkJBQTZCLENBQUM7QUFHckMsaUJBQWlCLENBQUMsWUFBWSxFQUFFLFdBQVcsb0NBQTRCLENBQUM7QUFDeEUsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLG9DQUE0QixDQUFDO0FBQ3BGLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixvQ0FBNEIsQ0FBQztBQUN0RixpQkFBaUIsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsb0NBQTRCLENBQUM7QUFDeEYsaUJBQWlCLENBQUMsNEJBQTRCLEVBQUUsMkJBQTJCLG9DQUE0QixDQUFDO0FBQ3hHLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixvQ0FBNEIsQ0FBQztBQUNwRixpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsb0NBQTRCLENBQUM7QUFDaEcsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLG9DQUE0QixDQUFDO0FBQ3BGLGlCQUFpQixDQUFDLDBCQUEwQixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQztBQUVuRyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUEwQix1QkFBdUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQ2hJLEVBQUUseURBQW1CO0lBQ3JCLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztJQUNuQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsd0JBQXdCLENBQUM7SUFDNUQsSUFBSSxFQUFFLGVBQWU7SUFDckIsc0JBQXNCLEVBQUUsSUFBSTtJQUM1QixLQUFLLEVBQUUsQ0FBQztJQUNSLDJCQUEyQixFQUFFO1FBQzVCLEVBQUUseURBQW1CO1FBQ3JCLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUM7UUFDbEcsc0RBQXNEO1FBQ3RELGtGQUFrRjtRQUNsRixLQUFLLEVBQUUsQ0FBQztLQUNSO0lBQ0QsV0FBVyxFQUFFLElBQUk7Q0FDakIsd0NBQWdDLENBQUM7QUFHbEMsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUEwQix1QkFBdUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLHFCQUFxQixDQUFDO0lBQzNJLEVBQUUsNERBQXdCO0lBQzFCLEtBQUssRUFBRSxTQUFTLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDO0lBQ3hELElBQUksRUFBRSxrQkFBa0I7SUFDeEIsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFDLGlCQUFpQixFQUFFLDZEQUF5QixFQUFFLG9DQUFvQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDL0gsV0FBVyxFQUFFLElBQUk7SUFDakIsS0FBSyxFQUFFLENBQUM7Q0FDUix1Q0FBK0IsRUFBRSx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBRXBFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBR3pGLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1QixFQUFFLGdFQUF1QjtRQUN6QixJQUFJLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQztRQUN2RCxhQUFhLEVBQUUsa0JBQWtCO1FBQ2pDLG1CQUFtQixFQUFFLEtBQUs7UUFDMUIsV0FBVyxFQUFFLElBQUk7UUFDakIsSUFBSSxFQUFFLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3RELGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxlQUFlLENBQUM7S0FDbkQsQ0FBQyxFQUFFLHdCQUF3QixDQUFDLENBQUM7QUFFOUIsYUFBYSxDQUFDLDBCQUEwQix3REFBeUI7SUFDaEUsT0FBTyxFQUFFLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxpREFBaUQsQ0FBQztDQUNqRyxDQUFDLENBQUM7QUFFSCxhQUFhLENBQUMsMEJBQTBCLHdEQUF5QjtJQUNoRSxPQUFPLEVBQUUsR0FBRyxHQUFHLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSx1Q0FBdUMsQ0FBQyxHQUFHLGFBQWEsMkVBQW9DLEdBQUc7SUFDNUosS0FBSyxFQUFFLEVBQUU7Q0FDVCxDQUFDLENBQUM7QUFFSCxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUIsRUFBRSx1REFBd0I7UUFDMUIsSUFBSSxFQUFFLFNBQVMsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1FBQ2hELGNBQWMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQztRQUN2RCxtQkFBbUIsRUFBRSxJQUFJO1FBQ3pCLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLE1BQU0sRUFBRSxFQUFFO1FBQ1YsS0FBSyxFQUFFLENBQUMsR0FBRztRQUNYLGFBQWEsRUFBRSxlQUFlO1FBQzlCLElBQUksRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQ3JFLEVBQUU7UUFDRixFQUFFLDREQUF3QjtRQUMxQixJQUFJLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7UUFDaEQsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDO1FBQ3BELG1CQUFtQixFQUFFLElBQUk7UUFDekIsV0FBVyxFQUFFLElBQUk7UUFDakIsTUFBTSxFQUFFLEVBQUU7UUFDVixLQUFLLEVBQUUsQ0FBQyxHQUFHO1FBQ1gsYUFBYSxFQUFFLGVBQWU7UUFDOUIsSUFBSSxFQUFFLGtCQUFrQixDQUFDLGtCQUFrQjtLQUMzQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFFbkIsY0FBYyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUMzQyxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUMzQyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN2QyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDL0IsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDMUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFFbkMsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQUMsc0JBQXNCLGtDQUEwQixDQUFDO0FBQzNKLFFBQVEsQ0FBQyxFQUFFLENBQWtDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLGlCQUFpQixvQ0FBNEIsQ0FBQztBQUN4SixRQUFRLENBQUMsRUFBRSxDQUFrQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxzQkFBc0Isb0NBQTRCLENBQUM7QUFFN0osMEJBQTBCLDRFQUFtQywyQkFBMkIsMkRBQW1ELENBQUM7QUFDNUksMEJBQTBCLDhFQUFvQyxrQkFBa0IsMkRBQW1ELENBQUM7QUFDcEksMEJBQTBCLHVGQUE0Qyx1QkFBdUIscURBQTZDLENBQUM7QUFFM0ksZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLE1BQTBCLEVBQUUsS0FBZSxFQUFFLEVBQUU7UUFDMUYsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakgsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLHdEQUF5QixLQUFLLENBQUMsQ0FBQztJQUNyRSxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBQ0gsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsOEZBQThDO0lBQ2hELE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxVQUFvQyxFQUFFLEtBQTJCLEVBQUUsRUFBRTtRQUNoSCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDbkQsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxVQUFVLENBQUM7UUFDekQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4SCxJQUFJLENBQUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUM7WUFDckMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqRCxJQUFJLEtBQUssSUFBSSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEQsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDOUMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBQ0gsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsNEZBQTZDO0lBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBMEIsRUFBRSxLQUEyQixFQUFFLEVBQUU7UUFDMUUsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQzdELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLHNCQUFzQjtJQUMxQixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsS0FBYSxFQUFFLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQztRQUNsQyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDaEQsSUFBSSxNQUFNLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZO1lBQzdELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQ0FBeUIsSUFBSSxNQUFNLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzdILE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLG1CQUFtQjtJQUN2QixPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsS0FBYSxFQUFFLElBQXdELEVBQUUsRUFBRTtRQUN0SCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTztRQUNSLENBQUM7UUFFRCwyRUFBMkU7UUFDM0UsaURBQWlEO1FBQ2pELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxFQUFFLGdCQUFnQixFQUFFLENBQUM7UUFFNUgsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVqRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLENBQUMsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNDLE1BQU0sR0FBRyxLQUFLLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixVQUFVO1FBQ1gsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4RSxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRO1lBQ2hDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN0RSxDQUFDLENBQUMsR0FBRyxFQUNMO1lBQ0MsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVO1lBQzVCLGFBQWEsRUFBRTtnQkFDZCxhQUFhLEVBQUUsSUFBSSxFQUFFLGFBQWE7YUFDbEM7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSxxQkFBcUI7SUFDekIsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEtBQTJCLEVBQUUsR0FBRyxPQUFpQixFQUFFLEVBQUU7UUFDaEcsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxNQUFNLG1CQUFtQixDQUN4QixRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLFVBQVUsRUFDckMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUM5QixPQUFPLEVBQ1AsS0FBSyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQy9DLENBQUM7SUFDSCxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZ0JBQWdCLENBQUMsZUFBZSxDQUFDO0lBQ2hDLEVBQUUsRUFBRSx3Q0FBd0M7SUFDNUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUEwQixFQUFFLEVBQUU7UUFDN0MsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxPQUFPLENBQUMsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQzthQUMxQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7YUFDaEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLCtCQUErQjtJQUNuQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsR0FBUSxFQUFFLEVBQUU7UUFDdkQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxPQUFPLENBQUMsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxRQUFRLENBQUMsRUFBRSxDQUF5Qix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDIn0=