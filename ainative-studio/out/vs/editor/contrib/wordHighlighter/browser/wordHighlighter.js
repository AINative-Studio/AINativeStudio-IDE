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
var WordHighlighter_1, WordHighlighterContribution_1;
import * as nls from '../../../../nls.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { createCancelablePromise, Delayer, first } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { matchesScheme, Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isDiffEditor } from '../../../browser/editorBrowser.js';
import { EditorAction, registerEditorAction, registerEditorContribution, registerModelAndPositionCommand } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { score } from '../../../common/languageSelector.js';
import { shouldSynchronizeModel } from '../../../common/model.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { getHighlightDecorationOptions } from './highlightDecorations.js';
import { TextualMultiDocumentHighlightFeature } from './textualHighlightProvider.js';
const ctxHasWordHighlights = new RawContextKey('hasWordHighlights', false);
export function getOccurrencesAtPosition(registry, model, position, token) {
    const orderedByScore = registry.ordered(model);
    // in order of score ask the occurrences provider
    // until someone response with a good result
    // (good = non undefined and non null value)
    // (result of size == 0 is valid, no highlights is a valid/expected result -- not a signal to fall back to other providers)
    return first(orderedByScore.map(provider => () => {
        return Promise.resolve(provider.provideDocumentHighlights(model, position, token))
            .then(undefined, onUnexpectedExternalError);
    }), (result) => result !== undefined && result !== null).then(result => {
        if (result) {
            const map = new ResourceMap();
            map.set(model.uri, result);
            return map;
        }
        return new ResourceMap();
    });
}
export function getOccurrencesAcrossMultipleModels(registry, model, position, token, otherModels) {
    const orderedByScore = registry.ordered(model);
    // in order of score ask the occurrences provider
    // until someone response with a good result
    // (good = non undefined and non null ResourceMap)
    // (result of size == 0 is valid, no highlights is a valid/expected result -- not a signal to fall back to other providers)
    return first(orderedByScore.map(provider => () => {
        const filteredModels = otherModels.filter(otherModel => {
            return shouldSynchronizeModel(otherModel);
        }).filter(otherModel => {
            return score(provider.selector, otherModel.uri, otherModel.getLanguageId(), true, undefined, undefined) > 0;
        });
        return Promise.resolve(provider.provideMultiDocumentHighlights(model, position, filteredModels, token))
            .then(undefined, onUnexpectedExternalError);
    }), (result) => result !== undefined && result !== null);
}
class OccurenceAtPositionRequest {
    constructor(_model, _selection, _wordSeparators) {
        this._model = _model;
        this._selection = _selection;
        this._wordSeparators = _wordSeparators;
        this._wordRange = this._getCurrentWordRange(_model, _selection);
        this._result = null;
    }
    get result() {
        if (!this._result) {
            this._result = createCancelablePromise(token => this._compute(this._model, this._selection, this._wordSeparators, token));
        }
        return this._result;
    }
    _getCurrentWordRange(model, selection) {
        const word = model.getWordAtPosition(selection.getPosition());
        if (word) {
            return new Range(selection.startLineNumber, word.startColumn, selection.startLineNumber, word.endColumn);
        }
        return null;
    }
    isValid(model, selection, decorations) {
        const lineNumber = selection.startLineNumber;
        const startColumn = selection.startColumn;
        const endColumn = selection.endColumn;
        const currentWordRange = this._getCurrentWordRange(model, selection);
        let requestIsValid = Boolean(this._wordRange && this._wordRange.equalsRange(currentWordRange));
        // Even if we are on a different word, if that word is in the decorations ranges, the request is still valid
        // (Same symbol)
        for (let i = 0, len = decorations.length; !requestIsValid && i < len; i++) {
            const range = decorations.getRange(i);
            if (range && range.startLineNumber === lineNumber) {
                if (range.startColumn <= startColumn && range.endColumn >= endColumn) {
                    requestIsValid = true;
                }
            }
        }
        return requestIsValid;
    }
    cancel() {
        this.result.cancel();
    }
}
class SemanticOccurenceAtPositionRequest extends OccurenceAtPositionRequest {
    constructor(model, selection, wordSeparators, providers) {
        super(model, selection, wordSeparators);
        this._providers = providers;
    }
    _compute(model, selection, wordSeparators, token) {
        return getOccurrencesAtPosition(this._providers, model, selection.getPosition(), token).then(value => {
            if (!value) {
                return new ResourceMap();
            }
            return value;
        });
    }
}
class MultiModelOccurenceRequest extends OccurenceAtPositionRequest {
    constructor(model, selection, wordSeparators, providers, otherModels) {
        super(model, selection, wordSeparators);
        this._providers = providers;
        this._otherModels = otherModels;
    }
    _compute(model, selection, wordSeparators, token) {
        return getOccurrencesAcrossMultipleModels(this._providers, model, selection.getPosition(), token, this._otherModels).then(value => {
            if (!value) {
                return new ResourceMap();
            }
            return value;
        });
    }
}
function computeOccurencesAtPosition(registry, model, selection, wordSeparators) {
    return new SemanticOccurenceAtPositionRequest(model, selection, wordSeparators, registry);
}
function computeOccurencesMultiModel(registry, model, selection, wordSeparators, otherModels) {
    return new MultiModelOccurenceRequest(model, selection, wordSeparators, registry, otherModels);
}
registerModelAndPositionCommand('_executeDocumentHighlights', async (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const map = await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, position, CancellationToken.None);
    return map?.get(model.uri);
});
let WordHighlighter = class WordHighlighter {
    static { WordHighlighter_1 = this; }
    static { this.storedDecorationIDs = new ResourceMap(); }
    static { this.query = null; }
    constructor(editor, providers, multiProviders, contextKeyService, textModelService, codeEditorService, configurationService, logService) {
        this.toUnhook = new DisposableStore();
        this.workerRequestTokenId = 0;
        this.workerRequestCompleted = false;
        this.workerRequestValue = new ResourceMap();
        this.lastCursorPositionChangeTime = 0;
        this.renderDecorationsTimer = -1;
        this.runDelayer = this.toUnhook.add(new Delayer(50));
        this.editor = editor;
        this.providers = providers;
        this.multiDocumentProviders = multiProviders;
        this.codeEditorService = codeEditorService;
        this.textModelService = textModelService;
        this.configurationService = configurationService;
        this.logService = logService;
        this._hasWordHighlights = ctxHasWordHighlights.bindTo(contextKeyService);
        this._ignorePositionChangeEvent = false;
        this.occurrencesHighlightEnablement = this.editor.getOption(82 /* EditorOption.occurrencesHighlight */);
        this.occurrencesHighlightDelay = this.configurationService.getValue('editor.occurrencesHighlightDelay');
        this.model = this.editor.getModel();
        this.toUnhook.add(editor.onDidChangeCursorPosition((e) => {
            if (this._ignorePositionChangeEvent) {
                // We are changing the position => ignore this event
                return;
            }
            if (this.occurrencesHighlightEnablement === 'off') {
                // Early exit if nothing needs to be done!
                // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
                return;
            }
            this.runDelayer.trigger(() => { this._onPositionChanged(e); });
        }));
        this.toUnhook.add(editor.onDidFocusEditorText((e) => {
            if (this.occurrencesHighlightEnablement === 'off') {
                // Early exit if nothing needs to be done
                return;
            }
            if (!this.workerRequest) {
                this.runDelayer.trigger(() => { this._run(); });
            }
        }));
        this.toUnhook.add(editor.onDidChangeModelContent((e) => {
            if (!matchesScheme(this.model.uri, 'output')) {
                this._stopAll();
            }
        }));
        this.toUnhook.add(editor.onDidChangeModel((e) => {
            if (!e.newModelUrl && e.oldModelUrl) {
                this._stopSingular();
            }
            else if (WordHighlighter_1.query) {
                this._run();
            }
        }));
        this.toUnhook.add(editor.onDidChangeConfiguration((e) => {
            const newEnablement = this.editor.getOption(82 /* EditorOption.occurrencesHighlight */);
            if (this.occurrencesHighlightEnablement !== newEnablement) {
                this.occurrencesHighlightEnablement = newEnablement;
                switch (newEnablement) {
                    case 'off':
                        this._stopAll();
                        break;
                    case 'singleFile':
                        this._stopAll(WordHighlighter_1.query?.modelInfo?.modelURI);
                        break;
                    case 'multiFile':
                        if (WordHighlighter_1.query) {
                            this._run(true);
                        }
                        break;
                    default:
                        console.warn('Unknown occurrencesHighlight setting value:', newEnablement);
                        break;
                }
            }
        }));
        this.toUnhook.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.occurrencesHighlightDelay')) {
                const newDelay = configurationService.getValue('editor.occurrencesHighlightDelay');
                if (this.occurrencesHighlightDelay !== newDelay) {
                    this.occurrencesHighlightDelay = newDelay;
                }
            }
        }));
        this.toUnhook.add(editor.onDidBlurEditorWidget(() => {
            // logic is as follows
            // - didBlur => active null => stopall
            // - didBlur => active nb   => if this.editor is notebook, do nothing (new cell, so we don't want to stopAll)
            //              active nb   => if this.editor is NOT nb,   stopAll
            const activeEditor = this.codeEditorService.getFocusedCodeEditor();
            if (!activeEditor) { // clicked into nb cell list, outline, terminal, etc
                this._stopAll();
            }
            else if (activeEditor.getModel()?.uri.scheme === Schemas.vscodeNotebookCell && this.editor.getModel()?.uri.scheme !== Schemas.vscodeNotebookCell) { // switched tabs from non-nb to nb
                this._stopAll();
            }
        }));
        this.decorations = this.editor.createDecorationsCollection();
        this.workerRequestTokenId = 0;
        this.workerRequest = null;
        this.workerRequestCompleted = false;
        this.lastCursorPositionChangeTime = 0;
        this.renderDecorationsTimer = -1;
        // if there is a query already, highlight off that query
        if (WordHighlighter_1.query) {
            this._run();
        }
    }
    hasDecorations() {
        return (this.decorations.length > 0);
    }
    restore(delay) {
        if (this.occurrencesHighlightEnablement === 'off') {
            return;
        }
        this.runDelayer.cancel();
        this.runDelayer.trigger(() => { this._run(false, delay); });
    }
    trigger() {
        this.runDelayer.cancel();
        this._run(false, 0); // immediate rendering (delay = 0)
    }
    stop() {
        if (this.occurrencesHighlightEnablement === 'off') {
            return;
        }
        this._stopAll();
    }
    _getSortedHighlights() {
        return (this.decorations.getRanges()
            .sort(Range.compareRangesUsingStarts));
    }
    moveNext() {
        const highlights = this._getSortedHighlights();
        const index = highlights.findIndex((range) => range.containsPosition(this.editor.getPosition()));
        const newIndex = ((index + 1) % highlights.length);
        const dest = highlights[newIndex];
        try {
            this._ignorePositionChangeEvent = true;
            this.editor.setPosition(dest.getStartPosition());
            this.editor.revealRangeInCenterIfOutsideViewport(dest);
            const word = this._getWord();
            if (word) {
                const lineContent = this.editor.getModel().getLineContent(dest.startLineNumber);
                alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
            }
        }
        finally {
            this._ignorePositionChangeEvent = false;
        }
    }
    moveBack() {
        const highlights = this._getSortedHighlights();
        const index = highlights.findIndex((range) => range.containsPosition(this.editor.getPosition()));
        const newIndex = ((index - 1 + highlights.length) % highlights.length);
        const dest = highlights[newIndex];
        try {
            this._ignorePositionChangeEvent = true;
            this.editor.setPosition(dest.getStartPosition());
            this.editor.revealRangeInCenterIfOutsideViewport(dest);
            const word = this._getWord();
            if (word) {
                const lineContent = this.editor.getModel().getLineContent(dest.startLineNumber);
                alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
            }
        }
        finally {
            this._ignorePositionChangeEvent = false;
        }
    }
    _removeSingleDecorations() {
        // return if no model
        if (!this.editor.hasModel()) {
            return;
        }
        const currentDecorationIDs = WordHighlighter_1.storedDecorationIDs.get(this.editor.getModel().uri);
        if (!currentDecorationIDs) {
            return;
        }
        this.editor.removeDecorations(currentDecorationIDs);
        WordHighlighter_1.storedDecorationIDs.delete(this.editor.getModel().uri);
        if (this.decorations.length > 0) {
            this.decorations.clear();
            this._hasWordHighlights.set(false);
        }
    }
    _removeAllDecorations(preservedModel) {
        const currentEditors = this.codeEditorService.listCodeEditors();
        const deleteURI = [];
        // iterate over editors and store models in currentModels
        for (const editor of currentEditors) {
            if (!editor.hasModel() || isEqual(editor.getModel().uri, preservedModel)) {
                continue;
            }
            const currentDecorationIDs = WordHighlighter_1.storedDecorationIDs.get(editor.getModel().uri);
            if (!currentDecorationIDs) {
                continue;
            }
            editor.removeDecorations(currentDecorationIDs);
            deleteURI.push(editor.getModel().uri);
            const editorHighlighterContrib = WordHighlighterContribution.get(editor);
            if (!editorHighlighterContrib?.wordHighlighter) {
                continue;
            }
            if (editorHighlighterContrib.wordHighlighter.decorations.length > 0) {
                editorHighlighterContrib.wordHighlighter.decorations.clear();
                editorHighlighterContrib.wordHighlighter.workerRequest = null;
                editorHighlighterContrib.wordHighlighter._hasWordHighlights.set(false);
            }
        }
        for (const uri of deleteURI) {
            WordHighlighter_1.storedDecorationIDs.delete(uri);
        }
    }
    _stopSingular() {
        // Remove any existing decorations + a possible query, and re - run to update decorations
        this._removeSingleDecorations();
        if (this.editor.hasTextFocus()) {
            if (this.editor.getModel()?.uri.scheme !== Schemas.vscodeNotebookCell && WordHighlighter_1.query?.modelInfo?.modelURI.scheme !== Schemas.vscodeNotebookCell) { // clear query if focused non-nb editor
                WordHighlighter_1.query = null;
                this._run(); // TODO: @Yoyokrazy -- investigate why we need a full rerun here. likely addressed a case/patch in the first iteration of this feature
            }
            else { // remove modelInfo to account for nb cell being disposed
                if (WordHighlighter_1.query?.modelInfo) {
                    WordHighlighter_1.query.modelInfo = null;
                }
            }
        }
        // Cancel any renderDecorationsTimer
        if (this.renderDecorationsTimer !== -1) {
            clearTimeout(this.renderDecorationsTimer);
            this.renderDecorationsTimer = -1;
        }
        // Cancel any worker request
        if (this.workerRequest !== null) {
            this.workerRequest.cancel();
            this.workerRequest = null;
        }
        // Invalidate any worker request callback
        if (!this.workerRequestCompleted) {
            this.workerRequestTokenId++;
            this.workerRequestCompleted = true;
        }
    }
    _stopAll(preservedModel) {
        // Remove any existing decorations
        // TODO: @Yoyokrazy -- this triggers as notebooks scroll, causing highlights to disappear momentarily.
        // maybe a nb type check?
        this._removeAllDecorations(preservedModel);
        // Cancel any renderDecorationsTimer
        if (this.renderDecorationsTimer !== -1) {
            clearTimeout(this.renderDecorationsTimer);
            this.renderDecorationsTimer = -1;
        }
        // Cancel any worker request
        if (this.workerRequest !== null) {
            this.workerRequest.cancel();
            this.workerRequest = null;
        }
        // Invalidate any worker request callback
        if (!this.workerRequestCompleted) {
            this.workerRequestTokenId++;
            this.workerRequestCompleted = true;
        }
    }
    _onPositionChanged(e) {
        // disabled
        if (this.occurrencesHighlightEnablement === 'off') {
            this._stopAll();
            return;
        }
        // ignore typing & other
        // need to check if the model is a notebook cell, should not stop if nb
        if (e.source !== 'api' && e.reason !== 3 /* CursorChangeReason.Explicit */) {
            this._stopAll();
            return;
        }
        this._run();
    }
    _getWord() {
        const editorSelection = this.editor.getSelection();
        const lineNumber = editorSelection.startLineNumber;
        const startColumn = editorSelection.startColumn;
        if (this.model.isDisposed()) {
            return null;
        }
        return this.model.getWordAtPosition({
            lineNumber: lineNumber,
            column: startColumn
        });
    }
    getOtherModelsToHighlight(model) {
        if (!model) {
            return [];
        }
        // notebook case
        const isNotebookEditor = model.uri.scheme === Schemas.vscodeNotebookCell;
        if (isNotebookEditor) {
            const currentModels = [];
            const currentEditors = this.codeEditorService.listCodeEditors();
            for (const editor of currentEditors) {
                const tempModel = editor.getModel();
                if (tempModel && tempModel !== model && tempModel.uri.scheme === Schemas.vscodeNotebookCell) {
                    currentModels.push(tempModel);
                }
            }
            return currentModels;
        }
        // inline case
        // ? current works when highlighting outside of an inline diff, highlighting in.
        // ? broken when highlighting within a diff editor. highlighting the main editor does not work
        // ? editor group service could be useful here
        const currentModels = [];
        const currentEditors = this.codeEditorService.listCodeEditors();
        for (const editor of currentEditors) {
            if (!isDiffEditor(editor)) {
                continue;
            }
            const diffModel = editor.getModel();
            if (!diffModel) {
                continue;
            }
            if (model === diffModel.modified) { // embedded inline chat diff would pass this, allowing highlights
                //? currentModels.push(diffModel.original);
                currentModels.push(diffModel.modified);
            }
        }
        if (currentModels.length) { // no matching editors have been found
            return currentModels;
        }
        // multi-doc OFF
        if (this.occurrencesHighlightEnablement === 'singleFile') {
            return [];
        }
        // multi-doc ON
        for (const editor of currentEditors) {
            const tempModel = editor.getModel();
            const isValidModel = tempModel && tempModel !== model;
            if (isValidModel) {
                currentModels.push(tempModel);
            }
        }
        return currentModels;
    }
    async _run(multiFileConfigChange, delay) {
        const hasTextFocus = this.editor.hasTextFocus();
        if (!hasTextFocus) { // new nb cell scrolled in, didChangeModel fires
            if (!WordHighlighter_1.query) { // no previous query, nothing to highlight off of
                this._stopAll();
                return;
            }
        }
        else { // has text focus
            const editorSelection = this.editor.getSelection();
            // ignore multiline selection
            if (!editorSelection || editorSelection.startLineNumber !== editorSelection.endLineNumber) {
                WordHighlighter_1.query = null;
                this._stopAll();
                return;
            }
            const startColumn = editorSelection.startColumn;
            const endColumn = editorSelection.endColumn;
            const word = this._getWord();
            // The selection must be inside a word or surround one word at most
            if (!word || word.startColumn > startColumn || word.endColumn < endColumn) {
                // no previous query, nothing to highlight
                WordHighlighter_1.query = null;
                this._stopAll();
                return;
            }
            WordHighlighter_1.query = {
                modelInfo: {
                    modelURI: this.model.uri,
                    selection: editorSelection,
                }
            };
        }
        this.lastCursorPositionChangeTime = (new Date()).getTime();
        if (isEqual(this.editor.getModel().uri, WordHighlighter_1.query.modelInfo?.modelURI)) { // only trigger new worker requests from the primary model that initiated the query
            // case d)
            // check if the new queried word is contained in the range of a stored decoration for this model
            if (!multiFileConfigChange) {
                const currentModelDecorationRanges = this.decorations.getRanges();
                for (const storedRange of currentModelDecorationRanges) {
                    if (storedRange.containsPosition(this.editor.getPosition())) {
                        return;
                    }
                }
            }
            // stop all previous actions if new word is highlighted
            // if we trigger the run off a setting change -> multifile highlighting, we do not want to remove decorations from this model
            this._stopAll(multiFileConfigChange ? this.model.uri : undefined);
            const myRequestId = ++this.workerRequestTokenId;
            this.workerRequestCompleted = false;
            const otherModelsToHighlight = this.getOtherModelsToHighlight(this.editor.getModel());
            // when reaching here, there are two possible states.
            // 		1) we have text focus, and a valid query was updated.
            // 		2) we do not have text focus, and a valid query is cached.
            // the query will ALWAYS have the correct data for the current highlight request, so it can always be passed to the workerRequest safely
            if (!WordHighlighter_1.query || !WordHighlighter_1.query.modelInfo) {
                return;
            }
            const queryModelRef = await this.textModelService.createModelReference(WordHighlighter_1.query.modelInfo.modelURI);
            try {
                this.workerRequest = this.computeWithModel(queryModelRef.object.textEditorModel, WordHighlighter_1.query.modelInfo.selection, otherModelsToHighlight);
                this.workerRequest?.result.then(data => {
                    if (myRequestId === this.workerRequestTokenId) {
                        this.workerRequestCompleted = true;
                        this.workerRequestValue = data || [];
                        this._beginRenderDecorations(delay ?? this.occurrencesHighlightDelay);
                    }
                }, onUnexpectedError);
            }
            catch (e) {
                this.logService.error('Unexpected error during occurrence request. Log: ', e);
            }
            finally {
                queryModelRef.dispose();
            }
        }
        else if (this.model.uri.scheme === Schemas.vscodeNotebookCell) {
            // new wordHighlighter coming from a different model, NOT the query model, need to create a textModel ref
            const myRequestId = ++this.workerRequestTokenId;
            this.workerRequestCompleted = false;
            if (!WordHighlighter_1.query || !WordHighlighter_1.query.modelInfo) {
                return;
            }
            const queryModelRef = await this.textModelService.createModelReference(WordHighlighter_1.query.modelInfo.modelURI);
            try {
                this.workerRequest = this.computeWithModel(queryModelRef.object.textEditorModel, WordHighlighter_1.query.modelInfo.selection, [this.model]);
                this.workerRequest?.result.then(data => {
                    if (myRequestId === this.workerRequestTokenId) {
                        this.workerRequestCompleted = true;
                        this.workerRequestValue = data || [];
                        this._beginRenderDecorations(delay ?? this.occurrencesHighlightDelay);
                    }
                }, onUnexpectedError);
            }
            catch (e) {
                this.logService.error('Unexpected error during occurrence request. Log: ', e);
            }
            finally {
                queryModelRef.dispose();
            }
        }
    }
    computeWithModel(model, selection, otherModels) {
        if (!otherModels.length) {
            return computeOccurencesAtPosition(this.providers, model, selection, this.editor.getOption(136 /* EditorOption.wordSeparators */));
        }
        else {
            return computeOccurencesMultiModel(this.multiDocumentProviders, model, selection, this.editor.getOption(136 /* EditorOption.wordSeparators */), otherModels);
        }
    }
    _beginRenderDecorations(delay) {
        const currentTime = (new Date()).getTime();
        const minimumRenderTime = this.lastCursorPositionChangeTime + delay;
        if (currentTime >= minimumRenderTime) {
            // Synchronous
            this.renderDecorationsTimer = -1;
            this.renderDecorations();
        }
        else {
            // Asynchronous
            this.renderDecorationsTimer = setTimeout(() => {
                this.renderDecorations();
            }, (minimumRenderTime - currentTime));
        }
    }
    renderDecorations() {
        this.renderDecorationsTimer = -1;
        // create new loop, iterate over current editors using this.codeEditorService.listCodeEditors(),
        // if the URI of that codeEditor is in the map, then add the decorations to the decorations array
        // then set the decorations for the editor
        const currentEditors = this.codeEditorService.listCodeEditors();
        for (const editor of currentEditors) {
            const editorHighlighterContrib = WordHighlighterContribution.get(editor);
            if (!editorHighlighterContrib) {
                continue;
            }
            const newDecorations = [];
            const uri = editor.getModel()?.uri;
            if (uri && this.workerRequestValue.has(uri)) {
                const oldDecorationIDs = WordHighlighter_1.storedDecorationIDs.get(uri);
                const newDocumentHighlights = this.workerRequestValue.get(uri);
                if (newDocumentHighlights) {
                    for (const highlight of newDocumentHighlights) {
                        if (!highlight.range) {
                            continue;
                        }
                        newDecorations.push({
                            range: highlight.range,
                            options: getHighlightDecorationOptions(highlight.kind)
                        });
                    }
                }
                let newDecorationIDs = [];
                editor.changeDecorations((changeAccessor) => {
                    newDecorationIDs = changeAccessor.deltaDecorations(oldDecorationIDs ?? [], newDecorations);
                });
                WordHighlighter_1.storedDecorationIDs = WordHighlighter_1.storedDecorationIDs.set(uri, newDecorationIDs);
                if (newDecorations.length > 0) {
                    editorHighlighterContrib.wordHighlighter?.decorations.set(newDecorations);
                    editorHighlighterContrib.wordHighlighter?._hasWordHighlights.set(true);
                }
            }
        }
        // clear the worker request when decorations are completed
        this.workerRequest = null;
    }
    dispose() {
        this._stopSingular();
        this.toUnhook.dispose();
    }
};
WordHighlighter = WordHighlighter_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, ICodeEditorService),
    __param(6, IConfigurationService),
    __param(7, ILogService)
], WordHighlighter);
let WordHighlighterContribution = class WordHighlighterContribution extends Disposable {
    static { WordHighlighterContribution_1 = this; }
    static { this.ID = 'editor.contrib.wordHighlighter'; }
    static get(editor) {
        return editor.getContribution(WordHighlighterContribution_1.ID);
    }
    constructor(editor, contextKeyService, languageFeaturesService, codeEditorService, textModelService, configurationService, logService) {
        super();
        this._wordHighlighter = null;
        const createWordHighlighterIfPossible = () => {
            if (editor.hasModel() && !editor.getModel().isTooLargeForTokenization() && editor.getModel().uri.scheme !== Schemas.accessibleView) {
                this._wordHighlighter = new WordHighlighter(editor, languageFeaturesService.documentHighlightProvider, languageFeaturesService.multiDocumentHighlightProvider, contextKeyService, textModelService, codeEditorService, configurationService, logService);
            }
        };
        this._register(editor.onDidChangeModel((e) => {
            if (this._wordHighlighter) {
                if (!e.newModelUrl && e.oldModelUrl?.scheme !== Schemas.vscodeNotebookCell) { // happens when switching tabs to a notebook that has focus in the cell list, no new model URI (this also doesn't make it to the wordHighlighter, bc no editor.hasModel)
                    this.wordHighlighter?.stop();
                }
                this._wordHighlighter.dispose();
                this._wordHighlighter = null;
            }
            createWordHighlighterIfPossible();
        }));
        createWordHighlighterIfPossible();
    }
    get wordHighlighter() {
        return this._wordHighlighter;
    }
    saveViewState() {
        if (this._wordHighlighter && this._wordHighlighter.hasDecorations()) {
            return true;
        }
        return false;
    }
    moveNext() {
        this._wordHighlighter?.moveNext();
    }
    moveBack() {
        this._wordHighlighter?.moveBack();
    }
    restoreViewState(state) {
        if (this._wordHighlighter && state) {
            this._wordHighlighter.restore(250); // 250 ms delay to restoring view state, since only exts call this
        }
    }
    stopHighlighting() {
        this._wordHighlighter?.stop();
    }
    dispose() {
        if (this._wordHighlighter) {
            this._wordHighlighter.dispose();
            this._wordHighlighter = null;
        }
        super.dispose();
    }
};
WordHighlighterContribution = WordHighlighterContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ILanguageFeaturesService),
    __param(3, ICodeEditorService),
    __param(4, ITextModelService),
    __param(5, IConfigurationService),
    __param(6, ILogService)
], WordHighlighterContribution);
export { WordHighlighterContribution };
class WordHighlightNavigationAction extends EditorAction {
    constructor(next, opts) {
        super(opts);
        this._isNext = next;
    }
    run(accessor, editor) {
        const controller = WordHighlighterContribution.get(editor);
        if (!controller) {
            return;
        }
        if (this._isNext) {
            controller.moveNext();
        }
        else {
            controller.moveBack();
        }
    }
}
class NextWordHighlightAction extends WordHighlightNavigationAction {
    constructor() {
        super(true, {
            id: 'editor.action.wordHighlight.next',
            label: nls.localize2('wordHighlight.next.label', "Go to Next Symbol Highlight"),
            precondition: ctxHasWordHighlights,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
class PrevWordHighlightAction extends WordHighlightNavigationAction {
    constructor() {
        super(false, {
            id: 'editor.action.wordHighlight.prev',
            label: nls.localize2('wordHighlight.previous.label', "Go to Previous Symbol Highlight"),
            precondition: ctxHasWordHighlights,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
class TriggerWordHighlightAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.wordHighlight.trigger',
            label: nls.localize2('wordHighlight.trigger.label', "Trigger Symbol Highlight"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor, args) {
        const controller = WordHighlighterContribution.get(editor);
        if (!controller) {
            return;
        }
        controller.restoreViewState(true);
    }
}
registerEditorContribution(WordHighlighterContribution.ID, WordHighlighterContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it uses `saveViewState`/`restoreViewState`
registerEditorAction(NextWordHighlightAction);
registerEditorAction(PrevWordHighlightAction);
registerEditorAction(TriggerWordHighlightAction);
registerEditorFeature(TextualMultiDocumentHighlightFeature);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZEhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3dvcmRIaWdobGlnaHRlci9icm93c2VyL3dvcmRIaWdobGlnaHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDakUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3RILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQWtDLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQW1ELG9C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