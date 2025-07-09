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
import { createStyleSheetFromObservable } from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { derived, mapObservableArrayCached, derivedDisposable, constObservable, derivedObservableWithCache } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../browser/observableCodeEditor.js';
import { InlineCompletionsHintsWidget } from '../hintsWidget/inlineCompletionsHintsWidget.js';
import { convertItemsToStableObservables } from '../utils.js';
import { GhostTextView } from './ghostText/ghostTextView.js';
import { InlineEditsViewAndDiffProducer } from './inlineEdits/inlineEditsViewProducer.js';
let InlineCompletionsView = class InlineCompletionsView extends Disposable {
    constructor(_editor, _model, _focusIsInMenu, _instantiationService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._focusIsInMenu = _focusIsInMenu;
        this._instantiationService = _instantiationService;
        this._ghostTexts = derived(this, (reader) => {
            const model = this._model.read(reader);
            return model?.ghostTexts.read(reader) ?? [];
        });
        this._stablizedGhostTexts = convertItemsToStableObservables(this._ghostTexts, this._store);
        this._editorObs = observableCodeEditor(this._editor);
        this._ghostTextWidgets = mapObservableArrayCached(this, this._stablizedGhostTexts, (ghostText, store) => derivedDisposable((reader) => this._instantiationService.createInstance(GhostTextView.hot.read(reader), this._editor, {
            ghostText: ghostText,
            warning: this._model.map((m, reader) => {
                const warning = m?.warning?.read(reader);
                return warning ? { icon: warning.icon } : undefined;
            }),
            minReservedLineCount: constObservable(0),
            targetTextModel: this._model.map(v => v?.textModel),
        }, this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(v => ({ syntaxHighlightingEnabled: v.syntaxHighlightingEnabled })), false, false)).recomputeInitiallyAndOnChange(store)).recomputeInitiallyAndOnChange(this._store);
        this._inlineEdit = derived(this, reader => this._model.read(reader)?.inlineEditState.read(reader)?.inlineEdit);
        this._everHadInlineEdit = derivedObservableWithCache(this, (reader, last) => last || !!this._inlineEdit.read(reader) || !!this._model.read(reader)?.inlineCompletionState.read(reader)?.inlineCompletion?.sourceInlineCompletion.showInlineEditMenu);
        this._inlineEditWidget = derivedDisposable(reader => {
            if (!this._everHadInlineEdit.read(reader)) {
                return undefined;
            }
            return this._instantiationService.createInstance(InlineEditsViewAndDiffProducer.hot.read(reader), this._editor, this._inlineEdit, this._model, this._focusIsInMenu);
        })
            .recomputeInitiallyAndOnChange(this._store);
        this._fontFamily = this._editorObs.getOption(64 /* EditorOption.inlineSuggest */).map(val => val.fontFamily);
        this._register(createStyleSheetFromObservable(derived(reader => {
            const fontFamily = this._fontFamily.read(reader);
            if (fontFamily === '' || fontFamily === 'default') {
                return '';
            }
            return `
.monaco-editor .ghost-text-decoration,
.monaco-editor .ghost-text-decoration-preview,
.monaco-editor .ghost-text {
	font-family: ${fontFamily};
}`;
        })));
        this._register(new InlineCompletionsHintsWidget(this._editor, this._model, this._instantiationService));
    }
    shouldShowHoverAtViewZone(viewZoneId) {
        return this._ghostTextWidgets.get()[0]?.get().ownsViewZone(viewZoneId) ?? false;
    }
};
InlineCompletionsView = __decorate([
    __param(3, IInstantiationService)
], InlineCompletionsView);
export { InlineCompletionsView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVDb21wbGV0aW9uc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDcEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLDBCQUEwQixFQUFvQyxNQUFNLDBDQUEwQyxDQUFDO0FBQy9MLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRW5GLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFbkYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBd0NwRCxZQUNrQixPQUFvQixFQUNwQixNQUF1RCxFQUN2RCxjQUE0QyxFQUN0QyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFMUyxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ3BCLFdBQU0sR0FBTixNQUFNLENBQWlEO1FBQ3ZELG1CQUFjLEdBQWQsY0FB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