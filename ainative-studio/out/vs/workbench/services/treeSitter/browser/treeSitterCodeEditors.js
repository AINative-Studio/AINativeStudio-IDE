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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ITreeSitterParserService } from '../../../../editor/common/services/treeSitterParserService.js';
let TreeSitterCodeEditors = class TreeSitterCodeEditors extends Disposable {
    constructor(_languageId, _codeEditorService, _treeSitterParserService) {
        super();
        this._languageId = _languageId;
        this._codeEditorService = _codeEditorService;
        this._treeSitterParserService = _treeSitterParserService;
        this._textModels = new Set();
        this._languageEditors = this._register(new DisposableMap);
        this._allEditors = this._register(new DisposableMap());
        this._onDidChangeViewport = this._register(new Emitter());
        this.onDidChangeViewport = this._onDidChangeViewport.event;
        this._register(this._codeEditorService.onCodeEditorAdd(this._onCodeEditorAdd, this));
        this._register(this._codeEditorService.onCodeEditorRemove(this._onCodeEditorRemove, this));
        this._codeEditorService.listCodeEditors().forEach(this._onCodeEditorAdd, this);
    }
    get textModels() {
        return Array.from(this._textModels.keys());
    }
    getEditorForModel(model) {
        return this._codeEditorService.listCodeEditors().find(editor => editor.getModel() === model);
    }
    async getInitialViewPorts() {
        await this._treeSitterParserService.getLanguage(this._languageId);
        const editors = this._codeEditorService.listCodeEditors();
        const viewports = [];
        for (const editor of editors) {
            const model = await this.getEditorModel(editor);
            if (model && model.getLanguageId() === this._languageId) {
                viewports.push({
                    model,
                    ranges: this._nonIntersectingViewPortRanges(editor)
                });
            }
        }
        return viewports;
    }
    _onCodeEditorRemove(editor) {
        this._allEditors.deleteAndDispose(editor);
    }
    async getEditorModel(editor) {
        let model = editor.getModel() ?? undefined;
        if (!model) {
            const disposableStore = this._register(new DisposableStore());
            await Event.toPromise(Event.once(editor.onDidChangeModel), disposableStore);
            model = editor.getModel() ?? undefined;
        }
        return model;
    }
    async _onCodeEditorAdd(editor) {
        const otherEditorDisposables = new DisposableStore();
        otherEditorDisposables.add(editor.onDidChangeModel(() => this._onDidChangeModel(editor, editor.getModel()), this));
        this._allEditors.set(editor, otherEditorDisposables);
        const model = editor.getModel();
        if (model) {
            this._tryAddEditor(editor, model);
        }
    }
    _tryAddEditor(editor, model) {
        const language = model.getLanguageId();
        if ((language === this._languageId)) {
            if (!this._textModels.has(model)) {
                this._textModels.add(model);
            }
            if (!this._languageEditors.has(editor)) {
                const langaugeEditorDisposables = new DisposableStore();
                langaugeEditorDisposables.add(editor.onDidScrollChange(() => this._onViewportChange(editor), this));
                this._languageEditors.set(editor, langaugeEditorDisposables);
                this._onViewportChange(editor);
            }
        }
    }
    async _onDidChangeModel(editor, model) {
        if (model) {
            this._tryAddEditor(editor, model);
        }
        else {
            this._languageEditors.deleteAndDispose(editor);
        }
    }
    async _onViewportChange(editor) {
        const ranges = this._nonIntersectingViewPortRanges(editor);
        const model = editor.getModel();
        if (!model) {
            this._languageEditors.deleteAndDispose(editor);
            return;
        }
        this._onDidChangeViewport.fire({ model: model, ranges });
    }
    _nonIntersectingViewPortRanges(editor) {
        const viewportRanges = editor.getVisibleRangesPlusViewportAboveBelow();
        const nonIntersectingRanges = [];
        for (const range of viewportRanges) {
            if (nonIntersectingRanges.length !== 0) {
                const prev = nonIntersectingRanges[nonIntersectingRanges.length - 1];
                if (Range.areOnlyIntersecting(prev, range)) {
                    const newRange = prev.plusRange(range);
                    nonIntersectingRanges[nonIntersectingRanges.length - 1] = newRange;
                    continue;
                }
            }
            nonIntersectingRanges.push(range);
        }
        return nonIntersectingRanges;
    }
};
TreeSitterCodeEditors = __decorate([
    __param(1, ICodeEditorService),
    __param(2, ITreeSitterParserService)
], TreeSitterCodeEditors);
export { TreeSitterCodeEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckNvZGVFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RyZWVTaXR0ZXIvYnJvd3Nlci90cmVlU2l0dGVyQ29kZUVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUU5RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFPbEcsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBT3BELFlBQTZCLFdBQW1CLEVBQzNCLGtCQUF1RCxFQUNqRCx3QkFBbUU7UUFFN0YsS0FBSyxFQUFFLENBQUM7UUFKb0IsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDVix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ2hDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFSN0UsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBYyxDQUFDO1FBQ3BDLHFCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUEwQixDQUFDLENBQUM7UUFDbEUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFlLENBQUMsQ0FBQztRQUMvRCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElB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