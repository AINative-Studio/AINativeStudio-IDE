/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { env } from '../../../../base/common/process.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IExtensionTransferService = createDecorator('ExtensionTransferService');
// Define extensions to skip when transferring
const extensionBlacklist = [
    // ignore extensions
    'ms-vscode-remote.remote', // ms-vscode-remote.remote-ssh, ms-vscode-remote.remote-wsl
    'ms-vscode.remote', // ms-vscode.remote-explorer
    // ignore other AI copilots that could conflict with Void keybindings
    'sourcegraph.cody-ai',
    'continue.continue',
    'codeium.codeium',
    'saoudrizwan.claude-dev', // cline
    'rooveterinaryinc.roo-cline', // roo
    'supermaven.supermaven' // supermaven
    // 'github.copilot',
];
const isBlacklisted = (fsPath) => {
    return extensionBlacklist.find(bItem => fsPath?.includes(bItem));
};
let ExtensionTransferService = class ExtensionTransferService extends Disposable {
    constructor(_fileService) {
        super();
        this._fileService = _fileService;
    }
    async transferExtensions(os, fromEditor) {
        const transferTheseFiles = transferTheseFilesOfOS(os, fromEditor);
        const fileService = this._fileService;
        let errAcc = '';
        for (const { from, to, isExtensions } of transferTheseFiles) {
            // Check if the source file exists before attempting to copy
            try {
                if (!isExtensions) {
                    console.log('transferring item', from, to);
                    const exists = await fileService.exists(from);
                    if (exists) {
                        // Ensure the destination directory exists
                        const toParent = URI.joinPath(to, '..');
                        const toParentExists = await fileService.exists(toParent);
                        if (!toParentExists) {
                            await fileService.createFolder(toParent);
                        }
                        await fileService.copy(from, to, true);
                    }
                    else {
                        console.log(`Skipping file that doesn't exist: ${from.toString()}`);
                    }
                }
                // extensions folder
                else {
                    console.log('transferring extensions...', from, to);
                    const exists = await fileService.exists(from);
                    if (exists) {
                        const stat = await fileService.resolve(from);
                        const toParent = URI.joinPath(to); // extensions/
                        const toParentExists = await fileService.exists(toParent);
                        if (!toParentExists) {
                            await fileService.createFolder(toParent);
                        }
                        for (const extensionFolder of stat.children ?? []) {
                            const from = extensionFolder.resource;
                            const to = URI.joinPath(toParent, extensionFolder.name);
                            const toStat = await fileService.resolve(from);
                            if (toStat.isDirectory) {
                                if (!isBlacklisted(extensionFolder.resource.fsPath)) {
                                    await fileService.copy(from, to, true);
                                }
                            }
                            else if (toStat.isFile) {
                                if (extensionFolder.name === 'extensions.json') {
                                    try {
                                        const contentsStr = await fileService.readFile(from);
                                        const json = JSON.parse(contentsStr.value.toString());
                                        const j2 = json.filter((entry) => !isBlacklisted(entry?.identifier?.id));
                                        const jsonStr = JSON.stringify(j2);
                                        await fileService.writeFile(to, VSBuffer.fromString(jsonStr));
                                    }
                                    catch {
                                        console.log('Error copying extensions.json, skipping');
                                    }
                                }
                            }
                        }
                    }
                    else {
                        console.log(`Skipping file that doesn't exist: ${from.toString()}`);
                    }
                    console.log('done transferring extensions.');
                }
            }
            catch (e) {
                console.error('Error copying file:', e);
                errAcc += `Error copying ${from.toString()}: ${e}\n`;
            }
        }
        if (errAcc)
            return errAcc;
        return undefined;
    }
    async deleteBlacklistExtensions(os) {
        const fileService = this._fileService;
        const extensionsURI = getExtensionsFolder(os);
        if (!extensionsURI)
            return;
        const eURI = await fileService.resolve(extensionsURI);
        for (const child of eURI.children ?? []) {
            try {
                if (child.isDirectory) {
                    // if is blacklisted
                    if (isBlacklisted(child.resource.fsPath)) {
                        console.log('Deleting extension', child.resource.fsPath);
                        await fileService.del(child.resource, { recursive: true, useTrash: true });
                    }
                }
                else if (child.isFile) {
                    // if is extensions.json
                    if (child.name === 'extensions.json') {
                        console.log('Updating extensions.json', child.resource.fsPath);
                        try {
                            const contentsStr = await fileService.readFile(child.resource);
                            const json = JSON.parse(contentsStr.value.toString());
                            const j2 = json.filter((entry) => !isBlacklisted(entry?.identifier?.id));
                            const jsonStr = JSON.stringify(j2);
                            await fileService.writeFile(child.resource, VSBuffer.fromString(jsonStr));
                        }
                        catch {
                            console.log('Error copying extensions.json, skipping');
                        }
                    }
                }
            }
            catch (e) {
                console.error('Could not delete extension', child.resource.fsPath, e);
            }
        }
    }
};
ExtensionTransferService = __decorate([
    __param(0, IFileService)
], ExtensionTransferService);
registerSingleton(IExtensionTransferService, ExtensionTransferService, 0 /* InstantiationType.Eager */); // lazily loaded, even if Eager
const transferTheseFilesOfOS = (os, fromEditor = 'VS Code') => {
    if (os === null)
        throw new Error(`One-click switch is not possible in this environment.`);
    if (os === 'mac') {
        const homeDir = env['HOME'];
        if (!homeDir)
            throw new Error(`$HOME not found`);
        if (fromEditor === 'VS Code') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Cursor') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Windsurf') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
    }
    if (os === 'linux') {
        const homeDir = env['HOME'];
        if (!homeDir)
            throw new Error(`variable for $HOME location not found`);
        if (fromEditor === 'VS Code') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Cursor') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Windsurf') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
    }
    if (os === 'windows') {
        const appdata = env['APPDATA'];
        if (!appdata)
            throw new Error(`variable for %APPDATA% location not found`);
        const userprofile = env['USERPROFILE'];
        if (!userprofile)
            throw new Error(`variable for %USERPROFILE% location not found`);
        if (fromEditor === 'VS Code') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Cursor') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Windsurf') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.void-editor', 'extensions'),
                    isExtensions: true,
                }];
        }
    }
    throw new Error(`os '${os}' not recognized or editor type '${fromEditor}' not supported for this OS`);
};
const getExtensionsFolder = (os) => {
    const t = transferTheseFilesOfOS(os, 'VS Code'); // from editor doesnt matter
    return t.find(f => f.isExtensions)?.to;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVHJhbnNmZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9leHRlbnNpb25UcmFuc2ZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBVzdGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBNEIsMEJBQTBCLENBQUMsQ0FBQztBQU1oSCw4Q0FBOEM7QUFDOUMsTUFBTSxrQkFBa0IsR0FBRztJQUMxQixvQkFBb0I7SUFDcEIseUJBQXlCLEVBQUUsMkRBQTJEO0lBQ3RGLGtCQUFrQixFQUFFLDRCQUE0QjtJQUNoRCxxRUFBcUU7SUFDckUscUJBQXFCO0lBQ3JCLG1CQUFtQjtJQUNuQixpQkFBaUI7SUFDakIsd0JBQXdCLEVBQUUsUUFBUTtJQUNsQyw0QkFBNEIsRUFBRSxNQUFNO0lBQ3BDLHVCQUF1QixDQUFDLGFBQWE7SUFDckMsb0JBQW9CO0NBQ3BCLENBQUM7QUFHRixNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQTBCLEVBQUUsRUFB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