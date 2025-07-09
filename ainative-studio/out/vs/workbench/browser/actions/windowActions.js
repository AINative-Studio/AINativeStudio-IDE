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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL3dpbmRvd0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5SCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLGtDQUFrQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNuSCxPQUFPLEVBQXFCLGtCQUFrQixFQUFpRCxNQUFNLG1EQUFtRCxDQUFDO0FBQ3pKLE9BQU8sRUFBRSx3QkFBd0IsRUFBd0IsTUFBTSxpREFBaUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsYUFBYSxFQUFhLE1BQU0seUNBQXlDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2hGLE9BQU8sRUFBVyxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVuSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVoRyxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxxQkFBcUIsQ0FBQztBQVFuRSxNQUFlLG9CQUFxQixTQUFRLE9BQU87SUFrQmxELFlBQVksSUFBK0I7UUFDMUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBakJJLDZCQUF3QixHQUFzQjtZQUM5RCxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQ3JELE9BQU8sRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLDZCQUE2QixDQUFDO1NBQzFELENBQUM7UUFFZSw4QkFBeUIsR0FBc0I7WUFDL0QsU0FBUyxFQUFFLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUN6RSxPQUFPLEVBQUUsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDJCQUEyQixDQUFDO1lBQzNFLGFBQWEsRUFBRSxJQUFJO1NBQ25CLENBQUM7UUFFZSxpQ0FBNEIsR0FBc0I7WUFDbEUsR0FBRyxJQUFJLENBQUMseUJBQXlCO1lBQ2pDLE9BQU8sRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsOEJBQThCLENBQUM7U0FDakYsQ0FBQztJQUlGLENBQUM7SUFJUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQzVDLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM5RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDakQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVuRCxNQUFNLGNBQWMsR0FBRyxNQUFNLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDbkUsTUFBTSx5QkFBeUIsR0FBRyxNQUFNLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFFL0UsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1FBRTFCLHlEQUF5RDtRQUN6RCxNQUFNLFlBQVksR0FBRyxJQUFJLFdBQVcsRUFBVyxDQUFDO1FBQ2hELE1BQU0sZUFBZSxHQUFHLElBQUksV0FBVyxFQUF3QixDQUFDO1FBQ2hFLEtBQUssTUFBTSxjQUFjLElBQUkseUJBQXlCLEVBQUUsQ0FBQztZQUN4RCxJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLFlBQVksQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsZUFBZSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ25GLGFBQWEsR0FBRyxJQUFJLENBQUM7WUFDdEIsQ0FBQztRQUNGLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxXQUFXLEVBQVcsQ0FBQztRQUNqRCxNQUFNLGdCQUFnQixHQUFHLElBQUksV0FBVyxFQUF3QixDQUFDO1FBQ2pFLEtBQUssTUFBTSxNQUFNLElBQUksY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hELElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDcEUsYUFBYSxHQUFHLElBQUksQ0FBQztZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUVELCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBMEIsRUFBRSxDQUFDO1FBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUUvSCxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDckcsQ0FBQztRQUVELDZEQUE2RDtRQUM3RCxLQUFLLE1BQU0sc0JBQXNCLElBQUkseUJBQXlCLEVBQUUsQ0FBQztZQUNoRSxJQUFJLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hHLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2xILENBQUM7aUJBQU0sSUFBSSxxQkFBcUIsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUNoSSxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUV6SCw0RUFBNEU7UUFDNUUsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRCxNQUFNLG9CQUFvQixHQUFZLFVBQVUsSUFBSSxjQUFjLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVuSyxJQUFJLE9BQTZCLENBQUM7UUFFbEMsTUFBTSxrQkFBa0IsR0FBd0IsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDeEwsTUFBTSxhQUFhLEdBQXdCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3BHLE1BQU0sS0FBSyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxjQUFjLEVBQUUsYUFBYSxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFFbkYsTUFBTSxJQUFJLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ2hELFVBQVUsRUFBRSw2QkFBNkI7WUFDekMsVUFBVSxFQUFFLENBQUMsR0FBRyxjQUFjLEVBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0UsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGlGQUFpRixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSwrRUFBK0UsQ0FBQztZQUN2USxrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sR0FBRyxJQUFJO1lBQ2pDLGFBQWEsRUFBRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUN0SCxTQUFTLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNqQyxzQkFBc0IsRUFBRSxLQUFLLEVBQUMsT0FBTyxFQUFDLEVBQUU7Z0JBRXZDLFNBQVM7Z0JBQ1QsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO29CQUN0RCxNQUFNLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUN0RSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3RCLENBQUM7Z0JBRUQseUJBQXlCO3FCQUNwQixJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLHlCQUF5QixJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7b0JBQ3BILE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsNEJBQTRCLENBQUM7b0JBQzlFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGFBQWEsQ0FBQyxPQUFPLENBQUM7d0JBQ2pELEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsMkJBQTJCLENBQUM7d0JBQzNJLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLGdFQUFnRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw2REFBNkQsQ0FBQzt3QkFDL04sTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsc0dBQXNHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLG1HQUFtRyxDQUFDO3FCQUN0VCxDQUFDLENBQUM7b0JBRUgsSUFBSSxTQUFTLEVBQUUsQ0FBQzt3QkFDZixXQUFXLENBQUMsVUFBVSxDQUNyQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7NEJBQ3pCLGVBQWUsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsc0ZBQXNGO3lCQUM1SSxDQUFDLENBQUM7d0JBQ0gsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzVCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM5QyxjQUFjLEVBQUUsT0FBTyxFQUFFLE9BQU87Z0JBQ2hDLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxHQUFHO2dCQUM5QixlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsc0ZBQXNGO2FBQ3BJLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVyxDQUFDLFlBQTJCLEVBQUUsZUFBaUMsRUFBRSxZQUEyQixFQUFFLE1BQWUsRUFBRSxPQUFnQjtRQUNqSixJQUFJLFFBQXFDLENBQUM7UUFDMUMsSUFBSSxXQUFxQixDQUFDO1FBQzFCLElBQUksU0FBNkIsQ0FBQztRQUNsQyxJQUFJLFFBQXlCLENBQUM7UUFDOUIsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBRXhCLFNBQVM7UUFDVCxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzVCLFFBQVEsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO1lBQzVCLFdBQVcsR0FBRyxjQUFjLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZGLFFBQVEsR0FBRyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUNuQyxTQUFTLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUVELFlBQVk7YUFDUCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDcEMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3ZDLFdBQVcsR0FBRyxjQUFjLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzVGLFFBQVEsR0FBRyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsQ0FBQztZQUN0QyxTQUFTLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1lBQzFHLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDcEIsQ0FBQztRQUVELE9BQU87YUFDRixDQUFDO1lBQ0wsUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDMUIsV0FBVyxHQUFHLGNBQWMsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckYsUUFBUSxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxJQUFJLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNqRyxDQUFDO1FBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV6RCxPQUFPO1lBQ04sV0FBVztZQUNYLEtBQUssRUFBRSxJQUFJO1lBQ1gsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsK0JBQStCLEVBQUUscUNBQXFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtZQUNuTixXQUFXLEVBQUUsVUFBVTtZQUN2QixPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUM7WUFDdkksUUFBUTtZQUNSLFFBQVE7WUFDUixlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWU7U0FDdkMsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxvQkFBb0I7YUFFbEQsT0FBRSxHQUFHLDZCQUE2QixDQUFDO0lBRTFDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdCQUFnQixDQUFDLEVBQUU7WUFDdkIsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQztnQkFDNUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQzthQUMzRjtZQUNELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsSUFBSTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGdEQUE2QixFQUFFO2FBQy9DO1lBQ0QsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsaUJBQWlCO2dCQUM1QixLQUFLLEVBQUUsUUFBUTtnQkFDZixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVTLGVBQWU7UUFDeEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDOztBQUdGLE1BQU0scUJBQXNCLFNBQVEsb0JBQW9CO0lBRXZEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsU0FBUyxDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDO1lBQzNELFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTtZQUN6QixFQUFFLEVBQUUsS0FBSyxDQUFDLHVHQUF1RztTQUNqSCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVMsZUFBZTtRQUN4QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQUVELE1BQU0sc0JBQXVCLFNBQVEsT0FBTztJQUUzQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsS0FBSyxFQUFFO2dCQUNOLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDO2dCQUN0RCxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUM7YUFDM0c7WUFDRCxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLE9BQU8sc0JBQWE7Z0JBQ3BCLEdBQUcsRUFBRTtvQkFDSixPQUFPLEVBQUUsb0RBQStCLHdCQUFlO2lCQUN2RDthQUNEO1lBQ0QsWUFBWSxFQUFFLFlBQVksQ0FBQyxTQUFTLEVBQUU7WUFDdEMsT0FBTyxFQUFFLDZCQUE2QjtZQUN0QyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLHFCQUFxQjtvQkFDaEMsS0FBSyxFQUFFLGVBQWU7b0JBQ3RCLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsR0FBRyxDQUFDLFFBQTBCO1FBQ3RDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFL0MsT0FBTyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztJQUN4RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsT0FBTzthQUU5QixPQUFFLEdBQUcsK0JBQStCLENBQUM7SUFFckQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0JBQWtCLENBQUMsRUFBRTtZQUN6QixLQUFLLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7WUFDakQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtnQkFDOUMsSUFBSSxFQUFFLG9CQUFvQjtnQkFDMUIsT0FBTyxFQUFFLGlEQUE2QjthQUN0QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQzVDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFL0MsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDN0IsQ0FBQzs7QUFHRixNQUFNLHFCQUFzQixTQUFRLE9BQU87SUFFMUM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0NBQWtDO1lBQ3RDLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO2dCQUM5QixhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDO2FBQzFGO1lBQ0QsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtnQkFDMUIsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxTQUFTLEVBQUU7YUFDcEM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsR0FBRyxDQUFDLFFBQTBCO1FBQ3RDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbkQsT0FBTyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxlQUFnQixTQUFRLE9BQU87SUFFcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCO1lBQ2hDLEtBQUssRUFBRTtnQkFDTixHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDO2dCQUN2QyxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDO2FBQ25HO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1gsTUFBTSw2Q0FBbUM7Z0JBQ3pDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsaURBQTZCLEVBQUUsK0NBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0RBQTJCLDBCQUFlLHdCQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsbURBQTZCLHdCQUFlO2dCQUM5TSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1EQUE2Qix3QkFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7YUFDN0U7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlO2dCQUMxQixLQUFLLEVBQUUsT0FBTztnQkFDZCxLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEdBQUcsQ0FBQyxRQUEwQjtRQUN0QyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRS9DLE9BQU8sV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVyxTQUFRLE9BQU87SUFFL0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUJBQXVCO1lBQzNCLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLDRDQUE0QyxDQUFDO1NBQ3RFLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxHQUFHO1FBQ0YsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztRQUN6QyxJQUFJLGFBQWEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ2xDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsMkJBQTJCO0FBRTNCLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNqQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUN4QyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN2QyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNsQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUNwQyxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN2QyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFNUIsd0NBQXdDO0FBRXhDLE1BQU0sd0JBQXdCLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztBQUUzSCxNQUFNLDBDQUEwQyxHQUFHLDJEQUEyRCxDQUFDO0FBQy9HLG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSwwQ0FBMEM7SUFDOUMsTUFBTSxFQUFFLDhDQUFvQyxFQUFFO0lBQzlDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQywwQ0FBMEMsRUFBRSxJQUFJLENBQUM7SUFDbEYsSUFBSSxFQUFFLHdCQUF3QjtJQUM5QixPQUFPLEVBQUUsaURBQTZCO0lBQ3RDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxnREFBNkIsRUFBRTtDQUMvQyxDQUFDLENBQUM7QUFFSCxNQUFNLDRDQUE0QyxHQUFHLCtEQUErRCxDQUFDO0FBQ3JILG1CQUFtQixDQUFDLGdDQUFnQyxDQUFDO0lBQ3BELEVBQUUsRUFBRSw0Q0FBNEM7SUFDaEQsTUFBTSxFQUFFLDhDQUFvQyxFQUFFO0lBQzlDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLENBQUM7SUFDckYsSUFBSSxFQUFFLHdCQUF3QjtJQUM5QixPQUFPLEVBQUUsbURBQTZCLHdCQUFlO0lBQ3JELEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxrREFBNkIsd0JBQWUsRUFBRTtDQUM5RCxDQUFDLENBQUM7QUFFSCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsMkNBQTJDLEVBQUUsUUFBUSxDQUFDLEVBQUU7SUFDeEYsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFDakUsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsT0FBTyxDQUFzQywyQkFBMkIsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUV6SCxPQUFPLG9CQUFvQixDQUFDLFdBQVcsQ0FBQywyQkFBMkIsRUFBRSxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3RILENBQUMsQ0FBQyxDQUFDO0FBRUgsd0JBQXdCO0FBRXhCLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtJQUNuRCxLQUFLLEVBQUUsZ0JBQWdCO0lBQ3ZCLE9BQU8sRUFBRTtRQUNSLEVBQUUsRUFBRSwyQ0FBMkM7UUFDL0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxzQkFBc0IsQ0FBQztRQUN6RCxPQUFPLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxPQUFPLENBQUM7S0FDOUU7SUFDRCxLQUFLLEVBQUUsQ0FBQztJQUNSLElBQUksRUFBRSxZQUFZO0NBQ2xCLENBQUMsQ0FBQztBQUVILFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtJQUNuRCxLQUFLLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDO0lBQzdGLE9BQU8sRUFBRSxNQUFNLENBQUMsaUJBQWlCO0lBQ2pDLEtBQUssRUFBRSxRQUFRO0lBQ2YsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUMifQ==