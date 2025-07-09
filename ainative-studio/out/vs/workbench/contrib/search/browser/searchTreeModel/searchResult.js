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
import { PauseableEmitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookEditorWidget } from '../../../notebook/browser/notebookEditorWidget.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { arrayContainsElementOrParent, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchWithResource, isSearchTreeMatch, isTextSearchHeading, mergeSearchResultEvents, SEARCH_RESULT_PREFIX } from './searchTreeCommon.js';
import { PlainTextSearchHeadingImpl } from './textSearchHeading.js';
import { AITextSearchHeadingImpl } from '../AISearch/aiSearchModel.js';
let SearchResultImpl = class SearchResultImpl extends Disposable {
    constructor(searchModel, instantiationService, modelService, notebookEditorService) {
        super();
        this.searchModel = searchModel;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.notebookEditorService = notebookEditorService;
        this._onChange = this._register(new PauseableEmitter({
            merge: mergeSearchResultEvents
        }));
        this.onChange = this._onChange.event;
        this._plainTextSearchResult = this._register(this.instantiationService.createInstance(PlainTextSearchHeadingImpl, this));
        this._aiTextSearchResult = this._register(this.instantiationService.createInstance(AITextSearchHeadingImpl, this));
        this._register(this._plainTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this._register(this._aiTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this.modelService.getModels().forEach(model => this.onModelAdded(model));
        this._register(this.modelService.onModelAdded(model => this.onModelAdded(model)));
        this._register(this.notebookEditorService.onDidAddNotebookEditor(widget => {
            if (widget instanceof NotebookEditorWidget) {
                this.onDidAddNotebookEditorWidget(widget);
            }
        }));
        this._id = SEARCH_RESULT_PREFIX + Date.now().toString();
    }
    id() {
        return this._id;
    }
    get plainTextSearchResult() {
        return this._plainTextSearchResult;
    }
    get aiTextSearchResult() {
        return this._aiTextSearchResult;
    }
    get children() {
        return this.textSearchResults;
    }
    get hasChildren() {
        return true; // should always have a Text Search Result for plain results.
    }
    get textSearchResults() {
        return [this._plainTextSearchResult, this._aiTextSearchResult];
    }
    async batchReplace(elementsToReplace) {
        try {
            this._onChange.pause();
            await Promise.all(elementsToReplace.map(async (elem) => {
                const parent = elem.parent();
                if ((isSearchTreeFolderMatch(parent) || isSearchTreeFileMatch(parent)) && arrayContainsElementOrParent(parent, elementsToReplace)) {
                    // skip any children who have parents in the array
                    return;
                }
                if (isSearchTreeFileMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeFolderMatch(elem)) {
                    await elem.replaceAll();
                }
            }));
        }
        finally {
            this._onChange.resume();
        }
    }
    batchRemove(elementsToRemove) {
        // need to check that we aren't trying to remove elements twice
        const removedElems = [];
        try {
            this._onChange.pause();
            elementsToRemove.forEach((currentElement) => {
                if (!arrayContainsElementOrParent(currentElement, removedElems)) {
                    if (isTextSearchHeading(currentElement)) {
                        currentElement.hide();
                    }
                    else if (!isSearchTreeFolderMatch(currentElement) || isSearchTreeFolderMatchWithResource(currentElement)) {
                        if (isSearchTreeFileMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeFolderMatchWithResource(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        removedElems.push(currentElement);
                    }
                }
            });
        }
        finally {
            this._onChange.resume();
        }
    }
    get isDirty() {
        return this._aiTextSearchResult.isDirty || this._plainTextSearchResult.isDirty;
    }
    get query() {
        return this._plainTextSearchResult.query;
    }
    set query(query) {
        this._plainTextSearchResult.query = query;
    }
    setAIQueryUsingTextQuery(query) {
        if (!query) {
            query = this.query;
        }
        this.aiTextSearchResult.query = aiTextQueryFromTextQuery(query);
    }
    onDidAddNotebookEditorWidget(widget) {
        this._onWillChangeModelListener?.dispose();
        this._onWillChangeModelListener = widget.onWillChangeModel((model) => {
            if (model) {
                this.onNotebookEditorWidgetRemoved(widget, model?.uri);
            }
        });
        this._onDidChangeModelListener?.dispose();
        // listen to view model change as we are searching on both inputs and outputs
        this._onDidChangeModelListener = widget.onDidAttachViewModel(() => {
            if (widget.hasModel()) {
                this.onNotebookEditorWidgetAdded(widget, widget.textModel.uri);
            }
        });
    }
    folderMatches(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.folderMatches();
        }
        return this._plainTextSearchResult.folderMatches();
    }
    onModelAdded(model) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(model.uri);
        folderMatch?.bindModel(model);
    }
    async onNotebookEditorWidgetAdded(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        await folderMatch?.bindNotebookEditorWidget(editor, resource);
    }
    onNotebookEditorWidgetRemoved(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        folderMatch?.unbindNotebookEditorWidget(editor, resource);
    }
    add(allRaw, searchInstanceID, ai, silent = false) {
        this._plainTextSearchResult.hidden = false;
        if (ai) {
            this._aiTextSearchResult.hidden = false;
        }
        if (ai) {
            this._aiTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
        else {
            this._plainTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
    }
    clear() {
        this._plainTextSearchResult.clear();
        this._aiTextSearchResult.clear();
    }
    remove(matches, ai = false) {
        if (ai) {
            this._aiTextSearchResult.remove(matches, ai);
        }
        this._plainTextSearchResult.remove(matches, ai);
    }
    replace(match) {
        return this._plainTextSearchResult.replace(match);
    }
    matches(ai) {
        if (ai === undefined) {
            return this._plainTextSearchResult.matches().concat(this._aiTextSearchResult.matches());
        }
        else if (ai === true) {
            return this._aiTextSearchResult.matches();
        }
        return this._plainTextSearchResult.matches();
    }
    isEmpty() {
        return this._plainTextSearchResult.isEmpty() && this._aiTextSearchResult.isEmpty();
    }
    fileCount() {
        return this._plainTextSearchResult.fileCount() + this._aiTextSearchResult.fileCount();
    }
    count() {
        return this._plainTextSearchResult.count() + this._aiTextSearchResult.count();
    }
    setCachedSearchComplete(cachedSearchComplete, ai) {
        if (ai) {
            this._aiTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
        else {
            this._plainTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
    }
    getCachedSearchComplete(ai) {
        if (ai) {
            return this._aiTextSearchResult.cachedSearchComplete;
        }
        return this._plainTextSearchResult.cachedSearchComplete;
    }
    toggleHighlights(value, ai = false) {
        if (ai) {
            this._aiTextSearchResult.toggleHighlights(value);
        }
        else {
            this._plainTextSearchResult.toggleHighlights(value);
        }
    }
    getRangeHighlightDecorations(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.rangeHighlightDecorations;
        }
        return this._plainTextSearchResult.rangeHighlightDecorations;
    }
    replaceAll(progress) {
        return this._plainTextSearchResult.replaceAll(progress);
    }
    async dispose() {
        this._aiTextSearchResult?.dispose();
        this._plainTextSearchResult?.dispose();
        this._onWillChangeModelListener?.dispose();
        this._onDidChangeModelListener?.dispose();
        super.dispose();
    }
};
SearchResultImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, INotebookEditorService)
], SearchResultImpl);
export { SearchResultImpl };
function aiTextQueryFromTextQuery(query) {
    return query === null ? null : { ...query, contentPattern: query.contentPattern.pattern, type: 3 /* QueryType.aiText */ };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaFRyZWVNb2RlbC9zZWFyY2hSZXN1bHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBR2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUVyRyxPQUFPLEVBQUUsNEJBQTRCLEVBQW9ILHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLG1DQUFtQyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFzQix1QkFBdUIsRUFBbUIsb0JBQW9CLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUd4WSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVoRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUFZL0MsWUFDaUIsV0FBeUIsRUFDbEIsb0JBQTRELEVBQ3BFLFlBQTRDLEVBQ25DLHFCQUE4RDtRQUV0RixLQUFLLEVBQUUsQ0FBQztRQUxRLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ0QseUJBQW9CLEdBQXBC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