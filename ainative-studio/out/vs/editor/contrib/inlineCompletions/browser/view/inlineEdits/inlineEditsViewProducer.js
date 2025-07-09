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
var InlineEditsViewAndDiffProducer_1;
import { createHotClass } from '../../../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { derived } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { LineRange } from '../../../../../common/core/lineRange.js';
import { Range } from '../../../../../common/core/range.js';
import { SingleTextEdit, TextEdit } from '../../../../../common/core/textEdit.js';
import { TextModelText } from '../../../../../common/model/textModelText.js';
import { InlineEditWithChanges } from './inlineEditWithChanges.js';
import { GhostTextIndicator, InlineEditHost, InlineEditModel } from './inlineEditsModel.js';
import { InlineEditsView } from './inlineEditsView.js';
import { InlineEditTabAction } from './inlineEditsViewInterface.js';
let InlineEditsViewAndDiffProducer = class InlineEditsViewAndDiffProducer extends Disposable {
    static { InlineEditsViewAndDiffProducer_1 = this; }
    static { this.hot = createHotClass(InlineEditsViewAndDiffProducer_1); }
    constructor(_editor, _edit, _model, _focusIsInMenu, instantiationService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._model = _model;
        this._focusIsInMenu = _focusIsInMenu;
        this._inlineEdit = derived(this, (reader) => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const inlineEdit = this._edit.read(reader);
            if (!inlineEdit) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            if (!textModel) {
                return undefined;
            }
            const editOffset = model.inlineEditState.get()?.inlineCompletion.updatedEdit.read(reader);
            if (!editOffset) {
                return undefined;
            }
            const offsetEdits = model.inPartialAcceptFlow.read(reader) ? [editOffset.edits[0]] : editOffset.edits;
            const edits = offsetEdits.map(e => {
                const innerEditRange = Range.fromPositions(textModel.getPositionAt(e.replaceRange.start), textModel.getPositionAt(e.replaceRange.endExclusive));
                return new SingleTextEdit(innerEditRange, e.newText);
            });
            const diffEdits = new TextEdit(edits);
            const text = new TextModelText(textModel);
            return new InlineEditWithChanges(text, diffEdits, model.primaryPosition.get(), inlineEdit.commands, inlineEdit.inlineCompletion);
        });
        this._inlineEditModel = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const edit = this._inlineEdit.read(reader);
            if (!edit) {
                return undefined;
            }
            const tabAction = derived(this, reader => {
                if (this._editorObs.isFocused.read(reader)) {
                    if (model.tabShouldJumpToInlineEdit.read(reader)) {
                        return InlineEditTabAction.Jump;
                    }
                    if (model.tabShouldAcceptInlineEdit.read(reader)) {
                        return InlineEditTabAction.Accept;
                    }
                }
                return InlineEditTabAction.Inactive;
            });
            return new InlineEditModel(model, edit, tabAction);
        });
        this._inlineEditHost = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            return new InlineEditHost(model);
        });
        this._ghostTextIndicator = derived(this, reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            const state = model.inlineCompletionState.read(reader);
            if (!state) {
                return undefined;
            }
            const inlineCompletion = state.inlineCompletion;
            if (!inlineCompletion) {
                return undefined;
            }
            if (!inlineCompletion.sourceInlineCompletion.showInlineEditMenu) {
                return undefined;
            }
            const lineRange = LineRange.ofLength(state.primaryGhostText.lineNumber, 1);
            return new GhostTextIndicator(this._editor, model, lineRange, inlineCompletion);
        });
        this._editorObs = observableCodeEditor(this._editor);
        this._register(instantiationService.createInstance(InlineEditsView, this._editor, this._inlineEditHost, this._inlineEditModel, this._ghostTextIndicator, this._focusIsInMenu));
    }
};
InlineEditsViewAndDiffProducer = InlineEditsViewAndDiffProducer_1 = __decorate([
    __param(4, IInstantiationService)
], InlineEditsViewAndDiffProducer);
export { InlineEditsViewAndDiffProducer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNWaWV3UHJvZHVjZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld1Byb2R1Y2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQW9DLE1BQU0sNkNBQTZDLENBQUM7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFHN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFN0QsSUFBTSw4QkFBOEIsR0FB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