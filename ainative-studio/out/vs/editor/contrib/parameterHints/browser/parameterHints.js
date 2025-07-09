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
var ParameterHintsController_1;
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as languages from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ParameterHintsModel } from './parameterHintsModel.js';
import { Context } from './provideSignatureHelp.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ParameterHintsWidget } from './parameterHintsWidget.js';
let ParameterHintsController = class ParameterHintsController extends Disposable {
    static { ParameterHintsController_1 = this; }
    static { this.ID = 'editor.controller.parameterHints'; }
    static get(editor) {
        return editor.getContribution(ParameterHintsController_1.ID);
    }
    constructor(editor, instantiationService, languageFeaturesService) {
        super();
        this.editor = editor;
        this.model = this._register(new ParameterHintsModel(editor, languageFeaturesService.signatureHelpProvider));
        this._register(this.model.onChangedHints(newParameterHints => {
            if (newParameterHints) {
                this.widget.value.show();
                this.widget.value.render(newParameterHints);
            }
            else {
                this.widget.rawValue?.hide();
            }
        }));
        this.widget = new Lazy(() => this._register(instantiationService.createInstance(ParameterHintsWidget, this.editor, this.model)));
    }
    cancel() {
        this.model.cancel();
    }
    previous() {
        this.widget.rawValue?.previous();
    }
    next() {
        this.widget.rawValue?.next();
    }
    trigger(context) {
        this.model.trigger(context, 0);
    }
};
ParameterHintsController = ParameterHintsController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILanguageFeaturesService)
], ParameterHintsController);
export { ParameterHintsController };
export class TriggerParameterHintsAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.triggerParameterHints',
            label: nls.localize2('parameterHints.trigger.label', "Trigger Parameter Hints"),
            precondition: EditorContextKeys.hasSignatureHelpProvider,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 10 /* KeyCode.Space */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        const controller = ParameterHintsController.get(editor);
        controller?.trigger({
            triggerKind: languages.SignatureHelpTriggerKind.Invoke
        });
    }
}
registerEditorContribution(ParameterHintsController.ID, ParameterHintsController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(TriggerParameterHintsAction);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 75;
const ParameterHintsCommand = EditorCommand.bindToContribution(ParameterHintsController.get);
registerEditorCommand(new ParameterHintsCommand({
    id: 'closeParameterHints',
    precondition: Context.Visible,
    handler: x => x.cancel(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
    }
}));
registerEditorCommand(new ParameterHintsCommand({
    id: 'showPrevParameterHint',
    precondition: ContextKeyExpr.and(Context.Visible, Context.MultipleSignatures),
    handler: x => x.previous(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.focus,
        primary: 16 /* KeyCode.UpArrow */,
        secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
        mac: { primary: 16 /* KeyCode.UpArrow */, secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */] }
    }
}));
registerEditorCommand(new ParameterHintsCommand({
    id: 'showNextParameterHint',
    precondition: ContextKeyExpr.and(Context.Visible, Context.MultipleSignatures),
    handler: x => x.next(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.focus,
        primary: 18 /* KeyCode.DownArrow */,
        secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
        mac: { primary: 18 /* KeyCode.DownArrow */, secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */] }
    }
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcGFyYW1ldGVySGludHMvYnJvd3Nlci9wYXJhbWV0ZXJIaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBbUMsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFFL00sT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxLQUFLLFNBQVMsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQWtCLE1BQU0sMEJBQTBCLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTFELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTs7YUFFaEMsT0FBRSxHQUFHLGtDQUFrQyxBQUFyQyxDQUFzQztJQUV4RCxNQUFNLENB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