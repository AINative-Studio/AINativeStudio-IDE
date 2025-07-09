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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { TernarySearchTree } from '../../../../../base/common/ternarySearchTree.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IReplaceService } from '../replace.js';
import { RangeHighlightDecorations } from './rangeDecorations.js';
import { FolderMatchNoRootImpl, FolderMatchWorkspaceRootImpl } from './folderMatch.js';
import { isSearchTreeFileMatch, isSearchTreeFolderMatch, TEXT_SEARCH_HEADING_PREFIX, PLAIN_TEXT_SEARCH__RESULT_ID } from './searchTreeCommon.js';
import { isNotebookFileMatch } from '../notebookSearch/notebookSearchModelBase.js';
let TextSearchHeadingImpl = class TextSearchHeadingImpl extends Disposable {
    constructor(_allowOtherResults, _parent, instantiationService, uriIdentityService) {
        super();
        this._allowOtherResults = _allowOtherResults;
        this._parent = _parent;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._isDirty = false;
        this._showHighlights = false;
        this._query = null;
        this.disposePastResults = () => Promise.resolve();
        this._folderMatches = [];
        this._otherFilesMatch = null;
        this._folderMatchesMap = TernarySearchTree.forUris(key => this.uriIdentityService.extUri.ignorePathCasing(key));
        this.resource = null;
        this.hidden = false;
        this._rangeHighlightDecorations = this.instantiationService.createInstance(RangeHighlightDecorations);
        this._register(this.onChange(e => {
            if (e.removed) {
                this._isDirty = !this.isEmpty();
            }
        }));
    }
    hide() {
        this.hidden = true;
        this.clear();
    }
    parent() {
        return this._parent;
    }
    get hasChildren() {
        return this._folderMatches.length > 0;
    }
    get isDirty() {
        return this._isDirty;
    }
    getFolderMatch(resource) {
        const folderMatch = this._folderMatchesMap.findSubstr(resource);
        if (!folderMatch && this._allowOtherResults && this._otherFilesMatch) {
            return this._otherFilesMatch;
        }
        return folderMatch;
    }
    add(allRaw, searchInstanceID, silent = false) {
        // Split up raw into a list per folder so we can do a batch add per folder.
        const { byFolder, other } = this.groupFilesByFolder(allRaw);
        byFolder.forEach(raw => {
            if (!raw.length) {
                return;
            }
            // ai results go into the respective folder
            const folderMatch = this.getFolderMatch(raw[0].resource);
            folderMatch?.addFileMatch(raw, silent, searchInstanceID);
        });
        if (!this.isAIContributed) {
            this._otherFilesMatch?.addFileMatch(other, silent, searchInstanceID);
        }
        this.disposePastResults();
    }
    remove(matches, ai = false) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        matches.forEach(m => {
            if (isSearchTreeFolderMatch(m)) {
                m.clear();
            }
        });
        const fileMatches = matches.filter(m => isSearchTreeFileMatch(m));
        const { byFolder, other } = this.groupFilesByFolder(fileMatches);
        byFolder.forEach(matches => {
            if (!matches.length) {
                return;
            }
            this.getFolderMatch(matches[0].resource)?.remove(matches);
        });
        if (other.length) {
            this.getFolderMatch(other[0].resource)?.remove(other);
        }
    }
    groupFilesByFolder(fileMatches) {
        const rawPerFolder = new ResourceMap();
        const otherFileMatches = [];
        this._folderMatches.forEach(fm => rawPerFolder.set(fm.resource, []));
        fileMatches.forEach(rawFileMatch => {
            const folderMatch = this.getFolderMatch(rawFileMatch.resource);
            if (!folderMatch) {
                // foldermatch was previously removed by user or disposed for some reason
                return;
            }
            const resource = folderMatch.resource;
            if (resource) {
                rawPerFolder.get(resource).push(rawFileMatch);
            }
            else {
                otherFileMatches.push(rawFileMatch);
            }
        });
        return {
            byFolder: rawPerFolder,
            other: otherFileMatches
        };
    }
    isEmpty() {
        return this.folderMatches().every((folderMatch) => folderMatch.isEmpty());
    }
    findFolderSubstr(resource) {
        return this._folderMatchesMap.findSubstr(resource);
    }
    clearQuery() {
        // When updating the query we could change the roots, so keep a reference to them to clean up when we trigger `disposePastResults`
        const oldFolderMatches = this.folderMatches();
        this.disposePastResults = async () => {
            oldFolderMatches.forEach(match => match.clear());
            oldFolderMatches.forEach(match => match.dispose());
            this._isDirty = false;
        };
        this.cachedSearchComplete = undefined;
        this._rangeHighlightDecorations.removeHighlightRange();
        this._folderMatchesMap = TernarySearchTree.forUris(key => this.uriIdentityService.extUri.ignorePathCasing(key));
    }
    folderMatches() {
        return this._otherFilesMatch && this._allowOtherResults ?
            [
                ...this._folderMatches,
                this._otherFilesMatch,
            ] :
            this._folderMatches;
    }
    disposeMatches() {
        this.folderMatches().forEach(folderMatch => folderMatch.dispose());
        this._folderMatches = [];
        this._folderMatchesMap = TernarySearchTree.forUris(key => this.uriIdentityService.extUri.ignorePathCasing(key));
        this._rangeHighlightDecorations.removeHighlightRange();
    }
    matches() {
        const matches = [];
        this.folderMatches().forEach(folderMatch => {
            matches.push(folderMatch.allDownstreamFileMatches());
        });
        return [].concat(...matches);
    }
    get showHighlights() {
        return this._showHighlights;
    }
    toggleHighlights(value) {
        if (this._showHighlights === value) {
            return;
        }
        this._showHighlights = value;
        let selectedMatch = null;
        this.matches().forEach((fileMatch) => {
            fileMatch.updateHighlights();
            if (isNotebookFileMatch(fileMatch)) {
                fileMatch.updateNotebookHighlights();
            }
            if (!selectedMatch) {
                selectedMatch = fileMatch.getSelectedMatch();
            }
        });
        if (this._showHighlights && selectedMatch) {
            // TS?
            this._rangeHighlightDecorations.highlightRange(selectedMatch.parent().resource, selectedMatch.range());
        }
        else {
            this._rangeHighlightDecorations.removeHighlightRange();
        }
    }
    get rangeHighlightDecorations() {
        return this._rangeHighlightDecorations;
    }
    fileCount() {
        return this.folderMatches().reduce((prev, match) => prev + match.recursiveFileCount(), 0);
    }
    count() {
        return this.matches().reduce((prev, match) => prev + match.count(), 0);
    }
    clear(clearAll = true) {
        this.cachedSearchComplete = undefined;
        this.folderMatches().forEach((folderMatch) => folderMatch.clear(clearAll));
        this.disposeMatches();
        this._folderMatches = [];
        this._otherFilesMatch = null;
    }
    async dispose() {
        this._rangeHighlightDecorations.dispose();
        this.disposeMatches();
        super.dispose();
        await this.disposePastResults();
    }
};
TextSearchHeadingImpl = __decorate([
    __param(2, IInstantiationService),
    __param(3, IUriIdentityService)
], TextSearchHeadingImpl);
export { TextSearchHeadingImpl };
let PlainTextSearchHeadingImpl = class PlainTextSearchHeadingImpl extends TextSearchHeadingImpl {
    constructor(parent, instantiationService, uriIdentityService, replaceService) {
        super(true, parent, instantiationService, uriIdentityService);
        this.replaceService = replaceService;
    }
    id() {
        return TEXT_SEARCH_HEADING_PREFIX + PLAIN_TEXT_SEARCH__RESULT_ID;
    }
    get isAIContributed() {
        return false;
    }
    replace(match) {
        return this.getFolderMatch(match.resource)?.replace(match) ?? Promise.resolve();
    }
    name() {
        return 'Text';
    }
    replaceAll(progress) {
        this.replacingAll = true;
        const promise = this.replaceService.replace(this.matches(), progress);
        return promise.then(() => {
            this.replacingAll = false;
            this.clear();
        }, () => {
            this.replacingAll = false;
        });
    }
    set replacingAll(running) {
        this.folderMatches().forEach((folderMatch) => {
            folderMatch.replacingAll = running;
        });
    }
    get query() {
        return this._query;
    }
    set query(query) {
        this.clearQuery();
        if (!query) {
            return;
        }
        this._folderMatches = (query && query.folderQueries || [])
            .map(fq => fq.folder)
            .map((resource, index) => this._createBaseFolderMatch(resource, resource.toString(), index, query));
        this._folderMatches.forEach(fm => this._folderMatchesMap.set(fm.resource, fm));
        this._otherFilesMatch = this._createBaseFolderMatch(null, 'otherFiles', this._folderMatches.length + 1, query);
        this._query = query;
    }
    _createBaseFolderMatch(resource, id, index, query) {
        let folderMatch;
        if (resource) {
            folderMatch = this._register(this.createWorkspaceRootWithResourceImpl(resource, id, index, query));
        }
        else {
            folderMatch = this._register(this.createNoRootWorkspaceImpl(id, index, query));
        }
        const disposable = folderMatch.onChange((event) => this._onChange.fire(event));
        this._register(folderMatch.onDispose(() => disposable.dispose()));
        return folderMatch;
    }
    createWorkspaceRootWithResourceImpl(resource, id, index, query) {
        return this.instantiationService.createInstance(FolderMatchWorkspaceRootImpl, resource, id, index, query, this);
    }
    createNoRootWorkspaceImpl(id, index, query) {
        return this._register(this.instantiationService.createInstance(FolderMatchNoRootImpl, id, index, query, this));
    }
};
PlainTextSearchHeadingImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService),
    __param(3, IReplaceService)
], PlainTextSearchHeadingImpl);
export { PlainTextSearchHeadingImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaEhlYWRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL3RleHRTZWFyY2hIZWFkaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXBGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFaEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDdkYsT0FBTyxFQUErSyxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBd0MsMEJBQTBCLEVBQUUsNEJBQTRCLEVBQWdDLE1BQU0sdUJBQXVCLENBQUM7QUFDbFksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHNUUsSUFBZSxxQkFBcUIsR0FBcEMsTUFBZSxxQkFBMEQsU0FBUSxVQUFVO0lBaUJqRyxZQUNTLGtCQUEyQixFQUMzQixPQUFzQixFQUNQLG9CQUE4RCxFQUNoRSxrQkFBd0Q7UUFFN0Us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