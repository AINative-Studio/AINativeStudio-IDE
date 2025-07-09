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
var TabCompletionController_1;
import { RawContextKey, IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ISnippetsService } from './snippets.js';
import { getNonWhitespacePrefix } from './snippetsService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { registerEditorContribution, EditorCommand, registerEditorCommand } from '../../../../editor/browser/editorExtensions.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { showSimpleSuggestions } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { SnippetCompletion } from './snippetCompletionProvider.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { EditorState } from '../../../../editor/contrib/editorState/browser/editorState.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
let TabCompletionController = class TabCompletionController {
    static { TabCompletionController_1 = this; }
    static { this.ID = 'editor.tabCompletionController'; }
    static { this.ContextKey = new RawContextKey('hasSnippetCompletions', undefined); }
    static get(editor) {
        return editor.getContribution(TabCompletionController_1.ID);
    }
    constructor(_editor, _snippetService, _clipboardService, _languageFeaturesService, contextKeyService) {
        this._editor = _editor;
        this._snippetService = _snippetService;
        this._clipboardService = _clipboardService;
        this._languageFeaturesService = _languageFeaturesService;
        this._activeSnippets = [];
        this._hasSnippets = TabCompletionController_1.ContextKey.bindTo(contextKeyService);
        this._configListener = this._editor.onDidChangeConfiguration(e => {
            if (e.hasChanged(128 /* EditorOption.tabCompletion */)) {
                this._update();
            }
        });
        this._update();
    }
    dispose() {
        this._configListener.dispose();
        this._selectionListener?.dispose();
    }
    _update() {
        const enabled = this._editor.getOption(128 /* EditorOption.tabCompletion */) === 'onlySnippets';
        if (this._enabled !== enabled) {
            this._enabled = enabled;
            if (!this._enabled) {
                this._selectionListener?.dispose();
            }
            else {
                this._selectionListener = this._editor.onDidChangeCursorSelection(e => this._updateSnippets());
                if (this._editor.getModel()) {
                    this._updateSnippets();
                }
            }
        }
    }
    _updateSnippets() {
        // reset first
        this._activeSnippets = [];
        this._completionProvider?.dispose();
        if (!this._editor.hasModel()) {
            return;
        }
        // lots of dance for getting the
        const selection = this._editor.getSelection();
        const model = this._editor.getModel();
        model.tokenization.tokenizeIfCheap(selection.positionLineNumber);
        const id = model.getLanguageIdAtPosition(selection.positionLineNumber, selection.positionColumn);
        const snippets = this._snippetService.getSnippetsSync(id);
        if (!snippets) {
            // nothing for this language
            this._hasSnippets.set(false);
            return;
        }
        if (Range.isEmpty(selection)) {
            // empty selection -> real text (no whitespace) left of cursor
            const prefix = getNonWhitespacePrefix(model, selection.getPosition());
            if (prefix) {
                for (const snippet of snippets) {
                    if (prefix.endsWith(snippet.prefix)) {
                        this._activeSnippets.push(snippet);
                    }
                }
            }
        }
        else if (!Range.spansMultipleLines(selection) && model.getValueLengthInRange(selection) <= 100) {
            // actual selection -> snippet must be a full match
            const selected = model.getValueInRange(selection);
            if (selected) {
                for (const snippet of snippets) {
                    if (selected === snippet.prefix) {
                        this._activeSnippets.push(snippet);
                    }
                }
            }
        }
        const len = this._activeSnippets.length;
        if (len === 0) {
            this._hasSnippets.set(false);
        }
        else if (len === 1) {
            this._hasSnippets.set(true);
        }
        else {
            this._hasSnippets.set(true);
            this._completionProvider = {
                _debugDisplayName: 'tabCompletion',
                dispose: () => {
                    registration.dispose();
                },
                provideCompletionItems: (_model, position) => {
                    if (_model !== model || !selection.containsPosition(position)) {
                        return;
                    }
                    const suggestions = this._activeSnippets.map(snippet => {
                        const range = Range.fromPositions(position.delta(0, -snippet.prefix.length), position);
                        return new SnippetCompletion(snippet, range);
                    });
                    return { suggestions };
                }
            };
            const registration = this._languageFeaturesService.completionProvider.register({ language: model.getLanguageId(), pattern: model.uri.fsPath, scheme: model.uri.scheme }, this._completionProvider);
        }
    }
    async performSnippetCompletions() {
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._activeSnippets.length === 1) {
            // one -> just insert
            const [snippet] = this._activeSnippets;
            // async clipboard access might be required and in that case
            // we need to check if the editor has changed in flight and then
            // bail out (or be smarter than that)
            let clipboardText;
            if (snippet.needsClipboard) {
                const state = new EditorState(this._editor, 1 /* CodeEditorStateFlag.Value */ | 4 /* CodeEditorStateFlag.Position */);
                clipboardText = await this._clipboardService.readText();
                if (!state.validate(this._editor)) {
                    return;
                }
            }
            SnippetController2.get(this._editor)?.insert(snippet.codeSnippet, {
                overwriteBefore: snippet.prefix.length, overwriteAfter: 0,
                clipboardText
            });
        }
        else if (this._activeSnippets.length > 1) {
            // two or more -> show IntelliSense box
            if (this._completionProvider) {
                showSimpleSuggestions(this._editor, this._completionProvider);
            }
        }
    }
};
TabCompletionController = TabCompletionController_1 = __decorate([
    __param(1, ISnippetsService),
    __param(2, IClipboardService),
    __param(3, ILanguageFeaturesService),
    __param(4, IContextKeyService)
], TabCompletionController);
export { TabCompletionController };
registerEditorContribution(TabCompletionController.ID, TabCompletionController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to define a context key
const TabCompletionCommand = EditorCommand.bindToContribution(TabCompletionController.get);
registerEditorCommand(new TabCompletionCommand({
    id: 'insertSnippet',
    precondition: TabCompletionController.ContextKey,
    handler: x => x.performSnippetCompletions(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */,
        kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus, SnippetController2.InSnippetMode.toNegated()),
        primary: 2 /* KeyCode.Tab */
    }
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFiQ29tcGxldGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL3RhYkNvbXBsZXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFlLE1BQU0sc0RBQXNELENBQUM7QUFFdEksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ2pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBRzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixFQUFtQyxNQUFNLGdEQUFnRCxDQUFDO0FBQ25LLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQXVCLE1BQU0sK0RBQStELENBQUM7QUFDakgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHM0YsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7O2FBRW5CLE9BQUUsR0FBRyxnQ0FBZ0MsQUFBbkMsQ0FBb0M7YUFFdEMsZUFBVSxHQUFH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