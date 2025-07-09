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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckNvZGVFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90cmVlU2l0dGVyL2Jyb3dzZXIvdHJlZVNpdHRlckNvZGVFZGl0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFOUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBT2xHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQU9wRCxZQUE2QixXQUFtQixFQUMzQixrQkFBdUQsRUFDakQsd0JBQW1FO1FBRTdGLEtBQUssRUFBRSxDQUFDO1FBSm9CLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ1YsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNoQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBUjdFLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWMsQ0FBQztRQUNwQyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBMEIsQ0FBQyxDQUFDO1FBQ2xFLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBZSxDQUFDLENBQUM7UUFDL0QseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJ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