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
import { localize, localize2 } from '../../../../nls.js';
import { GettingStartedInputSerializer, GettingStartedPage, inWelcomeContext } from './gettingStarted.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IWalkthroughsService } from './gettingStartedService.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { StartupPageEditorResolverContribution, StartupPageRunnerContribution } from './startupPage.js';
import { ExtensionsInput } from '../../extensions/common/extensionsInput.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { GettingStartedAccessibleView } from './gettingStartedAccessibleView.js';
export * as icons from './gettingStartedIcons.js';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openWalkthrough',
            title: localize2('miWelcome', 'Welcome'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 1,
            },
            metadata: {
                description: localize2('minWelcomeDescription', 'Opens a Walkthrough to help you get started in VS Code.')
            }
        });
    }
    run(accessor, walkthroughID, optionsOrToSide) {
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const instantiationService = accessor.get(IInstantiationService);
        const editorService = accessor.get(IEditorService);
        const commandService = accessor.get(ICommandService);
        const toSide = typeof optionsOrToSide === 'object' ? optionsOrToSide.toSide : optionsOrToSide;
        const inactive = typeof optionsOrToSide === 'object' ? optionsOrToSide.inactive : false;
        if (walkthroughID) {
            const selectedCategory = typeof walkthroughID === 'string' ? walkthroughID : walkthroughID.category;
            let selectedStep;
            if (typeof walkthroughID === 'object' && 'category' in walkthroughID && 'step' in walkthroughID) {
                selectedStep = `${walkthroughID.category}#${walkthroughID.step}`;
            }
            else {
                selectedStep = undefined;
            }
            // We're trying to open the welcome page from the Help menu
            if (!selectedCategory && !selectedStep) {
                editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options: { preserveFocus: toSide ?? false, inactive }
                }, toSide ? SIDE_GROUP : undefined);
                return;
            }
            // Try first to select the walkthrough on an active welcome page with no selected walkthrough
            for (const group of editorGroupsService.groups) {
                if (group.activeEditor instanceof GettingStartedInput) {
                    const activeEditor = group.activeEditor;
                    activeEditor.showWelcome = false;
                    group.activeEditorPane.makeCategoryVisibleWhenAvailable(selectedCategory, selectedStep);
                    return;
                }
            }
            // Otherwise, try to find a welcome input somewhere with no selected walkthrough, and open it to this one.
            const result = editorService.findEditors({ typeId: GettingStartedInput.ID, editorId: undefined, resource: GettingStartedInput.RESOURCE });
            for (const { editor, groupId } of result) {
                if (editor instanceof GettingStartedInput) {
                    const group = editorGroupsService.getGroup(groupId);
                    if (!editor.selectedCategory && group) {
                        editor.selectedCategory = selectedCategory;
                        editor.selectedStep = selectedStep;
                        editor.showWelcome = false;
                        group.openEditor(editor, { revealIfOpened: true, inactive });
                        return;
                    }
                }
            }
            const activeEditor = editorService.activeEditor;
            // If the walkthrough is already open just reveal the step
            if (selectedStep && activeEditor instanceof GettingStartedInput && activeEditor.selectedCategory === selectedCategory) {
                activeEditor.showWelcome = false;
                commandService.executeCommand('walkthroughs.selectStep', selectedStep);
                return;
            }
            // If it's the extension install page then lets replace it with the getting started page
            if (activeEditor instanceof ExtensionsInput) {
                const activeGroup = editorGroupsService.activeGroup;
                activeGroup.replaceEditors([{
                        editor: activeEditor,
                        replacement: instantiationService.createInstance(GettingStartedInput, { selectedCategory: selectedCategory, selectedStep: selectedStep, showWelcome: false })
                    }]);
            }
            else {
                // else open respecting toSide
                const options = { selectedCategory: selectedCategory, selectedStep: selectedStep, showWelcome: false, preserveFocus: toSide ?? false, inactive };
                editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options
                }, toSide ? SIDE_GROUP : undefined).then((editor) => {
                    editor?.makeCategoryVisibleWhenAvailable(selectedCategory, selectedStep);
                });
            }
        }
        else {
            editorService.openEditor({
                resource: GettingStartedInput.RESOURCE,
                options: { preserveFocus: toSide ?? false, inactive }
            }, toSide ? SIDE_GROUP : undefined);
        }
    }
});
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(GettingStartedInput.ID, GettingStartedInputSerializer);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(GettingStartedPage, GettingStartedPage.ID, localize('welcome', "Welcome")), [
    new SyncDescriptor(GettingStartedInput)
]);
const category = localize2('welcome', "Welcome");
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.goBack',
            title: localize2('welcome.goBack', 'Go Back'),
            category,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: inWelcomeContext
            },
            precondition: ContextKeyExpr.equals('activeEditor', 'gettingStartedPage'),
            f1: true
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorPane = editorService.activeEditorPane;
        if (editorPane instanceof GettingStartedPage) {
            editorPane.escape();
        }
    }
});
CommandsRegistry.registerCommand({
    id: 'walkthroughs.selectStep',
    handler: (accessor, stepID) => {
        const editorService = accessor.get(IEditorService);
        const editorPane = editorService.activeEditorPane;
        if (editorPane instanceof GettingStartedPage) {
            editorPane.selectStepLoose(stepID);
        }
        else {
            console.error('Cannot run walkthroughs.selectStep outside of walkthrough context');
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.markStepComplete',
            title: localize('welcome.markStepComplete', "Mark Step Complete"),
            category,
        });
    }
    run(accessor, arg) {
        if (!arg) {
            return;
        }
        const gettingStartedService = accessor.get(IWalkthroughsService);
        gettingStartedService.progressStep(arg);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.markStepIncomplete',
            title: localize('welcome.markStepInomplete', "Mark Step Incomplete"),
            category,
        });
    }
    run(accessor, arg) {
        if (!arg) {
            return;
        }
        const gettingStartedService = accessor.get(IWalkthroughsService);
        gettingStartedService.deprogressStep(arg);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'welcome.showAllWalkthroughs',
            title: localize2('welcome.showAllWalkthroughs', 'Open Walkthrough...'),
            category,
            f1: true,
        });
    }
    async getQuickPickItems(contextService, gettingStartedService) {
        const categories = await gettingStartedService.getWalkthroughs();
        return categories
            .filter(c => contextService.contextMatchesRules(c.when))
            .map(x => ({
            id: x.id,
            label: x.title,
            detail: x.description,
            description: x.source,
        }));
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const contextService = accessor.get(IContextKeyService);
        const quickInputService = accessor.get(IQuickInputService);
        const gettingStartedService = accessor.get(IWalkthroughsService);
        const extensionService = accessor.get(IExtensionService);
        const disposables = new DisposableStore();
        const quickPick = disposables.add(quickInputService.createQuickPick());
        quickPick.canSelectMany = false;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.placeholder = localize('pickWalkthroughs', 'Select a walkthrough to open');
        quickPick.items = await this.getQuickPickItems(contextService, gettingStartedService);
        quickPick.busy = true;
        disposables.add(quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0];
            if (selection) {
                commandService.executeCommand('workbench.action.openWalkthrough', selection.id);
            }
            quickPick.hide();
        }));
        disposables.add(quickPick.onDidHide(() => disposables.dispose()));
        await extensionService.whenInstalledExtensionsRegistered();
        gettingStartedService.onDidAddWalkthrough(async () => {
            quickPick.items = await this.getQuickPickItems(contextService, gettingStartedService);
        });
        quickPick.show();
        quickPick.busy = false;
    }
});
export const WorkspacePlatform = new RawContextKey('workspacePlatform', undefined, localize('workspacePlatform', "The platform of the current workspace, which in remote or serverless contexts may be different from the platform of the UI"));
let WorkspacePlatformContribution = class WorkspacePlatformContribution {
    static { this.ID = 'workbench.contrib.workspacePlatform'; }
    constructor(extensionManagementServerService, remoteAgentService, contextService) {
        this.extensionManagementServerService = extensionManagementServerService;
        this.remoteAgentService = remoteAgentService;
        this.contextService = contextService;
        this.remoteAgentService.getEnvironment().then(env => {
            const remoteOS = env?.os;
            const remotePlatform = remoteOS === 2 /* OS.Macintosh */ ? 'mac'
                : remoteOS === 1 /* OS.Windows */ ? 'windows'
                    : remoteOS === 3 /* OS.Linux */ ? 'linux'
                        : undefined;
            if (remotePlatform) {
                WorkspacePlatform.bindTo(this.contextService).set(remotePlatform);
            }
            else if (this.extensionManagementServerService.localExtensionManagementServer) {
                if (isMacintosh) {
                    WorkspacePlatform.bindTo(this.contextService).set('mac');
                }
                else if (isLinux) {
                    WorkspacePlatform.bindTo(this.contextService).set('linux');
                }
                else if (isWindows) {
                    WorkspacePlatform.bindTo(this.contextService).set('windows');
                }
            }
            else if (this.extensionManagementServerService.webExtensionManagementServer) {
                WorkspacePlatform.bindTo(this.contextService).set('webworker');
            }
            else {
                console.error('Error: Unable to detect workspace platform');
            }
        });
    }
};
WorkspacePlatformContribution = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IRemoteAgentService),
    __param(2, IContextKeyService)
], WorkspacePlatformContribution);
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    ...workbenchConfigurationNodeBase,
    properties: {
        'workbench.welcomePage.walkthroughs.openOnInstall': {
            scope: 2 /* ConfigurationScope.MACHINE */,
            type: 'boolean',
            default: true,
            description: localize('workbench.welcomePage.walkthroughs.openOnInstall', "When enabled, an extension's walkthrough will open upon install of the extension.")
        },
        'workbench.startupEditor': {
            'scope': 5 /* ConfigurationScope.RESOURCE */,
            'type': 'string',
            'enum': ['none', 'welcomePage', 'readme', 'newUntitledFile', 'welcomePageInEmptyWorkbench', 'terminal'],
            'enumDescriptions': [
                localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'workbench.startupEditor.none' }, "Start without an editor."),
                localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'workbench.startupEditor.welcomePage' }, "Open the Welcome page, with content to aid in getting started with VS Code and extensions."),
                localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'workbench.startupEditor.readme' }, "Open the README when opening a folder that contains one, fallback to 'welcomePage' otherwise. Note: This is only observed as a global configuration, it will be ignored if set in a workspace or folder configuration."),
                localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'workbench.startupEditor.newUntitledFile' }, "Open a new untitled text file (only applies when opening an empty window)."),
                localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'workbench.startupEditor.welcomePageInEmptyWorkbench' }, "Open the Welcome page when opening an empty workbench."),
                localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'workbench.startupEditor.terminal' }, "Open a new terminal in the editor area."),
            ],
            'default': 'welcomePage',
            'description': localize('workbench.startupEditor', "Controls which editor is shown at startup, if none are restored from the previous session.")
        },
        'workbench.welcomePage.preferReducedMotion': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            deprecationMessage: localize('deprecationMessage', "Deprecated, use the global `workbench.reduceMotion`."),
            description: localize('workbench.welcomePage.preferReducedMotion', "When enabled, reduce motion in welcome page.")
        }
    }
});
registerWorkbenchContribution2(WorkspacePlatformContribution.ID, WorkspacePlatformContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(StartupPageEditorResolverContribution.ID, StartupPageEditorResolverContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(StartupPageRunnerContribution.ID, StartupPageRunnerContribution, 3 /* WorkbenchPhase.AfterRestored */);
AccessibleViewRegistry.register(new GettingStartedAccessibleView());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDMUcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRixPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6SCxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRzlGLE9BQU8sRUFBRSxvQkFBb0IsRUFBdUIsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEUsT0FBTyxFQUErQixtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVGLE9B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