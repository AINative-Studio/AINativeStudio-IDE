/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVHJhbnNmZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2V4dGVuc2lvblRyYW5zZmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFXN0YsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwwQkFBMEIsQ0FBQyxDQUFDO0FBTWhILDhDQUE4QztBQUM5QyxNQUFNLGtCQUFrQixHQUFHO0lBQzFCLG9CQUFvQjtJQUNwQix5QkFBeUIsRUFBRSwyREFBMkQ7SUFDdEYsa0JBQWtCLEVBQUUsNEJBQTRCO0lBQ2hELHFFQUFxRTtJQUNyRSxxQkFBcUI7SUFDckIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQix3QkFBd0IsRUFBRSxRQUFRO0lBQ2xDLDRCQUE0QixFQUFFLE1BQU07SUFDcEMsdUJBQXVCLENBQUMsYUFBYTtJQUNyQyxvQkFBb0I7Q0FDcEIsQ0FBQztBQUdGLE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBMEIsRUFBRSxFQUFF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