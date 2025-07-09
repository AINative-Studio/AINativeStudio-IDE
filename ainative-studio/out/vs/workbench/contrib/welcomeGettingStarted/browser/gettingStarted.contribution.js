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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sMkJBQTJCLENBQUM7QUFDckYsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUc5RixPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xFLE9BQU8sRUFBK0IsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RixP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