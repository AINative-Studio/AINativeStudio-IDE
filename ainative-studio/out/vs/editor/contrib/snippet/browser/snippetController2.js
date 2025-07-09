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
var SnippetController2_1;
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { EditorCommand, registerEditorCommand, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { showSimpleSuggestions } from '../../suggest/browser/suggest.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SnippetSession } from './snippetSession.js';
const _defaultOptions = {
    overwriteBefore: 0,
    overwriteAfter: 0,
    undoStopBefore: true,
    undoStopAfter: true,
    adjustWhitespace: true,
    clipboardText: undefined,
    overtypingCapturer: undefined
};
let SnippetController2 = class SnippetController2 {
    static { SnippetController2_1 = this; }
    static { this.ID = 'snippetController2'; }
    static get(editor) {
        return editor.getContribution(SnippetController2_1.ID);
    }
    static { this.InSnippetMode = new RawContextKey('inSnippetMode', false, localize('inSnippetMode', "Whether the editor in current in snippet mode")); }
    static { this.HasNextTabstop = new RawContextKey('hasNextTabstop', false, localize('hasNextTabstop', "Whether there is a next tab stop when in snippet mode")); }
    static { this.HasPrevTabstop = new RawContextKey('hasPrevTabstop', false, localize('hasPrevTabstop', "Whether there is a previous tab stop when in snippet mode")); }
    constructor(_editor, _logService, _languageFeaturesService, contextKeyService, _languageConfigurationService) {
        this._editor = _editor;
        this._logService = _logService;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._snippetListener = new DisposableStore();
        this._modelVersionId = -1;
        this._inSnippet = SnippetController2_1.InSnippetMode.bindTo(contextKeyService);
        this._hasNextTabstop = SnippetController2_1.HasNextTabstop.bindTo(contextKeyService);
        this._hasPrevTabstop = SnippetController2_1.HasPrevTabstop.bindTo(contextKeyService);
    }
    dispose() {
        this._inSnippet.reset();
        this._hasPrevTabstop.reset();
        this._hasNextTabstop.reset();
        this._session?.dispose();
        this._snippetListener.dispose();
    }
    apply(edits, opts) {
        try {
            this._doInsert(edits, typeof opts === 'undefined' ? _defaultOptions : { ..._defaultOptions, ...opts });
        }
        catch (e) {
            this.cancel();
            this._logService.error(e);
            this._logService.error('snippet_error');
            this._logService.error('insert_edits=', edits);
            this._logService.error('existing_template=', this._session ? this._session._logInfo() : '<no_session>');
        }
    }
    insert(template, opts) {
        // this is here to find out more about the yet-not-understood
        // error that sometimes happens when we fail to inserted a nested
        // snippet
        try {
            this._doInsert(template, typeof opts === 'undefined' ? _defaultOptions : { ..._defaultOptions, ...opts });
        }
        catch (e) {
            this.cancel();
            this._logService.error(e);
            this._logService.error('snippet_error');
            this._logService.error('insert_template=', template);
            this._logService.error('existing_template=', this._session ? this._session._logInfo() : '<no_session>');
        }
    }
    _doInsert(template, opts) {
        if (!this._editor.hasModel()) {
            return;
        }
        // don't listen while inserting the snippet
        // as that is the inflight state causing cancelation
        this._snippetListener.clear();
        if (opts.undoStopBefore) {
            this._editor.getModel().pushStackElement();
        }
        // don't merge
        if (this._session && typeof template !== 'string') {
            this.cancel();
        }
        if (!this._session) {
            this._modelVersionId = this._editor.getModel().getAlternativeVersionId();
            this._session = new SnippetSession(this._editor, template, opts, this._languageConfigurationService);
            this._session.insert();
        }
        else {
            assertType(typeof template === 'string');
            this._session.merge(template, opts);
        }
        if (opts.undoStopAfter) {
            this._editor.getModel().pushStackElement();
        }
        // regster completion item provider when there is any choice element
        if (this._session?.hasChoice) {
            const provider = {
                _debugDisplayName: 'snippetChoiceCompletions',
                provideCompletionItems: (model, position) => {
                    if (!this._session || model !== this._editor.getModel() || !Position.equals(this._editor.getPosition(), position)) {
                        return undefined;
                    }
                    const { activeChoice } = this._session;
                    if (!activeChoice || activeChoice.choice.options.length === 0) {
                        return undefined;
                    }
                    const word = model.getValueInRange(activeChoice.range);
                    const isAnyOfOptions = Boolean(activeChoice.choice.options.find(o => o.value === word));
                    const suggestions = [];
                    for (let i = 0; i < activeChoice.choice.options.length; i++) {
                        const option = activeChoice.choice.options[i];
                        suggestions.push({
                            kind: 13 /* CompletionItemKind.Value */,
                            label: option.value,
                            insertText: option.value,
                            sortText: 'a'.repeat(i + 1),
                            range: activeChoice.range,
                            filterText: isAnyOfOptions ? `${word}_${option.value}` : undefined,
                            command: { id: 'jumpToNextSnippetPlaceholder', title: localize('next', 'Go to next placeholder...') }
                        });
                    }
                    return { suggestions };
                }
            };
            const model = this._editor.getModel();
            let registration;
            let isRegistered = false;
            const disable = () => {
                registration?.dispose();
                isRegistered = false;
            };
            const enable = () => {
                if (!isRegistered) {
                    registration = this._languageFeaturesService.completionProvider.register({
                        language: model.getLanguageId(),
                        pattern: model.uri.fsPath,
                        scheme: model.uri.scheme,
                        exclusive: true
                    }, provider);
                    this._snippetListener.add(registration);
                    isRegistered = true;
                }
            };
            this._choiceCompletions = { provider, enable, disable };
        }
        this._updateState();
        this._snippetListener.add(this._editor.onDidChangeModelContent(e => e.isFlush && this.cancel()));
        this._snippetListener.add(this._editor.onDidChangeModel(() => this.cancel()));
        this._snippetListener.add(this._editor.onDidChangeCursorSelection(() => this._updateState()));
    }
    _updateState() {
        if (!this._session || !this._editor.hasModel()) {
            // canceled in the meanwhile
            return;
        }
        if (this._modelVersionId === this._editor.getModel().getAlternativeVersionId()) {
            // undo until the 'before' state happened
            // and makes use cancel snippet mode
            return this.cancel();
        }
        if (!this._session.hasPlaceholder) {
            // don't listen for selection changes and don't
            // update context keys when the snippet is plain text
            return this.cancel();
        }
        if (this._session.isAtLastPlaceholder || !this._session.isSelectionWithinPlaceholders()) {
            this._editor.getModel().pushStackElement();
            return this.cancel();
        }
        this._inSnippet.set(true);
        this._hasPrevTabstop.set(!this._session.isAtFirstPlaceholder);
        this._hasNextTabstop.set(!this._session.isAtLastPlaceholder);
        this._handleChoice();
    }
    _handleChoice() {
        if (!this._session || !this._editor.hasModel()) {
            this._currentChoice = undefined;
            return;
        }
        const { activeChoice } = this._session;
        if (!activeChoice || !this._choiceCompletions) {
            this._choiceCompletions?.disable();
            this._currentChoice = undefined;
            return;
        }
        if (this._currentChoice !== activeChoice.choice) {
            this._currentChoice = activeChoice.choice;
            this._choiceCompletions.enable();
            // trigger suggest with the special choice completion provider
            queueMicrotask(() => {
                showSimpleSuggestions(this._editor, this._choiceCompletions.provider);
            });
        }
    }
    finish() {
        while (this._inSnippet.get()) {
            this.next();
        }
    }
    cancel(resetSelection = false) {
        this._inSnippet.reset();
        this._hasPrevTabstop.reset();
        this._hasNextTabstop.reset();
        this._snippetListener.clear();
        this._currentChoice = undefined;
        this._session?.dispose();
        this._session = undefined;
        this._modelVersionId = -1;
        if (resetSelection) {
            // reset selection to the primary cursor when being asked
            // for. this happens when explicitly cancelling snippet mode,
            // e.g. when pressing ESC
            this._editor.setSelections([this._editor.getSelection()]);
        }
    }
    prev() {
        this._session?.prev();
        this._updateState();
    }
    next() {
        this._session?.next();
        this._updateState();
    }
    isInSnippet() {
        return Boolean(this._inSnippet.get());
    }
    getSessionEnclosingRange() {
        if (this._session) {
            return this._session.getEnclosingRange();
        }
        return undefined;
    }
};
SnippetController2 = SnippetController2_1 = __decorate([
    __param(1, ILogService),
    __param(2, ILanguageFeaturesService),
    __param(3, IContextKeyService),
    __param(4, ILanguageConfigurationService)
], SnippetController2);
export { SnippetController2 };
registerEditorContribution(SnippetController2.ID, SnippetController2, 4 /* EditorContributionInstantiation.Lazy */);
const CommandCtor = EditorCommand.bindToContribution(SnippetController2.get);
registerEditorCommand(new CommandCtor({
    id: 'jumpToNextSnippetPlaceholder',
    precondition: ContextKeyExpr.and(SnippetController2.InSnippetMode, SnippetController2.HasNextTabstop),
    handler: ctrl => ctrl.next(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 2 /* KeyCode.Tab */
    }
}));
registerEditorCommand(new CommandCtor({
    id: 'jumpToPrevSnippetPlaceholder',
    precondition: ContextKeyExpr.and(SnippetController2.InSnippetMode, SnippetController2.HasPrevTabstop),
    handler: ctrl => ctrl.prev(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */
    }
}));
registerEditorCommand(new CommandCtor({
    id: 'leaveSnippet',
    precondition: SnippetController2.InSnippetMode,
    handler: ctrl => ctrl.cancel(true),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        kbExpr: EditorContextKeys.textInputFocus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
    }
}));
registerEditorCommand(new CommandCtor({
    id: 'acceptSnippet',
    precondition: SnippetController2.InSnippetMode,
    handler: ctrl => ctrl.finish(),
    // kbOpts: {
    // 	weight: KeybindingWeight.EditorContrib + 30,
    // 	kbExpr: EditorContextKeys.textFocus,
    // 	primary: KeyCode.Enter,
    // }
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NuaXBwZXQvYnJvd3Nlci9zbmlwcGV0Q29udHJvbGxlcjIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFOUQsT0FBTyxFQUFFLGFBQWEsRUFBbUMscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6SixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFM0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFdEksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBZ0IsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFZbkUsTUFBTSxlQUFlLEdBQTBCO0lBQzlDLGVBQWUsRUFBRSxDQUFDO0lBQ2xCLGNBQWMsRUFBRSxDQUFDO0lBQ2pCLGNBQWMsRUFBRSxJQUFJO0lB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