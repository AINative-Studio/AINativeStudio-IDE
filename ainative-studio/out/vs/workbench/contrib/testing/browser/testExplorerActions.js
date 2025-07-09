/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SymbolNavigationAction } from '../../../../editor/contrib/gotoSymbol/browser/goToCommands.js';
import { ReferencesModel } from '../../../../editor/contrib/gotoSymbol/browser/referencesModel.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { PeekContext } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, ContextKeyGreaterExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { TestItemTreeElement } from './explorerProjections/index.js';
import * as icons from './icons.js';
import { getTestingConfiguration } from '../common/configuration.js';
import { testConfigurationGroupNames } from '../common/constants.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { ITestProfileService, canUseProfileWithTest } from '../common/testProfileService.js';
import { ITestResultService } from '../common/testResultService.js';
import { ITestService, expandAndGetTestById, testsInFile, testsUnderUri } from '../common/testService.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import { ITestingContinuousRunService } from '../common/testingContinuousRunService.js';
import { ITestingPeekOpener } from '../common/testingPeekOpener.js';
import { isFailedState } from '../common/testingStates.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
const category = Categories.Test;
var ActionOrder;
(function (ActionOrder) {
    // Navigation:
    ActionOrder[ActionOrder["Refresh"] = 10] = "Refresh";
    ActionOrder[ActionOrder["Run"] = 11] = "Run";
    ActionOrder[ActionOrder["Debug"] = 12] = "Debug";
    ActionOrder[ActionOrder["Coverage"] = 13] = "Coverage";
    ActionOrder[ActionOrder["RunContinuous"] = 14] = "RunContinuous";
    ActionOrder[ActionOrder["RunUsing"] = 15] = "RunUsing";
    // Submenu:
    ActionOrder[ActionOrder["Collapse"] = 16] = "Collapse";
    ActionOrder[ActionOrder["ClearResults"] = 17] = "ClearResults";
    ActionOrder[ActionOrder["DisplayMode"] = 18] = "DisplayMode";
    ActionOrder[ActionOrder["Sort"] = 19] = "Sort";
    ActionOrder[ActionOrder["GoToTest"] = 20] = "GoToTest";
    ActionOrder[ActionOrder["HideTest"] = 21] = "HideTest";
    ActionOrder[ActionOrder["ContinuousRunTest"] = 2147483647] = "ContinuousRunTest";
})(ActionOrder || (ActionOrder = {}));
const hasAnyTestProvider = ContextKeyGreaterExpr.create(TestingContextKeys.providerCount.key, 0);
const LABEL_RUN_TESTS = localize2('runSelectedTests', "Run Tests");
const LABEL_DEBUG_TESTS = localize2('debugSelectedTests', "Debug Tests");
const LABEL_COVERAGE_TESTS = localize2('coverageSelectedTests', "Run Tests with Coverage");
export class HideTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.hideTest" /* TestCommandId.HideTestAction */,
            title: localize2('hideTest', 'Hide Test'),
            menu: {
                id: MenuId.TestItem,
                group: 'builtin@2',
                when: TestingContextKeys.testItemIsHidden.isEqualTo(false)
            },
        });
    }
    run(accessor, ...elements) {
        const service = accessor.get(ITestService);
        for (const element of elements) {
            service.excluded.toggle(element.test, true);
        }
        return Promise.resolve();
    }
}
export class UnhideTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.unhideTest" /* TestCommandId.UnhideTestAction */,
            title: localize2('unhideTest', 'Unhide Test'),
            menu: {
                id: MenuId.TestItem,
                order: 21 /* ActionOrder.HideTest */,
                when: TestingContextKeys.testItemIsHidden.isEqualTo(true)
            },
        });
    }
    run(accessor, ...elements) {
        const service = accessor.get(ITestService);
        for (const element of elements) {
            if (element instanceof TestItemTreeElement) {
                service.excluded.toggle(element.test, false);
            }
        }
        return Promise.resolve();
    }
}
export class UnhideAllTestsAction extends Action2 {
    constructor() {
        super({
            id: "testing.unhideAllTests" /* TestCommandId.UnhideAllTestsAction */,
            title: localize2('unhideAllTests', 'Unhide All Tests'),
        });
    }
    run(accessor) {
        const service = accessor.get(ITestService);
        service.excluded.clear();
        return Promise.resolve();
    }
}
const testItemInlineAndInContext = (order, when) => [
    {
        id: MenuId.TestItem,
        group: 'inline',
        order,
        when,
    }, {
        id: MenuId.TestItem,
        group: 'builtin@1',
        order,
        when,
    }
];
class RunVisibleAction extends ViewAction {
    constructor(bitset, desc) {
        super({
            ...desc,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
        this.bitset = bitset;
    }
    /**
     * @override
     */
    runInView(accessor, view, ...elements) {
        const { include, exclude } = view.getTreeIncludeExclude(this.bitset, elements.map(e => e.test));
        return accessor.get(ITestService).runTests({
            tests: include,
            exclude,
            group: this.bitset,
        });
    }
}
export class DebugAction extends RunVisibleAction {
    constructor() {
        super(4 /* TestRunProfileBitset.Debug */, {
            id: "testing.debug" /* TestCommandId.DebugAction */,
            title: localize2('debug test', 'Debug Test'),
            icon: icons.testingDebugIcon,
            menu: testItemInlineAndInContext(12 /* ActionOrder.Debug */, TestingContextKeys.hasDebuggableTests.isEqualTo(true)),
        });
    }
}
export class CoverageAction extends RunVisibleAction {
    constructor() {
        super(8 /* TestRunProfileBitset.Coverage */, {
            id: "testing.coverage" /* TestCommandId.RunWithCoverageAction */,
            title: localize2('run with cover test', 'Run Test with Coverage'),
            icon: icons.testingCoverageIcon,
            menu: testItemInlineAndInContext(13 /* ActionOrder.Coverage */, TestingContextKeys.hasCoverableTests.isEqualTo(true)),
        });
    }
}
export class RunUsingProfileAction extends Action2 {
    constructor() {
        super({
            id: "testing.runUsing" /* TestCommandId.RunUsingProfileAction */,
            title: localize2('testing.runUsing', 'Execute Using Profile...'),
            icon: icons.testingDebugIcon,
            menu: {
                id: MenuId.TestItem,
                order: 15 /* ActionOrder.RunUsing */,
                group: 'builtin@2',
                when: TestingContextKeys.hasNonDefaultProfile.isEqualTo(true),
            },
        });
    }
    async run(acessor, ...elements) {
        const commandService = acessor.get(ICommandService);
        const testService = acessor.get(ITestService);
        const profile = await commandService.executeCommand('vscode.pickTestProfile', {
            onlyForTest: elements[0].test,
        });
        if (!profile) {
            return;
        }
        testService.runResolvedTests({
            group: profile.group,
            targets: [{
                    profileId: profile.profileId,
                    controllerId: profile.controllerId,
                    testIds: elements.filter(t => canUseProfileWithTest(profile, t.test)).map(t => t.test.item.extId)
                }]
        });
    }
}
export class RunAction extends RunVisibleAction {
    constructor() {
        super(2 /* TestRunProfileBitset.Run */, {
            id: "testing.run" /* TestCommandId.RunAction */,
            title: localize2('run test', 'Run Test'),
            icon: icons.testingRunIcon,
            menu: testItemInlineAndInContext(11 /* ActionOrder.Run */, TestingContextKeys.hasRunnableTests.isEqualTo(true)),
        });
    }
}
export class SelectDefaultTestProfiles extends Action2 {
    constructor() {
        super({
            id: "testing.selectDefaultTestProfiles" /* TestCommandId.SelectDefaultTestProfiles */,
            title: localize2('testing.selectDefaultTestProfiles', 'Select Default Profile'),
            icon: icons.testingUpdateProfiles,
            category,
        });
    }
    async run(acessor, onlyGroup) {
        const commands = acessor.get(ICommandService);
        const testProfileService = acessor.get(ITestProfileService);
        const profiles = await commands.executeCommand('vscode.pickMultipleTestProfiles', {
            showConfigureButtons: false,
            selected: testProfileService.getGroupDefaultProfiles(onlyGroup),
            onlyGroup,
        });
        if (profiles?.length) {
            testProfileService.setGroupDefaultProfiles(onlyGroup, profiles);
        }
    }
}
export class ContinuousRunTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.toggleContinuousRunForTest" /* TestCommandId.ToggleContinousRunForTest */,
            title: localize2('testing.toggleContinuousRunOn', 'Turn on Continuous Run'),
            icon: icons.testingTurnContinuousRunOn,
            precondition: ContextKeyExpr.or(TestingContextKeys.isContinuousModeOn.isEqualTo(true), TestingContextKeys.isParentRunningContinuously.isEqualTo(false)),
            toggled: {
                condition: TestingContextKeys.isContinuousModeOn.isEqualTo(true),
                icon: icons.testingContinuousIsOn,
                title: localize('testing.toggleContinuousRunOff', 'Turn off Continuous Run'),
            },
            menu: testItemInlineAndInContext(2147483647 /* ActionOrder.ContinuousRunTest */, TestingContextKeys.supportsContinuousRun.isEqualTo(true)),
        });
    }
    async run(accessor, ...elements) {
        const crService = accessor.get(ITestingContinuousRunService);
        for (const element of elements) {
            const id = element.test.item.extId;
            if (crService.isSpecificallyEnabledFor(id)) {
                crService.stop(id);
                continue;
            }
            crService.start(2 /* TestRunProfileBitset.Run */, id);
        }
    }
}
export class ContinuousRunUsingProfileTestAction extends Action2 {
    constructor() {
        super({
            id: "testing.continuousRunUsingForTest" /* TestCommandId.ContinousRunUsingForTest */,
            title: localize2('testing.startContinuousRunUsing', 'Start Continous Run Using...'),
            icon: icons.testingDebugIcon,
            menu: [
                {
                    id: MenuId.TestItem,
                    order: 14 /* ActionOrder.RunContinuous */,
                    group: 'builtin@2',
                    when: ContextKeyExpr.and(TestingContextKeys.supportsContinuousRun.isEqualTo(true), TestingContextKeys.isContinuousModeOn.isEqualTo(false))
                }
            ],
        });
    }
    async run(accessor, ...elements) {
        const crService = accessor.get(ITestingContinuousRunService);
        const profileService = accessor.get(ITestProfileService);
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        for (const element of elements) {
            const selected = await selectContinuousRunProfiles(crService, notificationService, quickInputService, [{ profiles: profileService.getControllerProfiles(element.test.controllerId) }]);
            if (selected.length) {
                crService.start(selected, element.test.item.extId);
            }
        }
    }
}
export class ConfigureTestProfilesAction extends Action2 {
    constructor() {
        super({
            id: "testing.configureProfile" /* TestCommandId.ConfigureTestProfilesAction */,
            title: localize2('testing.configureProfile', "Configure Test Profiles"),
            icon: icons.testingUpdateProfiles,
            f1: true,
            category,
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasConfigurableProfile.isEqualTo(true),
            },
        });
    }
    async run(acessor, onlyGroup) {
        const commands = acessor.get(ICommandService);
        const testProfileService = acessor.get(ITestProfileService);
        const profile = await commands.executeCommand('vscode.pickTestProfile', {
            placeholder: localize('configureProfile', 'Select a profile to update'),
            showConfigureButtons: false,
            onlyConfigurable: true,
            onlyGroup,
        });
        if (profile) {
            testProfileService.configure(profile.controllerId, profile.profileId);
        }
    }
}
const continuousMenus = (whenIsContinuousOn) => [
    {
        id: MenuId.ViewTitle,
        group: 'navigation',
        order: 15 /* ActionOrder.RunUsing */,
        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.supportsContinuousRun.isEqualTo(true), TestingContextKeys.isContinuousModeOn.isEqualTo(whenIsContinuousOn)),
    },
    {
        id: MenuId.CommandPalette,
        when: TestingContextKeys.supportsContinuousRun.isEqualTo(true),
    },
];
class StopContinuousRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.stopContinuousRun" /* TestCommandId.StopContinousRun */,
            title: localize2('testing.stopContinuous', 'Stop Continuous Run'),
            category,
            icon: icons.testingTurnContinuousRunOff,
            menu: continuousMenus(true),
        });
    }
    run(accessor) {
        accessor.get(ITestingContinuousRunService).stop();
    }
}
function selectContinuousRunProfiles(crs, notificationService, quickInputService, profilesToPickFrom) {
    const items = [];
    for (const { controller, profiles } of profilesToPickFrom) {
        for (const profile of profiles) {
            if (profile.supportsContinuousRun) {
                items.push({
                    label: profile.label || controller?.label.get() || '',
                    description: controller?.label.get(),
                    profile,
                });
            }
        }
    }
    if (items.length === 0) {
        notificationService.info(localize('testing.noProfiles', 'No test continuous run-enabled profiles were found'));
        return Promise.resolve([]);
    }
    // special case: don't bother to quick a pickpick if there's only a single profile
    if (items.length === 1) {
        return Promise.resolve([items[0].profile]);
    }
    const qpItems = [];
    const selectedItems = [];
    const lastRun = crs.lastRunProfileIds;
    items.sort((a, b) => a.profile.group - b.profile.group
        || a.profile.controllerId.localeCompare(b.profile.controllerId)
        || a.label.localeCompare(b.label));
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (i === 0 || items[i - 1].profile.group !== item.profile.group) {
            qpItems.push({ type: 'separator', label: testConfigurationGroupNames[item.profile.group] });
        }
        qpItems.push(item);
        if (lastRun.has(item.profile.profileId)) {
            selectedItems.push(item);
        }
    }
    const disposables = new DisposableStore();
    const quickpick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
    quickpick.title = localize('testing.selectContinuousProfiles', 'Select profiles to run when files change:');
    quickpick.canSelectMany = true;
    quickpick.items = qpItems;
    quickpick.selectedItems = selectedItems;
    quickpick.show();
    return new Promise(resolve => {
        disposables.add(quickpick.onDidAccept(() => {
            resolve(quickpick.selectedItems.map(i => i.profile));
            disposables.dispose();
        }));
        disposables.add(quickpick.onDidHide(() => {
            resolve([]);
            disposables.dispose();
        }));
    });
}
class StartContinuousRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.startContinuousRun" /* TestCommandId.StartContinousRun */,
            title: localize2('testing.startContinuous', "Start Continuous Run"),
            category,
            icon: icons.testingTurnContinuousRunOn,
            menu: continuousMenus(false),
        });
    }
    async run(accessor) {
        const crs = accessor.get(ITestingContinuousRunService);
        const profileService = accessor.get(ITestProfileService);
        const lastRunProfiles = [...profileService.all()].flatMap(p => p.profiles.filter(p => crs.lastRunProfileIds.has(p.profileId)));
        if (lastRunProfiles.length) {
            return crs.start(lastRunProfiles);
        }
        const selected = await selectContinuousRunProfiles(crs, accessor.get(INotificationService), accessor.get(IQuickInputService), accessor.get(ITestProfileService).all());
        if (selected.length) {
            crs.start(selected);
        }
    }
}
class ExecuteSelectedAction extends ViewAction {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.ViewTitle,
                    order: group === 2 /* TestRunProfileBitset.Run */
                        ? 11 /* ActionOrder.Run */
                        : group === 4 /* TestRunProfileBitset.Debug */
                            ? 12 /* ActionOrder.Debug */
                            : 13 /* ActionOrder.Coverage */,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.isRunning.isEqualTo(false), TestingContextKeys.capabilityToContextKey[group].isEqualTo(true))
                }],
            category,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
        });
        this.group = group;
    }
    /**
     * @override
     */
    runInView(accessor, view) {
        const { include, exclude } = view.getTreeIncludeExclude(this.group);
        return accessor.get(ITestService).runTests({ tests: include, exclude, group: this.group });
    }
}
export class GetSelectedProfiles extends Action2 {
    constructor() {
        super({ id: "testing.getSelectedProfiles" /* TestCommandId.GetSelectedProfiles */, title: localize2('getSelectedProfiles', 'Get Selected Profiles') });
    }
    /**
     * @override
     */
    run(accessor) {
        const profiles = accessor.get(ITestProfileService);
        return [
            ...profiles.getGroupDefaultProfiles(2 /* TestRunProfileBitset.Run */),
            ...profiles.getGroupDefaultProfiles(4 /* TestRunProfileBitset.Debug */),
            ...profiles.getGroupDefaultProfiles(8 /* TestRunProfileBitset.Coverage */),
        ].map(p => ({
            controllerId: p.controllerId,
            label: p.label,
            kind: p.group & 8 /* TestRunProfileBitset.Coverage */
                ? 3 /* ExtTestRunProfileKind.Coverage */
                : p.group & 4 /* TestRunProfileBitset.Debug */
                    ? 2 /* ExtTestRunProfileKind.Debug */
                    : 1 /* ExtTestRunProfileKind.Run */,
        }));
    }
}
export class GetExplorerSelection extends ViewAction {
    constructor() {
        super({ id: "_testing.getExplorerSelection" /* TestCommandId.GetExplorerSelection */, title: localize2('getExplorerSelection', 'Get Explorer Selection'), viewId: "workbench.view.testing" /* Testing.ExplorerViewId */ });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        const { include, exclude } = view.getTreeIncludeExclude(2 /* TestRunProfileBitset.Run */, undefined, 'selected');
        const mapper = (i) => i.item.extId;
        return { include: include.map(mapper), exclude: exclude.map(mapper) };
    }
}
export class RunSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.runSelected" /* TestCommandId.RunSelectedAction */,
            title: LABEL_RUN_TESTS,
            icon: icons.testingRunAllIcon,
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.debugSelected" /* TestCommandId.DebugSelectedAction */,
            title: LABEL_DEBUG_TESTS,
            icon: icons.testingDebugAllIcon,
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageSelectedAction extends ExecuteSelectedAction {
    constructor() {
        super({
            id: "testing.coverageSelected" /* TestCommandId.CoverageSelectedAction */,
            title: LABEL_COVERAGE_TESTS,
            icon: icons.testingCoverageAllIcon,
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
const showDiscoveringWhile = (progress, task) => {
    return progress.withProgress({
        location: 10 /* ProgressLocation.Window */,
        title: localize('discoveringTests', 'Discovering Tests'),
    }, () => task);
};
class RunOrDebugAllTestsAction extends Action2 {
    constructor(options, group, noTestsFoundError) {
        super({
            ...options,
            category,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                }]
        });
        this.group = group;
        this.noTestsFoundError = noTestsFoundError;
    }
    async run(accessor) {
        const testService = accessor.get(ITestService);
        const notifications = accessor.get(INotificationService);
        const roots = [...testService.collection.rootItems].filter(r => r.children.size
            || r.expand === 1 /* TestItemExpandState.Expandable */ || r.expand === 2 /* TestItemExpandState.BusyExpanding */);
        if (!roots.length) {
            notifications.info(this.noTestsFoundError);
            return;
        }
        await testService.runTests({ tests: roots, group: this.group });
    }
}
export class RunAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.runAll" /* TestCommandId.RunAllAction */,
            title: localize2('runAllTests', 'Run All Tests'),
            icon: icons.testingRunAllIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 31 /* KeyCode.KeyA */),
            },
        }, 2 /* TestRunProfileBitset.Run */, localize('noTestProvider', 'No tests found in this workspace. You may need to install a test provider extension'));
    }
}
export class DebugAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.debugAll" /* TestCommandId.DebugAllAction */,
            title: localize2('debugAllTests', 'Debug All Tests'),
            icon: icons.testingDebugIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */),
            },
        }, 4 /* TestRunProfileBitset.Debug */, localize('noDebugTestProvider', 'No debuggable tests found in this workspace. You may need to install a test provider extension'));
    }
}
export class CoverageAllAction extends RunOrDebugAllTestsAction {
    constructor() {
        super({
            id: "testing.coverageAll" /* TestCommandId.RunAllWithCoverageAction */,
            title: localize2('runAllWithCoverage', 'Run All Tests with Coverage'),
            icon: icons.testingCoverageIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */, localize('noCoverageTestProvider', 'No tests with coverage runners found in this workspace. You may need to install a test provider extension'));
    }
}
export class CancelTestRunAction extends Action2 {
    constructor() {
        super({
            id: "testing.cancelRun" /* TestCommandId.CancelTestRunAction */,
            title: localize2('testing.cancelRun', 'Cancel Test Run'),
            icon: icons.testingCancelIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */),
            },
            menu: [{
                    id: MenuId.ViewTitle,
                    order: 11 /* ActionOrder.Run */,
                    group: 'navigation',
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), ContextKeyExpr.equals(TestingContextKeys.isRunning.serialize(), true))
                }]
        });
    }
    /**
     * @override
     */
    async run(accessor, resultId, taskId) {
        const resultService = accessor.get(ITestResultService);
        const testService = accessor.get(ITestService);
        if (resultId) {
            testService.cancelTestRun(resultId, taskId);
        }
        else {
            for (const run of resultService.results) {
                if (!run.completedAt) {
                    testService.cancelTestRun(run.id);
                }
            }
        }
    }
}
export class TestingViewAsListAction extends ViewAction {
    constructor() {
        super({
            id: "testing.viewAsList" /* TestCommandId.TestingViewAsListAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.viewAsList', 'View as List'),
            toggled: TestingContextKeys.viewMode.isEqualTo("list" /* TestExplorerViewMode.List */),
            menu: {
                id: MenuId.ViewTitle,
                order: 18 /* ActionOrder.DisplayMode */,
                group: 'viewAs',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewMode = "list" /* TestExplorerViewMode.List */;
    }
}
export class TestingViewAsTreeAction extends ViewAction {
    constructor() {
        super({
            id: "testing.viewAsTree" /* TestCommandId.TestingViewAsTreeAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.viewAsTree', 'View as Tree'),
            toggled: TestingContextKeys.viewMode.isEqualTo("true" /* TestExplorerViewMode.Tree */),
            menu: {
                id: MenuId.ViewTitle,
                order: 18 /* ActionOrder.DisplayMode */,
                group: 'viewAs',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewMode = "true" /* TestExplorerViewMode.Tree */;
    }
}
export class TestingSortByStatusAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByStatus" /* TestCommandId.TestingSortByStatusAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByStatus', 'Sort by Status'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("status" /* TestExplorerViewSorting.ByStatus */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "status" /* TestExplorerViewSorting.ByStatus */;
    }
}
export class TestingSortByLocationAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByLocation" /* TestCommandId.TestingSortByLocationAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByLocation', 'Sort by Location'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("location" /* TestExplorerViewSorting.ByLocation */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "location" /* TestExplorerViewSorting.ByLocation */;
    }
}
export class TestingSortByDurationAction extends ViewAction {
    constructor() {
        super({
            id: "testing.sortByDuration" /* TestCommandId.TestingSortByDurationAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.sortByDuration', 'Sort by Duration'),
            toggled: TestingContextKeys.viewSorting.isEqualTo("duration" /* TestExplorerViewSorting.ByDuration */),
            menu: {
                id: MenuId.ViewTitle,
                order: 19 /* ActionOrder.Sort */,
                group: 'sortBy',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.viewSorting = "duration" /* TestExplorerViewSorting.ByDuration */;
    }
}
export class ShowMostRecentOutputAction extends Action2 {
    constructor() {
        super({
            id: "testing.showMostRecentOutput" /* TestCommandId.ShowMostRecentOutputAction */,
            title: localize2('testing.showMostRecentOutput', 'Show Output'),
            category,
            icon: Codicon.terminal,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
            },
            precondition: TestingContextKeys.hasAnyResults.isEqualTo(true),
            menu: [{
                    id: MenuId.ViewTitle,
                    order: 16 /* ActionOrder.Collapse */,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */),
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true)
                }]
        });
    }
    async run(accessor) {
        const viewService = accessor.get(IViewsService);
        const testView = await viewService.openView("workbench.panel.testResults.view" /* Testing.ResultsViewId */, true);
        testView?.showLatestRun();
    }
}
export class CollapseAllAction extends ViewAction {
    constructor() {
        super({
            id: "testing.collapseAll" /* TestCommandId.CollapseAllAction */,
            viewId: "workbench.view.testing" /* Testing.ExplorerViewId */,
            title: localize2('testing.collapseAll', 'Collapse All Tests'),
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                order: 16 /* ActionOrder.Collapse */,
                group: 'displayAction',
                when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
            }
        });
    }
    /**
     * @override
     */
    runInView(_accessor, view) {
        view.viewModel.collapseAll();
    }
}
export class ClearTestResultsAction extends Action2 {
    constructor() {
        super({
            id: "testing.clearTestResults" /* TestCommandId.ClearTestResultsAction */,
            title: localize2('testing.clearResults', 'Clear All Results'),
            category,
            icon: Codicon.clearAll,
            menu: [{
                    id: MenuId.TestPeekTitle,
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                }, {
                    id: MenuId.ViewTitle,
                    order: 17 /* ActionOrder.ClearResults */,
                    group: 'displayAction',
                    when: ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */)
                }, {
                    id: MenuId.ViewTitle,
                    order: 17 /* ActionOrder.ClearResults */,
                    group: 'navigation',
                    when: ContextKeyExpr.equals('view', "workbench.panel.testResults.view" /* Testing.ResultsViewId */)
                }],
        });
    }
    /**
     * @override
     */
    run(accessor) {
        accessor.get(ITestResultService).clear();
    }
}
export class GoToTest extends Action2 {
    constructor() {
        super({
            id: "testing.editFocusedTest" /* TestCommandId.GoToTest */,
            title: localize2('testing.editFocusedTest', 'Go to Test'),
            icon: Codicon.goToFile,
            menu: {
                id: MenuId.TestItem,
                group: 'builtin@1',
                order: 20 /* ActionOrder.GoToTest */,
                when: TestingContextKeys.testItemHasUri.isEqualTo(true),
            },
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                when: FocusedViewContext.isEqualTo("workbench.view.testing" /* Testing.ExplorerViewId */),
                primary: 3 /* KeyCode.Enter */ | 512 /* KeyMod.Alt */,
            },
        });
    }
    async run(accessor, element, preserveFocus) {
        if (!element) {
            const view = accessor.get(IViewsService).getActiveViewWithId("workbench.view.testing" /* Testing.ExplorerViewId */);
            element = view?.focusedTreeElements[0];
        }
        if (element && element instanceof TestItemTreeElement) {
            accessor.get(ICommandService).executeCommand('vscode.revealTest', element.test.item.extId, preserveFocus);
        }
    }
}
async function getTestsAtCursor(testService, uriIdentityService, uri, position, filter) {
    // testsInFile will descend in the test tree. We assume that as we go
    // deeper, ranges get more specific. We'll want to run all tests whose
    // range is equal to the most specific range we find (see #133519)
    //
    // If we don't find any test whose range contains the position, we pick
    // the closest one before the position. Again, if we find several tests
    // whose range is equal to the closest one, we run them all.
    let bestNodes = [];
    let bestRange;
    let bestNodesBefore = [];
    let bestRangeBefore;
    for await (const test of testsInFile(testService, uriIdentityService, uri)) {
        if (!test.item.range || filter?.(test) === false) {
            continue;
        }
        const irange = Range.lift(test.item.range);
        if (irange.containsPosition(position)) {
            if (bestRange && Range.equalsRange(test.item.range, bestRange)) {
                // check that a parent isn't already included (#180760)
                if (!bestNodes.some(b => TestId.isChild(b.item.extId, test.item.extId))) {
                    bestNodes.push(test);
                }
            }
            else {
                bestRange = irange;
                bestNodes = [test];
            }
        }
        else if (Position.isBefore(irange.getStartPosition(), position)) {
            if (!bestRangeBefore || bestRangeBefore.getStartPosition().isBefore(irange.getStartPosition())) {
                bestRangeBefore = irange;
                bestNodesBefore = [test];
            }
            else if (irange.equalsRange(bestRangeBefore) && !bestNodesBefore.some(b => TestId.isChild(b.item.extId, test.item.extId))) {
                bestNodesBefore.push(test);
            }
        }
    }
    return bestNodes.length ? bestNodes : bestNodesBefore;
}
var EditorContextOrder;
(function (EditorContextOrder) {
    EditorContextOrder[EditorContextOrder["RunAtCursor"] = 0] = "RunAtCursor";
    EditorContextOrder[EditorContextOrder["DebugAtCursor"] = 1] = "DebugAtCursor";
    EditorContextOrder[EditorContextOrder["RunInFile"] = 2] = "RunInFile";
    EditorContextOrder[EditorContextOrder["DebugInFile"] = 3] = "DebugInFile";
    EditorContextOrder[EditorContextOrder["GoToRelated"] = 4] = "GoToRelated";
    EditorContextOrder[EditorContextOrder["PeekRelated"] = 5] = "PeekRelated";
})(EditorContextOrder || (EditorContextOrder = {}));
class ExecuteTestAtCursor extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: hasAnyTestProvider,
                }, {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: group === 2 /* TestRunProfileBitset.Run */ ? 0 /* EditorContextOrder.RunAtCursor */ : 1 /* EditorContextOrder.DebugAtCursor */,
                    when: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.capabilityToContextKey[group]),
                }]
        });
        this.group = group;
    }
    /**
     * @override
     */
    async run(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        let editor = codeEditorService.getActiveCodeEditor();
        if (!activeEditorPane || !editor) {
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        const position = editor?.getPosition();
        const model = editor?.getModel();
        if (!position || !model || !('uri' in model)) {
            return;
        }
        const testService = accessor.get(ITestService);
        const profileService = accessor.get(ITestProfileService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const progressService = accessor.get(IProgressService);
        const configurationService = accessor.get(IConfigurationService);
        const saveBeforeTest = getTestingConfiguration(configurationService, "testing.saveBeforeTest" /* TestingConfigKeys.SaveBeforeTest */);
        if (saveBeforeTest) {
            await editorService.save({ editor: activeEditorPane.input, groupId: activeEditorPane.group.id });
            await testService.syncTests();
        }
        // testsInFile will descend in the test tree. We assume that as we go
        // deeper, ranges get more specific. We'll want to run all tests whose
        // range is equal to the most specific range we find (see #133519)
        //
        // If we don't find any test whose range contains the position, we pick
        // the closest one before the position. Again, if we find several tests
        // whose range is equal to the closest one, we run them all.
        const testsToRun = await showDiscoveringWhile(progressService, getTestsAtCursor(testService, uriIdentityService, model.uri, position, test => !!(profileService.capabilitiesForTest(test.item) & this.group)));
        if (testsToRun.length) {
            await testService.runTests({ group: this.group, tests: testsToRun });
            return;
        }
        const relatedTests = await testService.getTestsRelatedToCode(model.uri, position);
        if (relatedTests.length) {
            await testService.runTests({ group: this.group, tests: relatedTests });
            return;
        }
        if (editor) {
            MessageController.get(editor)?.showMessage(localize('noTestsAtCursor', "No tests found here"), position);
        }
    }
}
export class RunAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.runAtCursor" /* TestCommandId.RunAtCursor */,
            title: localize2('testing.runAtCursor', 'Run Test at Cursor'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 33 /* KeyCode.KeyC */),
            },
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.debugAtCursor" /* TestCommandId.DebugAtCursor */,
            title: localize2('testing.debugAtCursor', 'Debug Test at Cursor'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */),
            },
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageAtCursor extends ExecuteTestAtCursor {
    constructor() {
        super({
            id: "testing.coverageAtCursor" /* TestCommandId.CoverageAtCursor */,
            title: localize2('testing.coverageAtCursor', 'Run Test at Cursor with Coverage'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
class ExecuteTestsUnderUriAction extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.ExplorerContext,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                    group: '6.5_testing',
                    order: (group === 2 /* TestRunProfileBitset.Run */ ? 11 /* ActionOrder.Run */ : 12 /* ActionOrder.Debug */) + 0.1,
                }],
        });
        this.group = group;
    }
    async run(accessor, uri) {
        const testService = accessor.get(ITestService);
        const notificationService = accessor.get(INotificationService);
        const tests = await Iterable.asyncToArray(testsUnderUri(testService, accessor.get(IUriIdentityService), uri));
        if (!tests.length) {
            notificationService.notify({ message: localize('noTests', 'No tests found in the selected file or folder'), severity: Severity.Info });
            return;
        }
        return testService.runTests({ tests, group: this.group });
    }
}
class RunTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.run.uri" /* TestCommandId.RunByUri */,
            title: LABEL_RUN_TESTS,
            category,
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
class DebugTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.debug.uri" /* TestCommandId.DebugByUri */,
            title: LABEL_DEBUG_TESTS,
            category,
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
class CoverageTestsUnderUri extends ExecuteTestsUnderUriAction {
    constructor() {
        super({
            id: "testing.coverage.uri" /* TestCommandId.CoverageByUri */,
            title: LABEL_COVERAGE_TESTS,
            category,
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
class ExecuteTestsInCurrentFile extends Action2 {
    constructor(options, group) {
        super({
            ...options,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.capabilityToContextKey[group].isEqualTo(true),
                }, {
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: group === 2 /* TestRunProfileBitset.Run */ ? 2 /* EditorContextOrder.RunInFile */ : 3 /* EditorContextOrder.DebugInFile */,
                    when: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.capabilityToContextKey[group]),
                }],
        });
        this.group = group;
    }
    /**
     * @override
     */
    run(accessor) {
        let editor = accessor.get(ICodeEditorService).getActiveCodeEditor();
        if (!editor) {
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        const position = editor?.getPosition();
        const model = editor?.getModel();
        if (!position || !model || !('uri' in model)) {
            return;
        }
        const testService = accessor.get(ITestService);
        const demandedUri = model.uri.toString();
        // Iterate through the entire collection and run any tests that are in the
        // uri. See #138007.
        const queue = [testService.collection.rootIds];
        const discovered = [];
        while (queue.length) {
            for (const id of queue.pop()) {
                const node = testService.collection.getNodeById(id);
                if (node.item.uri?.toString() === demandedUri) {
                    discovered.push(node);
                }
                else {
                    queue.push(node.children);
                }
            }
        }
        if (discovered.length) {
            return testService.runTests({
                tests: discovered,
                group: this.group,
            });
        }
        if (editor) {
            MessageController.get(editor)?.showMessage(localize('noTestsInFile', "No tests found in this file"), position);
        }
        return undefined;
    }
}
export class RunCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.runCurrentFile" /* TestCommandId.RunCurrentFile */,
            title: localize2('testing.runCurrentFile', 'Run Tests in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 36 /* KeyCode.KeyF */),
            },
        }, 2 /* TestRunProfileBitset.Run */);
    }
}
export class DebugCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.debugCurrentFile" /* TestCommandId.DebugCurrentFile */,
            title: localize2('testing.debugCurrentFile', 'Debug Tests in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */),
            },
        }, 4 /* TestRunProfileBitset.Debug */);
    }
}
export class CoverageCurrentFile extends ExecuteTestsInCurrentFile {
    constructor() {
        super({
            id: "testing.coverageCurrentFile" /* TestCommandId.CoverageCurrentFile */,
            title: localize2('testing.coverageCurrentFile', 'Run Tests with Coverage in Current File'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */),
            },
        }, 8 /* TestRunProfileBitset.Coverage */);
    }
}
export const discoverAndRunTests = async (collection, progress, ids, runTests) => {
    const todo = Promise.all(ids.map(p => expandAndGetTestById(collection, p)));
    const tests = (await showDiscoveringWhile(progress, todo)).filter(isDefined);
    return tests.length ? await runTests(tests) : undefined;
};
class RunOrDebugExtsByPath extends Action2 {
    /**
     * @override
     */
    async run(accessor, ...args) {
        const testService = accessor.get(ITestService);
        await discoverAndRunTests(accessor.get(ITestService).collection, accessor.get(IProgressService), [...this.getTestExtIdsToRun(accessor, ...args)], tests => this.runTest(testService, tests));
    }
}
class RunOrDebugFailedTests extends RunOrDebugExtsByPath {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: hasAnyTestProvider,
            },
        });
    }
    /**
     * @inheritdoc
     */
    getTestExtIdsToRun(accessor) {
        const { results } = accessor.get(ITestResultService);
        const ids = new Set();
        for (let i = results.length - 1; i >= 0; i--) {
            const resultSet = results[i];
            for (const test of resultSet.tests) {
                if (isFailedState(test.ownComputedState)) {
                    ids.add(test.item.extId);
                }
                else {
                    ids.delete(test.item.extId);
                }
            }
        }
        return ids;
    }
}
class RunOrDebugLastRun extends Action2 {
    constructor(options) {
        super({
            ...options,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(hasAnyTestProvider, TestingContextKeys.hasAnyResults.isEqualTo(true)),
            },
        });
    }
    getLastTestRunRequest(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const lastResult = runId ? resultService.results.find(r => r.id === runId) : resultService.results[0];
        return lastResult?.request;
    }
    /** @inheritdoc */
    async run(accessor, runId) {
        const resultService = accessor.get(ITestResultService);
        const lastResult = runId ? resultService.results.find(r => r.id === runId) : resultService.results[0];
        if (!lastResult) {
            return;
        }
        const req = lastResult.request;
        const testService = accessor.get(ITestService);
        const profileService = accessor.get(ITestProfileService);
        const profileExists = (t) => profileService.getControllerProfiles(t.controllerId).some(p => p.profileId === t.profileId);
        await discoverAndRunTests(testService.collection, accessor.get(IProgressService), req.targets.flatMap(t => t.testIds), tests => {
            // If we're requesting a re-run in the same group and have the same profiles
            // as were used before, then use those exactly. Otherwise guess naively.
            if (this.getGroup() & req.group && req.targets.every(profileExists)) {
                return testService.runResolvedTests({
                    targets: req.targets,
                    group: req.group,
                    exclude: req.exclude,
                });
            }
            else {
                return testService.runTests({ tests, group: this.getGroup() });
            }
        });
    }
}
export class ReRunFailedTests extends RunOrDebugFailedTests {
    constructor() {
        super({
            id: "testing.reRunFailTests" /* TestCommandId.ReRunFailedTests */,
            title: localize2('testing.reRunFailTests', 'Rerun Failed Tests'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 35 /* KeyCode.KeyE */),
            },
        });
    }
    runTest(service, internalTests) {
        return service.runTests({
            group: 2 /* TestRunProfileBitset.Run */,
            tests: internalTests,
        });
    }
}
export class DebugFailedTests extends RunOrDebugFailedTests {
    constructor() {
        super({
            id: "testing.debugFailTests" /* TestCommandId.DebugFailedTests */,
            title: localize2('testing.debugFailTests', 'Debug Failed Tests'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */),
            },
        });
    }
    runTest(service, internalTests) {
        return service.runTests({
            group: 4 /* TestRunProfileBitset.Debug */,
            tests: internalTests,
        });
    }
}
export class ReRunLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.reRunLastRun" /* TestCommandId.ReRunLastRun */,
            title: localize2('testing.reRunLastRun', 'Rerun Last Run'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 2 /* TestRunProfileBitset.Run */;
    }
}
export class DebugLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.debugLastRun" /* TestCommandId.DebugLastRun */,
            title: localize2('testing.debugLastRun', 'Debug Last Run'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 4 /* TestRunProfileBitset.Debug */;
    }
}
export class CoverageLastRun extends RunOrDebugLastRun {
    constructor() {
        super({
            id: "testing.coverageLastRun" /* TestCommandId.CoverageLastRun */,
            title: localize2('testing.coverageLastRun', 'Rerun Last Run with Coverage'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */),
            },
        });
    }
    getGroup() {
        return 8 /* TestRunProfileBitset.Coverage */;
    }
}
export class SearchForTestExtension extends Action2 {
    constructor() {
        super({
            id: "testing.searchForTestExtension" /* TestCommandId.SearchForTestExtension */,
            title: localize2('testing.searchForTestExtension', 'Search for Test Extension'),
        });
    }
    async run(accessor) {
        accessor.get(IExtensionsWorkbenchService).openSearch('@category:"testing"');
    }
}
export class OpenOutputPeek extends Action2 {
    constructor() {
        super({
            id: "testing.openOutputPeek" /* TestCommandId.OpenOutputPeek */,
            title: localize2('testing.openOutputPeek', 'Peek Output'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 43 /* KeyCode.KeyM */),
            },
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasAnyResults.isEqualTo(true),
            },
        });
    }
    async run(accessor) {
        accessor.get(ITestingPeekOpener).open();
    }
}
export class ToggleInlineTestOutput extends Action2 {
    constructor() {
        super({
            id: "testing.toggleInlineTestOutput" /* TestCommandId.ToggleInlineTestOutput */,
            title: localize2('testing.toggleInlineTestOutput', 'Toggle Inline Test Output'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            },
            menu: {
                id: MenuId.CommandPalette,
                when: TestingContextKeys.hasAnyResults.isEqualTo(true),
            },
        });
    }
    async run(accessor) {
        const testService = accessor.get(ITestService);
        testService.showInlineOutput.value = !testService.showInlineOutput.value;
    }
}
const refreshMenus = (whenIsRefreshing) => [
    {
        id: MenuId.TestItem,
        group: 'inline',
        order: 10 /* ActionOrder.Refresh */,
        when: ContextKeyExpr.and(TestingContextKeys.canRefreshTests.isEqualTo(true), TestingContextKeys.isRefreshingTests.isEqualTo(whenIsRefreshing)),
    },
    {
        id: MenuId.ViewTitle,
        group: 'navigation',
        order: 10 /* ActionOrder.Refresh */,
        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', "workbench.view.testing" /* Testing.ExplorerViewId */), TestingContextKeys.canRefreshTests.isEqualTo(true), TestingContextKeys.isRefreshingTests.isEqualTo(whenIsRefreshing)),
    },
    {
        id: MenuId.CommandPalette,
        when: TestingContextKeys.canRefreshTests.isEqualTo(true),
    },
];
export class RefreshTestsAction extends Action2 {
    constructor() {
        super({
            id: "testing.refreshTests" /* TestCommandId.RefreshTestsAction */,
            title: localize2('testing.refreshTests', 'Refresh Tests'),
            category,
            icon: icons.testingRefreshTests,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 85 /* KeyCode.Semicolon */, 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */),
                when: TestingContextKeys.canRefreshTests.isEqualTo(true),
            },
            menu: refreshMenus(false),
        });
    }
    async run(accessor, ...elements) {
        const testService = accessor.get(ITestService);
        const progressService = accessor.get(IProgressService);
        const controllerIds = distinct(elements.filter(isDefined).map(e => e.test.controllerId));
        return progressService.withProgress({ location: "workbench.view.extension.test" /* Testing.ViewletId */ }, async () => {
            if (controllerIds.length) {
                await Promise.all(controllerIds.map(id => testService.refreshTests(id)));
            }
            else {
                await testService.refreshTests();
            }
        });
    }
}
export class CancelTestRefreshAction extends Action2 {
    constructor() {
        super({
            id: "testing.cancelTestRefresh" /* TestCommandId.CancelTestRefreshAction */,
            title: localize2('testing.cancelTestRefresh', 'Cancel Test Refresh'),
            category,
            icon: icons.testingCancelRefreshTests,
            menu: refreshMenus(true),
        });
    }
    async run(accessor) {
        accessor.get(ITestService).cancelRefreshTests();
    }
}
export class CleareCoverage extends Action2 {
    constructor() {
        super({
            id: "testing.coverage.close" /* TestCommandId.CoverageClear */,
            title: localize2('testing.clearCoverage', 'Clear Coverage'),
            icon: widgetClose,
            category,
            menu: [{
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 10 /* ActionOrder.Refresh */,
                    when: ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */)
                }, {
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.isTestCoverageOpen.isEqualTo(true),
                }]
        });
    }
    run(accessor) {
        accessor.get(ITestCoverageService).closeCoverage();
    }
}
export class OpenCoverage extends Action2 {
    constructor() {
        super({
            id: "testing.openCoverage" /* TestCommandId.OpenCoverage */,
            title: localize2('testing.openCoverage', 'Open Coverage'),
            category,
            menu: [{
                    id: MenuId.CommandPalette,
                    when: TestingContextKeys.hasAnyResults.isEqualTo(true),
                }]
        });
    }
    run(accessor) {
        const results = accessor.get(ITestResultService).results;
        const task = results.length && results[0].tasks.find(r => r.coverage);
        if (!task) {
            const notificationService = accessor.get(INotificationService);
            notificationService.info(localize('testing.noCoverage', 'No coverage information available on the last test run.'));
            return;
        }
        accessor.get(ITestCoverageService).openCoverage(task, true);
    }
}
class TestNavigationAction extends SymbolNavigationAction {
    runEditorCommand(accessor, editor, ...args) {
        this.testService = accessor.get(ITestService);
        this.uriIdentityService = accessor.get(IUriIdentityService);
        return super.runEditorCommand(accessor, editor, ...args);
    }
    _getAlternativeCommand(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).alternativeTestsCommand;
    }
    _getGoToPreference(editor) {
        return editor.getOption(60 /* EditorOption.gotoLocation */).multipleTests || 'peek';
    }
}
class GoToRelatedTestAction extends TestNavigationAction {
    async _getLocationModel(_languageFeaturesService, model, position, token) {
        const tests = await this.testService.getTestsRelatedToCode(model.uri, position, token);
        return new ReferencesModel(tests.map(t => t.item.uri && ({ uri: t.item.uri, range: t.item.range || new Range(1, 1, 1, 1) })).filter(isDefined), localize('relatedTests', 'Related Tests'));
    }
    _getNoResultFoundMessage() {
        return localize('noTestFound', 'No related tests found.');
    }
}
class GoToRelatedTest extends GoToRelatedTestAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: "testing.goToRelatedTest" /* TestCommandId.GoToRelatedTest */,
            title: localize2('testing.goToRelatedTest', 'Go to Related Test'),
            category,
            precondition: ContextKeyExpr.and(
            // todo@connor4312: make this more explicit based on cursor position
            ContextKeyExpr.not(TestingContextKeys.activeEditorHasTests.key), TestingContextKeys.canGoToRelatedTest),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 4 /* EditorContextOrder.GoToRelated */,
                }]
        });
    }
}
class PeekRelatedTest extends GoToRelatedTestAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: "testing.peekRelatedTest" /* TestCommandId.PeekRelatedTest */,
            title: localize2('testing.peekToRelatedTest', 'Peek Related Test'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.canGoToRelatedTest, 
            // todo@connor4312: make this more explicit based on cursor position
            ContextKeyExpr.not(TestingContextKeys.activeEditorHasTests.key), PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 5 /* EditorContextOrder.PeekRelated */,
                }]
        });
    }
}
class GoToRelatedCodeAction extends TestNavigationAction {
    async _getLocationModel(_languageFeaturesService, model, position, token) {
        const testsAtCursor = await getTestsAtCursor(this.testService, this.uriIdentityService, model.uri, position);
        const code = await Promise.all(testsAtCursor.map(t => this.testService.getCodeRelatedToTest(t)));
        return new ReferencesModel(code.flat(), localize('relatedCode', 'Related Code'));
    }
    _getNoResultFoundMessage() {
        return localize('noRelatedCode', 'No related code found.');
    }
}
class GoToRelatedCode extends GoToRelatedCodeAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: false,
            muteMessage: false
        }, {
            id: "testing.goToRelatedCode" /* TestCommandId.GoToRelatedCode */,
            title: localize2('testing.goToRelatedCode', 'Go to Related Code'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.canGoToRelatedCode),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 4 /* EditorContextOrder.GoToRelated */,
                }]
        });
    }
}
class PeekRelatedCode extends GoToRelatedCodeAction {
    constructor() {
        super({
            openToSide: false,
            openInPeek: true,
            muteMessage: false
        }, {
            id: "testing.peekRelatedCode" /* TestCommandId.PeekRelatedCode */,
            title: localize2('testing.peekToRelatedCode', 'Peek Related Code'),
            category,
            precondition: ContextKeyExpr.and(TestingContextKeys.activeEditorHasTests, TestingContextKeys.canGoToRelatedCode, PeekContext.notInPeekEditor, EditorContextKeys.isInEmbeddedEditor.toNegated()),
            menu: [{
                    id: MenuId.EditorContext,
                    group: 'testing',
                    order: 5 /* EditorContextOrder.PeekRelated */,
                }]
        });
    }
}
export const allTestActions = [
    CancelTestRefreshAction,
    CancelTestRunAction,
    CleareCoverage,
    ClearTestResultsAction,
    CollapseAllAction,
    ConfigureTestProfilesAction,
    ContinuousRunTestAction,
    ContinuousRunUsingProfileTestAction,
    CoverageAction,
    CoverageAllAction,
    CoverageAtCursor,
    CoverageCurrentFile,
    CoverageLastRun,
    CoverageSelectedAction,
    CoverageTestsUnderUri,
    DebugAction,
    DebugAllAction,
    DebugAtCursor,
    DebugCurrentFile,
    DebugFailedTests,
    DebugLastRun,
    DebugSelectedAction,
    DebugTestsUnderUri,
    GetExplorerSelection,
    GetSelectedProfiles,
    GoToRelatedCode,
    GoToRelatedTest,
    GoToTest,
    HideTestAction,
    OpenCoverage,
    OpenOutputPeek,
    PeekRelatedCode,
    PeekRelatedTest,
    RefreshTestsAction,
    ReRunFailedTests,
    ReRunLastRun,
    RunAction,
    RunAllAction,
    RunAtCursor,
    RunCurrentFile,
    RunSelectedAction,
    RunTestsUnderUri,
    RunUsingProfileAction,
    SearchForTestExtension,
    SelectDefaultTestProfiles,
    ShowMostRecentOutputAction,
    StartContinuousRunAction,
    StopContinuousRunAction,
    TestingSortByDurationAction,
    TestingSortByLocationAction,
    TestingSortByStatusAction,
    TestingViewAsListAction,
    TestingViewAsTreeAction,
    ToggleInlineTestOutput,
    UnhideAllTestsAction,
    UnhideTestAction,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvdGVzdEV4cGxvcmVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFFcEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RGLE9B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