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
var SnippetEnablement_1, SnippetUsageTimestamps_1;
import { combinedDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { setSnippetSuggestSupport } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { SnippetFile } from './snippetsFile.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../../services/language/common/languageService.js';
import { SnippetCompletionProvider } from './snippetCompletionProvider.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { insertInto } from '../../../../base/common/arrays.js';
var snippetExt;
(function (snippetExt) {
    function toValidSnippet(extension, snippet, languageService) {
        if (isFalsyOrWhitespace(snippet.path)) {
            extension.collector.error(localize('invalid.path.0', "Expected string in `contributes.{0}.path`. Provided value: {1}", extension.description.name, String(snippet.path)));
            return null;
        }
        if (isFalsyOrWhitespace(snippet.language) && !snippet.path.endsWith('.code-snippets')) {
            extension.collector.error(localize('invalid.language.0', "When omitting the language, the value of `contributes.{0}.path` must be a `.code-snippets`-file. Provided value: {1}", extension.description.name, String(snippet.path)));
            return null;
        }
        if (!isFalsyOrWhitespace(snippet.language) && !languageService.isRegisteredLanguageId(snippet.language)) {
            extension.collector.error(localize('invalid.language', "Unknown language in `contributes.{0}.language`. Provided value: {1}", extension.description.name, String(snippet.language)));
            return null;
        }
        const extensionLocation = extension.description.extensionLocation;
        const snippetLocation = resources.joinPath(extensionLocation, snippet.path);
        if (!resources.isEqualOrParent(snippetLocation, extensionLocation)) {
            extension.collector.error(localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", extension.description.name, snippetLocation.path, extensionLocation.path));
            return null;
        }
        return {
            language: snippet.language,
            location: snippetLocation
        };
    }
    snippetExt.toValidSnippet = toValidSnippet;
    snippetExt.snippetsContribution = {
        description: localize('vscode.extension.contributes.snippets', 'Contributes snippets.'),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '', path: '' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { language: '${1:id}', path: './snippets/${2:id}.json.' } }],
            properties: {
                language: {
                    description: localize('vscode.extension.contributes.snippets-language', 'Language identifier for which this snippet is contributed to.'),
                    type: 'string'
                },
                path: {
                    description: localize('vscode.extension.contributes.snippets-path', 'Path of the snippets file. The path is relative to the extension folder and typically starts with \'./snippets/\'.'),
                    type: 'string'
                }
            }
        }
    };
    snippetExt.point = ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'snippets',
        deps: [languagesExtPoint],
        jsonSchema: snippetExt.snippetsContribution
    });
})(snippetExt || (snippetExt = {}));
function watch(service, resource, callback) {
    return combinedDisposable(service.watch(resource), service.onDidFilesChange(e => {
        if (e.affects(resource)) {
            callback();
        }
    }));
}
let SnippetEnablement = class SnippetEnablement {
    static { SnippetEnablement_1 = this; }
    static { this._key = 'snippets.ignoredSnippets'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        const raw = _storageService.get(SnippetEnablement_1._key, 0 /* StorageScope.PROFILE */, '');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch { }
        this._ignored = isStringArray(data) ? new Set(data) : new Set();
    }
    isIgnored(id) {
        return this._ignored.has(id);
    }
    updateIgnored(id, value) {
        let changed = false;
        if (this._ignored.has(id) && !value) {
            this._ignored.delete(id);
            changed = true;
        }
        else if (!this._ignored.has(id) && value) {
            this._ignored.add(id);
            changed = true;
        }
        if (changed) {
            this._storageService.store(SnippetEnablement_1._key, JSON.stringify(Array.from(this._ignored)), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
};
SnippetEnablement = SnippetEnablement_1 = __decorate([
    __param(0, IStorageService)
], SnippetEnablement);
let SnippetUsageTimestamps = class SnippetUsageTimestamps {
    static { SnippetUsageTimestamps_1 = this; }
    static { this._key = 'snippets.usageTimestamps'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        const raw = _storageService.get(SnippetUsageTimestamps_1._key, 0 /* StorageScope.PROFILE */, '');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch {
            data = [];
        }
        this._usages = Array.isArray(data) ? new Map(data) : new Map();
    }
    getUsageTimestamp(id) {
        return this._usages.get(id);
    }
    updateUsageTimestamp(id) {
        // map uses insertion order, we want most recent at the end
        this._usages.delete(id);
        this._usages.set(id, Date.now());
        // persist last 100 item
        const all = [...this._usages].slice(-100);
        this._storageService.store(SnippetUsageTimestamps_1._key, JSON.stringify(all), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
SnippetUsageTimestamps = SnippetUsageTimestamps_1 = __decorate([
    __param(0, IStorageService)
], SnippetUsageTimestamps);
let SnippetsService = class SnippetsService {
    constructor(_environmentService, _userDataProfileService, _contextService, _languageService, _logService, _fileService, _textfileService, _extensionResourceLoaderService, lifecycleService, instantiationService, languageConfigurationService) {
        this._environmentService = _environmentService;
        this._userDataProfileService = _userDataProfileService;
        this._contextService = _contextService;
        this._languageService = _languageService;
        this._logService = _logService;
        this._fileService = _fileService;
        this._textfileService = _textfileService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._disposables = new DisposableStore();
        this._pendingWork = [];
        this._files = new ResourceMap();
        this._pendingWork.push(Promise.resolve(lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            this._initExtensionSnippets();
            this._initUserSnippets();
            this._initWorkspaceSnippets();
        })));
        setSnippetSuggestSupport(new SnippetCompletionProvider(this._languageService, this, languageConfigurationService));
        this._enablement = instantiationService.createInstance(SnippetEnablement);
        this._usageTimestamps = instantiationService.createInstance(SnippetUsageTimestamps);
    }
    dispose() {
        this._disposables.dispose();
    }
    isEnabled(snippet) {
        return !this._enablement.isIgnored(snippet.snippetIdentifier);
    }
    updateEnablement(snippet, enabled) {
        this._enablement.updateIgnored(snippet.snippetIdentifier, !enabled);
    }
    updateUsageTimestamp(snippet) {
        this._usageTimestamps.updateUsageTimestamp(snippet.snippetIdentifier);
    }
    _joinSnippets() {
        const promises = this._pendingWork.slice(0);
        this._pendingWork.length = 0;
        return Promise.all(promises);
    }
    async getSnippetFiles() {
        await this._joinSnippets();
        return this._files.values();
    }
    async getSnippets(languageId, opts) {
        await this._joinSnippets();
        const result = [];
        const promises = [];
        if (languageId) {
            if (this._languageService.isRegisteredLanguageId(languageId)) {
                for (const file of this._files.values()) {
                    promises.push(file.load()
                        .then(file => file.select(languageId, result))
                        .catch(err => this._logService.error(err, file.location.toString())));
                }
            }
        }
        else {
            for (const file of this._files.values()) {
                promises.push(file.load()
                    .then(file => insertInto(result, result.length, file.data))
                    .catch(err => this._logService.error(err, file.location.toString())));
            }
        }
        await Promise.all(promises);
        return this._filterAndSortSnippets(result, opts);
    }
    getSnippetsSync(languageId, opts) {
        const result = [];
        if (this._languageService.isRegisteredLanguageId(languageId)) {
            for (const file of this._files.values()) {
                // kick off loading (which is a noop in case it's already loaded)
                // and optimistically collect snippets
                file.load().catch(_err => { });
                file.select(languageId, result);
            }
        }
        return this._filterAndSortSnippets(result, opts);
    }
    _filterAndSortSnippets(snippets, opts) {
        const result = [];
        for (const snippet of snippets) {
            if (!snippet.prefix && !opts?.includeNoPrefixSnippets) {
                // prefix or no-prefix wanted
                continue;
            }
            if (!this.isEnabled(snippet) && !opts?.includeDisabledSnippets) {
                // enabled or disabled wanted
                continue;
            }
            if (typeof opts?.fileTemplateSnippets === 'boolean' && opts.fileTemplateSnippets !== snippet.isFileTemplate) {
                // isTopLevel requested but mismatching
                continue;
            }
            result.push(snippet);
        }
        return result.sort((a, b) => {
            let result = 0;
            if (!opts?.noRecencySort) {
                const val1 = this._usageTimestamps.getUsageTimestamp(a.snippetIdentifier) ?? -1;
                const val2 = this._usageTimestamps.getUsageTimestamp(b.snippetIdentifier) ?? -1;
                result = val2 - val1;
            }
            if (result === 0) {
                result = this._compareSnippet(a, b);
            }
            return result;
        });
    }
    _compareSnippet(a, b) {
        if (a.snippetSource < b.snippetSource) {
            return -1;
        }
        else if (a.snippetSource > b.snippetSource) {
            return 1;
        }
        else if (a.source < b.source) {
            return -1;
        }
        else if (a.source > b.source) {
            return 1;
        }
        else if (a.name > b.name) {
            return 1;
        }
        else if (a.name < b.name) {
            return -1;
        }
        else {
            return 0;
        }
    }
    // --- loading, watching
    _initExtensionSnippets() {
        snippetExt.point.setHandler(extensions => {
            for (const [key, value] of this._files) {
                if (value.source === 3 /* SnippetSource.Extension */) {
                    this._files.delete(key);
                }
            }
            for (const extension of extensions) {
                for (const contribution of extension.value) {
                    const validContribution = snippetExt.toValidSnippet(extension, contribution, this._languageService);
                    if (!validContribution) {
                        continue;
                    }
                    const file = this._files.get(validContribution.location);
                    if (file) {
                        if (file.defaultScopes) {
                            file.defaultScopes.push(validContribution.language);
                        }
                        else {
                            file.defaultScopes = [];
                        }
                    }
                    else {
                        const file = new SnippetFile(3 /* SnippetSource.Extension */, validContribution.location, validContribution.language ? [validContribution.language] : undefined, extension.description, this._fileService, this._extensionResourceLoaderService);
                        this._files.set(file.location, file);
                        if (this._environmentService.isExtensionDevelopment) {
                            file.load().then(file => {
                                // warn about bad tabstop/variable usage
                                if (file.data.some(snippet => snippet.isBogous)) {
                                    extension.collector.warn(localize('badVariableUse', "One or more snippets from the extension '{0}' very likely confuse snippet-variables and snippet-placeholders (see https://code.visualstudio.com/docs/editor/userdefinedsnippets#_snippet-syntax for more details)", extension.description.name));
                                }
                            }, err => {
                                // generic error
                                extension.collector.warn(localize('badFile', "The snippet file \"{0}\" could not be read.", file.location.toString()));
                            });
                        }
                    }
                }
            }
        });
    }
    _initWorkspaceSnippets() {
        // workspace stuff
        const disposables = new DisposableStore();
        const updateWorkspaceSnippets = () => {
            disposables.clear();
            this._pendingWork.push(this._initWorkspaceFolderSnippets(this._contextService.getWorkspace(), disposables));
        };
        this._disposables.add(disposables);
        this._disposables.add(this._contextService.onDidChangeWorkspaceFolders(updateWorkspaceSnippets));
        this._disposables.add(this._contextService.onDidChangeWorkbenchState(updateWorkspaceSnippets));
        updateWorkspaceSnippets();
    }
    async _initWorkspaceFolderSnippets(workspace, bucket) {
        const promises = workspace.folders.map(async (folder) => {
            const snippetFolder = folder.toResource('.vscode');
            const value = await this._fileService.exists(snippetFolder);
            if (value) {
                this._initFolderSnippets(2 /* SnippetSource.Workspace */, snippetFolder, bucket);
            }
            else {
                // watch
                bucket.add(this._fileService.onDidFilesChange(e => {
                    if (e.contains(snippetFolder, 1 /* FileChangeType.ADDED */)) {
                        this._initFolderSnippets(2 /* SnippetSource.Workspace */, snippetFolder, bucket);
                    }
                }));
            }
        });
        await Promise.all(promises);
    }
    async _initUserSnippets() {
        const disposables = new DisposableStore();
        const updateUserSnippets = async () => {
            disposables.clear();
            const userSnippetsFolder = this._userDataProfileService.currentProfile.snippetsHome;
            await this._fileService.createFolder(userSnippetsFolder);
            await this._initFolderSnippets(1 /* SnippetSource.User */, userSnippetsFolder, disposables);
        };
        this._disposables.add(disposables);
        this._disposables.add(this._userDataProfileService.onDidChangeCurrentProfile(e => e.join((async () => {
            this._pendingWork.push(updateUserSnippets());
        })())));
        await updateUserSnippets();
    }
    _initFolderSnippets(source, folder, bucket) {
        const disposables = new DisposableStore();
        const addFolderSnippets = async () => {
            disposables.clear();
            if (!await this._fileService.exists(folder)) {
                return;
            }
            try {
                const stat = await this._fileService.resolve(folder);
                for (const entry of stat.children || []) {
                    disposables.add(this._addSnippetFile(entry.resource, source));
                }
            }
            catch (err) {
                this._logService.error(`Failed snippets from folder '${folder.toString()}'`, err);
            }
        };
        bucket.add(this._textfileService.files.onDidSave(e => {
            if (resources.isEqualOrParent(e.model.resource, folder)) {
                addFolderSnippets();
            }
        }));
        bucket.add(watch(this._fileService, folder, addFolderSnippets));
        bucket.add(disposables);
        return addFolderSnippets();
    }
    _addSnippetFile(uri, source) {
        const ext = resources.extname(uri);
        if (source === 1 /* SnippetSource.User */ && ext === '.json') {
            const langName = resources.basename(uri).replace(/\.json/, '');
            this._files.set(uri, new SnippetFile(source, uri, [langName], undefined, this._fileService, this._extensionResourceLoaderService));
        }
        else if (ext === '.code-snippets') {
            this._files.set(uri, new SnippetFile(source, uri, undefined, undefined, this._fileService, this._extensionResourceLoaderService));
        }
        return {
            dispose: () => this._files.delete(uri)
        };
    }
};
SnippetsService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IUserDataProfileService),
    __param(2, IWorkspaceContextService),
    __param(3, ILanguageService),
    __param(4, ILogService),
    __param(5, IFileService),
    __param(6, ITextFileService),
    __param(7, IExtensionResourceLoaderService),
    __param(8, ILifecycleService),
    __param(9, IInstantiationService),
    __param(10, ILanguageConfigurationService)
], SnippetsService);
export { SnippetsService };
export function getNonWhitespacePrefix(model, position) {
    /**
     * Do not analyze more characters
     */
    const MAX_PREFIX_LENGTH = 100;
    const line = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
    const minChIndex = Math.max(0, line.length - MAX_PREFIX_LENGTH);
    for (let chIndex = line.length - 1; chIndex >= minChIndex; chIndex--) {
        const ch = line.charAt(chIndex);
        if (/\s/.test(ch)) {
            return line.substr(chIndex + 1);
        }
    }
    if (minChIndex === 0) {
        return line;
    }
    return '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL2Jyb3dzZXIvc25pcHBldHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQWUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEcsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUd6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFrQixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFDcEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBYyx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTFHLE9BQU8sRUFBVyxXQUFXLEVBQWlCLE1BQU0sbUJBQW1CLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUF1QixNQUFNLDJEQUEyRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUNySCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsSUFBVSxVQUFVLENBb0ZuQjtBQXBGRCxXQUFVLFVBQVU7SUFZbkIsU0FBZ0IsY0FBYyxDQUFDLFNBQXlELEVBQUUsT0FBZ0MsRUFBRSxlQUFpQztRQUU1SixJQUFJLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FDakMsZ0JBQWdCLEVBQ2hCLGdFQUFnRSxFQUNoRSxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUNoRCxDQUFDLENBQUM7WUFDSCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUN2RixTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQ2pDLG9CQUFvQixFQUNwQixzSEFBc0gsRUFDdEgsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FDaEQsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN6RyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQ2pDLGtCQUFrQixFQUNsQixxRUFBcUUsRUFDckUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FDcEQsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxJQUFJLENBQUM7UUFFYixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDO1FBQ2xFLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDcEUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUNqQyxnQkFBZ0IsRUFDaEIsbUlBQW1JLEVBQ25JLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUN4RSxDQUFDLENBQUM7WUFDSCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPO1lBQ04sUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLFFBQVEsRUFBRSxlQUFlO1NBQ3pCLENBQUM7SUFDSCxDQUFDO0lBN0NlLHlCQUFjLGlCQTZDN0IsQ0FBQTtJQUVZLCtCQUFvQixHQUFnQjtRQUNoRCxXQUFXLEVBQUUsUUFBUSxDQUFDLHVDQUF1QyxFQUFFLHVCQUF1QixDQUFDO1FBQ3ZGLElBQUksRUFBRSxPQUFPO1FBQ2IsZUFBZSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUN6RCxLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsMEJBQTBCLEVBQUUsRUFBRSxDQUFDO1lBQ3RGLFVBQVUsRUFBRTtnQkFDWCxRQUFRLEVBQUU7b0JBQ1QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxnREFBZ0QsRUFBRSwrREFBK0QsQ0FBQztvQkFDeEksSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMLFdBQVcsRUFBRSxRQUFRLENBQUMsNENBQTRDLEVBQUUsb0hBQW9ILENBQUM7b0JBQ3pMLElBQUksRUFBRSxRQUFRO2lCQUNkO2FBQ0Q7U0FDRDtLQUNELENBQUM7SUFFVyxnQkFBSyxHQUFHLGtCQUFrQixDQUFDLHNCQUFzQixDQUF1QztRQUNwRyxjQUFjLEVBQUUsVUFBVTtRQUMxQixJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztRQUN6QixVQUFVLEVBQUUsVUFBVSxDQUFDLG9CQUFvQjtLQUMzQyxDQUFDLENBQUM7QUFDSixDQUFDLEVBcEZTLFVBQVUsS0FBVixVQUFVLFFBb0ZuQjtBQUVELFNBQVMsS0FBSyxDQUFDLE9BQXFCLEVBQUUsUUFBYSxFQUFFLFFBQXVCO0lBQzNFLE9BQU8sa0JBQWtCLENBQ3hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQ3ZCLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUM1QixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN6QixRQUFRLEVBQUUsQ0FBQztRQUNaLENBQUM7SUFDRixDQUFDLENBQUMsQ0FDRixDQUFDO0FBQ0gsQ0FBQztBQUVELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCOzthQUVQLFNBQUksR0FBRywwQkFBMEIsQUFBN0IsQ0FBOEI7SUFJakQsWUFDbUMsZUFBZ0M7UUFBaEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBR2xFLE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsbUJBQWlCLENBQUMsSUFBSSxnQ0FBd0IsRUFBRSxDQUFDLENBQUM7UUFDbEYsSUFBSSxJQUEwQixDQUFDO1FBQy9CLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRVgsSUFBSSxDQUFDLFFBQVEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2pFLENBQUM7SUFFRCxTQUFTLENBQUMsRUFBVTtRQUNuQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFRCxhQUFhLENBQUMsRUFBVSxFQUFFLEtBQWM7UUFDdkMsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6QixPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEIsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNoQixDQUFDO1FBQ0QsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLG1CQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLDJEQUEyQyxDQUFDO1FBQ3pJLENBQUM7SUFDRixDQUFDOztBQW5DSSxpQkFBaUI7SUFPcEIsV0FBQSxlQUFlLENBQUE7R0FQWixpQkFBaUIsQ0FvQ3RCO0FBRUQsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7O2FBRVosU0FBSSxHQUFHLDBCQUEwQixBQUE3QixDQUE4QjtJQUlqRCxZQUNtQyxlQUFnQztRQUFoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFHbEUsTUFBTSxHQUFHLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyx3QkFBc0IsQ0FBQyxJQUFJLGdDQUF3QixFQUFFLENBQUMsQ0FBQztRQUN2RixJQUFJLElBQW9DLENBQUM7UUFDekMsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLElBQUksR0FBRyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUNoRSxDQUFDO0lBRUQsaUJBQWlCLENBQUMsRUFBVTtRQUMzQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxFQUFVO1FBQzlCLDJEQUEyRDtRQUMzRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFakMsd0JBQXdCO1FBQ3hCLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsd0JBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJEQUEyQyxDQUFDO0lBQ3hILENBQUM7O0FBakNJLHNCQUFzQjtJQU96QixXQUFBLGVBQWUsQ0FBQTtHQVBaLHNCQUFzQixDQWtDM0I7QUFFTSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFlO0lBVTNCLFlBQ3NCLG1CQUF5RCxFQUNyRCx1QkFBaUUsRUFDaEUsZUFBMEQsRUFDbEUsZ0JBQW1ELEVBQ3hELFdBQXlDLEVBQ3hDLFlBQTJDLEVBQ3ZDLGdCQUFtRCxFQUNwQywrQkFBaUYsRUFDL0YsZ0JBQW1DLEVBQy9CLG9CQUEyQyxFQUNuQyw0QkFBMkQ7UUFWcEQsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUNwQyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQXlCO1FBQy9DLG9CQUFlLEdBQWYsZUFBZSxDQUEwQjtRQUNqRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3ZDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3ZCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQ3RCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDbkIsb0NBQStCLEdBQS9CLCtCQUErQixDQUFpQztRQWRsRyxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDckMsaUJBQVksR0FBbUIsRUFBRSxDQUFDO1FBQ2xDLFdBQU0sR0FBRyxJQUFJLFdBQVcsRUFBZSxDQUFDO1FBaUJ4RCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksaUNBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUMvRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTCx3QkFBd0IsQ0FBQyxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBRW5ILElBQUksQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsU0FBUyxDQUFDLE9BQWdCO1FBQ3pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsZ0JBQWdCLENBQUMsT0FBZ0IsRUFBRSxPQUFnQjtRQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsb0JBQW9CLENBQUMsT0FBZ0I7UUFDcEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFTyxhQUFhO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUM3QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlO1FBQ3BCLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUE4QixFQUFFLElBQXlCO1FBQzFFLE1BQU0sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRTNCLE1BQU0sTUFBTSxHQUFjLEVBQUUsQ0FBQztRQUM3QixNQUFNLFFBQVEsR0FBbUIsRUFBRSxDQUFDO1FBRXBDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7b0JBQ3pDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTt5QkFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7eUJBQzdDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FDcEUsQ0FBQztnQkFDSCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ3pDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtxQkFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDMUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUNwRSxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUIsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxlQUFlLENBQUMsVUFBa0IsRUFBRSxJQUF5QjtRQUM1RCxNQUFNLE1BQU0sR0FBYyxFQUFFLENBQUM7UUFDN0IsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztnQkFDekMsaUVBQWlFO2dCQUNqRSxzQ0FBc0M7Z0JBQ3RDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBYyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVPLHNCQUFzQixDQUFDLFFBQW1CLEVBQUUsSUFBeUI7UUFFNUUsTUFBTSxNQUFNLEdBQWMsRUFBRSxDQUFDO1FBRTdCLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztnQkFDdkQsNkJBQTZCO2dCQUM3QixTQUFTO1lBQ1YsQ0FBQztZQUNELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFLENBQUM7Z0JBQ2hFLDZCQUE2QjtnQkFDN0IsU0FBUztZQUNWLENBQUM7WUFDRCxJQUFJLE9BQU8sSUFBSSxFQUFFLG9CQUFvQixLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEtBQUssT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM3Ryx1Q0FBdUM7Z0JBQ3ZDLFNBQVM7WUFDVixDQUFDO1lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN0QixDQUFDO1FBR0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUM7Z0JBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDaEYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNoRixNQUFNLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztZQUN0QixDQUFDO1lBQ0QsSUFBSSxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNyQyxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxlQUFlLENBQUMsQ0FBVSxFQUFFLENBQVU7UUFDN0MsSUFBSSxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2QyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUMsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztJQUNGLENBQUM7SUFFRCx3QkFBd0I7SUFFaEIsc0JBQXNCO1FBQzdCLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBRXhDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3hDLElBQUksS0FBSyxDQUFDLE1BQU0sb0NBQTRCLEVBQUUsQ0FBQztvQkFDOUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pCLENBQUM7WUFDRixDQUFDO1lBRUQsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxNQUFNLFlBQVksSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzVDLE1BQU0saUJBQWlCLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUNwRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDeEIsU0FBUztvQkFDVixDQUFDO29CQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN6RCxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUNWLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDOzRCQUN4QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDckQsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDO3dCQUN6QixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLElBQUksR0FBRyxJQUFJLFdBQVcsa0NBQTBCLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUM7d0JBQ3pPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBRXJDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFLENBQUM7NEJBQ3JELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0NBQ3ZCLHdDQUF3QztnQ0FDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29DQUNqRCxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQ2hDLGdCQUFnQixFQUNoQixtTkFBbU4sRUFDbk4sU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQzFCLENBQUMsQ0FBQztnQ0FDSixDQUFDOzRCQUNGLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRTtnQ0FDUixnQkFBZ0I7Z0NBQ2hCLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FDaEMsU0FBUyxFQUNULDZDQUE2QyxFQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUN4QixDQUFDLENBQUM7NEJBQ0osQ0FBQyxDQUFDLENBQUM7d0JBQ0osQ0FBQztvQkFFRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLGtCQUFrQjtRQUNsQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxFQUFFO1lBQ3BDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzdHLENBQUMsQ0FBQztRQUNGLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsMkJBQTJCLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ2pHLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQy9GLHVCQUF1QixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVPLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxTQUFxQixFQUFFLE1BQXVCO1FBQ3hGLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxNQUFNLEVBQUMsRUFBRTtZQUNyRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDNUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxJQUFJLENBQUMsbUJBQW1CLGtDQUEwQixhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDMUUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVE7Z0JBQ1IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNqRCxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSwrQkFBdUIsRUFBRSxDQUFDO3dCQUNyRCxJQUFJLENBQUMsbUJBQW1CLGtDQUEwQixhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7b0JBQzFFLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQjtRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDckMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUM7WUFDcEYsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3pELE1BQU0sSUFBSSxDQUFDLG1CQUFtQiw2QkFBcUIsa0JBQWtCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDckYsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3BHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ1IsTUFBTSxrQkFBa0IsRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxNQUFxQixFQUFFLE1BQVcsRUFBRSxNQUF1QjtRQUN0RixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDcEMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDO2dCQUNKLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3JELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLEVBQUUsQ0FBQztvQkFDekMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDL0QsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNuRixDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwRCxJQUFJLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDekQsaUJBQWlCLEVBQUUsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8saUJBQWlCLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8sZUFBZSxDQUFDLEdBQVEsRUFBRSxNQUFxQjtRQUN0RCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLElBQUksTUFBTSwrQkFBdUIsSUFBSSxHQUFHLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDdEQsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUNwSSxDQUFDO2FBQU0sSUFBSSxHQUFHLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUNuSSxDQUFDO1FBQ0QsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7U0FDdEMsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBdlNZLGVBQWU7SUFXekIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLCtCQUErQixDQUFBO0lBQy9CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLDZCQUE2QixDQUFBO0dBckJuQixlQUFlLENBdVMzQjs7QUFPRCxNQUFNLFVBQVUsc0JBQXNCLENBQUMsS0FBbUIsRUFBRSxRQUFrQjtJQUM3RTs7T0FFRztJQUNILE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDO0lBRTlCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUV0RixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLGlCQUFpQixDQUFDLENBQUM7SUFDaEUsS0FBSyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxPQUFPLElBQUksVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDdEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdEIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsT0FBTyxFQUFFLENBQUM7QUFDWCxDQUFDIn0=