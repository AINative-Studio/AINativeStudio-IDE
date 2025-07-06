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
var FileMatchImpl_1;
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { themeColorFromId } from '../../../../../base/common/themables.js';
import { ModelDecorationOptions } from '../../../../../editor/common/model/textModel.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { overviewRulerFindMatchForeground, minimapFindMatch } from '../../../../../platform/theme/common/colorRegistry.js';
import { resultIsMatch, DEFAULT_MAX_SEARCH_RESULTS } from '../../../../services/search/common/search.js';
import { editorMatchesToTextSearchResults, getTextSearchMatchWithModelContext } from '../../../../services/search/common/searchHelpers.js';
import { IReplaceService } from '../replace.js';
import { FILE_MATCH_PREFIX } from './searchTreeCommon.js';
import { Emitter } from '../../../../../base/common/event.js';
import { textSearchResultToMatches } from './match.js';
import { OverviewRulerLane } from '../../../../../editor/common/standalone/standaloneEnums.js';
let FileMatchImpl = class FileMatchImpl extends Disposable {
    static { FileMatchImpl_1 = this; }
    static { this._CURRENT_FIND_MATCH = ModelDecorationOptions.register({
        description: 'search-current-find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 13,
        className: 'currentFindMatch',
        inlineClassName: 'currentFindMatchInline',
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */
        }
    }); }
    static { this._FIND_MATCH = ModelDecorationOptions.register({
        description: 'search-find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'findMatch',
        inlineClassName: 'findMatchInline',
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */
        }
    }); }
    static getDecorationOption(selected) {
        return (selected ? FileMatchImpl_1._CURRENT_FIND_MATCH : FileMatchImpl_1._FIND_MATCH);
    }
    get context() {
        return new Map(this._context);
    }
    constructor(_query, _previewOptions, _maxResults, _parent, rawMatch, _closestRoot, modelService, replaceService, labelService) {
        super();
        this._query = _query;
        this._previewOptions = _previewOptions;
        this._maxResults = _maxResults;
        this._parent = _parent;
        this.rawMatch = rawMatch;
        this._closestRoot = _closestRoot;
        this.modelService = modelService;
        this.replaceService = replaceService;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this._model = null;
        this._modelListener = null;
        this._selectedMatch = null;
        this._modelDecorations = [];
        this._context = new Map();
        this.replaceQ = Promise.resolve();
        this._resource = this.rawMatch.resource;
        this._textMatches = new Map();
        this._removedTextMatches = new Set();
        this._updateScheduler = new RunOnceScheduler(this.updateMatchesForModel.bind(this), 250);
        this._name = new Lazy(() => labelService.getUriBasenameLabel(this.resource));
    }
    get closestRoot() {
        return this._closestRoot;
    }
    hasReadonlyMatches() {
        return this.matches().some(m => m.isReadonly);
    }
    createMatches() {
        const model = this.modelService.getModel(this._resource);
        if (model) {
            // todo: handle better when ai contributed results has model, currently, createMatches does not work for this
            this.bindModel(model);
            this.updateMatchesForModel();
        }
        else {
            if (this.rawMatch.results) {
                this.rawMatch.results
                    .filter(resultIsMatch)
                    .forEach(rawMatch => {
                    textSearchResultToMatches(rawMatch, this, false)
                        .forEach(m => this.add(m));
                });
            }
        }
    }
    bindModel(model) {
        this._model = model;
        this._modelListener = new DisposableStore();
        this._modelListener.add(this._model.onDidChangeContent(() => {
            this._updateScheduler.schedule();
        }));
        this._modelListener.add(this._model.onWillDispose(() => this.onModelWillDispose()));
        this.updateHighlights();
    }
    onModelWillDispose() {
        // Update matches because model might have some dirty changes
        this.updateMatchesForModel();
        this.unbindModel();
    }
    unbindModel() {
        if (this._model) {
            this._updateScheduler.cancel();
            this._model.changeDecorations((accessor) => {
                this._modelDecorations = accessor.deltaDecorations(this._modelDecorations, []);
            });
            this._model = null;
            this._modelListener.dispose();
        }
    }
    updateMatchesForModel() {
        // this is called from a timeout and might fire
        // after the model has been disposed
        if (!this._model) {
            return;
        }
        this._textMatches = new Map();
        const wordSeparators = this._query.isWordMatch && this._query.wordSeparators ? this._query.wordSeparators : null;
        const matches = this._model
            .findMatches(this._query.pattern, this._model.getFullModelRange(), !!this._query.isRegExp, !!this._query.isCaseSensitive, wordSeparators, false, this._maxResults ?? DEFAULT_MAX_SEARCH_RESULTS);
        this.updateMatches(matches, true, this._model, false);
    }
    async updatesMatchesForLineAfterReplace(lineNumber, modelChange) {
        if (!this._model) {
            return;
        }
        const range = {
            startLineNumber: lineNumber,
            startColumn: this._model.getLineMinColumn(lineNumber),
            endLineNumber: lineNumber,
            endColumn: this._model.getLineMaxColumn(lineNumber)
        };
        const oldMatches = Array.from(this._textMatches.values()).filter(match => match.range().startLineNumber === lineNumber);
        oldMatches.forEach(match => this._textMatches.delete(match.id()));
        const wordSeparators = this._query.isWordMatch && this._query.wordSeparators ? this._query.wordSeparators : null;
        const matches = this._model.findMatches(this._query.pattern, range, !!this._query.isRegExp, !!this._query.isCaseSensitive, wordSeparators, false, this._maxResults ?? DEFAULT_MAX_SEARCH_RESULTS);
        this.updateMatches(matches, modelChange, this._model, false);
    }
    updateMatches(matches, modelChange, model, isAiContributed) {
        const textSearchResults = editorMatchesToTextSearchResults(matches, model, this._previewOptions);
        textSearchResults.forEach(textSearchResult => {
            textSearchResultToMatches(textSearchResult, this, isAiContributed).forEach(match => {
                if (!this._removedTextMatches.has(match.id())) {
                    this.add(match);
                    if (this.isMatchSelected(match)) {
                        this._selectedMatch = match;
                    }
                }
            });
        });
        this.addContext(getTextSearchMatchWithModelContext(textSearchResults, model, this.parent().parent().query));
        this._onChange.fire({ forceUpdateModel: modelChange });
        this.updateHighlights();
    }
    updateHighlights() {
        if (!this._model) {
            return;
        }
        this._model.changeDecorations((accessor) => {
            const newDecorations = (this.parent().showHighlights
                ? this.matches().map((match) => ({
                    range: match.range(),
                    options: FileMatchImpl_1.getDecorationOption(this.isMatchSelected(match))
                }))
                : []);
            this._modelDecorations = accessor.deltaDecorations(this._modelDecorations, newDecorations);
        });
    }
    id() {
        return FILE_MATCH_PREFIX + this.resource.toString();
    }
    parent() {
        return this._parent;
    }
    get hasChildren() {
        return this._textMatches.size > 0;
    }
    matches() {
        return [...this._textMatches.values()];
    }
    textMatches() {
        return Array.from(this._textMatches.values());
    }
    remove(matches) {
        if (!Array.isArray(matches)) {
            matches = [matches];
        }
        for (const match of matches) {
            this.removeMatch(match);
            this._removedTextMatches.add(match.id());
        }
        this._onChange.fire({ didRemove: true });
    }
    async replace(toReplace) {
        return this.replaceQ = this.replaceQ.finally(async () => {
            await this.replaceService.replace(toReplace);
            await this.updatesMatchesForLineAfterReplace(toReplace.range().startLineNumber, false);
        });
    }
    setSelectedMatch(match) {
        if (match) {
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
    getSelectedMatch() {
        return this._selectedMatch;
    }
    isMatchSelected(match) {
        return !!this._selectedMatch && this._selectedMatch.id() === match.id();
    }
    count() {
        return this.matches().length;
    }
    get resource() {
        return this._resource;
    }
    name() {
        return this._name.value;
    }
    addContext(results) {
        if (!results) {
            return;
        }
        const contexts = results
            .filter((result => !resultIsMatch(result)));
        return contexts.forEach(context => this._context.set(context.lineNumber, context.text));
    }
    add(match, trigger) {
        this._textMatches.set(match.id(), match);
        if (trigger) {
            this._onChange.fire({ forceUpdateModel: true });
        }
    }
    removeMatch(match) {
        this._textMatches.delete(match.id());
        if (this.isMatchSelected(match)) {
            this.setSelectedMatch(null);
            this._findMatchDecorationModel?.clearCurrentFindMatchDecoration();
        }
        else {
            this.updateHighlights();
        }
    }
    async resolveFileStat(fileService) {
        this._fileStat = await fileService.stat(this.resource).catch(() => undefined);
    }
    get fileStat() {
        return this._fileStat;
    }
    set fileStat(stat) {
        this._fileStat = stat;
    }
    dispose() {
        this.setSelectedMatch(null);
        this.unbindModel();
        this._onDispose.fire();
        super.dispose();
    }
    hasOnlyReadOnlyMatches() {
        return this.matches().every(match => match.isReadonly);
    }
};
FileMatchImpl = FileMatchImpl_1 = __decorate([
    __param(6, IModelService),
    __param(7, IReplaceService),
    __param(8, ILabelService)
], FileMatchImpl);
export { FileMatchImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZU1hdGNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL2ZpbGVNYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMzSCxPQUFPLEVBQXVELGFBQWEsRUFBRSwwQkFBMEIsRUFBeUMsTUFBTSw4Q0FBOEMsQ0FBQztBQUNyTSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUzSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2hELE9BQU8sRUFBRSxpQkFBaUIsRUFBdUcsTUFBTSx1QkFBdUIsQ0FBQztBQUMvSixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sWUFBWSxDQUFD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