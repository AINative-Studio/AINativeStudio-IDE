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
// Settings keys that are identity/machine/app-specific and should never be carried over
// from another editor's settings.json into AINativeStudio's. These are either:
//  - telemetry/identity values tied to the OTHER app's installation
//  - window/update/sync state that only makes sense for the app that wrote it
//  - keys that reference the other app's product name directly
// Matching is by exact key or by key-prefix (anything before the last '.' segment group below).
const settingsKeyBlacklist = [
    // telemetry / machine identity
    'telemetry.machineId',
    'telemetry.devDeviceId',
    'telemetry.enableCrashReporter',
    'telemetry.telemetryLevel',
    // update channel - the other app's update settings don't apply to us
    'update.mode',
    'update.channel',
    'update.enableWindowsBackgroundUpdates',
    // window/UI chrome state that's app-instance specific, not a "preference" to port
    'window.restoreWindows',
    'window.restoreFullscreen',
    'window.titleBarStyle', // platform rendering quirks differ between forks
    // account-based settings sync - pointing at the other app's sync service would be wrong/break
    'settingsSync.enabled',
    'sync.enable',
    // extensions auto-update / gallery pointed at the other app's marketplace config
    'extensions.autoUpdate',
    'extensions.autoCheckUpdates',
    'extensions.gallery.serviceUrl',
    'extensions.gallery.itemUrl',
    'extensions.gallery.cacheUrl',
    'extensions.gallery.controlUrl',
    'extensions.gallery.nlsUrl',
    'extensions.gallery.publisherUrl',
    'extensions.gallery.resourceUrlTemplate',
];
const isBlacklistedSettingsKey = (key) => {
    return settingsKeyBlacklist.some(bItem => key === bItem || key.startsWith(bItem + '.'));
};
/**
 * Merge `incoming` settings (parsed from another editor's settings.json) into
 * `existing` settings (AINativeStudio's current settings.json, parsed, may be {}).
 * - Keys already present in `existing` are preserved (we never clobber the user's
 *   current AINativeStudio configuration with values from the other editor).
 * - Keys on `settingsKeyBlacklist` are dropped from the incoming set entirely,
 *   since they are identity/app-instance specific and should not transfer.
 */
const mergeSettingsJSON = (existing, incoming) => {
    const merged = { ...existing };
    for (const key of Object.keys(incoming)) {
        if (isBlacklistedSettingsKey(key))
            continue;
        if (Object.prototype.hasOwnProperty.call(merged, key))
            continue; // don't clobber user's existing AINativeStudio setting
        merged[key] = incoming[key];
    }
    return merged;
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
        for (const { from, to, isExtensions, isSettingsJSON } of transferTheseFiles) {
            // Check if the source file exists before attempting to copy
            try {
                if (isSettingsJSON) {
                    console.log('transferring settings.json (merge)', from, to);
                    const exists = await fileService.exists(from);
                    if (exists) {
                        // Ensure the destination directory exists
                        const toParent = URI.joinPath(to, '..');
                        const toParentExists = await fileService.exists(toParent);
                        if (!toParentExists) {
                            await fileService.createFolder(toParent);
                        }
                        try {
                            const incomingStr = await fileService.readFile(from);
                            const incomingJSON = JSON.parse(incomingStr.value.toString());
                            let existingJSON = {};
                            const destExists = await fileService.exists(to);
                            if (destExists) {
                                try {
                                    const existingStr = await fileService.readFile(to);
                                    existingJSON = JSON.parse(existingStr.value.toString());
                                }
                                catch {
                                    console.log(`Could not parse existing settings.json at ${to.toString()}, treating as empty`);
                                    existingJSON = {};
                                }
                            }
                            const merged = mergeSettingsJSON(existingJSON, incomingJSON);
                            await fileService.writeFile(to, VSBuffer.fromString(JSON.stringify(merged, null, '\t')));
                        }
                        catch (parseErr) {
                            // If the source settings.json isn't valid JSON (e.g. has comments some
                            // editors tolerate), skip the merge rather than corrupting the user's settings.
                            console.log(`Could not parse settings.json at ${from.toString()}, skipping settings import`, parseErr);
                        }
                    }
                    else {
                        console.log(`Skipping file that doesn't exist: ${from.toString()}`);
                    }
                }
                else if (!isExtensions) {
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
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Cursor') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Windsurf') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'settings.json'),
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, 'Library', 'Application Support', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
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
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Cursor') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Windsurf') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'settings.json'),
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.config', 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), homeDir, '.ainative-studio', 'extensions'),
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
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Code', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.vscode', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.ainative-studio', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Cursor') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Cursor', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.cursor', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.ainative-studio', 'extensions'),
                    isExtensions: true,
                }];
        }
        else if (fromEditor === 'Windsurf') {
            return [{
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'settings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'settings.json'),
                    isSettingsJSON: true,
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Windsurf', 'User', 'keybindings.json'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), appdata, 'Void', 'User', 'keybindings.json'),
                }, {
                    from: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.windsurf', 'extensions'),
                    to: URI.joinPath(URI.from({ scheme: 'file' }), userprofile, '.ainative-studio', 'extensions'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVHJhbnNmZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWlkZXZlbG9wZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9haW5hdGl2ZS9icm93c2VyL2V4dGVuc2lvblRyYW5zZmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFXN0YsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwwQkFBMEIsQ0FBQyxDQUFDO0FBTWhILDhDQUE4QztBQUM5QyxNQUFNLGtCQUFrQixHQUFHO0lBQzFCLG9CQUFvQjtJQUNwQix5QkFBeUIsRUFBRSwyREFBMkQ7SUFDdEYsa0JBQWtCLEVBQUUsNEJBQTRCO0lBQ2hELHFFQUFxRTtJQUNyRSxxQkFBcUI7SUFDckIsbUJBQW1CO0lBQ25CLGlCQUFpQjtJQUNqQix3QkFBd0IsRUFBRSxRQUFRO0lBQ2xDLDRCQUE0QixFQUFFLE1BQU07SUFDcEMsdUJBQXVCLENBQUMsYUFBYTtJQUNyQyxvQkFBb0I7Q0FDcEIsQ0FBQztBQUdGLE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBMEIsRUFB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