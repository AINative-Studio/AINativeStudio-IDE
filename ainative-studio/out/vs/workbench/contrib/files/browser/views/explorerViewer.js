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
var FilesRenderer_1, FileDragAndDrop_1;
import * as DOM from '../../../../../base/browser/dom.js';
import * as glob from '../../../../../base/common/glob.js';
import { IProgressService, } from '../../../../../platform/progress/common/progress.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { IFileService, FileKind } from '../../../../../platform/files/common/files.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { isTemporaryWorkspace, IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Disposable, dispose, toDisposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IContextMenuService, IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ExplorerFindProviderActive } from '../../common/files.js';
import { dirname, joinPath, distinctParents, relativePath } from '../../../../../base/common/resources.js';
import { InputBox } from '../../../../../base/browser/ui/inputbox/inputBox.js';
import { localize } from '../../../../../nls.js';
import { createSingleCallFunction } from '../../../../../base/common/functional.js';
import { equals, deepClone } from '../../../../../base/common/objects.js';
import * as path from '../../../../../base/common/path.js';
import { ExplorerItem, NewExplorerItem } from '../../common/explorerModel.js';
import { compareFileExtensionsDefault, compareFileNamesDefault, compareFileNamesUpper, compareFileExtensionsUpper, compareFileNamesLower, compareFileExtensionsLower, compareFileNamesUnicode, compareFileExtensionsUnicode } from '../../../../../base/common/comparers.js';
import { CodeDataTransfers, containsDragType } from '../../../../../platform/dnd/browser/dnd.js';
import { fillEditorsDragData } from '../../../../browser/dnd.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { Schemas } from '../../../../../base/common/network.js';
import { NativeDragAndDropData, ExternalElementsDragAndDropData } from '../../../../../base/browser/ui/list/listView.js';
import { isMacintosh, isWeb } from '../../../../../base/common/platform.js';
import { IDialogService, getFileNamesMessage } from '../../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceEditingService } from '../../../../services/workspaces/common/workspaceEditing.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { findValidPasteFileTarget } from '../fileActions.js';
import { createMatches } from '../../../../../base/common/filters.js';
import { Emitter, Event, EventMultiplexer } from '../../../../../base/common/event.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { isNumber } from '../../../../../base/common/types.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceFileEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { IExplorerService } from '../files.js';
import { BrowserFileUpload, ExternalFileImport, getMultipleFilesOverwriteConfirm } from '../fileImportExport.js';
import { toErrorMessage } from '../../../../../base/common/errorMessage.js';
import { WebFileSystemAccess } from '../../../../../platform/files/browser/webFileSystemAccess.js';
import { IgnoreFile } from '../../../../services/search/common/ignoreFile.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { defaultCountBadgeStyles, defaultInputBoxStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { timeout } from '../../../../../base/common/async.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { explorerFileContribRegistry } from '../explorerFileContrib.js';
import { ISearchService, getExcludes } from '../../../../services/search/common/search.js';
import { TreeFindMatchType, TreeFindMode } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { CountBadge } from '../../../../../base/browser/ui/countBadge/countBadge.js';
import { listFilterMatchHighlight, listFilterMatchHighlightBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../platform/theme/common/colorUtils.js';
export class ExplorerDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return ExplorerDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return FilesRenderer.ID;
    }
}
export const explorerRootErrorEmitter = new Emitter();
let ExplorerDataSource = class ExplorerDataSource {
    constructor(fileFilter, findProvider, progressService, configService, notificationService, layoutService, fileService, explorerService, contextService, filesConfigService) {
        this.fileFilter = fileFilter;
        this.findProvider = findProvider;
        this.progressService = progressService;
        this.configService = configService;
        this.notificationService = notificationService;
        this.layoutService = layoutService;
        this.fileService = fileService;
        this.explorerService = explorerService;
        this.contextService = contextService;
        this.filesConfigService = filesConfigService;
    }
    getParent(element) {
        if (element.parent) {
            return element.parent;
        }
        throw new Error('getParent only supported for cached parents');
    }
    hasChildren(element) {
        // don't render nest parents as containing children when all the children are filtered out
        return Array.isArray(element) || element.hasChildren((stat) => this.fileFilter.filter(stat, 1 /* TreeVisibility.Visible */));
    }
    getChildren(element) {
        if (Array.isArray(element)) {
            return element;
        }
        if (this.findProvider.isShowingFilterResults()) {
            return Array.from(element.children.values());
        }
        const hasError = element.error;
        const sortOrder = this.explorerService.sortOrderConfiguration.sortOrder;
        const children = element.fetchChildren(sortOrder);
        if (Array.isArray(children)) {
            // fast path when children are known sync (i.e. nested children)
            return children;
        }
        const promise = children.then(children => {
            // Clear previous error decoration on root folder
            if (element instanceof ExplorerItem && element.isRoot && !element.error && hasError && this.contextService.getWorkbenchState() !== 2 /* WorkbenchState.FOLDER */) {
                explorerRootErrorEmitter.fire(element.resource);
            }
            return children;
        }, e => {
            if (element instanceof ExplorerItem && element.isRoot) {
                if (this.contextService.getWorkbenchState() === 2 /* WorkbenchState.FOLDER */) {
                    // Single folder create a dummy explorer item to show error
                    const placeholder = new ExplorerItem(element.resource, this.fileService, this.configService, this.filesConfigService, undefined, undefined, false);
                    placeholder.error = e;
                    return [placeholder];
                }
                else {
                    explorerRootErrorEmitter.fire(element.resource);
                }
            }
            else {
                // Do not show error for roots since we already use an explorer decoration to notify user
                this.notificationService.error(e);
            }
            return []; // we could not resolve any children because of an error
        });
        this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: this.layoutService.isRestored() ? 800 : 1500 // reduce progress visibility when still restoring
        }, _progress => promise);
        return promise;
    }
};
ExplorerDataSource = __decorate([
    __param(2, IProgressService),
    __param(3, IConfigurationService),
    __param(4, INotificationService),
    __param(5, IWorkbenchLayoutService),
    __param(6, IFileService),
    __param(7, IExplorerService),
    __param(8, IWorkspaceContextService),
    __param(9, IFilesConfigurationService)
], ExplorerDataSource);
export { ExplorerDataSource };
export class PhantomExplorerItem extends ExplorerItem {
    constructor(resource, fileService, configService, filesConfigService, _parent, _isDirectory) {
        super(resource, fileService, configService, filesConfigService, _parent, _isDirectory);
    }
}
class ExplorerFindHighlightTree {
    constructor() {
        this._tree = new Map();
        this._highlightedItems = new Map();
    }
    get highlightedItems() {
        return Array.from(this._highlightedItems.values());
    }
    get(item) {
        const result = this.find(item);
        if (result === undefined) {
            return 0;
        }
        const { treeLayer, relPath } = result;
        this._highlightedItems.set(relPath, item);
        return treeLayer.childMatches;
    }
    find(item) {
        const rootLayer = this._tree.get(item.root.name);
        if (rootLayer === undefined) {
            return undefined;
        }
        const relPath = relativePath(item.root.resource, item.resource);
        if (relPath === undefined || relPath.startsWith('..')) {
            throw new Error('Resource is not a child of the root');
        }
        if (relPath === '') {
            return { treeLayer: rootLayer, relPath };
        }
        let treeLayer = rootLayer;
        for (const segment of relPath.split('/')) {
            if (!treeLayer.stats[segment]) {
                return undefined;
            }
            treeLayer = treeLayer.stats[segment];
        }
        return { treeLayer, relPath };
    }
    add(resource, root) {
        const relPath = relativePath(root.resource, resource);
        if (relPath === undefined || relPath.startsWith('..')) {
            throw new Error('Resource is not a child of the root');
        }
        let rootLayer = this._tree.get(root.name);
        if (!rootLayer) {
            rootLayer = { childMatches: 0, stats: {}, isMatch: false };
            this._tree.set(root.name, rootLayer);
        }
        rootLayer.childMatches++;
        let treeLayer = rootLayer;
        for (const stat of relPath.split('/')) {
            if (!treeLayer.stats[stat]) {
                treeLayer.stats[stat] = { childMatches: 0, stats: {}, isMatch: false };
            }
            treeLayer = treeLayer.stats[stat];
            treeLayer.childMatches++;
        }
        treeLayer.childMatches--; // the last segment is the file itself
        treeLayer.isMatch = true;
    }
    isMatch(item) {
        const result = this.find(item);
        if (result === undefined) {
            return false;
        }
        const { treeLayer } = result;
        return treeLayer.isMatch;
    }
    clear() {
        this._tree.clear();
    }
}
let ExplorerFindProvider = class ExplorerFindProvider {
    get highlightTree() {
        return this.findHighlightTree;
    }
    constructor(filesFilter, treeProvider, searchService, fileService, configurationService, filesConfigService, progressService, explorerService, contextKeyService) {
        this.filesFilter = filesFilter;
        this.treeProvider = treeProvider;
        this.searchService = searchService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.filesConfigService = filesConfigService;
        this.progressService = progressService;
        this.explorerService = explorerService;
        this.sessionId = 0;
        this.phantomParents = new Set();
        this.findHighlightTree = new ExplorerFindHighlightTree();
        this.explorerFindActiveContextKey = ExplorerFindProviderActive.bindTo(contextKeyService);
    }
    isShowingFilterResults() {
        return !!this.filterSessionStartState;
    }
    isVisible(element) {
        if (!this.filterSessionStartState) {
            return true;
        }
        if (this.explorerService.isEditable(element)) {
            return true;
        }
        return this.filterSessionStartState.rootsWithProviders.has(element.root) ? element.isMarkedAsFiltered() : true;
    }
    startSession() {
        this.sessionId++;
    }
    async endSession() {
        // Restore view state
        if (this.filterSessionStartState) {
            await this.endFilterSession();
        }
        if (this.highlightSessionStartState) {
            this.endHighlightSession();
        }
    }
    async find(pattern, toggles, token) {
        const promise = this.doFind(pattern, toggles, token);
        return await this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: 750,
        }, _progress => promise);
    }
    async doFind(pattern, toggles, token) {
        if (toggles.findMode === TreeFindMode.Highlight) {
            if (this.filterSessionStartState) {
                await this.endFilterSession();
            }
            if (!this.highlightSessionStartState) {
                this.startHighlightSession();
            }
            return await this.doHighlightFind(pattern, toggles.matchType, token);
        }
        if (this.highlightSessionStartState) {
            this.endHighlightSession();
        }
        if (!this.filterSessionStartState) {
            this.startFilterSession();
        }
        return await this.doFilterFind(pattern, toggles.matchType, token);
    }
    // Filter
    startFilterSession() {
        const tree = this.treeProvider();
        const input = tree.getInput();
        if (!input) {
            return;
        }
        const roots = this.explorerService.roots.filter(root => this.searchSupportsScheme(root.resource.scheme));
        this.filterSessionStartState = { viewState: tree.getViewState(), input, rootsWithProviders: new Set(roots) };
        this.explorerFindActiveContextKey.set(true);
    }
    async doFilterFind(pattern, matchType, token) {
        if (!this.filterSessionStartState) {
            throw new Error('ExplorerFindProvider: no session state');
        }
        const roots = Array.from(this.filterSessionStartState.rootsWithProviders);
        const searchResults = await this.getSearchResults(pattern, roots, matchType, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        this.clearPhantomElements();
        for (const { explorerRoot, files, directories } of searchResults) {
            this.addWorkspaceFilterResults(explorerRoot, files, directories);
        }
        const tree = this.treeProvider();
        await tree.setInput(this.filterSessionStartState.input);
        const hitMaxResults = searchResults.some(({ hitMaxResults }) => hitMaxResults);
        return {
            isMatch: (item) => item.isMarkedAsFiltered(),
            matchCount: searchResults.reduce((acc, { files, directories }) => acc + files.length + directories.length, 0),
            warningMessage: hitMaxResults ? localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.") : undefined
        };
    }
    addWorkspaceFilterResults(root, files, directories) {
        const results = [
            ...files.map(file => ({ resource: file, isDirectory: false })),
            ...directories.map(directory => ({ resource: directory, isDirectory: true }))
        ];
        for (const { resource, isDirectory } of results) {
            const element = root.find(resource);
            if (element && element.root === root) {
                // File is already in the model
                element.markItemAndParentsAsFiltered();
                continue;
            }
            // File is not in the model, create phantom items for the file and it's parents
            const phantomElements = this.createPhantomItems(resource, root, isDirectory);
            if (phantomElements.length === 0) {
                throw new Error('Phantom item was not created even though it is not in the model');
            }
            // Store the first ancestor of the file which is already present in the model
            const firstPhantomParent = phantomElements[0].parent;
            if (!(firstPhantomParent instanceof PhantomExplorerItem)) {
                this.phantomParents.add(firstPhantomParent);
            }
            const phantomFileElement = phantomElements[phantomElements.length - 1];
            phantomFileElement.markItemAndParentsAsFiltered();
        }
    }
    createPhantomItems(resource, root, resourceIsDirectory) {
        const relativePathToRoot = relativePath(root.resource, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the root');
        }
        const phantomElements = [];
        let currentItem = root;
        let currentResource = root.resource;
        const pathSegments = relativePathToRoot.split('/');
        for (const stat of pathSegments) {
            currentResource = currentResource.with({ path: `${currentResource.path}/${stat}` });
            let child = currentItem.getChild(stat);
            if (!child) {
                const isDirectory = pathSegments[pathSegments.length - 1] === stat ? resourceIsDirectory : true;
                child = new PhantomExplorerItem(currentResource, this.fileService, this.configurationService, this.filesConfigService, currentItem, isDirectory);
                currentItem.addChild(child);
                phantomElements.push(child);
            }
            currentItem = child;
        }
        return phantomElements;
    }
    async endFilterSession() {
        this.clearPhantomElements();
        this.explorerFindActiveContextKey.set(false);
        // Restore view state
        if (!this.filterSessionStartState) {
            throw new Error('ExplorerFindProvider: no session state to restore');
        }
        const tree = this.treeProvider();
        await tree.setInput(this.filterSessionStartState.input, this.filterSessionStartState.viewState);
        this.filterSessionStartState = undefined;
        this.explorerService.refresh();
    }
    clearPhantomElements() {
        for (const phantomParent of this.phantomParents) {
            // Clear phantom nodes from model
            phantomParent.forgetChildren();
        }
        this.phantomParents.clear();
        this.explorerService.roots.forEach(root => root.unmarkItemAndChildren());
    }
    // Highlight
    startHighlightSession() {
        const roots = this.explorerService.roots.filter(root => this.searchSupportsScheme(root.resource.scheme));
        this.highlightSessionStartState = { rootsWithProviders: new Set(roots) };
    }
    async doHighlightFind(pattern, matchType, token) {
        if (!this.highlightSessionStartState) {
            throw new Error('ExplorerFindProvider: no highlight session state');
        }
        const roots = Array.from(this.highlightSessionStartState.rootsWithProviders);
        const searchResults = await this.getSearchResults(pattern, roots, matchType, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        this.clearHighlights();
        for (const { explorerRoot, files, directories } of searchResults) {
            this.addWorkspaceHighlightResults(explorerRoot, files.concat(directories));
        }
        const hitMaxResults = searchResults.some(({ hitMaxResults }) => hitMaxResults);
        return {
            isMatch: (item) => this.findHighlightTree.isMatch(item) || (this.findHighlightTree.get(item) > 0 && this.treeProvider().isCollapsed(item)),
            matchCount: searchResults.reduce((acc, { files, directories }) => acc + files.length + directories.length, 0),
            warningMessage: hitMaxResults ? localize('searchMaxResultsWarning', "The result set only contains a subset of all matches. Be more specific in your search to narrow down the results.") : undefined
        };
    }
    addWorkspaceHighlightResults(root, resources) {
        const highlightedDirectories = new Set();
        const storeDirectories = (item) => {
            while (item) {
                highlightedDirectories.add(item);
                item = item.parent;
            }
        };
        for (const resource of resources) {
            const element = root.find(resource);
            if (element && element.root === root) {
                // File is already in the model
                this.findHighlightTree.add(resource, root);
                storeDirectories(element.parent);
                continue;
            }
            const firstParent = findFirstParent(resource, root);
            if (firstParent) {
                this.findHighlightTree.add(resource, root);
                storeDirectories(firstParent.parent);
            }
        }
        const tree = this.treeProvider();
        for (const directory of highlightedDirectories) {
            if (tree.hasNode(directory)) {
                tree.rerender(directory);
            }
        }
    }
    endHighlightSession() {
        this.highlightSessionStartState = undefined;
        this.clearHighlights();
    }
    clearHighlights() {
        const tree = this.treeProvider();
        for (const item of this.findHighlightTree.highlightedItems) {
            if (tree.hasNode(item)) {
                tree.rerender(item);
            }
        }
        this.findHighlightTree.clear();
    }
    // Search
    searchSupportsScheme(scheme) {
        // Limited by the search API
        if (scheme !== Schemas.file && scheme !== Schemas.vscodeRemote) {
            return false;
        }
        return this.searchService.schemeHasFileSearchProvider(scheme);
    }
    async getSearchResults(pattern, roots, matchType, token) {
        const patternLowercase = pattern.toLowerCase();
        const isFuzzyMatch = matchType === TreeFindMatchType.Fuzzy;
        return await Promise.all(roots.map((root, index) => this.searchInWorkspace(patternLowercase, root, index, isFuzzyMatch, token)));
    }
    async searchInWorkspace(patternLowercase, root, rootIndex, isFuzzyMatch, token) {
        const segmentMatchPattern = caseInsensitiveGlobPattern(isFuzzyMatch ? fuzzyMatchingGlobPattern(patternLowercase) : continousMatchingGlobPattern(patternLowercase));
        const searchExcludePattern = getExcludes(this.configurationService.getValue({ resource: root.resource })) || {};
        const searchOptions = {
            folderQueries: [{
                    folder: root.resource,
                    disregardIgnoreFiles: !this.configurationService.getValue('explorer.excludeGitIgnore'),
                }],
            type: 1 /* QueryType.File */,
            shouldGlobMatchFilePattern: true,
            cacheKey: `explorerfindprovider:${root.name}:${rootIndex}:${this.sessionId}`,
            excludePattern: searchExcludePattern,
        };
        let fileResults;
        let folderResults;
        try {
            [fileResults, folderResults] = await Promise.all([
                this.searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}`, maxResults: 512 }, token),
                this.searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}/**` }, token)
            ]);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                throw e;
            }
        }
        if (!fileResults || !folderResults || token.isCancellationRequested) {
            return { explorerRoot: root, files: [], directories: [], hitMaxResults: false };
        }
        const fileResultResources = fileResults.results.map(result => result.resource);
        const directoryResources = getMatchingDirectoriesFromFiles(folderResults.results.map(result => result.resource), root, segmentMatchPattern);
        const filteredFileResources = fileResultResources.filter(resource => !this.filesFilter.isIgnored(resource, root.resource, false));
        const filteredDirectoryResources = directoryResources.filter(resource => !this.filesFilter.isIgnored(resource, root.resource, true));
        return { explorerRoot: root, files: filteredFileResources, directories: filteredDirectoryResources, hitMaxResults: !!fileResults.limitHit || !!folderResults.limitHit };
    }
};
ExplorerFindProvider = __decorate([
    __param(2, ISearchService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IFilesConfigurationService),
    __param(6, IProgressService),
    __param(7, IExplorerService),
    __param(8, IContextKeyService)
], ExplorerFindProvider);
export { ExplorerFindProvider };
function getMatchingDirectoriesFromFiles(resources, root, segmentMatchPattern) {
    const uniqueDirectories = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(root.resource, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the root');
        }
        let dirResource = root.resource;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueDirectories.add(dirResource);
        }
    }
    const matchingDirectories = [];
    for (const dirResource of uniqueDirectories) {
        const stats = dirResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingDirectories.push(dirResource);
    }
    return matchingDirectories;
}
function findFirstParent(resource, root) {
    const relativePathToRoot = relativePath(root.resource, resource);
    if (!relativePathToRoot) {
        throw new Error('Resource is not a child of the root');
    }
    let currentItem = root;
    let currentResource = root.resource;
    const pathSegments = relativePathToRoot.split('/');
    for (const stat of pathSegments) {
        currentResource = currentResource.with({ path: `${currentResource.path}/${stat}` });
        const child = currentItem.getChild(stat);
        if (!child) {
            return currentItem;
        }
        currentItem = child;
    }
    return undefined;
}
function fuzzyMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern.split('').join('*') + '*';
}
function continousMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern + '*';
}
function caseInsensitiveGlobPattern(pattern) {
    let caseInsensitiveFilePattern = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (/[a-zA-Z]/.test(char)) {
            caseInsensitiveFilePattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        else {
            caseInsensitiveFilePattern += char;
        }
    }
    return caseInsensitiveFilePattern;
}
export class CompressedNavigationController {
    static { this.ID = 0; }
    get index() { return this._index; }
    get count() { return this.items.length; }
    get current() { return this.items[this._index]; }
    get currentId() { return `${this.id}_${this.index}`; }
    get labels() { return this._labels; }
    constructor(id, items, templateData, depth, collapsed) {
        this.id = id;
        this.items = items;
        this.depth = depth;
        this.collapsed = collapsed;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._index = items.length - 1;
        this.updateLabels(templateData);
        this._updateLabelDisposable = templateData.label.onDidRender(() => this.updateLabels(templateData));
    }
    updateLabels(templateData) {
        this._labels = Array.from(templateData.container.querySelectorAll('.label-name'));
        let parents = '';
        for (let i = 0; i < this.labels.length; i++) {
            const ariaLabel = parents.length ? `${this.items[i].name}, compact, ${parents}` : this.items[i].name;
            this.labels[i].setAttribute('aria-label', ariaLabel);
            this.labels[i].setAttribute('aria-level', `${this.depth + i}`);
            parents = parents.length ? `${this.items[i].name} ${parents}` : this.items[i].name;
        }
        this.updateCollapsed(this.collapsed);
        if (this._index < this.labels.length) {
            this.labels[this._index].classList.add('active');
        }
    }
    previous() {
        if (this._index <= 0) {
            return;
        }
        this.setIndex(this._index - 1);
    }
    next() {
        if (this._index >= this.items.length - 1) {
            return;
        }
        this.setIndex(this._index + 1);
    }
    first() {
        if (this._index === 0) {
            return;
        }
        this.setIndex(0);
    }
    last() {
        if (this._index === this.items.length - 1) {
            return;
        }
        this.setIndex(this.items.length - 1);
    }
    setIndex(index) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        this.labels[this._index].classList.remove('active');
        this._index = index;
        this.labels[this._index].classList.add('active');
        this._onDidChange.fire();
    }
    updateCollapsed(collapsed) {
        this.collapsed = collapsed;
        for (let i = 0; i < this.labels.length; i++) {
            this.labels[i].setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
    }
    dispose() {
        this._onDidChange.dispose();
        this._updateLabelDisposable.dispose();
    }
}
let FilesRenderer = class FilesRenderer {
    static { FilesRenderer_1 = this; }
    static { this.ID = 'file'; }
    constructor(container, labels, highlightTree, updateWidth, contextViewService, themeService, configurationService, explorerService, labelService, contextService, contextMenuService, instantiationService) {
        this.labels = labels;
        this.highlightTree = highlightTree;
        this.updateWidth = updateWidth;
        this.contextViewService = contextViewService;
        this.themeService = themeService;
        this.configurationService = configurationService;
        this.explorerService = explorerService;
        this.labelService = labelService;
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.instantiationService = instantiationService;
        this.compressedNavigationControllers = new Map();
        this._onDidChangeActiveDescendant = new EventMultiplexer();
        this.onDidChangeActiveDescendant = this._onDidChangeActiveDescendant.event;
        this.config = this.configurationService.getValue();
        const updateOffsetStyles = () => {
            const indent = this.configurationService.getValue('workbench.tree.indent');
            const offset = Math.max(22 - indent, 0); // derived via inspection
            container.style.setProperty(`--vscode-explorer-align-offset-margin-left`, `${offset}px`);
        };
        this.configListener = this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('explorer')) {
                this.config = this.configurationService.getValue();
            }
            if (e.affectsConfiguration('workbench.tree.indent')) {
                updateOffsetStyles();
            }
        });
        updateOffsetStyles();
    }
    getWidgetAriaLabel() {
        return localize('treeAriaLabel', "Files Explorer");
    }
    get templateId() {
        return FilesRenderer_1.ID;
    }
    // Void added this
    // // Create void buttons container
    // const voidButtonsContainer = DOM.append(container, DOM.$('div'));
    // voidButtonsContainer.style.position = 'absolute'
    // voidButtonsContainer.style.top = '0'
    // voidButtonsContainer.style.right = '0'
    // // const voidButtons = DOM.append(voidButtonsContainer, DOM.$('span'));
    // // voidButtons.textContent = 'voidbuttons'
    // // voidButtons.addEventListener('click', () => {
    // // 	console.log('ON CLICK', templateData.currentContext?.children)
    // // })
    // const voidLabels = this.labels.create(voidButtonsContainer, { supportHighlights: false, supportIcons: false, });
    // voidLabels.element.textContent = 'hi333'
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        const label = templateDisposables.add(this.labels.create(container, { supportHighlights: true }));
        templateDisposables.add(label.onDidRender(() => {
            try {
                if (templateData.currentContext) {
                    this.updateWidth(templateData.currentContext);
                }
            }
            catch (e) {
                // noop since the element might no longer be in the tree, no update of width necessary
            }
        }));
        const contribs = explorerFileContribRegistry.create(this.instantiationService, container, templateDisposables);
        templateDisposables.add(explorerFileContribRegistry.onDidRegisterDescriptor(d => {
            const contr = d.create(this.instantiationService, container);
            contribs.push(templateDisposables.add(contr));
            contr.setResource(templateData.currentContext?.resource);
        }));
        const templateData = { templateDisposables, elementDisposables: templateDisposables.add(new DisposableStore()), label, container, contribs };
        return templateData;
    }
    // Void cares about this function, this is where elements in the tree are rendered
    renderElement(node, index, templateData) {
        const stat = node.element;
        templateData.currentContext = stat;
        const editableData = this.explorerService.getEditableData(stat);
        templateData.label.element.classList.remove('compressed');
        // File Label
        if (!editableData) {
            templateData.label.element.style.display = 'flex';
            this.renderStat(stat, stat.name, undefined, node.filterData, templateData);
        }
        // Input Box
        else {
            templateData.label.element.style.display = 'none';
            templateData.contribs.forEach(c => c.setResource(undefined));
            templateData.elementDisposables.add(this.renderInputBox(templateData.container, stat, editableData));
        }
    }
    renderCompressedElements(node, index, templateData, height) {
        const stat = node.element.elements[node.element.elements.length - 1];
        templateData.currentContext = stat;
        const editable = node.element.elements.filter(e => this.explorerService.isEditable(e));
        const editableData = editable.length === 0 ? undefined : this.explorerService.getEditableData(editable[0]);
        // File Label
        if (!editableData) {
            templateData.label.element.classList.add('compressed');
            templateData.label.element.style.display = 'flex';
            const id = `compressed-explorer_${CompressedNavigationController.ID++}`;
            const labels = node.element.elements.map(e => e.name);
            // If there is a fuzzy score, we need to adjust the offset of the score
            // to align with the last stat of the compressed label
            let fuzzyScore = node.filterData;
            if (fuzzyScore && fuzzyScore.length > 2) {
                const filterDataOffset = labels.join('/').length - labels[labels.length - 1].length;
                fuzzyScore = [fuzzyScore[0], fuzzyScore[1] + filterDataOffset, ...fuzzyScore.slice(2)];
            }
            this.renderStat(stat, labels, id, fuzzyScore, templateData);
            const compressedNavigationController = new CompressedNavigationController(id, node.element.elements, templateData, node.depth, node.collapsed);
            templateData.elementDisposables.add(compressedNavigationController);
            const nodeControllers = this.compressedNavigationControllers.get(stat) ?? [];
            this.compressedNavigationControllers.set(stat, [...nodeControllers, compressedNavigationController]);
            // accessibility
            templateData.elementDisposables.add(this._onDidChangeActiveDescendant.add(compressedNavigationController.onDidChange));
            templateData.elementDisposables.add(DOM.addDisposableListener(templateData.container, 'mousedown', e => {
                const result = getIconLabelNameFromHTMLElement(e.target);
                if (result) {
                    compressedNavigationController.setIndex(result.index);
                }
            }));
            templateData.elementDisposables.add(toDisposable(() => {
                const nodeControllers = this.compressedNavigationControllers.get(stat) ?? [];
                const renderedIndex = nodeControllers.findIndex(controller => controller === compressedNavigationController);
                if (renderedIndex < 0) {
                    throw new Error('Disposing unknown navigation controller');
                }
                if (nodeControllers.length === 1) {
                    this.compressedNavigationControllers.delete(stat);
                }
                else {
                    nodeControllers.splice(renderedIndex, 1);
                }
            }));
        }
        // Input Box
        else {
            templateData.label.element.classList.remove('compressed');
            templateData.label.element.style.display = 'none';
            templateData.contribs.forEach(c => c.setResource(undefined));
            templateData.elementDisposables.add(this.renderInputBox(templateData.container, editable[0], editableData));
        }
    }
    renderStat(stat, label, domId, filterData, templateData) {
        templateData.label.element.style.display = 'flex';
        const extraClasses = ['explorer-item'];
        if (this.explorerService.isCut(stat)) {
            extraClasses.push('cut');
        }
        // Offset nested children unless folders have both chevrons and icons, otherwise alignment breaks
        const theme = this.themeService.getFileIconTheme();
        // Hack to always render chevrons for file nests, or else may not be able to identify them.
        const twistieContainer = templateData.container.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.toggle('force-twistie', stat.hasNests && theme.hidesExplorerArrows);
        // when explorer arrows are hidden or there are no folder icons, nests get misaligned as they are forced to have arrows and files typically have icons
        // Apply some CSS magic to get things looking as reasonable as possible.
        const themeIsUnhappyWithNesting = theme.hasFileIcons && (theme.hidesExplorerArrows || !theme.hasFolderIcons);
        const realignNestedChildren = stat.nestedParent && themeIsUnhappyWithNesting;
        templateData.contribs.forEach(c => c.setResource(stat.resource));
        templateData.label.setResource({ resource: stat.resource, name: label }, {
            fileKind: stat.isRoot ? FileKind.ROOT_FOLDER : stat.isDirectory ? FileKind.FOLDER : FileKind.FILE,
            extraClasses: realignNestedChildren ? [...extraClasses, 'align-nest-icon-with-parent-icon'] : extraClasses,
            fileDecorations: this.config.explorer.decorations,
            matches: createMatches(filterData),
            separator: this.labelService.getSeparator(stat.resource.scheme, stat.resource.authority),
            domId
        });
        const highlightResults = stat.isDirectory ? this.highlightTree.get(stat) : 0;
        if (highlightResults > 0) {
            const badge = new CountBadge(templateData.label.element.lastElementChild, {}, { ...defaultCountBadgeStyles, badgeBackground: asCssVariable(listFilterMatchHighlight), badgeBorder: asCssVariable(listFilterMatchHighlightBorder) });
            badge.setCount(highlightResults);
            badge.setTitleFormat(localize('explorerHighlightFolderBadgeTitle', "Directory contains {0} matches", highlightResults));
            templateData.elementDisposables.add(badge);
        }
        templateData.label.element.classList.toggle('highlight-badge', highlightResults > 0);
    }
    renderInputBox(container, stat, editableData) {
        // Use a file label only for the icon next to the input box
        const label = this.labels.create(container);
        const extraClasses = ['explorer-item', 'explorer-item-edited'];
        const fileKind = stat.isRoot ? FileKind.ROOT_FOLDER : stat.isDirectory ? FileKind.FOLDER : FileKind.FILE;
        const theme = this.themeService.getFileIconTheme();
        const themeIsUnhappyWithNesting = theme.hasFileIcons && (theme.hidesExplorerArrows || !theme.hasFolderIcons);
        const realignNestedChildren = stat.nestedParent && themeIsUnhappyWithNesting;
        const labelOptions = {
            hidePath: true,
            hideLabel: true,
            fileKind,
            extraClasses: realignNestedChildren ? [...extraClasses, 'align-nest-icon-with-parent-icon'] : extraClasses,
        };
        const parent = stat.name ? dirname(stat.resource) : stat.resource;
        const value = stat.name || '';
        label.setFile(joinPath(parent, value || ' '), labelOptions); // Use icon for ' ' if name is empty.
        // hack: hide label
        label.element.firstElementChild.style.display = 'none';
        // Input field for name
        const inputBox = new InputBox(label.element, this.contextViewService, {
            validationOptions: {
                validation: (value) => {
                    const message = editableData.validationMessage(value);
                    if (!message || message.severity !== Severity.Error) {
                        return null;
                    }
                    return {
                        content: message.content,
                        formatContent: true,
                        type: 3 /* MessageType.ERROR */
                    };
                }
            },
            ariaLabel: localize('fileInputAriaLabel', "Type file name. Press Enter to confirm or Escape to cancel."),
            inputBoxStyles: defaultInputBoxStyles,
        });
        const lastDot = value.lastIndexOf('.');
        let currentSelectionState = 'prefix';
        inputBox.value = value;
        inputBox.focus();
        inputBox.select({ start: 0, end: lastDot > 0 && !stat.isDirectory ? lastDot : value.length });
        const done = createSingleCallFunction((success, finishEditing) => {
            label.element.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            label.element.remove();
            if (finishEditing) {
                editableData.onFinish(value, success);
            }
        });
        const showInputBoxNotification = () => {
            if (inputBox.isInputValid()) {
                const message = editableData.validationMessage(inputBox.value);
                if (message) {
                    inputBox.showMessage({
                        content: message.content,
                        formatContent: true,
                        type: message.severity === Severity.Info ? 1 /* MessageType.INFO */ : message.severity === Severity.Warning ? 2 /* MessageType.WARNING */ : 3 /* MessageType.ERROR */
                    });
                }
                else {
                    inputBox.hideMessage();
                }
            }
        };
        showInputBoxNotification();
        const toDispose = [
            inputBox,
            inputBox.onDidChange(value => {
                label.setFile(joinPath(parent, value || ' '), labelOptions); // update label icon while typing!
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_DOWN, (e) => {
                if (e.equals(60 /* KeyCode.F2 */)) {
                    const dotIndex = inputBox.value.lastIndexOf('.');
                    if (stat.isDirectory || dotIndex === -1) {
                        return;
                    }
                    if (currentSelectionState === 'prefix') {
                        currentSelectionState = 'all';
                        inputBox.select({ start: 0, end: inputBox.value.length });
                    }
                    else if (currentSelectionState === 'all') {
                        currentSelectionState = 'suffix';
                        inputBox.select({ start: dotIndex + 1, end: inputBox.value.length });
                    }
                    else {
                        currentSelectionState = 'prefix';
                        inputBox.select({ start: 0, end: dotIndex });
                    }
                }
                else if (e.equals(3 /* KeyCode.Enter */)) {
                    if (!inputBox.validate()) {
                        done(true, true);
                    }
                }
                else if (e.equals(9 /* KeyCode.Escape */)) {
                    done(false, true);
                }
            }),
            DOM.addStandardDisposableListener(inputBox.inputElement, DOM.EventType.KEY_UP, (e) => {
                showInputBoxNotification();
            }),
            DOM.addDisposableListener(inputBox.inputElement, DOM.EventType.BLUR, async () => {
                while (true) {
                    await timeout(0);
                    const ownerDocument = inputBox.inputElement.ownerDocument;
                    if (!ownerDocument.hasFocus()) {
                        break;
                    }
                    if (DOM.isActiveElement(inputBox.inputElement)) {
                        return;
                    }
                    else if (DOM.isHTMLElement(ownerDocument.activeElement) && DOM.hasParentWithClass(ownerDocument.activeElement, 'context-view')) {
                        await Event.toPromise(this.contextMenuService.onDidHideContextMenu);
                    }
                    else {
                        break;
                    }
                }
                done(inputBox.isInputValid(), true);
            }),
            label
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(element, index, templateData) {
        templateData.currentContext = undefined;
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.currentContext = undefined;
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    getCompressedNavigationController(stat) {
        return this.compressedNavigationControllers.get(stat);
    }
    // IAccessibilityProvider
    getAriaLabel(element) {
        return element.name;
    }
    getAriaLevel(element) {
        // We need to comput aria level on our own since children of compact folders will otherwise have an incorrect level	#107235
        let depth = 0;
        let parent = element.parent;
        while (parent) {
            parent = parent.parent;
            depth++;
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            depth = depth + 1;
        }
        return depth;
    }
    getActiveDescendantId(stat) {
        return this.compressedNavigationControllers.get(stat)?.[0]?.currentId ?? undefined;
    }
    dispose() {
        this.configListener.dispose();
    }
};
FilesRenderer = FilesRenderer_1 = __decorate([
    __param(4, IContextViewService),
    __param(5, IThemeService),
    __param(6, IConfigurationService),
    __param(7, IExplorerService),
    __param(8, ILabelService),
    __param(9, IWorkspaceContextService),
    __param(10, IContextMenuService),
    __param(11, IInstantiationService)
], FilesRenderer);
export { FilesRenderer };
/**
 * Respects files.exclude setting in filtering out content from the explorer.
 * Makes sure that visible editors are always shown in the explorer even if they are filtered out by settings.
 */
let FilesFilter = class FilesFilter {
    constructor(contextService, configurationService, explorerService, editorService, uriIdentityService, fileService) {
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.hiddenExpressionPerRoot = new Map();
        this.editorsAffectingFilter = new Set();
        this._onDidChange = new Emitter();
        this.toDispose = [];
        // List of ignoreFile resources. Used to detect changes to the ignoreFiles.
        this.ignoreFileResourcesPerRoot = new Map();
        // Ignore tree per root. Similar to `hiddenExpressionPerRoot`
        // Note: URI in the ternary search tree is the URI of the folder containing the ignore file
        // It is not the ignore file itself. This is because of the way the IgnoreFile works and nested paths
        this.ignoreTreesPerRoot = new Map();
        this.toDispose.push(this.contextService.onDidChangeWorkspaceFolders(() => this.updateConfiguration()));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('files.exclude') || e.affectsConfiguration('explorer.excludeGitIgnore')) {
                this.updateConfiguration();
            }
        }));
        this.toDispose.push(this.fileService.onDidFilesChange(e => {
            // Check to see if the update contains any of the ignoreFileResources
            for (const [root, ignoreFileResourceSet] of this.ignoreFileResourcesPerRoot.entries()) {
                ignoreFileResourceSet.forEach(async (ignoreResource) => {
                    if (e.contains(ignoreResource, 0 /* FileChangeType.UPDATED */)) {
                        await this.processIgnoreFile(root, ignoreResource, true);
                    }
                    if (e.contains(ignoreResource, 2 /* FileChangeType.DELETED */)) {
                        this.ignoreTreesPerRoot.get(root)?.delete(dirname(ignoreResource));
                        ignoreFileResourceSet.delete(ignoreResource);
                        this._onDidChange.fire();
                    }
                });
            }
        }));
        this.toDispose.push(this.editorService.onDidVisibleEditorsChange(() => {
            const editors = this.editorService.visibleEditors;
            let shouldFire = false;
            for (const e of editors) {
                if (!e.resource) {
                    continue;
                }
                const stat = this.explorerService.findClosest(e.resource);
                if (stat && stat.isExcluded) {
                    // A filtered resource suddenly became visible since user opened an editor
                    shouldFire = true;
                    break;
                }
            }
            for (const e of this.editorsAffectingFilter) {
                if (!editors.includes(e)) {
                    // Editor that was affecting filtering is no longer visible
                    shouldFire = true;
                    break;
                }
            }
            if (shouldFire) {
                this.editorsAffectingFilter.clear();
                this._onDidChange.fire();
            }
        }));
        this.updateConfiguration();
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    updateConfiguration() {
        let shouldFire = false;
        let updatedGitIgnoreSetting = false;
        this.contextService.getWorkspace().folders.forEach(folder => {
            const configuration = this.configurationService.getValue({ resource: folder.uri });
            const excludesConfig = configuration?.files?.exclude || Object.create(null);
            const parseIgnoreFile = configuration.explorer.excludeGitIgnore;
            // If we should be parsing ignoreFiles for this workspace and don't have an ignore tree initialize one
            if (parseIgnoreFile && !this.ignoreTreesPerRoot.has(folder.uri.toString())) {
                updatedGitIgnoreSetting = true;
                this.ignoreFileResourcesPerRoot.set(folder.uri.toString(), new ResourceSet());
                this.ignoreTreesPerRoot.set(folder.uri.toString(), TernarySearchTree.forUris((uri) => this.uriIdentityService.extUri.ignorePathCasing(uri)));
            }
            // If we shouldn't be parsing ignore files but have an ignore tree, clear the ignore tree
            if (!parseIgnoreFile && this.ignoreTreesPerRoot.has(folder.uri.toString())) {
                updatedGitIgnoreSetting = true;
                this.ignoreFileResourcesPerRoot.delete(folder.uri.toString());
                this.ignoreTreesPerRoot.delete(folder.uri.toString());
            }
            if (!shouldFire) {
                const cached = this.hiddenExpressionPerRoot.get(folder.uri.toString());
                shouldFire = !cached || !equals(cached.original, excludesConfig);
            }
            const excludesConfigCopy = deepClone(excludesConfig); // do not keep the config, as it gets mutated under our hoods
            this.hiddenExpressionPerRoot.set(folder.uri.toString(), { original: excludesConfigCopy, parsed: glob.parse(excludesConfigCopy) });
        });
        if (shouldFire || updatedGitIgnoreSetting) {
            this.editorsAffectingFilter.clear();
            this._onDidChange.fire();
        }
    }
    /**
     * Given a .gitignore file resource, processes the resource and adds it to the ignore tree which hides explorer items
     * @param root The root folder of the workspace as a string. Used for lookup key for ignore tree and resource list
     * @param ignoreFileResource The resource of the .gitignore file
     * @param update Whether or not we're updating an existing ignore file. If true it deletes the old entry
     */
    async processIgnoreFile(root, ignoreFileResource, update) {
        // Get the name of the directory which the ignore file is in
        const dirUri = dirname(ignoreFileResource);
        const ignoreTree = this.ignoreTreesPerRoot.get(root);
        if (!ignoreTree) {
            return;
        }
        // Don't process a directory if we already have it in the tree
        if (!update && ignoreTree.has(dirUri)) {
            return;
        }
        // Maybe we need a cancellation token here in case it's super long?
        const content = await this.fileService.readFile(ignoreFileResource);
        // If it's just an update we update the contents keeping all references the same
        if (update) {
            const ignoreFile = ignoreTree.get(dirUri);
            ignoreFile?.updateContents(content.value.toString());
        }
        else {
            // Otherwise we create a new ignorefile and add it to the tree
            const ignoreParent = ignoreTree.findSubstr(dirUri);
            const ignoreFile = new IgnoreFile(content.value.toString(), dirUri.path, ignoreParent);
            ignoreTree.set(dirUri, ignoreFile);
            // If we haven't seen this resource before then we need to add it to the list of resources we're tracking
            if (!this.ignoreFileResourcesPerRoot.get(root)?.has(ignoreFileResource)) {
                this.ignoreFileResourcesPerRoot.get(root)?.add(ignoreFileResource);
            }
        }
        // Notify the explorer of the change so we may ignore these files
        this._onDidChange.fire();
    }
    filter(stat, parentVisibility) {
        // Add newly visited .gitignore files to the ignore tree
        if (stat.name === '.gitignore' && this.ignoreTreesPerRoot.has(stat.root.resource.toString())) {
            this.processIgnoreFile(stat.root.resource.toString(), stat.resource, false);
            return true;
        }
        return this.isVisible(stat, parentVisibility);
    }
    isVisible(stat, parentVisibility) {
        stat.isExcluded = false;
        if (parentVisibility === 0 /* TreeVisibility.Hidden */) {
            stat.isExcluded = true;
            return false;
        }
        if (this.explorerService.getEditableData(stat)) {
            return true; // always visible
        }
        // Hide those that match Hidden Patterns
        const cached = this.hiddenExpressionPerRoot.get(stat.root.resource.toString());
        const globMatch = cached?.parsed(path.relative(stat.root.resource.path, stat.resource.path), stat.name, name => !!(stat.parent && stat.parent.getChild(name)));
        // Small optimization to only run isHiddenResource (traverse gitIgnore) if the globMatch from fileExclude returned nothing
        const isHiddenResource = !!globMatch ? true : this.isIgnored(stat.resource, stat.root.resource, stat.isDirectory);
        if (isHiddenResource || stat.parent?.isExcluded) {
            stat.isExcluded = true;
            const editors = this.editorService.visibleEditors;
            const editor = editors.find(e => e.resource && this.uriIdentityService.extUri.isEqualOrParent(e.resource, stat.resource));
            if (editor && stat.root === this.explorerService.findClosestRoot(stat.resource)) {
                this.editorsAffectingFilter.add(editor);
                return true; // Show all opened files and their parents
            }
            return false; // hidden through pattern
        }
        return true;
    }
    isIgnored(resource, rootResource, isDirectory) {
        const ignoreFile = this.ignoreTreesPerRoot.get(rootResource.toString())?.findSubstr(resource);
        const isIncludedInTraversal = ignoreFile?.isPathIncludedInTraversal(resource.path, isDirectory);
        // Doing !undefined returns true and we want it to be false when undefined because that means it's not included in the ignore file
        return isIncludedInTraversal === undefined ? false : !isIncludedInTraversal;
    }
    dispose() {
        dispose(this.toDispose);
    }
};
FilesFilter = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IConfigurationService),
    __param(2, IExplorerService),
    __param(3, IEditorService),
    __param(4, IUriIdentityService),
    __param(5, IFileService)
], FilesFilter);
export { FilesFilter };
// Explorer Sorter
let FileSorter = class FileSorter {
    constructor(explorerService, contextService) {
        this.explorerService = explorerService;
        this.contextService = contextService;
    }
    compare(statA, statB) {
        // Do not sort roots
        if (statA.isRoot) {
            if (statB.isRoot) {
                const workspaceA = this.contextService.getWorkspaceFolder(statA.resource);
                const workspaceB = this.contextService.getWorkspaceFolder(statB.resource);
                return workspaceA && workspaceB ? (workspaceA.index - workspaceB.index) : -1;
            }
            return -1;
        }
        if (statB.isRoot) {
            return 1;
        }
        const sortOrder = this.explorerService.sortOrderConfiguration.sortOrder;
        const lexicographicOptions = this.explorerService.sortOrderConfiguration.lexicographicOptions;
        const reverse = this.explorerService.sortOrderConfiguration.reverse;
        if (reverse) {
            [statA, statB] = [statB, statA];
        }
        let compareFileNames;
        let compareFileExtensions;
        switch (lexicographicOptions) {
            case 'upper':
                compareFileNames = compareFileNamesUpper;
                compareFileExtensions = compareFileExtensionsUpper;
                break;
            case 'lower':
                compareFileNames = compareFileNamesLower;
                compareFileExtensions = compareFileExtensionsLower;
                break;
            case 'unicode':
                compareFileNames = compareFileNamesUnicode;
                compareFileExtensions = compareFileExtensionsUnicode;
                break;
            default:
                // 'default'
                compareFileNames = compareFileNamesDefault;
                compareFileExtensions = compareFileExtensionsDefault;
        }
        // Sort Directories
        switch (sortOrder) {
            case 'type':
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                if (statA.isDirectory && statB.isDirectory) {
                    return compareFileNames(statA.name, statB.name);
                }
                break;
            case 'filesFirst':
                if (statA.isDirectory && !statB.isDirectory) {
                    return 1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return -1;
                }
                break;
            case 'foldersNestsFiles':
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                if (statA.hasNests && !statB.hasNests) {
                    return -1;
                }
                if (statB.hasNests && !statA.hasNests) {
                    return 1;
                }
                break;
            case 'mixed':
                break; // not sorting when "mixed" is on
            default: /* 'default', 'modified' */
                if (statA.isDirectory && !statB.isDirectory) {
                    return -1;
                }
                if (statB.isDirectory && !statA.isDirectory) {
                    return 1;
                }
                break;
        }
        // Sort Files
        switch (sortOrder) {
            case 'type':
                return compareFileExtensions(statA.name, statB.name);
            case 'modified':
                if (statA.mtime !== statB.mtime) {
                    return (statA.mtime && statB.mtime && statA.mtime < statB.mtime) ? 1 : -1;
                }
                return compareFileNames(statA.name, statB.name);
            default: /* 'default', 'mixed', 'filesFirst' */
                return compareFileNames(statA.name, statB.name);
        }
    }
};
FileSorter = __decorate([
    __param(0, IExplorerService),
    __param(1, IWorkspaceContextService)
], FileSorter);
export { FileSorter };
let FileDragAndDrop = class FileDragAndDrop {
    static { FileDragAndDrop_1 = this; }
    static { this.CONFIRM_DND_SETTING_KEY = 'explorer.confirmDragAndDrop'; }
    constructor(isCollapsed, explorerService, editorService, dialogService, contextService, fileService, configurationService, instantiationService, workspaceEditingService, uriIdentityService) {
        this.isCollapsed = isCollapsed;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.contextService = contextService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.workspaceEditingService = workspaceEditingService;
        this.uriIdentityService = uriIdentityService;
        this.compressedDropTargetDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this.dropEnabled = false;
        const updateDropEnablement = (e) => {
            if (!e || e.affectsConfiguration('explorer.enableDragAndDrop')) {
                this.dropEnabled = this.configurationService.getValue('explorer.enableDragAndDrop');
            }
        };
        updateDropEnablement(undefined);
        this.disposables.add(this.configurationService.onDidChangeConfiguration(e => updateDropEnablement(e)));
    }
    onDragOver(data, target, targetIndex, targetSector, originalEvent) {
        if (!this.dropEnabled) {
            return false;
        }
        // Compressed folders
        if (target) {
            const compressedTarget = FileDragAndDrop_1.getCompressedStatFromDragEvent(target, originalEvent);
            if (compressedTarget) {
                const iconLabelName = getIconLabelNameFromHTMLElement(originalEvent.target);
                if (iconLabelName && iconLabelName.index < iconLabelName.count - 1) {
                    const result = this.handleDragOver(data, compressedTarget, targetIndex, targetSector, originalEvent);
                    if (result) {
                        if (iconLabelName.element !== this.compressedDragOverElement) {
                            this.compressedDragOverElement = iconLabelName.element;
                            this.compressedDropTargetDisposable.dispose();
                            this.compressedDropTargetDisposable = toDisposable(() => {
                                iconLabelName.element.classList.remove('drop-target');
                                this.compressedDragOverElement = undefined;
                            });
                            iconLabelName.element.classList.add('drop-target');
                        }
                        return typeof result === 'boolean' ? result : { ...result, feedback: [] };
                    }
                    this.compressedDropTargetDisposable.dispose();
                    return false;
                }
            }
        }
        this.compressedDropTargetDisposable.dispose();
        return this.handleDragOver(data, target, targetIndex, targetSector, originalEvent);
    }
    handleDragOver(data, target, targetIndex, targetSector, originalEvent) {
        const isCopy = originalEvent && ((originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh));
        const isNative = data instanceof NativeDragAndDropData;
        const effectType = (isNative || isCopy) ? 0 /* ListDragOverEffectType.Copy */ : 1 /* ListDragOverEffectType.Move */;
        const effect = { type: effectType, position: "drop-target" /* ListDragOverEffectPosition.Over */ };
        // Native DND
        if (isNative) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES, DataTransfers.RESOURCES)) {
                return false;
            }
        }
        // Other-Tree DND
        else if (data instanceof ExternalElementsDragAndDropData) {
            return false;
        }
        // In-Explorer DND
        else {
            const items = FileDragAndDrop_1.getStatsFromDragAndDropData(data);
            const isRootsReorder = items.every(item => item.isRoot);
            if (!target) {
                // Dropping onto the empty area. Do not accept if items dragged are already
                // children of the root unless we are copying the file
                if (!isCopy && items.every(i => !!i.parent && i.parent.isRoot)) {
                    return false;
                }
                // root is added after last root folder when hovering on empty background
                if (isRootsReorder) {
                    return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */, position: "drop-target-after" /* ListDragOverEffectPosition.After */ } };
                }
                return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect, autoExpand: false };
            }
            if (!Array.isArray(items)) {
                return false;
            }
            if (!isCopy && items.every((source) => source.isReadonly)) {
                return false; // Cannot move readonly items unless we copy
            }
            if (items.some((source) => {
                if (source.isRoot) {
                    return false; // Root folders are handled seperately
                }
                if (this.uriIdentityService.extUri.isEqual(source.resource, target.resource)) {
                    return true; // Can not move anything onto itself excpet for root folders
                }
                if (!isCopy && this.uriIdentityService.extUri.isEqual(dirname(source.resource), target.resource)) {
                    return true; // Can not move a file to the same parent unless we copy
                }
                if (this.uriIdentityService.extUri.isEqualOrParent(target.resource, source.resource)) {
                    return true; // Can not move a parent folder into one of its children
                }
                return false;
            })) {
                return false;
            }
            // reordering roots
            if (isRootsReorder) {
                if (!target.isRoot) {
                    return false;
                }
                let dropEffectPosition = undefined;
                switch (targetSector) {
                    case 0 /* ListViewTargetSector.TOP */:
                    case 1 /* ListViewTargetSector.CENTER_TOP */:
                        dropEffectPosition = "drop-target-before" /* ListDragOverEffectPosition.Before */;
                        break;
                    case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    case 3 /* ListViewTargetSector.BOTTOM */:
                        dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
                        break;
                }
                return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */, position: dropEffectPosition } };
            }
        }
        // All (target = model)
        if (!target) {
            return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect };
        }
        // All (target = file/folder)
        else {
            if (target.isDirectory) {
                if (target.isReadonly) {
                    return false;
                }
                return { accept: true, bubble: 0 /* TreeDragOverBubble.Down */, effect, autoExpand: true };
            }
            if (this.contextService.getWorkspace().folders.every(folder => folder.uri.toString() !== target.resource.toString())) {
                return { accept: true, bubble: 1 /* TreeDragOverBubble.Up */, effect };
            }
        }
        return false;
    }
    getDragURI(element) {
        if (this.explorerService.isEditable(element)) {
            return null;
        }
        return element.resource.toString();
    }
    getDragLabel(elements, originalEvent) {
        if (elements.length === 1) {
            const stat = FileDragAndDrop_1.getCompressedStatFromDragEvent(elements[0], originalEvent);
            return stat.name;
        }
        return String(elements.length);
    }
    onDragStart(data, originalEvent) {
        const items = FileDragAndDrop_1.getStatsFromDragAndDropData(data, originalEvent);
        if (items && items.length && originalEvent.dataTransfer) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, items, originalEvent));
            // The only custom data transfer we set from the explorer is a file transfer
            // to be able to DND between multiple code file explorers across windows
            const fileResources = items.filter(s => s.resource.scheme === Schemas.file).map(r => r.resource.fsPath);
            if (fileResources.length) {
                originalEvent.dataTransfer.setData(CodeDataTransfers.FILES, JSON.stringify(fileResources));
            }
        }
    }
    async drop(data, target, targetIndex, targetSector, originalEvent) {
        this.compressedDropTargetDisposable.dispose();
        // Find compressed target
        if (target) {
            const compressedTarget = FileDragAndDrop_1.getCompressedStatFromDragEvent(target, originalEvent);
            if (compressedTarget) {
                target = compressedTarget;
            }
        }
        // Find parent to add to
        if (!target) {
            target = this.explorerService.roots[this.explorerService.roots.length - 1];
            targetSector = 3 /* ListViewTargetSector.BOTTOM */;
        }
        if (!target.isDirectory && target.parent) {
            target = target.parent;
        }
        if (target.isReadonly) {
            return;
        }
        const resolvedTarget = target;
        if (!resolvedTarget) {
            return;
        }
        try {
            // External file DND (Import/Upload file)
            if (data instanceof NativeDragAndDropData) {
                // Use local file import when supported
                if (!isWeb || (isTemporaryWorkspace(this.contextService.getWorkspace()) && WebFileSystemAccess.supported(mainWindow))) {
                    const fileImport = this.instantiationService.createInstance(ExternalFileImport);
                    await fileImport.import(resolvedTarget, originalEvent, mainWindow);
                }
                // Otherwise fallback to browser based file upload
                else {
                    const browserUpload = this.instantiationService.createInstance(BrowserFileUpload);
                    await browserUpload.upload(target, originalEvent);
                }
            }
            // In-Explorer DND (Move/Copy file)
            else {
                await this.handleExplorerDrop(data, resolvedTarget, targetIndex, targetSector, originalEvent);
            }
        }
        catch (error) {
            this.dialogService.error(toErrorMessage(error));
        }
    }
    async handleExplorerDrop(data, target, targetIndex, targetSector, originalEvent) {
        const elementsData = FileDragAndDrop_1.getStatsFromDragAndDropData(data);
        const distinctItems = new Map(elementsData.map(element => [element, this.isCollapsed(element)]));
        for (const [item, collapsed] of distinctItems) {
            if (collapsed) {
                const nestedChildren = item.nestedChildren;
                if (nestedChildren) {
                    for (const child of nestedChildren) {
                        // if parent is collapsed, then the nested children is considered collapsed to operate as a group
                        // and skip collapsed state check since they're not in the tree
                        distinctItems.set(child, true);
                    }
                }
            }
        }
        const items = distinctParents([...distinctItems.keys()], s => s.resource);
        const isCopy = (originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh);
        // Handle confirm setting
        const confirmDragAndDrop = !isCopy && this.configurationService.getValue(FileDragAndDrop_1.CONFIRM_DND_SETTING_KEY);
        if (confirmDragAndDrop) {
            const message = items.length > 1 && items.every(s => s.isRoot) ? localize('confirmRootsMove', "Are you sure you want to change the order of multiple root folders in your workspace?")
                : items.length > 1 ? localize('confirmMultiMove', "Are you sure you want to move the following {0} files into '{1}'?", items.length, target.name)
                    : items[0].isRoot ? localize('confirmRootMove', "Are you sure you want to change the order of root folder '{0}' in your workspace?", items[0].name)
                        : localize('confirmMove', "Are you sure you want to move '{0}' into '{1}'?", items[0].name, target.name);
            const detail = items.length > 1 && !items.every(s => s.isRoot) ? getFileNamesMessage(items.map(i => i.resource)) : undefined;
            const confirmation = await this.dialogService.confirm({
                message,
                detail,
                checkbox: {
                    label: localize('doNotAskAgain', "Do not ask me again")
                },
                primaryButton: localize({ key: 'moveButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Move")
            });
            if (!confirmation.confirmed) {
                return;
            }
            // Check for confirmation checkbox
            if (confirmation.checkboxChecked === true) {
                await this.configurationService.updateValue(FileDragAndDrop_1.CONFIRM_DND_SETTING_KEY, false);
            }
        }
        await this.doHandleRootDrop(items.filter(s => s.isRoot), target, targetSector);
        const sources = items.filter(s => !s.isRoot);
        if (isCopy) {
            return this.doHandleExplorerDropOnCopy(sources, target);
        }
        return this.doHandleExplorerDropOnMove(sources, target);
    }
    async doHandleRootDrop(roots, target, targetSector) {
        if (roots.length === 0) {
            return;
        }
        const folders = this.contextService.getWorkspace().folders;
        let targetIndex;
        const sourceIndices = [];
        const workspaceCreationData = [];
        const rootsToMove = [];
        for (let index = 0; index < folders.length; index++) {
            const data = {
                uri: folders[index].uri,
                name: folders[index].name
            };
            // Is current target
            if (target instanceof ExplorerItem && this.uriIdentityService.extUri.isEqual(folders[index].uri, target.resource)) {
                targetIndex = index;
            }
            // Is current source
            for (const root of roots) {
                if (this.uriIdentityService.extUri.isEqual(folders[index].uri, root.resource)) {
                    sourceIndices.push(index);
                    break;
                }
            }
            if (roots.every(r => r.resource.toString() !== folders[index].uri.toString())) {
                workspaceCreationData.push(data);
            }
            else {
                rootsToMove.push(data);
            }
        }
        if (targetIndex === undefined) {
            targetIndex = workspaceCreationData.length;
        }
        else {
            switch (targetSector) {
                case 3 /* ListViewTargetSector.BOTTOM */:
                case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                    targetIndex++;
                    break;
            }
            // Adjust target index if source was located before target.
            // The move will cause the index to change
            for (const sourceIndex of sourceIndices) {
                if (sourceIndex < targetIndex) {
                    targetIndex--;
                }
            }
        }
        workspaceCreationData.splice(targetIndex, 0, ...rootsToMove);
        return this.workspaceEditingService.updateFolders(0, workspaceCreationData.length, workspaceCreationData);
    }
    async doHandleExplorerDropOnCopy(sources, target) {
        // Reuse duplicate action when user copies
        const explorerConfig = this.configurationService.getValue().explorer;
        const resourceFileEdits = [];
        for (const { resource, isDirectory } of sources) {
            const allowOverwrite = explorerConfig.incrementalNaming === 'disabled';
            const newResource = await findValidPasteFileTarget(this.explorerService, this.fileService, this.dialogService, target, { resource, isDirectory, allowOverwrite }, explorerConfig.incrementalNaming);
            if (!newResource) {
                continue;
            }
            const resourceEdit = new ResourceFileEdit(resource, newResource, { copy: true, overwrite: allowOverwrite });
            resourceFileEdits.push(resourceEdit);
        }
        const labelSuffix = getFileOrFolderLabelSuffix(sources);
        await this.explorerService.applyBulkEdit(resourceFileEdits, {
            confirmBeforeUndo: explorerConfig.confirmUndo === "default" /* UndoConfirmLevel.Default */ || explorerConfig.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
            undoLabel: localize('copy', "Copy {0}", labelSuffix),
            progressLabel: localize('copying', "Copying {0}", labelSuffix),
        });
        const editors = resourceFileEdits.filter(edit => {
            const item = edit.newResource ? this.explorerService.findClosest(edit.newResource) : undefined;
            return item && !item.isDirectory;
        }).map(edit => ({ resource: edit.newResource, options: { pinned: true } }));
        await this.editorService.openEditors(editors);
    }
    async doHandleExplorerDropOnMove(sources, target) {
        // Do not allow moving readonly items
        const resourceFileEdits = sources.filter(source => !source.isReadonly).map(source => new ResourceFileEdit(source.resource, joinPath(target.resource, source.name)));
        const labelSuffix = getFileOrFolderLabelSuffix(sources);
        const options = {
            confirmBeforeUndo: this.configurationService.getValue().explorer.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
            undoLabel: localize('move', "Move {0}", labelSuffix),
            progressLabel: localize('moving', "Moving {0}", labelSuffix)
        };
        try {
            await this.explorerService.applyBulkEdit(resourceFileEdits, options);
        }
        catch (error) {
            // Conflict
            if (error.fileOperationResult === 4 /* FileOperationResult.FILE_MOVE_CONFLICT */) {
                const overwrites = [];
                for (const edit of resourceFileEdits) {
                    if (edit.newResource && await this.fileService.exists(edit.newResource)) {
                        overwrites.push(edit.newResource);
                    }
                }
                // Move with overwrite if the user confirms
                const confirm = getMultipleFilesOverwriteConfirm(overwrites);
                const { confirmed } = await this.dialogService.confirm(confirm);
                if (confirmed) {
                    await this.explorerService.applyBulkEdit(resourceFileEdits.map(re => new ResourceFileEdit(re.oldResource, re.newResource, { overwrite: true })), options);
                }
            }
            // Any other error: bubble up
            else {
                throw error;
            }
        }
    }
    static getStatsFromDragAndDropData(data, dragStartEvent) {
        if (data.context) {
            return data.context;
        }
        // Detect compressed folder dragging
        if (dragStartEvent && data.elements.length === 1) {
            data.context = [FileDragAndDrop_1.getCompressedStatFromDragEvent(data.elements[0], dragStartEvent)];
            return data.context;
        }
        return data.elements;
    }
    static getCompressedStatFromDragEvent(stat, dragEvent) {
        const target = DOM.getWindow(dragEvent).document.elementFromPoint(dragEvent.clientX, dragEvent.clientY);
        const iconLabelName = getIconLabelNameFromHTMLElement(target);
        if (iconLabelName) {
            const { count, index } = iconLabelName;
            let i = count - 1;
            while (i > index && stat.parent) {
                stat = stat.parent;
                i--;
            }
            return stat;
        }
        return stat;
    }
    onDragEnd() {
        this.compressedDropTargetDisposable.dispose();
    }
    dispose() {
        this.compressedDropTargetDisposable.dispose();
    }
};
FileDragAndDrop = FileDragAndDrop_1 = __decorate([
    __param(1, IExplorerService),
    __param(2, IEditorService),
    __param(3, IDialogService),
    __param(4, IWorkspaceContextService),
    __param(5, IFileService),
    __param(6, IConfigurationService),
    __param(7, IInstantiationService),
    __param(8, IWorkspaceEditingService),
    __param(9, IUriIdentityService)
], FileDragAndDrop);
export { FileDragAndDrop };
function getIconLabelNameFromHTMLElement(target) {
    if (!(DOM.isHTMLElement(target))) {
        return null;
    }
    let element = target;
    while (element && !element.classList.contains('monaco-list-row')) {
        if (element.classList.contains('label-name') && element.hasAttribute('data-icon-label-count')) {
            const count = Number(element.getAttribute('data-icon-label-count'));
            const index = Number(element.getAttribute('data-icon-label-index'));
            if (isNumber(count) && isNumber(index)) {
                return { element: element, count, index };
            }
        }
        element = element.parentElement;
    }
    return null;
}
export function isCompressedFolderName(target) {
    return !!getIconLabelNameFromHTMLElement(target);
}
export class ExplorerCompressionDelegate {
    isIncompressible(stat) {
        return stat.isRoot || !stat.isDirectory || stat instanceof NewExplorerItem || (!stat.parent || stat.parent.isRoot);
    }
}
function getFileOrFolderLabelSuffix(items) {
    if (items.length === 1) {
        return items[0].name;
    }
    if (items.every(i => i.isDirectory)) {
        return localize('numberOfFolders', "{0} folders", items.length);
    }
    if (items.every(i => !i.isDirectory)) {
        return localize('numberOfFiles', "{0} files", items.length);
    }
    return `${items.length} files and folders`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci92aWV3cy9leHBsb3JlclZpZXdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxnQkFBZ0IsR0FBcUIsTUFBTSxxREFBcUQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDN0csT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQTJELE1BQU0sK0NBQStDLENBQUM7QUFDaEosT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHdCQUF3QixFQUFrQixNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZJLE9BQU8sRUFBZSxVQUFVLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUkxSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUE2QixxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSwwQkFBMEIsRUFBeUMsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0s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