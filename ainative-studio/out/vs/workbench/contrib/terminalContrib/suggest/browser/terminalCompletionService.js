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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3Rlcm1pbmFsQ29tcGxldGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBSWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBNEIsTUFBTSw2QkFBNkIsQ0FBQztBQUNuRyxPQUFPLEVBQUUsR0FBRyxJQUFJLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDJCQUEyQixDQUFDLENBQUM7QUFFbkg7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHNCQUFzQjtJQVlsQzs7Ozs7T0FLRztJQUNILFlBQVksS0FBNkIsRUFBRSxxQkFBcUQ7UUFDL0YsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFD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