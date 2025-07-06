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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW51c3VhbExpbmVUZXJtaW5hdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3VudXN1YWxMaW5lVGVybWluYXRvcnMvYnJvd3Nlci91bnVzdWFsTGluZVRlcm1pbmF0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBSXBGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUF1QixjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVyRyxNQUFNLDRCQUE0QixHQUFHLDhCQUE4QixDQUFDO0FBRXBFLFNBQVMsZ0JBQWdCLENBQUMsaUJBQXFDLEVBQUUsS0FBaUIsRUFBRSxLQUFjO0lBQ2pHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDcEYsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLGlCQUFxQyxFQUFFLEtBQWlCO0lBQ2hGLE9BQU8saUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3BGLENBQUM7QUFFTSxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7YUFFdEMsT0FBRSxHQUFHLCtDQUErQyxBQUFsRCxDQUFtRDtJQUs1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