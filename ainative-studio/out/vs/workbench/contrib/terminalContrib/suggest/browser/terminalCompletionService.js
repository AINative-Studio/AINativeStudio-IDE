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
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { env as processEnv } from '../../../../../base/common/process.js';
import { timeout } from '../../../../../base/common/async.js';
export const ITerminalCompletionService = createDecorator('terminalCompletionService');
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the terminal.
 */
export class TerminalCompletionList {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceRequestConfig) {
        this.items = items;
        this.resourceRequestConfig = resourceRequestConfig;
    }
}
let TerminalCompletionService = class TerminalCompletionService extends Disposable {
    get providers() {
        return this._providersGenerator();
    }
    *_providersGenerator() {
        for (const providerMap of this._providers.values()) {
            for (const provider of providerMap.values()) {
                yield provider;
            }
        }
    }
    /** Overrides the environment for testing purposes. */
    set processEnv(env) { this._processEnv = env; }
    constructor(_configurationService, _fileService) {
        super();
        this._configurationService = _configurationService;
        this._fileService = _fileService;
        this._providers = new Map();
        this._processEnv = processEnv;
    }
    registerTerminalCompletionProvider(extensionIdentifier, id, provider, ...triggerCharacters) {
        let extMap = this._providers.get(extensionIdentifier);
        if (!extMap) {
            extMap = new Map();
            this._providers.set(extensionIdentifier, extMap);
        }
        provider.triggerCharacters = triggerCharacters;
        provider.id = id;
        extMap.set(id, provider);
        return toDisposable(() => {
            const extMap = this._providers.get(extensionIdentifier);
            if (extMap) {
                extMap.delete(id);
                if (extMap.size === 0) {
                    this._providers.delete(extensionIdentifier);
                }
            }
        });
    }
    async provideCompletions(promptValue, cursorPosition, allowFallbackCompletions, shellType, capabilities, token, triggerCharacter, skipExtensionCompletions) {
        if (!this._providers || !this._providers.values || cursorPosition < 0) {
            return undefined;
        }
        let providers;
        if (triggerCharacter) {
            const providersToRequest = [];
            for (const provider of this.providers) {
                if (!provider.triggerCharacters) {
                    continue;
                }
                for (const char of provider.triggerCharacters) {
                    if (promptValue.substring(0, cursorPosition)?.endsWith(char)) {
                        providersToRequest.push(provider);
                        break;
                    }
                }
            }
            providers = providersToRequest;
        }
        else {
            providers = [...this._providers.values()].flatMap(providerMap => [...providerMap.values()]);
        }
        if (skipExtensionCompletions) {
            providers = providers.filter(p => p.isBuiltin);
            return this._collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token);
        }
        const providerConfig = this._configurationService.getValue("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */);
        providers = providers.filter(p => {
            const providerId = p.id;
            return providerId && providerId in providerConfig && providerConfig[providerId] !== false;
        });
        if (!providers.length) {
            return;
        }
        return this._collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token);
    }
    async _collectCompletions(providers, shellType, promptValue, cursorPosition, allowFallbackCompletions, capabilities, token) {
        const completionPromises = providers.map(async (provider) => {
            if (provider.shellTypes && !provider.shellTypes.includes(shellType)) {
                return undefined;
            }
            const completions = await Promise.race([
                provider.provideCompletions(promptValue, cursorPosition, allowFallbackCompletions, token),
                timeout(5000)
            ]);
            if (!completions) {
                return undefined;
            }
            const completionItems = Array.isArray(completions) ? completions : completions.items ?? [];
            if (shellType === "pwsh" /* GeneralShellType.PowerShell */) {
                for (const completion of completionItems) {
                    completion.isFileOverride ??= completion.kind === TerminalCompletionItemKind.Method && completion.replacementIndex === 0;
                }
            }
            if (provider.isBuiltin) {
                //TODO: why is this needed?
                for (const item of completionItems) {
                    item.provider = provider.id;
                }
            }
            if (Array.isArray(completions)) {
                return completionItems;
            }
            if (completions.resourceRequestConfig) {
                const resourceCompletions = await this.resolveResources(completions.resourceRequestConfig, promptValue, cursorPosition, provider.id, capabilities);
                if (resourceCompletions) {
                    completionItems.push(...resourceCompletions);
                }
            }
            return completionItems;
        });
        const results = await Promise.all(completionPromises);
        return results.filter(result => !!result).flat();
    }
    async resolveResources(resourceRequestConfig, promptValue, cursorPosition, provider, capabilities) {
        const useWindowsStylePath = resourceRequestConfig.pathSeparator === '\\';
        if (useWindowsStylePath) {
            // for tests, make sure the right path separator is used
            promptValue = promptValue.replaceAll(/[\\/]/g, resourceRequestConfig.pathSeparator);
        }
        // Files requested implies folders requested since the file could be in any folder. We could
        // provide diagnostics when a folder is provided where a file is expected.
        const foldersRequested = (resourceRequestConfig.foldersRequested || resourceRequestConfig.filesRequested) ?? false;
        const filesRequested = resourceRequestConfig.filesRequested ?? false;
        const fileExtensions = resourceRequestConfig.fileExtensions ?? undefined;
        const cwd = URI.revive(resourceRequestConfig.cwd);
        if (!cwd || (!foldersRequested && !filesRequested)) {
            return;
        }
        const resourceCompletions = [];
        const cursorPrefix = promptValue.substring(0, cursorPosition);
        // TODO: Leverage Fig's tokens array here?
        // The last word (or argument). When the cursor is following a space it will be the empty
        // string
        const lastWord = cursorPrefix.endsWith(' ') ? '' : cursorPrefix.split(/(?<!\\) /).at(-1) ?? '';
        // Get the nearest folder path from the prefix. This ignores everything after the `/` as
        // they are what triggers changes in the directory.
        let lastSlashIndex;
        if (useWindowsStylePath) {
            // TODO: Flesh out escaped path logic, it currently only partially works
            let lastBackslashIndex = -1;
            for (let i = lastWord.length - 1; i >= 0; i--) {
                if (lastWord[i] === '\\') {
                    if (i === lastWord.length - 1 || lastWord[i + 1] !== ' ') {
                        lastBackslashIndex = i;
                        break;
                    }
                }
            }
            lastSlashIndex = Math.max(lastBackslashIndex, lastWord.lastIndexOf('/'));
        }
        else {
            lastSlashIndex = lastWord.lastIndexOf(resourceRequestConfig.pathSeparator);
        }
        // The _complete_ folder of the last word. For example if the last word is `./src/file`,
        // this will be `./src/`. This also always ends in the path separator if it is not the empty
        // string and path separators are normalized on Windows.
        let lastWordFolder = lastSlashIndex === -1 ? '' : lastWord.slice(0, lastSlashIndex + 1);
        if (useWindowsStylePath) {
            lastWordFolder = lastWordFolder.replaceAll('/', '\\');
        }
        // Determine the current folder being shown
        let lastWordFolderResource;
        const lastWordFolderHasDotPrefix = !!lastWordFolder.match(/^\.\.?[\\\/]/);
        const lastWordFolderHasTildePrefix = !!lastWordFolder.match(/^~[\\\/]?/);
        const isAbsolutePath = useWindowsStylePath
            ? /^[a-zA-Z]:[\\\/]/.test(lastWord)
            : lastWord.startsWith(resourceRequestConfig.pathSeparator);
        const type = lastWordFolderHasTildePrefix ? 'tilde' : isAbsolutePath ? 'absolute' : 'relative';
        switch (type) {
            case 'tilde': {
                const home = this._getHomeDir(useWindowsStylePath, capabilities);
                if (home) {
                    lastWordFolderResource = URI.joinPath(URI.file(home), lastWordFolder.slice(1).replaceAll('\\ ', ' '));
                }
                if (!lastWordFolderResource) {
                    // Use less strong wording here as it's not as strong of a concept on Windows
                    // and could be misleading
                    if (lastWord.match(/^~[\\\/]$/)) {
                        lastWordFolderResource = useWindowsStylePath ? 'Home directory' : '$HOME';
                    }
                }
                break;
            }
            case 'absolute': {
                lastWordFolderResource = URI.file(lastWordFolder.replaceAll('\\ ', ' '));
                break;
            }
            case 'relative': {
                lastWordFolderResource = cwd;
                break;
            }
        }
        // Assemble completions based on the resource of lastWordFolder. Note that on Windows the
        // path seprators are normalized to `\`.
        if (!lastWordFolderResource) {
            return undefined;
        }
        // Early exit with basic completion if we don't know the resource
        if (typeof lastWordFolderResource === 'string') {
            resourceCompletions.push({
                label: lastWordFolder,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: lastWordFolderResource,
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
            return resourceCompletions;
        }
        const stat = await this._fileService.resolve(lastWordFolderResource, { resolveSingleChildDescendants: true });
        if (!stat?.children) {
            return;
        }
        // Add current directory. This should be shown at the top because it will be an exact
        // match and therefore highlight the detail, plus it improves the experience when
        // runOnEnter is used.
        //
        // - (relative) `|`       -> `.`
        //   this does not have the trailing `/` intentionally as it's common to complete the
        //   current working directory and we do not want to complete `./` when `runOnEnter` is
        //   used.
        // - (relative) `./src/|` -> `./src/`
        // - (absolute) `/src/|`  -> `/src/`
        // - (tilde)    `~/|`     -> `~/`
        // - (tilde)    `~/src/|` -> `~/src/`
        if (foldersRequested) {
            let label;
            switch (type) {
                case 'tilde': {
                    label = lastWordFolder;
                    break;
                }
                case 'absolute': {
                    label = lastWordFolder;
                    break;
                }
                case 'relative': {
                    label = '.';
                    if (lastWordFolder.length > 0) {
                        label = addPathRelativePrefix(lastWordFolder, resourceRequestConfig, lastWordFolderHasDotPrefix);
                    }
                    break;
                }
            }
            resourceCompletions.push({
                label,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: getFriendlyPath(lastWordFolderResource, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        // Add all direct children files or folders
        //
        // - (relative) `cd ./src/`  -> `cd ./src/folder1/`, ...
        // - (absolute) `cd c:/src/` -> `cd c:/src/folder1/`, ...
        // - (tilde)    `cd ~/src/`  -> `cd ~/src/folder1/`, ...
        for (const child of stat.children) {
            let kind;
            if (foldersRequested && child.isDirectory) {
                kind = TerminalCompletionItemKind.Folder;
            }
            else if (filesRequested && child.isFile) {
                kind = TerminalCompletionItemKind.File;
            }
            if (kind === undefined) {
                continue;
            }
            let label = lastWordFolder;
            if (label.length > 0 && !label.endsWith(resourceRequestConfig.pathSeparator)) {
                label += resourceRequestConfig.pathSeparator;
            }
            label += child.name;
            if (type === 'relative') {
                label = addPathRelativePrefix(label, resourceRequestConfig, lastWordFolderHasDotPrefix);
            }
            if (child.isDirectory && !label.endsWith(resourceRequestConfig.pathSeparator)) {
                label += resourceRequestConfig.pathSeparator;
            }
            if (child.isFile && fileExtensions) {
                const extension = child.name.split('.').length > 1 ? child.name.split('.').at(-1) : undefined;
                if (extension && !fileExtensions.includes(extension)) {
                    continue;
                }
            }
            resourceCompletions.push({
                label,
                provider,
                kind,
                detail: getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        // Support $CDPATH specially for the `cd` command only
        //
        // - (relative) `|` -> `/foo/vscode` (CDPATH has /foo which contains vscode folder)
        if (type === 'relative' && foldersRequested) {
            if (promptValue.startsWith('cd ')) {
                const config = this._configurationService.getValue("terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */);
                if (config === 'absolute' || config === 'relative') {
                    const cdPath = this._getEnvVar('CDPATH', capabilities);
                    if (cdPath) {
                        const cdPathEntries = cdPath.split(useWindowsStylePath ? ';' : ':');
                        for (const cdPathEntry of cdPathEntries) {
                            try {
                                const fileStat = await this._fileService.resolve(URI.file(cdPathEntry), { resolveSingleChildDescendants: true });
                                if (fileStat?.children) {
                                    for (const child of fileStat.children) {
                                        if (!child.isDirectory) {
                                            continue;
                                        }
                                        const useRelative = config === 'relative';
                                        const kind = TerminalCompletionItemKind.Folder;
                                        const label = useRelative ? basename(child.resource.fsPath) : getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind);
                                        const detail = useRelative ? `CDPATH ${getFriendlyPath(child.resource, resourceRequestConfig.pathSeparator, kind)}` : `CDPATH`;
                                        resourceCompletions.push({
                                            label,
                                            provider,
                                            kind,
                                            detail,
                                            replacementIndex: cursorPosition - lastWord.length,
                                            replacementLength: lastWord.length
                                        });
                                    }
                                }
                            }
                            catch { /* ignore */ }
                        }
                    }
                }
            }
        }
        // Add parent directory to the bottom of the list because it's not as useful as other suggestions
        //
        // - (relative) `|` -> `../`
        // - (relative) `./src/|` -> `./src/../`
        if (type === 'relative' && foldersRequested) {
            let label = `..${resourceRequestConfig.pathSeparator}`;
            if (lastWordFolder.length > 0) {
                label = addPathRelativePrefix(lastWordFolder + label, resourceRequestConfig, lastWordFolderHasDotPrefix);
            }
            const parentDir = URI.joinPath(cwd, '..' + resourceRequestConfig.pathSeparator);
            resourceCompletions.push({
                label,
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: getFriendlyPath(parentDir, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        // Add tilde for home directory for relative paths when there is no path separator in the
        // input.
        //
        // - (relative) `|` -> `~`
        if (type === 'relative' && !lastWordFolder.match(/[\\\/]/)) {
            let homeResource;
            const home = this._getHomeDir(useWindowsStylePath, capabilities);
            if (home) {
                homeResource = URI.joinPath(URI.file(home), lastWordFolder.slice(1).replaceAll('\\ ', ' '));
            }
            if (!homeResource) {
                // Use less strong wording here as it's not as strong of a concept on Windows
                // and could be misleading
                homeResource = useWindowsStylePath ? 'Home directory' : '$HOME';
            }
            resourceCompletions.push({
                label: '~',
                provider,
                kind: TerminalCompletionItemKind.Folder,
                detail: typeof homeResource === 'string' ? homeResource : getFriendlyPath(homeResource, resourceRequestConfig.pathSeparator, TerminalCompletionItemKind.Folder),
                replacementIndex: cursorPosition - lastWord.length,
                replacementLength: lastWord.length
            });
        }
        return resourceCompletions;
    }
    _getEnvVar(key, capabilities) {
        const env = capabilities.get(5 /* TerminalCapability.ShellEnvDetection */)?.env?.value;
        if (env) {
            return env[key];
        }
        return this._processEnv[key];
    }
    _getHomeDir(useWindowsStylePath, capabilities) {
        return useWindowsStylePath ? this._getEnvVar('USERPROFILE', capabilities) : this._getEnvVar('HOME', capabilities);
    }
};
TerminalCompletionService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IFileService)
], TerminalCompletionService);
export { TerminalCompletionService };
function getFriendlyPath(uri, pathSeparator, kind) {
    let path = uri.fsPath;
    // Ensure folders end with the path separator to differentiate presentation from files
    if (kind === TerminalCompletionItemKind.Folder && !path.endsWith(pathSeparator)) {
        path += pathSeparator;
    }
    // Ensure drive is capitalized on Windows
    if (pathSeparator === '\\' && path.match(/^[a-zA-Z]:\\/)) {
        path = `${path[0].toUpperCase()}:${path.slice(2)}`;
    }
    return path;
}
/**
 * Normalize suggestion to add a ./ prefix to the start of the path if there isn't one already. We
 * may want to change this behavior in the future to go with whatever format the user has.
 */
function addPathRelativePrefix(text, resourceRequestConfig, lastWordFolderHasDotPrefix) {
    if (!lastWordFolderHasDotPrefix) {
        return `.${resourceRequestConfig.pathSeparator}${text}`;
    }
    return text;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFJaEcsT0FBTyxFQUFFLDBCQUEwQixFQUE0QixNQUFNLDZCQUE2QixDQUFDO0FBQ25HLE9BQU8sRUFBRSxHQUFHLElBQUksVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FBNkIsMkJBQTJCLENBQUMsQ0FBQztBQUVuSDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBWWxDOzs7OztPQUtHO0lBQ0gsWUFBWSxLQUE2QixFQUFFLHFCQUFxRDtRQUMvRixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMscUJBQXFCLEdBQUcscUJBQXFCLENBQUM7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