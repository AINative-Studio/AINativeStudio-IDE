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
var FolderMatchImpl_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IReplaceService } from './../replace.js';
import { resultIsMatch } from '../../../../services/search/common/search.js';
import { isSearchTreeFolderMatchWorkspaceRoot, isSearchTreeFolderMatchNoRoot, FOLDER_MATCH_PREFIX, getFileMatches } from './searchTreeCommon.js';
import { isINotebookFileMatchNoModel } from '../../common/searchNotebookHelpers.js';
import { NotebookCompatibleFileMatch } from '../notebookSearch/notebookSearchModel.js';
import { isINotebookFileMatchWithModel, getIDFromINotebookCellMatch } from '../notebookSearch/searchNotebookHelpers.js';
import { isNotebookFileMatch } from '../notebookSearch/notebookSearchModelBase.js';
import { textSearchResultToMatches } from './match.js';
let FolderMatchImpl = FolderMatchImpl_1 = class FolderMatchImpl extends Disposable {
    constructor(_resource, _id, _index, _query, _parent, _searchResult, _closestRoot, replaceService, instantiationService, labelService, uriIdentityService) {
        super();
        this._resource = _resource;
        this._index = _index;
        this._query = _query;
        this._parent = _parent;
        this._searchResult = _searchResult;
        this._closestRoot = _closestRoot;
        this.replaceService = replaceService;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this._replacingAll = false;
        this._fileMatches = new ResourceMap();
        this._folderMatches = new ResourceMap();
        this._folderMatchesMap = TernarySearchTree.forUris(key => this.uriIdentityService.extUri.ignorePathCasing(key));
        this._unDisposedFileMatches = new ResourceMap();
        this._unDisposedFolderMatches = new ResourceMap();
        this._name = new Lazy(() => this.resource ? labelService.getUriBasenameLabel(this.resource) : '');
        this._id = FOLDER_MATCH_PREFIX + _id;
    }
    get searchModel() {
        return this._searchResult.searchModel;
    }
    get showHighlights() {
        return this._parent.showHighlights;
    }
    get closestRoot() {
        return this._closestRoot;
    }
    set replacingAll(b) {
        this._replacingAll = b;
    }
    id() {
        return this._id;
    }
    get resource() {
        return this._resource;
    }
    index() {
        return this._index;
    }
    name() {
        return this._name.value;
    }
    parent() {
        return this._parent;
    }
    isAIContributed() {
        return false;
    }
    get hasChildren() {
        return this._fileMatches.size > 0 || this._folderMatches.size > 0;
    }
    bindModel(model) {
        const fileMatch = this._fileMatches.get(model.uri);
        if (fileMatch) {
            fileMatch.bindModel(model);
        }
        else {
            const folderMatch = this.getFolderMatch(model.uri);
            const match = folderMatch?.getDownstreamFileMatch(model.uri);
            match?.bindModel(model);
        }
    }
    createIntermediateFolderMatch(resource, id, index, query, baseWorkspaceFolder) {
        const folderMatch = this._register(this.instantiationService.createInstance(FolderMatchWithResourceImpl, resource, id, index, query, this, this._searchResult, baseWorkspaceFolder));
        this.configureIntermediateMatch(folderMatch);
        this.doAddFolder(folderMatch);
        return folderMatch;
    }
    configureIntermediateMatch(folderMatch) {
        const disposable = folderMatch.onChange((event) => this.onFolderChange(folderMatch, event));
        this._register(folderMatch.onDispose(() => disposable.dispose()));
    }
    clear(clearingAll = false) {
        const changed = this.allDownstreamFileMatches();
        this.disposeMatches();
        this._onChange.fire({ elements: changed, removed: true, added: false, clearingAll });
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        const allMatches = getFileMatches(matches);
        this.doRemoveFile(allMatches);
    }
    async replace(match) {
        return this.replaceService.replace([match]).then(() => {
            this.doRemoveFile([match], true, true, true);
        });
    }
    replaceAll() {
        const matches = this.matches();
        return this.batchReplace(matches);
    }
    matches() {
        return [...this.fileMatchesIterator(), ...this.folderMatchesIterator()];
    }
    fileMatchesIterator() {
        return this._fileMatches.values();
    }
    folderMatchesIterator() {
        return this._folderMatches.values();
    }
    isEmpty() {
        return (this.fileCount() + this.folderCount()) === 0;
    }
    getDownstreamFileMatch(uri) {
        const directChildFileMatch = this._fileMatches.get(uri);
        if (directChildFileMatch) {
            return directChildFileMatch;
        }
        const folderMatch = this.getFolderMatch(uri);
        const match = folderMatch?.getDownstreamFileMatch(uri);
        if (match) {
            return match;
        }
        return null;
    }
    allDownstreamFileMatches() {
        let recursiveChildren = [];
        const iterator = this.folderMatchesIterator();
        for (const elem of iterator) {
            recursiveChildren = recursiveChildren.concat(elem.allDownstreamFileMatches());
        }
        return [...this.fileMatchesIterator(), ...recursiveChildren];
    }
    fileCount() {
        return this._fileMatches.size;
    }
    folderCount() {
        return this._folderMatches.size;
    }
    count() {
        return this.fileCount() + this.folderCount();
    }
    recursiveFileCount() {
        return this.allDownstreamFileMatches().length;
    }
    recursiveMatchCount() {
        return this.allDownstreamFileMatches().reduce((prev, match) => prev + match.count(), 0);
    }
    get query() {
        return this._query;
    }
    doAddFile(fileMatch) {
        this._fileMatches.set(fileMatch.resource, fileMatch);
        if (this._unDisposedFileMatches.has(fileMatch.resource)) {
            this._unDisposedFileMatches.delete(fileMatch.resource);
        }
    }
    hasOnlyReadOnlyMatches() {
        return Array.from(this._fileMatches.values()).every(fm => fm.hasOnlyReadOnlyMatches());
    }
    uriHasParent(parent, child) {
        return this.uriIdentityService.extUri.isEqualOrParent(child, parent) && !this.uriIdentityService.extUri.isEqual(child, parent);
    }
    isInParentChain(folderMatch) {
        let matchItem = this;
        while (matchItem instanceof FolderMatchImpl_1) {
            if (matchItem.id() === folderMatch.id()) {
                return true;
            }
            matchItem = matchItem.parent();
        }
        return false;
    }
    getFolderMatch(resource) {
        const folderMatch = this._folderMatchesMap.findSubstr(resource);
        return folderMatch;
    }
    doAddFolder(folderMatch) {
        if (this.resource && !this.uriHasParent(this.resource, folderMatch.resource)) {
            throw Error(`${folderMatch.resource} does not belong as a child of ${this.resource}`);
        }
        else if (this.isInParentChain(folderMatch)) {
            throw Error(`${folderMatch.resource} is a parent of ${this.resource}`);
        }
        this._folderMatches.set(folderMatch.resource, folderMatch);
        this._folderMatchesMap.set(folderMatch.resource, folderMatch);
        if (this._unDisposedFolderMatches.has(folderMatch.resource)) {
            this._unDisposedFolderMatches.delete(folderMatch.resource);
        }
    }
    async batchReplace(matches) {
        const allMatches = getFileMatches(matches);
        await this.replaceService.replace(allMatches);
        this.doRemoveFile(allMatches, true, true, true);
    }
    onFileChange(fileMatch, removed = false) {
        let added = false;
        if (!this._fileMatches.has(fileMatch.resource)) {
            this.doAddFile(fileMatch);
            added = true;
        }
        if (fileMatch.count() === 0) {
            this.doRemoveFile([fileMatch], false, false);
            added = false;
            removed = true;
        }
        if (!this._replacingAll) {
            this._onChange.fire({ elements: [fileMatch], added: added, removed: removed });
        }
    }
    onFolderChange(folderMatch, event) {
        if (!this._folderMatches.has(folderMatch.resource)) {
            this.doAddFolder(folderMatch);
        }
        if (folderMatch.isEmpty()) {
            this._folderMatches.delete(folderMatch.resource);
            folderMatch.dispose();
        }
        this._onChange.fire(event);
    }
    doRemoveFile(fileMatches, dispose = true, trigger = true, keepReadonly = false) {
        const removed = [];
        for (const match of fileMatches) {
            if (this._fileMatches.get(match.resource)) {
                if (keepReadonly && match.hasReadonlyMatches()) {
                    continue;
                }
                this._fileMatches.delete(match.resource);
                if (dispose) {
                    match.dispose();
                }
                else {
                    this._unDisposedFileMatches.set(match.resource, match);
                }
                removed.push(match);
            }
            else {
                const folder = this.getFolderMatch(match.resource);
                if (folder) {
                    folder.doRemoveFile([match], dispose, trigger);
                }
                else {
                    throw Error(`FileMatch ${match.resource} is not located within FolderMatch ${this.resource}`);
                }
            }
        }
        if (trigger) {
            this._onChange.fire({ elements: removed, removed: true });
        }
    }
    async bindNotebookEditorWidget(editor, resource) {
        const fileMatch = this._fileMatches.get(resource);
        if (isNotebookFileMatch(fileMatch)) {
            if (fileMatch) {
                fileMatch.bindNotebookEditorWidget(editor);
                await fileMatch.updateMatchesForEditorWidget();
            }
            else {
                const folderMatches = this.folderMatchesIterator();
                for (const elem of folderMatches) {
                    await elem.bindNotebookEditorWidget(editor, resource);
                }
            }
        }
    }
    addFileMatch(raw, silent, searchInstanceID) {
        // when adding a fileMatch that has intermediate directories
        const added = [];
        const updated = [];
        raw.forEach(rawFileMatch => {
            const existingFileMatch = this.getDownstreamFileMatch(rawFileMatch.resource);
            if (existingFileMatch) {
                if (rawFileMatch.results) {
                    rawFileMatch
                        .results
                        .filter(resultIsMatch)
                        .forEach(m => {
                        textSearchResultToMatches(m, existingFileMatch, false)
                            .forEach(m => existingFileMatch.add(m));
                    });
                }
                // add cell matches
                if (isINotebookFileMatchWithModel(rawFileMatch) || isINotebookFileMatchNoModel(rawFileMatch)) {
                    rawFileMatch.cellResults?.forEach(rawCellMatch => {
                        if (isNotebookFileMatch(existingFileMatch)) {
                            const existingCellMatch = existingFileMatch.getCellMatch(getIDFromINotebookCellMatch(rawCellMatch));
                            if (existingCellMatch) {
                                existingCellMatch.addContentMatches(rawCellMatch.contentResults);
                                existingCellMatch.addWebviewMatches(rawCellMatch.webviewResults);
                            }
                            else {
                                existingFileMatch.addCellMatch(rawCellMatch);
                            }
                        }
                    });
                }
                updated.push(existingFileMatch);
                if (rawFileMatch.results && rawFileMatch.results.length > 0) {
                    existingFileMatch.addContext(rawFileMatch.results);
                }
            }
            else {
                if (isSearchTreeFolderMatchWorkspaceRoot(this) || isSearchTreeFolderMatchNoRoot(this)) {
                    const fileMatch = this.createAndConfigureFileMatch(rawFileMatch, searchInstanceID);
                    added.push(fileMatch);
                }
            }
        });
        const elements = [...added, ...updated];
        if (!silent && elements.length) {
            this._onChange.fire({ elements, added: !!added.length });
        }
    }
    unbindNotebookEditorWidget(editor, resource) {
        const fileMatch = this._fileMatches.get(resource);
        if (isNotebookFileMatch(fileMatch)) {
            if (fileMatch) {
                fileMatch.unbindNotebookEditorWidget(editor);
            }
            else {
                const folderMatches = this.folderMatchesIterator();
                for (const elem of folderMatches) {
                    elem.unbindNotebookEditorWidget(editor, resource);
                }
            }
        }
    }
    disposeMatches() {
        [...this._fileMatches.values()].forEach((fileMatch) => fileMatch.dispose());
        [...this._folderMatches.values()].forEach((folderMatch) => folderMatch.disposeMatches());
        [...this._unDisposedFileMatches.values()].forEach((fileMatch) => fileMatch.dispose());
        [...this._unDisposedFolderMatches.values()].forEach((folderMatch) => folderMatch.disposeMatches());
        this._fileMatches.clear();
        this._folderMatches.clear();
        this._unDisposedFileMatches.clear();
        this._unDisposedFolderMatches.clear();
    }
    dispose() {
        this.disposeMatches();
        this._onDispose.fire();
        super.dispose();
    }
};
FolderMatchImpl = FolderMatchImpl_1 = __decorate([
    __param(7, IReplaceService),
    __param(8, IInstantiationService),
    __param(9, ILabelService),
    __param(10, IUriIdentityService)
], FolderMatchImpl);
export { FolderMatchImpl };
let FolderMatchWithResourceImpl = class FolderMatchWithResourceImpl extends FolderMatchImpl {
    constructor(_resource, _id, _index, _query, _parent, _searchResult, _closestRoot, replaceService, instantiationService, labelService, uriIdentityService) {
        super(_resource, _id, _index, _query, _parent, _searchResult, _closestRoot, replaceService, instantiationService, labelService, uriIdentityService);
        this._normalizedResource = new Lazy(() => this.uriIdentityService.extUri.removeTrailingPathSeparator(this.uriIdentityService.extUri.normalizePath(this.resource)));
    }
    get resource() {
        return this._resource;
    }
    get normalizedResource() {
        return this._normalizedResource.value;
    }
};
FolderMatchWithResourceImpl = __decorate([
    __param(7, IReplaceService),
    __param(8, IInstantiationService),
    __param(9, ILabelService),
    __param(10, IUriIdentityService)
], FolderMatchWithResourceImpl);
export { FolderMatchWithResourceImpl };
/**
 * FolderMatchWorkspaceRoot => folder for workspace root
 */
let FolderMatchWorkspaceRootImpl = class FolderMatchWorkspaceRootImpl extends FolderMatchWithResourceImpl {
    constructor(_resource, _id, _index, _query, _parent, replaceService, instantiationService, labelService, uriIdentityService) {
        super(_resource, _id, _index, _query, _parent, _parent.parent(), null, replaceService, instantiationService, labelService, uriIdentityService);
    }
    normalizedUriParent(uri) {
        return this.uriIdentityService.extUri.normalizePath(this.uriIdentityService.extUri.dirname(uri));
    }
    uriEquals(uri1, ur2) {
        return this.uriIdentityService.extUri.isEqual(uri1, ur2);
    }
    createFileMatch(query, previewOptions, maxResults, parent, rawFileMatch, closestRoot, searchInstanceID) {
        // TODO: can probably just create FileMatchImpl if we don't expect cell results from the file.
        const fileMatch = this.instantiationService.createInstance(NotebookCompatibleFileMatch, query, previewOptions, maxResults, parent, rawFileMatch, closestRoot, searchInstanceID);
        fileMatch.createMatches();
        parent.doAddFile(fileMatch);
        const disposable = fileMatch.onChange(({ didRemove }) => parent.onFileChange(fileMatch, didRemove));
        this._register(fileMatch.onDispose(() => disposable.dispose()));
        return fileMatch;
    }
    createAndConfigureFileMatch(rawFileMatch, searchInstanceID) {
        if (!this.uriHasParent(this.resource, rawFileMatch.resource)) {
            throw Error(`${rawFileMatch.resource} is not a descendant of ${this.resource}`);
        }
        const fileMatchParentParts = [];
        let uri = this.normalizedUriParent(rawFileMatch.resource);
        while (!this.uriEquals(this.normalizedResource, uri)) {
            fileMatchParentParts.unshift(uri);
            const prevUri = uri;
            uri = this.uriIdentityService.extUri.removeTrailingPathSeparator(this.normalizedUriParent(uri));
            if (this.uriEquals(prevUri, uri)) {
                throw Error(`${rawFileMatch.resource} is not correctly configured as a child of ${this.normalizedResource}`);
            }
        }
        const root = this.closestRoot ?? this;
        let parent = this;
        for (let i = 0; i < fileMatchParentParts.length; i++) {
            let folderMatch = parent.getFolderMatch(fileMatchParentParts[i]);
            if (!folderMatch) {
                folderMatch = parent.createIntermediateFolderMatch(fileMatchParentParts[i], fileMatchParentParts[i].toString(), -1, this._query, root);
            }
            parent = folderMatch;
        }
        const contentPatternToUse = typeof (this._query.contentPattern) === 'string' ? { pattern: this._query.contentPattern } : this._query.contentPattern;
        return this.createFileMatch(contentPatternToUse, this._query.previewOptions, this._query.maxResults, parent, rawFileMatch, root, searchInstanceID);
    }
};
FolderMatchWorkspaceRootImpl = __decorate([
    __param(5, IReplaceService),
    __param(6, IInstantiationService),
    __param(7, ILabelService),
    __param(8, IUriIdentityService)
], FolderMatchWorkspaceRootImpl);
export { FolderMatchWorkspaceRootImpl };
// currently, no support for AI results in out-of-workspace files
let FolderMatchNoRootImpl = class FolderMatchNoRootImpl extends FolderMatchImpl {
    constructor(_id, _index, _query, _parent, replaceService, instantiationService, labelService, uriIdentityService) {
        super(null, _id, _index, _query, _parent, _parent.parent(), null, replaceService, instantiationService, labelService, uriIdentityService);
    }
    createAndConfigureFileMatch(rawFileMatch, searchInstanceID) {
        const contentPatternToUse = typeof (this._query.contentPattern) === 'string' ? { pattern: this._query.contentPattern } : this._query.contentPattern;
        // TODO: can probably just create FileMatchImpl if we don't expect cell results from the file.
        const fileMatch = this._register(this.instantiationService.createInstance(NotebookCompatibleFileMatch, contentPatternToUse, this._query.previewOptions, this._query.maxResults, this, rawFileMatch, null, searchInstanceID));
        fileMatch.createMatches();
        this.doAddFile(fileMatch);
        const disposable = fileMatch.onChange(({ didRemove }) => this.onFileChange(fileMatch, didRemove));
        this._register(fileMatch.onDispose(() => disposable.dispose()));
        return fileMatch;
    }
};
FolderMatchNoRootImpl = __decorate([
    __param(4, IReplaceService),
    __param(5, IInstantiationService),
    __param(6, ILabelService),
    __param(7, IUriIdentityService)
], FolderMatchNoRootImpl);
export { FolderMatchNoRootImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGVyTWF0Y2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL2ZvbGRlck1hdGNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFHcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUNsRCxPQUFPLEVBQW1FLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRzlJLE9BQU8sRUFBa00sb0NBQW9DLEVBQXNCLDZCQUE2QixFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXJXLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDRD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