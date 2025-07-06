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
import { coalesce } from '../../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { resultIsMatch } from '../../../../services/search/common/search.js';
import { getTextSearchMatchWithModelContext } from '../../../../services/search/common/searchHelpers.js';
import { FindMatchDecorationModel } from '../../../notebook/browser/contrib/find/findMatchDecorationModel.js';
import { CellFindMatchModel } from '../../../notebook/browser/contrib/find/findModel.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { NotebookCellsChangeType } from '../../../notebook/common/notebookCommon.js';
import { CellSearchModel } from '../../common/cellSearchModel.js';
import { isINotebookFileMatchNoModel, rawCellPrefix } from '../../common/searchNotebookHelpers.js';
import { contentMatchesToTextSearchMatches, isINotebookCellMatchWithModel, isINotebookFileMatchWithModel, webviewMatchesToTextSearchMatches } from './searchNotebookHelpers.js';
import { MATCH_PREFIX } from '../searchTreeModel/searchTreeCommon.js';
import { IReplaceService } from '../replace.js';
import { FileMatchImpl } from '../searchTreeModel/fileMatch.js';
import { isIMatchInNotebook } from './notebookSearchModelBase.js';
import { MatchImpl, textSearchResultToMatches } from '../searchTreeModel/match.js';
export class MatchInNotebook extends MatchImpl {
    constructor(_cellParent, _fullPreviewLines, _fullPreviewRange, _documentRange, webviewIndex) {
        super(_cellParent.parent, _fullPreviewLines, _fullPreviewRange, _documentRange, false);
        this._cellParent = _cellParent;
        this._id = MATCH_PREFIX + this._parent.resource.toString() + '>' + this._cellParent.cellIndex + (webviewIndex ? '_' + webviewIndex : '') + '_' + this.notebookMatchTypeString() + this._range + this.getMatchString();
        this._webviewIndex = webviewIndex;
    }
    parent() {
        return this._cellParent.parent;
    }
    get cellParent() {
        return this._cellParent;
    }
    notebookMatchTypeString() {
        return this.isWebviewMatch() ? 'webview' : 'content';
    }
    isWebviewMatch() {
        return this._webviewIndex !== undefined;
    }
    get isReadonly() {
        return super.isReadonly || (!this._cellParent.hasCellViewModel()) || this.isWebviewMatch();
    }
    get cellIndex() {
        return this._cellParent.cellIndex;
    }
    get webviewIndex() {
        return this._webviewIndex;
    }
    get cell() {
        return this._cellParent.cell;
    }
}
export class CellMatch {
    constructor(_parent, _cell, _cellIndex) {
        this._parent = _parent;
        this._cell = _cell;
        this._cellIndex = _cellIndex;
        this._contentMatches = new Map();
        this._webviewMatches = new Map();
        this._context = new Map();
    }
    hasCellViewModel() {
        return !(this._cell instanceof CellSearchModel);
    }
    get context() {
        return new Map(this._context);
    }
    matches() {
        return [...this._contentMatches.values(), ...this._webviewMatches.values()];
    }
    get contentMatches() {
        return Array.from(this._contentMatches.values());
    }
    get webviewMatches() {
        return Array.from(this._webviewMatches.values());
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        for (const match of matches) {
            this._contentMatches.delete(match.id());
            this._webviewMatches.delete(match.id());
        }
    }
    clearAllMatches() {
        this._contentMatches.clear();
        this._webviewMatches.clear();
    }
    addContentMatches(textSearchMatches) {
        const contentMatches = textSearchMatchesToNotebookMatches(textSearchMatches, this);
        contentMatches.forEach((match) => {
            this._contentMatches.set(match.id(), match);
        });
        this.addContext(textSearchMatches);
    }
    addContext(textSearchMatches) {
        if (!this.cell) {
            // todo: get closed notebook results in search editor
            return;
        }
        this.cell.resolveTextModel().then((textModel) => {
            const textResultsWithContext = getTextSearchMatchWithModelContext(textSearchMatches, textModel, this.parent.parent().query);
            const contexts = textResultsWithContext.filter((result => !resultIsMatch(result)));
            contexts.map(context => ({ ...context, lineNumber: context.lineNumber + 1 }))
                .forEach((context) => { this._context.set(context.lineNumber, context.text); });
        });
    }
    addWebviewMatches(textSearchMatches) {
        const webviewMatches = textSearchMatchesToNotebookMatches(textSearchMatches, this);
        webviewMatches.forEach((match) => {
            this._webviewMatches.set(match.id(), match);
        });
        // TODO: add webview results to context
    }
    setCellModel(cell) {
        this._cell = cell;
    }
    get parent() {
        return this._parent;
    }
    get id() {
        return this._cell?.id ?? `${rawCellPrefix}${this.cellIndex}`;
    }
    get cellIndex() {
        return this._cellIndex;
    }
    get cell() {
        return this._cell;
    }
}
let NotebookCompatibleFileMatch = class NotebookCompatibleFileMatch extends FileMatchImpl {
    constructor(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, searchInstanceID, modelService, replaceService, labelService, notebookEditorService) {
        super(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, modelService, replaceService, labelService);
        this.searchInstanceID = searchInstanceID;
        this.notebookEditorService = notebookEditorService;
        this._notebookEditorWidget = null;
        this._editorWidgetListener = null;
        this._cellMatches = new Map();
        this._notebookUpdateScheduler = new RunOnceScheduler(this.updateMatchesForEditorWidget.bind(this), 250);
    }
    get cellContext() {
        const cellContext = new Map();
        this._cellMatches.forEach(cellMatch => {
            cellContext.set(cellMatch.id, cellMatch.context);
        });
        return cellContext;
    }
    getCellMatch(cellID) {
        return this._cellMatches.get(cellID);
    }
    addCellMatch(rawCell) {
        const cellMatch = new CellMatch(this, isINotebookCellMatchWithModel(rawCell) ? rawCell.cell : undefined, rawCell.index);
        this._cellMatches.set(cellMatch.id, cellMatch);
        this.addWebviewMatchesToCell(cellMatch.id, rawCell.webviewResults);
        this.addContentMatchesToCell(cellMatch.id, rawCell.contentResults);
    }
    addWebviewMatchesToCell(cellID, webviewMatches) {
        const cellMatch = this.getCellMatch(cellID);
        if (cellMatch !== undefined) {
            cellMatch.addWebviewMatches(webviewMatches);
        }
    }
    addContentMatchesToCell(cellID, contentMatches) {
        const cellMatch = this.getCellMatch(cellID);
        if (cellMatch !== undefined) {
            cellMatch.addContentMatches(contentMatches);
        }
    }
    revealCellRange(match, outputOffset) {
        if (!this._notebookEditorWidget || !match.cell) {
            // match cell should never be a CellSearchModel if the notebook is open
            return;
        }
        if (match.webviewIndex !== undefined) {
            const index = this._notebookEditorWidget.getCellIndex(match.cell);
            if (index !== undefined) {
                this._notebookEditorWidget.revealCellOffsetInCenter(match.cell, outputOffset ?? 0);
            }
        }
        else {
            match.cell.updateEditState(match.cell.getEditState(), 'focusNotebookCell');
            this._notebookEditorWidget.setCellEditorSelection(match.cell, match.range());
            this._notebookEditorWidget.revealRangeInCenterIfOutsideViewportAsync(match.cell, match.range());
        }
    }
    bindNotebookEditorWidget(widget) {
        if (this._notebookEditorWidget === widget) {
            return;
        }
        this._notebookEditorWidget = widget;
        this._editorWidgetListener = this._notebookEditorWidget.textModel?.onDidChangeContent((e) => {
            if (!e.rawEvents.some(event => event.kind === NotebookCellsChangeType.ChangeCellContent || event.kind === NotebookCellsChangeType.ModelChange)) {
                return;
            }
            this._notebookUpdateScheduler.schedule();
        }) ?? null;
        this._addNotebookHighlights();
    }
    unbindNotebookEditorWidget(widget) {
        if (widget && this._notebookEditorWidget !== widget) {
            return;
        }
        if (this._notebookEditorWidget) {
            this._notebookUpdateScheduler.cancel();
            this._editorWidgetListener?.dispose();
        }
        this._removeNotebookHighlights();
        this._notebookEditorWidget = null;
    }
    updateNotebookHighlights() {
        if (this.parent().showHighlights) {
            this._addNotebookHighlights();
            this.setNotebookFindMatchDecorationsUsingCellMatches(Array.from(this._cellMatches.values()));
        }
        else {
            this._removeNotebookHighlights();
        }
    }
    _addNotebookHighlights() {
        if (!this._notebookEditorWidget) {
            return;
        }
        this._findMatchDecorationModel?.stopWebviewFind();
        this._findMatchDecorationModel?.dispose();
        this._findMatchDecorationModel = new FindMatchDecorationModel(this._notebookEditorWidget, this.searchInstanceID);
        if (this._selectedMatch instanceof MatchInNotebook) {
            this.highlightCurrentFindMatchDecoration(this._selectedMatch);
        }
    }
    _removeNotebookHighlights() {
        if (this._findMatchDecorationModel) {
            this._findMatchDecorationModel?.stopWebviewFind();
            this._findMatchDecorationModel?.dispose();
            this._findMatchDecorationModel = undefined;
        }
    }
    updateNotebookMatches(matches, modelChange) {
        if (!this._notebookEditorWidget) {
            return;
        }
        const oldCellMatches = new Map(this._cellMatches);
        if (this._notebookEditorWidget.getId() !== this._lastEditorWidgetIdForUpdate) {
            this._cellMatches.clear();
            this._lastEditorWidgetIdForUpdate = this._notebookEditorWidget.getId();
        }
        matches.forEach(match => {
            let existingCell = this._cellMatches.get(match.cell.id);
            if (this._notebookEditorWidget && !existingCell) {
                const index = this._notebookEditorWidget.getCellIndex(match.cell);
                const existingRawCell = oldCellMatches.get(`${rawCellPrefix}${index}`);
                if (existingRawCell) {
                    existingRawCell.setCellModel(match.cell);
                    existingRawCell.clearAllMatches();
                    existingCell = existingRawCell;
                }
            }
            existingCell?.clearAllMatches();
            const cell = existingCell ?? new CellMatch(this, match.cell, match.index);
            cell.addContentMatches(contentMatchesToTextSearchMatches(match.contentMatches, match.cell));
            cell.addWebviewMatches(webviewMatchesToTextSearchMatches(match.webviewMatches));
            this._cellMatches.set(cell.id, cell);
        });
        this._findMatchDecorationModel?.setAllFindMatchesDecorations(matches);
        if (this._selectedMatch instanceof MatchInNotebook) {
            this.highlightCurrentFindMatchDecoration(this._selectedMatch);
        }
        this._onChange.fire({ forceUpdateModel: modelChange });
    }
    setNotebookFindMatchDecorationsUsingCellMatches(cells) {
        if (!this._findMatchDecorationModel) {
            return;
        }
        const cellFindMatch = coalesce(cells.map((cell) => {
            const webviewMatches = coalesce(cell.webviewMatches.map((match) => {
                if (!match.webviewIndex) {
                    return undefined;
                }
                return {
                    index: match.webviewIndex,
                };
            }));
            if (!cell.cell) {
                return undefined;
            }
            const findMatches = cell.contentMatches.map(match => {
                return new FindMatch(match.range(), [match.text()]);
            });
            return new CellFindMatchModel(cell.cell, cell.cellIndex, findMatches, webviewMatches);
        }));
        try {
            this._findMatchDecorationModel.setAllFindMatchesDecorations(cellFindMatch);
        }
        catch (e) {
            // no op, might happen due to bugs related to cell output regex search
        }
    }
    async updateMatchesForEditorWidget() {
        if (!this._notebookEditorWidget) {
            return;
        }
        this._textMatches = new Map();
        const wordSeparators = this._query.isWordMatch && this._query.wordSeparators ? this._query.wordSeparators : null;
        const allMatches = await this._notebookEditorWidget
            .find(this._query.pattern, {
            regex: this._query.isRegExp,
            wholeWord: this._query.isWordMatch,
            caseSensitive: this._query.isCaseSensitive,
            wordSeparators: wordSeparators ?? undefined,
            includeMarkupInput: this._query.notebookInfo?.isInNotebookMarkdownInput,
            includeMarkupPreview: this._query.notebookInfo?.isInNotebookMarkdownPreview,
            includeCodeInput: this._query.notebookInfo?.isInNotebookCellInput,
            includeOutput: this._query.notebookInfo?.isInNotebookCellOutput,
        }, CancellationToken.None, false, true, this.searchInstanceID);
        this.updateNotebookMatches(allMatches, true);
    }
    async showMatch(match) {
        const offset = await this.highlightCurrentFindMatchDecoration(match);
        this.setSelectedMatch(match);
        this.revealCellRange(match, offset);
    }
    async highlightCurrentFindMatchDecoration(match) {
        if (!this._findMatchDecorationModel || !match.cell) {
            // match cell should never be a CellSearchModel if the notebook is open
            return null;
        }
        if (match.webviewIndex === undefined) {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInCell(match.cell, match.range());
        }
        else {
            return this._findMatchDecorationModel.highlightCurrentFindMatchDecorationInWebview(match.cell, match.webviewIndex);
        }
    }
    matches() {
        const matches = Array.from(this._cellMatches.values()).flatMap((e) => e.matches());
        return [...super.matches(), ...matches];
    }
    removeMatch(match) {
        if (match instanceof MatchInNotebook) {
            match.cellParent.remove(match);
            if (match.cellParent.matches().length === 0) {
                this._cellMatches.delete(match.cellParent.id);
            }
            if (this.isMatchSelected(match)) {
                this.setSelectedMatch(null);
                this._findMatchDecorationModel?.clearCurrentFindMatchDecoration();
            }
            else {
                this.updateHighlights();
            }
            this.setNotebookFindMatchDecorationsUsingCellMatches(this.cellMatches());
        }
        else {
            super.removeMatch(match);
        }
    }
    cellMatches() {
        return Array.from(this._cellMatches.values());
    }
    createMatches() {
        const model = this.modelService.getModel(this._resource);
        if (model) {
            // todo: handle better when ai contributed results has model, currently, createMatches does not work for this
            this.bindModel(model);
            this.updateMatchesForModel();
        }
        else {
            const notebookEditorWidgetBorrow = this.notebookEditorService.retrieveExistingWidgetFromURI(this.resource);
            if (notebookEditorWidgetBorrow?.value) {
                this.bindNotebookEditorWidget(notebookEditorWidgetBorrow.value);
            }
            if (this.rawMatch.results) {
                this.rawMatch.results
                    .filter(resultIsMatch)
                    .forEach(rawMatch => {
                    textSearchResultToMatches(rawMatch, this, false)
                        .forEach(m => this.add(m));
                });
            }
            if (isINotebookFileMatchWithModel(this.rawMatch) || isINotebookFileMatchNoModel(this.rawMatch)) {
                this.rawMatch.cellResults?.forEach(cell => this.addCellMatch(cell));
                this.setNotebookFindMatchDecorationsUsingCellMatches(this.cellMatches());
                this._onChange.fire({ forceUpdateModel: true });
            }
            this.addContext(this.rawMatch.results);
        }
    }
    get hasChildren() {
        return super.hasChildren || this._cellMatches.size > 0;
    }
    setSelectedMatch(match) {
        if (match) {
            if (!this.isMatchSelected(match) && isIMatchInNotebook(match)) {
                this._selectedMatch = match;
                return;
            }
            if (!this._textMatches.has(match.id())) {
                return;
            }
            if (this.isMatchSelected(match)) {
                return;
            }
        }
        this._selectedMatch = match;
        this.updateHighlights();
    }
    dispose() {
        this.unbindNotebookEditorWidget();
        super.dispose();
    }
};
NotebookCompatibleFileMatch = __decorate([
    __param(7, IModelService),
    __param(8, IReplaceService),
    __param(9, ILabelService),
    __param(10, INotebookEditorService)
], NotebookCompatibleFileMatch);
export { NotebookCompatibleFileMatch };
// text search to notebook matches
export function textSearchMatchesToNotebookMatches(textSearchMatches, cell) {
    const notebookMatches = [];
    textSearchMatches.forEach((textSearchMatch) => {
        const previewLines = textSearchMatch.previewText.split('\n');
        textSearchMatch.rangeLocations.map((rangeLocation) => {
            const previewRange = rangeLocation.preview;
            const match = new MatchInNotebook(cell, previewLines, previewRange, rangeLocation.source, textSearchMatch.webviewIndex);
            notebookMatches.push(match);
        });
    });
    return notebookMatches;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL25vdGVib29rU2VhcmNoL25vdGVib29rU2VhcmNoTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBa0MsYUFBYSxFQUEyRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RMLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBR3pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQTZCLDJCQUEyQixFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlILE9BQU8s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