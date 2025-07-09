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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/resources.js';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import * as nls from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
const ignoreUnusualLineTerminators = 'ignoreUnusualLineTerminators';
function writeIgnoreState(codeEditorService, model, state) {
    codeEditorService.setModelProperty(model.uri, ignoreUnusualLineTerminators, state);
}
function readIgnoreState(codeEditorService, model) {
    return codeEditorService.getModelProperty(model.uri, ignoreUnusualLineTerminators);
}
let UnusualLineTerminatorsDetector = class UnusualLineTerminatorsDetector extends Disposable {
    static { this.ID = 'editor.contrib.unusualLineTerminatorsDetector'; }
    constructor(_editor, _dialogService, _codeEditorService) {
        super();
        this._editor = _editor;
        this._dialogService = _dialogService;
        this._codeEditorService = _codeEditorService;
        this._isPresentingDialog = false;
        this._config = this._editor.getOption(131 /* EditorOption.unusualLineTerminators */);
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(131 /* EditorOption.unusualLineTerminators */)) {
                this._config = this._editor.getOption(131 /* EditorOption.unusualLineTerminators */);
                this._checkForUnusualLineTerminators();
            }
        }));
        this._register(this._editor.onDidChangeModel(() => {
            this._checkForUnusualLineTerminators();
        }));
        this._register(this._editor.onDidChangeModelContent((e) => {
            if (e.isUndoing) {
                // skip checking in case of undoing
                return;
            }
            this._checkForUnusualLineTerminators();
        }));
        this._checkForUnusualLineTerminators();
    }
    async _checkForUnusualLineTerminators() {
        if (this._config === 'off') {
            return;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        if (!model.mightContainUnusualLineTerminators()) {
            return;
        }
        const ignoreState = readIgnoreState(this._codeEditorService, model);
        if (ignoreState === true) {
            // this model should be ignored
            return;
        }
        if (this._editor.getOption(96 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return;
        }
        if (this._config === 'auto') {
            // just do it!
            model.removeUnusualLineTerminators(this._editor.getSelections());
            return;
        }
        if (this._isPresentingDialog) {
            // we're currently showing the dialog, which is async.
            // avoid spamming the user
            return;
        }
        let result;
        try {
            this._isPresentingDialog = true;
            result = await this._dialogService.confirm({
                title: nls.localize('unusualLineTerminators.title', "Unusual Line Terminators"),
                message: nls.localize('unusualLineTerminators.message', "Detected unusual line terminators"),
                detail: nls.localize('unusualLineTerminators.detail', "The file '{0}' contains one or more unusual line terminator characters, like Line Separator (LS) or Paragraph Separator (PS).\n\nIt is recommended to remove them from the file. This can be configured via `editor.unusualLineTerminators`.", basename(model.uri)),
                primaryButton: nls.localize({ key: 'unusualLineTerminators.fix', comment: ['&& denotes a mnemonic'] }, "&&Remove Unusual Line Terminators"),
                cancelButton: nls.localize('unusualLineTerminators.ignore', "Ignore")
            });
        }
        finally {
            this._isPresentingDialog = false;
        }
        if (!result.confirmed) {
            // this model should be ignored
            writeIgnoreState(this._codeEditorService, model, true);
            return;
        }
        model.removeUnusualLineTerminators(this._editor.getSelections());
    }
};
UnusualLineTerminatorsDetector = __decorate([
    __param(1, IDialogService),
    __param(2, ICodeEditorService)
], UnusualLineTerminatorsDetector);
export { UnusualLineTerminatorsDetector };
registerEditorContribution(UnusualLineTerminatorsDetector.ID, UnusualLineTerminatorsDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW51c3VhbExpbmVUZXJtaW5hdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi91bnVzdWFsTGluZVRlcm1pbmF0b3JzL2Jyb3dzZXIvdW51c3VhbExpbmVUZXJtaW5hdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUlwRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBdUIsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFckcsTUFBTSw0QkFBNEIsR0FBRyw4QkFBOEIsQ0FBQztBQUVwRSxTQUFTLGdCQUFnQixDQUFDLGlCQUFxQyxFQUFFLEtBQWlCLEVBQUUsS0FBYztJQUNqRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3BGLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxpQkFBcUMsRUFBRSxLQUFpQjtJQUNoRixPQUFPLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztBQUNwRixDQUFDO0FBRU0sSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSxVQUFVO2FBRXRDLE9BQUUsR0FBRywrQ0FBK0MsQUFBbEQsQ0FBbUQ7SUFL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