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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { CancellationTokenSource, } from '../../../../base/common/cancellation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { binarySearch } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { StickyModelProvider } from './stickyScrollModelProvider.js';
export class StickyLineCandidate {
    constructor(startLineNumber, endLineNumber, top, height) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.top = top;
        this.height = height;
    }
}
let StickyLineCandidateProvider = class StickyLineCandidateProvider extends Disposable {
    static { this.ID = 'store.contrib.stickyScrollController'; }
    constructor(editor, _languageFeaturesService, _languageConfigurationService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._onDidChangeStickyScroll = this._register(new Emitter());
        this.onDidChangeStickyScroll = this._onDidChangeStickyScroll.event;
        this._model = null;
        this._cts = null;
        this._stickyModelProvider = null;
        this._editor = editor;
        this._sessionStore = this._register(new DisposableStore());
        this._updateSoon = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._register(this._editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(120 /* EditorOption.stickyScroll */)) {
                this.readConfiguration();
            }
        }));
        this.readConfiguration();
    }
    readConfiguration() {
        this._sessionStore.clear();
        const options = this._editor.getOption(120 /* EditorOption.stickyScroll */);
        if (!options.enabled) {
            return;
        }
        this._sessionStore.add(this._editor.onDidChangeModel(() => {
            // We should not show an old model for a different file, it will always be wrong.
            // So we clear the model here immediately and then trigger an update.
            this._model = null;
            this.updateStickyModelProvider();
            this._onDidChangeStickyScroll.fire();
            this.update();
        }));
        this._sessionStore.add(this._editor.onDidChangeHiddenAreas(() => this.update()));
        this._sessionStore.add(this._editor.onDidChangeModelContent(() => this._updateSoon.schedule()));
        this._sessionStore.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => this.update()));
        this._sessionStore.add(toDisposable(() => {
            this._stickyModelProvider?.dispose();
            this._stickyModelProvider = null;
        }));
        this.updateStickyModelProvider();
        this.update();
    }
    getVersionId() {
        return this._model?.version;
    }
    updateStickyModelProvider() {
        this._stickyModelProvider?.dispose();
        this._stickyModelProvider = null;
        const editor = this._editor;
        if (editor.hasModel()) {
            this._stickyModelProvider = new StickyModelProvider(editor, () => this._updateSoon.schedule(), this._languageConfigurationService, this._languageFeaturesService);
        }
    }
    async update() {
        this._cts?.dispose(true);
        this._cts = new CancellationTokenSource();
        await this.updateStickyModel(this._cts.token);
        this._onDidChangeStickyScroll.fire();
    }
    async updateStickyModel(token) {
        if (!this._editor.hasModel() || !this._stickyModelProvider || this._editor.getModel().isTooLargeForTokenization()) {
            this._model = null;
            return;
        }
        const model = await this._stickyModelProvider.update(token);
        if (token.isCancellationRequested) {
            // the computation was canceled, so do not overwrite the model
            return;
        }
        this._model = model;
    }
    updateIndex(index) {
        if (index === -1) {
            index = 0;
        }
        else if (index < 0) {
            index = -index - 2;
        }
        return index;
    }
    getCandidateStickyLinesIntersectingFromStickyModel(range, outlineModel, result, depth, top, lastStartLineNumber) {
        if (outlineModel.children.length === 0) {
            return;
        }
        let lastLine = lastStartLineNumber;
        const childrenStartLines = [];
        for (let i = 0; i < outlineModel.children.length; i++) {
            const child = outlineModel.children[i];
            if (child.range) {
                childrenStartLines.push(child.range.startLineNumber);
            }
        }
        const lowerBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber, (a, b) => { return a - b; }));
        const upperBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber + depth, (a, b) => { return a - b; }));
        for (let i = lowerBound; i <= upperBound; i++) {
            const child = outlineModel.children[i];
            if (!child) {
                return;
            }
            const childRange = child.range;
            if (childRange) {
                const childStartLine = childRange.startLineNumber;
                const childEndLine = childRange.endLineNumber;
                if (range.startLineNumber <= childEndLine + 1 && childStartLine - 1 <= range.endLineNumber && childStartLine !== lastLine) {
                    lastLine = childStartLine;
                    const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
                    result.push(new StickyLineCandidate(childStartLine, childEndLine - 1, top, lineHeight));
                    this.getCandidateStickyLinesIntersectingFromStickyModel(range, child, result, depth + 1, top + lineHeight, childStartLine);
                }
            }
            else {
                this.getCandidateStickyLinesIntersectingFromStickyModel(range, child, result, depth, top, lastStartLineNumber);
            }
        }
    }
    getCandidateStickyLinesIntersecting(range) {
        if (!this._model?.element) {
            return [];
        }
        let stickyLineCandidates = [];
        this.getCandidateStickyLinesIntersectingFromStickyModel(range, this._model.element, stickyLineCandidates, 0, 0, -1);
        const hiddenRanges = this._editor._getViewModel()?.getHiddenAreas();
        if (hiddenRanges) {
            for (const hiddenRange of hiddenRanges) {
                stickyLineCandidates = stickyLineCandidates.filter(stickyLine => !(stickyLine.startLineNumber >= hiddenRange.startLineNumber && stickyLine.endLineNumber <= hiddenRange.endLineNumber + 1));
            }
        }
        return stickyLineCandidates;
    }
};
StickyLineCandidateProvider = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageConfigurationService)
], StickyLineCandidateProvider);
export { StickyLineCandidateProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3RpY2t5U2Nyb2xsL2Jyb3dzZXIvc3RpY2t5U2Nyb2xsUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEYsT0FBTyxFQUFxQix1QkFBdUIsR0FBRyxNQUFNLHlDQUF5QyxDQUFDO0FBRXRHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0csT0FBTyxFQUFFLG1CQUFtQixFQUF3QixNQUFNLGdDQUFnQyxDQUFDO0FBRzNGLE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFDaUIsZUFBdUIsRUFDdkIsYUFBcUIsRUFDckIsR0FBVyxFQUNYLE1BQWM7UUFIZCxvQkFBZSxHQUFmLGVBQWUsQ0FBUTtRQUN2QixrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQUNyQixRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQUMzQixDQUFDO0NBQ0w7QUFZTSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7YUFFMUMsT0FBRSxHQUFHLHNDQUFzQyxBQUF6QyxDQUEwQztJ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