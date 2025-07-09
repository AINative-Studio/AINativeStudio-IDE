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
var InlineCompletionLanguageStatusBarContribution_1;
import { localize } from '../../../../nls.js';
import { createHotClass } from '../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorunWithStore, derived } from '../../../../base/common/observable.js';
import { debouncedObservable } from '../../../../base/common/observableInternal/utils.js';
import Severity from '../../../../base/common/severity.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
let InlineCompletionLanguageStatusBarContribution = class InlineCompletionLanguageStatusBarContribution extends Disposable {
    static { InlineCompletionLanguageStatusBarContribution_1 = this; }
    static { this.hot = createHotClass(InlineCompletionLanguageStatusBarContribution_1); }
    static { this.Id = 'vs.editor.contrib.inlineCompletionLanguageStatusBarContribution'; }
    static { this.languageStatusBarDisposables = new Set(); }
    constructor(_editor, _languageStatusService) {
        super();
        this._editor = _editor;
        this._languageStatusService = _languageStatusService;
        this._c = InlineCompletionsController.get(this._editor);
        this._state = derived(this, reader => {
            const model = this._c?.model.read(reader);
            if (!model) {
                return undefined;
            }
            if (!observableCodeEditor(this._editor).isFocused.read(reader)) {
                return undefined;
            }
            return {
                model,
                status: debouncedObservable(model.status, 300),
            };
        });
        this._register(autorunWithStore((reader, store) => {
            const state = this._state.read(reader);
            if (!state) {
                return;
            }
            const status = state.status.read(reader);
            const statusMap = {
                loading: { shortLabel: '', label: localize('inlineSuggestionLoading', "Loading..."), loading: true, },
                ghostText: { shortLabel: '$(lightbulb)', label: '$(copilot) ' + localize('inlineCompletionAvailable', "Inline completion available"), loading: false, },
                inlineEdit: { shortLabel: '$(lightbulb-sparkle)', label: '$(copilot) ' + localize('inlineEditAvailable', "Inline edit available"), loading: false, },
                noSuggestion: { shortLabel: '$(circle-slash)', label: '$(copilot) ' + localize('noInlineSuggestionAvailable', "No inline suggestion available"), loading: false, },
            };
            // Make sure previous status is cleared before the new is registered. This works, but is a bit hacky.
            // TODO: Use a workbench contribution to get singleton behavior.
            InlineCompletionLanguageStatusBarContribution_1.languageStatusBarDisposables.forEach(d => d.clear());
            InlineCompletionLanguageStatusBarContribution_1.languageStatusBarDisposables.add(store);
            store.add({
                dispose: () => InlineCompletionLanguageStatusBarContribution_1.languageStatusBarDisposables.delete(store)
            });
            store.add(this._languageStatusService.addStatus({
                accessibilityInfo: undefined,
                busy: statusMap[status].loading,
                command: undefined,
                detail: localize('inlineSuggestionsSmall', "Inline suggestions"),
                id: 'inlineSuggestions',
                label: { value: statusMap[status].label, shortValue: statusMap[status].shortLabel },
                name: localize('inlineSuggestions', "Inline Suggestions"),
                selector: { pattern: state.model.textModel.uri.fsPath },
                severity: Severity.Info,
                source: 'inlineSuggestions',
            }));
        }));
    }
};
InlineCompletionLanguageStatusBarContribution = InlineCompletionLanguageStatusBarContribution_1 = __decorate([
    __param(1, ILanguageStatusService)
], InlineCompletionLanguageStatusBarContribution);
export { InlineCompletionLanguageStatusBarContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbkxhbmd1YWdlU3RhdHVzQmFyQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvaW5saW5lQ29tcGxldGlvbkxhbmd1YWdlU3RhdHVzQmFyQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBRTNELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdHQUFnRyxDQUFDO0FBQzdJLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRW5GLElBQU0sNkNBQTZDLEdBQW5ELE1BQU0sNkNBQThDLFNBQVEsVUFBVTs7YUFDckQsUUFBRyxHQUFHLGNBQWMsQ0FBQywrQ0FBNkMsQ0FBQyxBQUFoRSxDQUFpRTthQUU3RSxPQUFFLEdBQUcsaUVBQWlFLEFBQXBFLENBQXFFO2FBQzlELGlDQUE0QixHQUFHLElBQUksR0FBRyxFQUFtQixBQUE3QixDQUE4QjtJQWlCakYsWUFDa0IsT0FB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