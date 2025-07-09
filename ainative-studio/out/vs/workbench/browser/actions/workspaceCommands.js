/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { hasWorkspaceFileExtension, IWorkspaceContextService } from '../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { dirname } from '../../../base/common/resources.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { URI } from '../../../base/common/uri.js';
import { Schemas } from '../../../base/common/network.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IPathService } from '../../services/path/common/pathService.js';
export const ADD_ROOT_FOLDER_COMMAND_ID = 'addRootFolder';
export const ADD_ROOT_FOLDER_LABEL = localize2('addFolderToWorkspace', 'Add Folder to Workspace...');
export const SET_ROOT_FOLDER_COMMAND_ID = 'setRootFolder';
export const PICK_WORKSPACE_FOLDER_COMMAND_ID = '_workbench.pickWorkspaceFolder';
// Command registration
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFileFolderInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFileFolderAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: '_files.pickFolderAndOpen',
    handler: (accessor, options) => accessor.get(IFileDialogService).pickFolderAndOpen(options)
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFolderInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFolderAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.files.openFileInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickFileAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: 'workbench.action.openWorkspaceInNewWindow',
    handler: (accessor) => accessor.get(IFileDialogService).pickWorkspaceAndOpen({ forceNewWindow: true })
});
CommandsRegistry.registerCommand({
    id: ADD_ROOT_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const folders = await selectWorkspaceFolders(accessor);
        if (!folders || !folders.length) {
            return;
        }
        await workspaceEditingService.addFolders(folders.map(folder => ({ uri: folder })));
    }
});
CommandsRegistry.registerCommand({
    id: SET_ROOT_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const contextService = accessor.get(IWorkspaceContextService);
        const folders = await selectWorkspaceFolders(accessor);
        if (!folders || !folders.length) {
            return;
        }
        await workspaceEditingService.updateFolders(0, contextService.getWorkspace().folders.length, folders.map(folder => ({ uri: folder })));
    }
});
async function selectWorkspaceFolders(accessor) {
    const dialogsService = accessor.get(IFileDialogService);
    const pathService = accessor.get(IPathService);
    const folders = await dialogsService.showOpenDialog({
        openLabel: mnemonicButtonLabel(localize({ key: 'add', comment: ['&& denotes a mnemonic'] }, "&&Add")),
        title: localize('addFolderToWorkspaceTitle', "Add Folder to Workspace"),
        canSelectFolders: true,
        canSelectMany: true,
        defaultUri: await dialogsService.defaultFolderPath(),
        availableFileSystems: [pathService.defaultUriScheme]
    });
    return folders;
}
CommandsRegistry.registerCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, async function (accessor, args) {
    const quickInputService = accessor.get(IQuickInputService);
    const labelService = accessor.get(ILabelService);
    const contextService = accessor.get(IWorkspaceContextService);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const folders = contextService.getWorkspace().folders;
    if (!folders.length) {
        return;
    }
    const folderPicks = folders.map(folder => {
        const label = folder.name;
        const description = labelService.getUriLabel(dirname(folder.uri), { relative: true });
        return {
            label,
            description: description !== label ? description : undefined, // https://github.com/microsoft/vscode/issues/183418
            folder,
            iconClasses: getIconClasses(modelService, languageService, folder.uri, FileKind.ROOT_FOLDER)
        };
    });
    const options = (args ? args[0] : undefined) || Object.create(null);
    if (!options.activeItem) {
        options.activeItem = folderPicks[0];
    }
    if (!options.placeHolder) {
        options.placeHolder = localize('workspaceFolderPickerPlaceholder', "Select workspace folder");
    }
    if (typeof options.matchOnDescription !== 'boolean') {
        options.matchOnDescription = true;
    }
    const token = (args ? args[1] : undefined) || CancellationToken.None;
    const pick = await quickInputService.pick(folderPicks, options, token);
    if (pick) {
        return folders[folderPicks.indexOf(pick)];
    }
    return;
});
CommandsRegistry.registerCommand({
    id: 'vscode.openFolder',
    handler: (accessor, uriComponents, arg) => {
        const commandService = accessor.get(ICommandService);
        // Be compatible to previous args by converting to options
        if (typeof arg === 'boolean') {
            arg = { forceNewWindow: arg };
        }
        // Without URI, ask to pick a folder or workspace to open
        if (!uriComponents) {
            const options = {
                forceNewWindow: arg?.forceNewWindow
            };
            if (arg?.forceLocalWindow) {
                options.remoteAuthority = null;
                options.availableFileSystems = ['file'];
            }
            return commandService.executeCommand('_files.pickFolderAndOpen', options);
        }
        const uri = URI.from(uriComponents, true);
        const options = {
            forceNewWindow: arg?.forceNewWindow,
            forceReuseWindow: arg?.forceReuseWindow,
            noRecentEntry: arg?.noRecentEntry,
            remoteAuthority: arg?.forceLocalWindow ? null : undefined,
            forceProfile: arg?.forceProfile,
            forceTempProfile: arg?.forceTempProfile,
        };
        const uriToOpen = (hasWorkspaceFileExtension(uri) || uri.scheme === Schemas.untitled) ? { workspaceUri: uri } : { folderUri: uri };
        return commandService.executeCommand('_files.windowOpen', [uriToOpen], options);
    },
    metadata: {
        description: 'Open a folder or workspace in the current window or new window depending on the newWindow argument. Note that opening in the same window will shutdown the current extension host process and start a new one on the given folder/workspace unless the newWindow parameter is set to true.',
        args: [
            {
                name: 'uri', description: '(optional) Uri of the folder or workspace file to open. If not provided, a native dialog will ask the user for the folder',
                constraint: (value) => value === undefined || value === null || value instanceof URI
            },
            {
                name: 'options',
                description: '(optional) Options. Object with the following properties: ' +
                    '`forceNewWindow`: Whether to open the folder/workspace in a new window or the same. Defaults to opening in the same window. ' +
                    '`forceReuseWindow`: Whether to force opening the folder/workspace in the same window.  Defaults to false. ' +
                    '`noRecentEntry`: Whether the opened URI will appear in the \'Open Recent\' list. Defaults to false. ' +
                    'Note, for backward compatibility, options can also be of type boolean, representing the `forceNewWindow` setting.',
                constraint: (value) => value === undefined || typeof value === 'object' || typeof value === 'boolean'
            }
        ]
    }
});
CommandsRegistry.registerCommand({
    id: 'vscode.newWindow',
    handler: (accessor, options) => {
        const commandService = accessor.get(ICommandService);
        const commandOptions = {
            forceReuseWindow: options && options.reuseWindow,
            remoteAuthority: options && options.remoteAuthority
        };
        return commandService.executeCommand('_files.newWindow', commandOptions);
    },
    metadata: {
        description: 'Opens an new window depending on the newWindow argument.',
        args: [
            {
                name: 'options',
                description: '(optional) Options. Object with the following properties: ' +
                    '`reuseWindow`: Whether to open a new window or the same. Defaults to opening in a new window. ',
                constraint: (value) => value === undefined || typeof value === 'object'
            }
        ]
    }
});
// recent history commands
CommandsRegistry.registerCommand('_workbench.removeFromRecentlyOpened', function (accessor, uri) {
    const workspacesService = accessor.get(IWorkspacesService);
    return workspacesService.removeRecentlyOpened([uri]);
});
CommandsRegistry.registerCommand({
    id: 'vscode.removeFromRecentlyOpened',
    handler: (accessor, path) => {
        const workspacesService = accessor.get(IWorkspacesService);
        if (typeof path === 'string') {
            path = path.match(/^[^:/?#]+:\/\//) ? URI.parse(path) : URI.file(path);
        }
        else {
            path = URI.revive(path); // called from extension host
        }
        return workspacesService.removeRecentlyOpened([path]);
    },
    metadata: {
        description: 'Removes an entry with the given path from the recently opened list.',
        args: [
            { name: 'path', description: 'URI or URI string to remove from recently opened.', constraint: (value) => typeof value === 'string' || value instanceof URI }
        ]
    }
});
CommandsRegistry.registerCommand('_workbench.addToRecentlyOpened', async function (accessor, recentEntry) {
    const workspacesService = accessor.get(IWorkspacesService);
    const uri = recentEntry.uri;
    const label = recentEntry.label;
    const remoteAuthority = recentEntry.remoteAuthority;
    let recent = undefined;
    if (recentEntry.type === 'workspace') {
        const workspace = await workspacesService.getWorkspaceIdentifier(uri);
        recent = { workspace, label, remoteAuthority };
    }
    else if (recentEntry.type === 'folder') {
        recent = { folderUri: uri, label, remoteAuthority };
    }
    else {
        recent = { fileUri: uri, label, remoteAuthority };
    }
    return workspacesService.addRecentlyOpened([recent]);
});
CommandsRegistry.registerCommand('_workbench.getRecentlyOpened', async function (accessor) {
    const workspacesService = accessor.get(IWorkspacesService);
    return workspacesService.getRecentlyOpened();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy93b3Jrc3BhY2VDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3RELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQWdDLE1BQU0sbURBQW1ELENBQUM7QUFDckgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLEdBQUcsRUFB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