/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { MenuRegistry, MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { IsMainWindowFullscreenContext } from '../../common/contextkeys.js';
import { IsMacNativeContext, IsDevelopmentContext, IsWebContext, IsIOSContext } from '../../../platform/contextkey/common/contextkeys.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { KeybindingsRegistry } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { isRecentFolder, isRecentWorkspace, IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { splitRecentLabel } from '../../../base/common/labels.js';
import { isMacintosh, isWeb, isWindows } from '../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { inQuickPickContext, getQuickNavigateHandler } from '../quickaccess.js';
import { IHostService } from '../../services/host/browser/host.js';
import { ResourceMap } from '../../../base/common/map.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { isFolderBackupInfo, isWorkspaceBackupInfo } from '../../../platform/backup/common/backup.js';
import { getActiveElement, getActiveWindow, isHTMLElement } from '../../../base/browser/dom.js';
export const inRecentFilesPickerContextKey = 'inRecentFilesPicker';
class BaseOpenRecentAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.removeFromRecentlyOpened = {
            iconClass: ThemeIcon.asClassName(Codicon.removeClose),
            tooltip: localize('remove', "Remove from Recently Opened")
        };
        this.dirtyRecentlyOpenedFolder = {
            iconClass: 'dirty-workspace ' + ThemeIcon.asClassName(Codicon.closeDirty),
            tooltip: localize('dirtyRecentlyOpenedFolder', "Folder With Unsaved Files"),
            alwaysVisible: true
        };
        this.dirtyRecentlyOpenedWorkspace = {
            ...this.dirtyRecentlyOpenedFolder,
            tooltip: localize('dirtyRecentlyOpenedWorkspace', "Workspace With Unsaved Files"),
        };
    }
    async run(accessor) {
        const workspacesService = accessor.get(IWorkspacesService);
        const quickInputService = accessor.get(IQuickInputService);
        const contextService = accessor.get(IWorkspaceContextService);
        const labelService = accessor.get(ILabelService);
        const keybindingService = accessor.get(IKeybindingService);
        const modelService = accessor.get(IModelService);
        const languageService = accessor.get(ILanguageService);
        const hostService = accessor.get(IHostService);
        const dialogService = accessor.get(IDialogService);
        const recentlyOpened = await workspacesService.getRecentlyOpened();
        const dirtyWorkspacesAndFolders = await workspacesService.getDirtyWorkspaces();
        let hasWorkspaces = false;
        // Identify all folders and workspaces with unsaved files
        const dirtyFolders = new ResourceMap();
        const dirtyWorkspaces = new ResourceMap();
        for (const dirtyWorkspace of dirtyWorkspacesAndFolders) {
            if (isFolderBackupInfo(dirtyWorkspace)) {
                dirtyFolders.set(dirtyWorkspace.folderUri, true);
            }
            else {
                dirtyWorkspaces.set(dirtyWorkspace.workspace.configPath, dirtyWorkspace.workspace);
                hasWorkspaces = true;
            }
        }
        // Identify all recently opened folders and workspaces
        const recentFolders = new ResourceMap();
        const recentWorkspaces = new ResourceMap();
        for (const recent of recentlyOpened.workspaces) {
            if (isRecentFolder(recent)) {
                recentFolders.set(recent.folderUri, true);
            }
            else {
                recentWorkspaces.set(recent.workspace.configPath, recent.workspace);
                hasWorkspaces = true;
            }
        }
        // Fill in all known recently opened workspaces
        const workspacePicks = [];
        for (const recent of recentlyOpened.workspaces) {
            const isDirty = isRecentFolder(recent) ? dirtyFolders.has(recent.folderUri) : dirtyWorkspaces.has(recent.workspace.configPath);
            workspacePicks.push(this.toQuickPick(modelService, languageService, labelService, recent, isDirty));
        }
        // Fill any backup workspace that is not yet shown at the end
        for (const dirtyWorkspaceOrFolder of dirtyWorkspacesAndFolders) {
            if (isFolderBackupInfo(dirtyWorkspaceOrFolder) && !recentFolders.has(dirtyWorkspaceOrFolder.folderUri)) {
                workspacePicks.push(this.toQuickPick(modelService, languageService, labelService, dirtyWorkspaceOrFolder, true));
            }
            else if (isWorkspaceBackupInfo(dirtyWorkspaceOrFolder) && !recentWorkspaces.has(dirtyWorkspaceOrFolder.workspace.configPath)) {
                workspacePicks.push(this.toQuickPick(modelService, languageService, labelService, dirtyWorkspaceOrFolder, true));
            }
        }
        const filePicks = recentlyOpened.files.map(p => this.toQuickPick(modelService, languageService, labelService, p, false));
        // focus second entry if the first recent workspace is the current workspace
        const firstEntry = recentlyOpened.workspaces[0];
        const autoFocusSecondEntry = firstEntry && contextService.isCurrentWorkspace(isRecentWorkspace(firstEntry) ? firstEntry.workspace : firstEntry.folderUri);
        let keyMods;
        const workspaceSeparator = { type: 'separator', label: hasWorkspaces ? localize('workspacesAndFolders', "folders & workspaces") : localize('folders', "folders") };
        const fileSeparator = { type: 'separator', label: localize('files', "files") };
        const picks = [workspaceSeparator, ...workspacePicks, fileSeparator, ...filePicks];
        const pick = await quickInputService.pick(picks, {
            contextKey: inRecentFilesPickerContextKey,
            activeItem: [...workspacePicks, ...filePicks][autoFocusSecondEntry ? 1 : 0],
            placeHolder: isMacintosh ? localize('openRecentPlaceholderMac', "Select to open (hold Cmd-key to force new window or Option-key for same window)") : localize('openRecentPlaceholder', "Select to open (hold Ctrl-key to force new window or Alt-key for same window)"),
            matchOnDescription: true,
            onKeyMods: mods => keyMods = mods,
            quickNavigate: this.isQuickNavigate() ? { keybindings: keybindingService.lookupKeybindings(this.desc.id) } : undefined,
            hideInput: this.isQuickNavigate(),
            onDidTriggerItemButton: async (context) => {
                // Remove
                if (context.button === this.removeFromRecentlyOpened) {
                    await workspacesService.removeRecentlyOpened([context.item.resource]);
                    context.removeItem();
                }
                // Dirty Folder/Workspace
                else if (context.button === this.dirtyRecentlyOpenedFolder || context.button === this.dirtyRecentlyOpenedWorkspace) {
                    const isDirtyWorkspace = context.button === this.dirtyRecentlyOpenedWorkspace;
                    const { confirmed } = await dialogService.confirm({
                        title: isDirtyWorkspace ? localize('dirtyWorkspace', "Workspace with Unsaved Files") : localize('dirtyFolder', "Folder with Unsaved Files"),
                        message: isDirtyWorkspace ? localize('dirtyWorkspaceConfirm', "Do you want to open the workspace to review the unsaved files?") : localize('dirtyFolderConfirm', "Do you want to open the folder to review the unsaved files?"),
                        detail: isDirtyWorkspace ? localize('dirtyWorkspaceConfirmDetail', "Workspaces with unsaved files cannot be removed until all unsaved files have been saved or reverted.") : localize('dirtyFolderConfirmDetail', "Folders with unsaved files cannot be removed until all unsaved files have been saved or reverted.")
                    });
                    if (confirmed) {
                        hostService.openWindow([context.item.openable], {
                            remoteAuthority: context.item.remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
                        });
                        quickInputService.cancel();
                    }
                }
            }
        });
        if (pick) {
            return hostService.openWindow([pick.openable], {
                forceNewWindow: keyMods?.ctrlCmd,
                forceReuseWindow: keyMods?.alt,
                remoteAuthority: pick.remoteAuthority || null // local window if remoteAuthority is not set or can not be deducted from the openable
            });
        }
    }
    toQuickPick(modelService, languageService, labelService, recent, isDirty) {
        let openable;
        let iconClasses;
        let fullLabel;
        let resource;
        let isWorkspace = false;
        // Folder
        if (isRecentFolder(recent)) {
            resource = recent.folderUri;
            iconClasses = getIconClasses(modelService, languageService, resource, FileKind.FOLDER);
            openable = { folderUri: resource };
            fullLabel = recent.label || labelService.getWorkspaceLabel(resource, { verbose: 2 /* Verbosity.LONG */ });
        }
        // Workspace
        else if (isRecentWorkspace(recent)) {
            resource = recent.workspace.configPath;
            iconClasses = getIconClasses(modelService, languageService, resource, FileKind.ROOT_FOLDER);
            openable = { workspaceUri: resource };
            fullLabel = recent.label || labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
            isWorkspace = true;
        }
        // File
        else {
            resource = recent.fileUri;
            iconClasses = getIconClasses(modelService, languageService, resource, FileKind.FILE);
            openable = { fileUri: resource };
            fullLabel = recent.label || labelService.getUriLabel(resource, { appendWorkspaceSuffix: true });
        }
        const { name, parentPath } = splitRecentLabel(fullLabel);
        return {
            iconClasses,
            label: name,
            ariaLabel: isDirty ? isWorkspace ? localize('recentDirtyWorkspaceAriaLabel', "{0}, workspace with unsaved changes", name) : localize('recentDirtyFolderAriaLabel', "{0}, folder with unsaved changes", name) : name,
            description: parentPath,
            buttons: isDirty ? [isWorkspace ? this.dirtyRecentlyOpenedWorkspace : this.dirtyRecentlyOpenedFolder] : [this.removeFromRecentlyOpened],
            openable,
            resource,
            remoteAuthority: recent.remoteAuthority
        };
    }
}
export class OpenRecentAction extends BaseOpenRecentAction {
    static { this.ID = 'workbench.action.openRecent'; }
    constructor() {
        super({
            id: OpenRecentAction.ID,
            title: {
                ...localize2('openRecent', "Open Recent..."),
                mnemonicTitle: localize({ key: 'miMore', comment: ['&& denotes a mnemonic'] }, "&&More..."),
            },
            category: Categories.File,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 48 /* KeyCode.KeyR */ }
            },
            menu: {
                id: MenuId.MenubarRecentMenu,
                group: 'y_more',
                order: 1
            }
        });
    }
    isQuickNavigate() {
        return false;
    }
}
class QuickPickRecentAction extends BaseOpenRecentAction {
    constructor() {
        super({
            id: 'workbench.action.quickOpenRecent',
            title: localize2('quickOpenRecent', 'Quick Open Recent...'),
            category: Categories.File,
            f1: false // hide quick pickers from command palette to not confuse with the other entry that shows a input field
        });
    }
    isQuickNavigate() {
        return true;
    }
}
class ToggleFullScreenAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleFullScreen',
            title: {
                ...localize2('toggleFullScreen', "Toggle Full Screen"),
                mnemonicTitle: localize({ key: 'miToggleFullScreen', comment: ['&& denotes a mnemonic'] }, "&&Full Screen"),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 69 /* KeyCode.F11 */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 36 /* KeyCode.KeyF */
                }
            },
            precondition: IsIOSContext.toNegated(),
            toggled: IsMainWindowFullscreenContext,
            menu: [{
                    id: MenuId.MenubarAppearanceMenu,
                    group: '1_toggle_view',
                    order: 1
                }]
        });
    }
    run(accessor) {
        const hostService = accessor.get(IHostService);
        return hostService.toggleFullScreen(getActiveWindow());
    }
}
export class ReloadWindowAction extends Action2 {
    static { this.ID = 'workbench.action.reloadWindow'; }
    constructor() {
        super({
            id: ReloadWindowAction.ID,
            title: localize2('reloadWindow', 'Reload Window'),
            category: Categories.Developer,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
                when: IsDevelopmentContext,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */
            }
        });
    }
    async run(accessor) {
        const hostService = accessor.get(IHostService);
        return hostService.reload();
    }
}
class ShowAboutDialogAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showAboutDialog',
            title: {
                ...localize2('about', "About"),
                mnemonicTitle: localize({ key: 'miAbout', comment: ['&& denotes a mnemonic'] }, "&&About"),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: 'z_about',
                order: 1,
                when: IsMacNativeContext.toNegated()
            }
        });
    }
    run(accessor) {
        const dialogService = accessor.get(IDialogService);
        return dialogService.about();
    }
}
class NewWindowAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.newWindow',
            title: {
                ...localize2('newWindow', "New Window"),
                mnemonicTitle: localize({ key: 'miNewWindow', comment: ['&& denotes a mnemonic'] }, "New &&Window"),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: isWeb ? (isWindows ? KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */) : 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */) : 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */,
                secondary: isWeb ? [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */] : undefined
            },
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '1_new',
                order: 3
            }
        });
    }
    run(accessor) {
        const hostService = accessor.get(IHostService);
        return hostService.openWindow({ remoteAuthority: null });
    }
}
class BlurAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.blur',
            title: localize2('blur', 'Remove keyboard focus from focused element')
        });
    }
    run() {
        const activeElement = getActiveElement();
        if (isHTMLElement(activeElement)) {
            activeElement.blur();
        }
    }
}
// --- Actions Registration
registerAction2(NewWindowAction);
registerAction2(ToggleFullScreenAction);
registerAction2(QuickPickRecentAction);
registerAction2(OpenRecentAction);
registerAction2(ReloadWindowAction);
registerAction2(ShowAboutDialogAction);
registerAction2(BlurAction);
// --- Commands/Keybindings Registration
const recentFilesPickerContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(inRecentFilesPickerContextKey));
const quickPickNavigateNextInRecentFilesPickerId = 'workbench.action.quickOpenNavigateNextInRecentFilesPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickPickNavigateNextInRecentFilesPickerId,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickPickNavigateNextInRecentFilesPickerId, true),
    when: recentFilesPickerContext,
    primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 48 /* KeyCode.KeyR */ }
});
const quickPickNavigatePreviousInRecentFilesPicker = 'workbench.action.quickOpenNavigatePreviousInRecentFilesPicker';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: quickPickNavigatePreviousInRecentFilesPicker,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: getQuickNavigateHandler(quickPickNavigatePreviousInRecentFilesPicker, false),
    when: recentFilesPickerContext,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */ }
});
CommandsRegistry.registerCommand('workbench.action.toggleConfirmBeforeClose', accessor => {
    const configurationService = accessor.get(IConfigurationService);
    const setting = configurationService.inspect('window.confirmBeforeClose').userValue;
    return configurationService.updateValue('window.confirmBeforeClose', setting === 'never' ? 'keyboardOnly' : 'never');
});
// --- Menu Registration
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: 'z_ConfirmClose',
    command: {
        id: 'workbench.action.toggleConfirmBeforeClose',
        title: localize('miConfirmClose', "Confirm Before Close"),
        toggled: ContextKeyExpr.notEquals('config.window.confirmBeforeClose', 'never')
    },
    order: 1,
    when: IsWebContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    title: localize({ key: 'miOpenRecent', comment: ['&& denotes a mnemonic'] }, "Open &&Recent"),
    submenu: MenuId.MenubarRecentMenu,
    group: '2_open',
    order: 4
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvd2luZG93QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRXRELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFtQixNQUFNLDZDQUE2QyxDQUFDO0FBQzlILE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0sa0NBQWtDLENBQUM7QUFDN0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxSSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ25ILE9BQU8sRUFBcUIsa0JBQWtCLEVBQWlELE1BQU0sbURBQW1ELENBQUM7QUFDekosT0FBTyxFQUFFLHdCQUF3QixFQUF3QixNQUFNLGlEQUFpRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxhQUFhLEVBQWEsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENB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