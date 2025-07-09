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
var SurroundWithSnippetCodeActionProvider_1, FileTemplateCodeActionProvider_1;
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ApplyFileSnippetAction } from './commands/fileTemplateSnippets.js';
import { getSurroundableSnippets, SurroundWithSnippetEditorAction } from './commands/surroundWithSnippet.js';
import { ISnippetsService } from './snippets.js';
let SurroundWithSnippetCodeActionProvider = class SurroundWithSnippetCodeActionProvider {
    static { SurroundWithSnippetCodeActionProvider_1 = this; }
    static { this._MAX_CODE_ACTIONS = 4; }
    static { this._overflowCommandCodeAction = {
        kind: CodeActionKind.SurroundWith.value,
        title: localize('more', "More..."),
        command: {
            id: SurroundWithSnippetEditorAction.options.id,
            title: SurroundWithSnippetEditorAction.options.title.value,
        },
    }; }
    constructor(_snippetService) {
        this._snippetService = _snippetService;
    }
    async provideCodeActions(model, range) {
        if (range.isEmpty()) {
            return undefined;
        }
        const position = Selection.isISelection(range) ? range.getPosition() : range.getStartPosition();
        const snippets = await getSurroundableSnippets(this._snippetService, model, position, false);
        if (!snippets.length) {
            return undefined;
        }
        const actions = [];
        for (const snippet of snippets) {
            if (actions.length >= SurroundWithSnippetCodeActionProvider_1._MAX_CODE_ACTIONS) {
                actions.push(SurroundWithSnippetCodeActionProvider_1._overflowCommandCodeAction);
                break;
            }
            actions.push({
                title: localize('codeAction', "{0}", snippet.name),
                kind: CodeActionKind.SurroundWith.value,
                edit: asWorkspaceEdit(model, range, snippet)
            });
        }
        return {
            actions,
            dispose() { }
        };
    }
};
SurroundWithSnippetCodeActionProvider = SurroundWithSnippetCodeActionProvider_1 = __decorate([
    __param(0, ISnippetsService)
], SurroundWithSnippetCodeActionProvider);
let FileTemplateCodeActionProvider = class FileTemplateCodeActionProvider {
    static { FileTemplateCodeActionProvider_1 = this; }
    static { this._MAX_CODE_ACTIONS = 4; }
    static { this._overflowCommandCodeAction = {
        title: localize('overflow.start.title', 'Start with Snippet'),
        kind: CodeActionKind.SurroundWith.value,
        command: {
            id: ApplyFileSnippetAction.Id,
            title: ''
        }
    }; }
    constructor(_snippetService) {
        this._snippetService = _snippetService;
        this.providedCodeActionKinds = [CodeActionKind.SurroundWith.value];
    }
    async provideCodeActions(model) {
        if (model.getValueLength() !== 0) {
            return undefined;
        }
        const snippets = await this._snippetService.getSnippets(model.getLanguageId(), { fileTemplateSnippets: true, includeNoPrefixSnippets: true });
        const actions = [];
        for (const snippet of snippets) {
            if (actions.length >= FileTemplateCodeActionProvider_1._MAX_CODE_ACTIONS) {
                actions.push(FileTemplateCodeActionProvider_1._overflowCommandCodeAction);
                break;
            }
            actions.push({
                title: localize('title', 'Start with: {0}', snippet.name),
                kind: CodeActionKind.SurroundWith.value,
                edit: asWorkspaceEdit(model, model.getFullModelRange(), snippet)
            });
        }
        return {
            actions,
            dispose() { }
        };
    }
};
FileTemplateCodeActionProvider = FileTemplateCodeActionProvider_1 = __decorate([
    __param(0, ISnippetsService)
], FileTemplateCodeActionProvider);
function asWorkspaceEdit(model, range, snippet) {
    return {
        edits: [{
                versionId: model.getVersionId(),
                resource: model.uri,
                textEdit: {
                    range,
                    text: snippet.body,
                    insertAsSnippet: true,
                }
            }]
    };
}
let SnippetCodeActions = class SnippetCodeActions {
    constructor(instantiationService, languageFeaturesService, configService) {
        this._store = new DisposableStore();
        const setting = 'editor.snippets.codeActions.enabled';
        const sessionStore = new DisposableStore();
        const update = () => {
            sessionStore.clear();
            if (configService.getValue(setting)) {
                sessionStore.add(languageFeaturesService.codeActionProvider.register('*', instantiationService.createInstance(SurroundWithSnippetCodeActionProvider)));
                sessionStore.add(languageFeaturesService.codeActionProvider.register('*', instantiationService.createInstance(FileTemplateCodeActionProvider)));
            }
        };
        update();
        this._store.add(configService.onDidChangeConfiguration(e => e.affectsConfiguration(setting) && update()));
        this._store.add(sessionStore);
    }
    dispose() {
        this._store.dispose();
    }
};
SnippetCodeActions = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageFeaturesService),
    __param(2, IConfigurationService)
], SnippetCodeActions);
export { SnippetCodeActions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvZGVBY3Rpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL3NuaXBwZXRDb2RlQWN0aW9uUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFakQsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7O2FBRWxCLHNCQUFpQixHQUFHLENBQUMsQUFBSixDQUFLO2FBRXRCLCtCQUEwQixHQUFlO1FBQ2hFLElBQUksRUFBRSxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUs7UUFDdkMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO1FBQ2xDLE9BQU8sRUFB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