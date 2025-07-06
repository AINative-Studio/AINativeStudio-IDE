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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbnRyb2xsZXIyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC9icm93c2VyL3NuaXBwZXRDb250cm9sbGVyMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsYUFBYSxFQUFtQyxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pKLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUc1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0SSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFnQixjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQVluRSxNQUFNLGVBQWUsR0FBMEI7SUFDOUMsZUFBZSxFQUFFLENBQUM7SUFDbEIsY0FBYyxFQUFFLENBQUM7SUFDakIsY0FBYyxFQUFFLElBQUk7SUFD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