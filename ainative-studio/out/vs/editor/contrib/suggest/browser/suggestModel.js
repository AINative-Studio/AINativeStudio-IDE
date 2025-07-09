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
var SuggestModel_1;
import { TimeoutTimer } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { getLeadingWhitespace, isHighSurrogate, isLowSurrogate } from '../../../../base/common/strings.js';
import { Selection } from '../../../common/core/selection.js';
import { IEditorWorkerService } from '../../../common/services/editorWorker.js';
import { WordDistance } from './wordDistance.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CompletionModel } from './completionModel.js';
import { CompletionOptions, getSnippetSuggestSupport, provideSuggestionItems, QuickSuggestionsOptions } from './suggest.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { FuzzyScoreOptions } from '../../../../base/common/filters.js';
import { assertType } from '../../../../base/common/types.js';
import { InlineCompletionContextKeys } from '../../inlineCompletions/browser/controller/inlineCompletionContextKeys.js';
import { SnippetController2 } from '../../snippet/browser/snippetController2.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
export class LineContext {
    static shouldAutoTrigger(editor) {
        if (!editor.hasModel()) {
            return false;
        }
        const model = editor.getModel();
        const pos = editor.getPosition();
        model.tokenization.tokenizeIfCheap(pos.lineNumber);
        const word = model.getWordAtPosition(pos);
        if (!word) {
            return false;
        }
        if (word.endColumn !== pos.column &&
            word.startColumn + 1 !== pos.column /* after typing a single character before a word */) {
            return false;
        }
        if (!isNaN(Number(word.word))) {
            return false;
        }
        return true;
    }
    constructor(model, position, triggerOptions) {
        this.leadingLineContent = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
        this.leadingWord = model.getWordUntilPosition(position);
        this.lineNumber = position.lineNumber;
        this.column = position.column;
        this.triggerOptions = triggerOptions;
    }
}
export var State;
(function (State) {
    State[State["Idle"] = 0] = "Idle";
    State[State["Manual"] = 1] = "Manual";
    State[State["Auto"] = 2] = "Auto";
})(State || (State = {}));
function canShowQuickSuggest(editor, contextKeyService, configurationService) {
    if (!Boolean(contextKeyService.getContextKeyValue(InlineCompletionContextKeys.inlineSuggestionVisible.key))) {
        // Allow if there is no inline suggestion.
        return true;
    }
    const suppressSuggestions = contextKeyService.getContextKeyValue(InlineCompletionContextKeys.suppressSuggestions.key);
    if (suppressSuggestions !== undefined) {
        return !suppressSuggestions;
    }
    return !editor.getOption(64 /* EditorOption.inlineSuggest */).suppressSuggestions;
}
function canShowSuggestOnTriggerCharacters(editor, contextKeyService, configurationService) {
    if (!Boolean(contextKeyService.getContextKeyValue('inlineSuggestionVisible'))) {
        // Allow if there is no inline suggestion.
        return true;
    }
    const suppressSuggestions = contextKeyService.getContextKeyValue(InlineCompletionContextKeys.suppressSuggestions.key);
    if (suppressSuggestions !== undefined) {
        return !suppressSuggestions;
    }
    return !editor.getOption(64 /* EditorOption.inlineSuggest */).suppressSuggestions;
}
let SuggestModel = SuggestModel_1 = class SuggestModel {
    constructor(_editor, _editorWorkerService, _clipboardService, _telemetryService, _logService, _contextKeyService, _configurationService, _languageFeaturesService, _envService) {
        this._editor = _editor;
        this._editorWorkerService = _editorWorkerService;
        this._clipboardService = _clipboardService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._languageFeaturesService = _languageFeaturesService;
        this._envService = _envService;
        this._toDispose = new DisposableStore();
        this._triggerCharacterListener = new DisposableStore();
        this._triggerQuickSuggest = new TimeoutTimer();
        this._triggerState = undefined;
        this._completionDisposables = new DisposableStore();
        this._onDidCancel = new Emitter();
        this._onDidTrigger = new Emitter();
        this._onDidSuggest = new Emitter();
        this.onDidCancel = this._onDidCancel.event;
        this.onDidTrigger = this._onDidTrigger.event;
        this.onDidSuggest = this._onDidSuggest.event;
        this._currentSelection = this._editor.getSelection() || new Selection(1, 1, 1, 1);
        // wire up various listeners
        this._toDispose.add(this._editor.onDidChangeModel(() => {
            this._updateTriggerCharacters();
            this.cancel();
        }));
        this._toDispose.add(this._editor.onDidChangeModelLanguage(() => {
            this._updateTriggerCharacters();
            this.cancel();
        }));
        this._toDispose.add(this._editor.onDidChangeConfiguration(() => {
            this._updateTriggerCharacters();
        }));
        this._toDispose.add(this._languageFeaturesService.completionProvider.onDidChange(() => {
            this._updateTriggerCharacters();
            this._updateActiveSuggestSession();
        }));
        let editorIsComposing = false;
        this._toDispose.add(this._editor.onDidCompositionStart(() => {
            editorIsComposing = true;
        }));
        this._toDispose.add(this._editor.onDidCompositionEnd(() => {
            editorIsComposing = false;
            this._onCompositionEnd();
        }));
        this._toDispose.add(this._editor.onDidChangeCursorSelection(e => {
            // only trigger suggest when the editor isn't composing a character
            if (!editorIsComposing) {
                this._onCursorChange(e);
            }
        }));
        this._toDispose.add(this._editor.onDidChangeModelContent(() => {
            // only filter completions when the editor isn't composing a character
            // allow-any-unicode-next-line
            // e.g. ¨ + u makes ü but just ¨ cannot be used for filtering
            if (!editorIsComposing && this._triggerState !== undefined) {
                this._refilterCompletionItems();
            }
        }));
        this._updateTriggerCharacters();
    }
    dispose() {
        dispose(this._triggerCharacterListener);
        dispose([this._onDidCancel, this._onDidSuggest, this._onDidTrigger, this._triggerQuickSuggest]);
        this._toDispose.dispose();
        this._completionDisposables.dispose();
        this.cancel();
    }
    _updateTriggerCharacters() {
        this._triggerCharacterListener.clear();
        if (this._editor.getOption(96 /* EditorOption.readOnly */)
            || !this._editor.hasModel()
            || !this._editor.getOption(126 /* EditorOption.suggestOnTriggerCharacters */)) {
            return;
        }
        const supportsByTriggerCharacter = new Map();
        for (const support of this._languageFeaturesService.completionProvider.all(this._editor.getModel())) {
            for (const ch of support.triggerCharacters || []) {
                let set = supportsByTriggerCharacter.get(ch);
                if (!set) {
                    set = new Set();
                    const suggestSupport = getSnippetSuggestSupport();
                    if (suggestSupport) {
                        set.add(suggestSupport);
                    }
                    supportsByTriggerCharacter.set(ch, set);
                }
                set.add(support);
            }
        }
        const checkTriggerCharacter = (text) => {
            if (!canShowSuggestOnTriggerCharacters(this._editor, this._contextKeyService, this._configurationService)) {
                return;
            }
            if (LineContext.shouldAutoTrigger(this._editor)) {
                // don't trigger by trigger characters when this is a case for quick suggest
                return;
            }
            if (!text) {
                // came here from the compositionEnd-event
                const position = this._editor.getPosition();
                const model = this._editor.getModel();
                text = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
            }
            let lastChar = '';
            if (isLowSurrogate(text.charCodeAt(text.length - 1))) {
                if (isHighSurrogate(text.charCodeAt(text.length - 2))) {
                    lastChar = text.substr(text.length - 2);
                }
            }
            else {
                lastChar = text.charAt(text.length - 1);
            }
            const supports = supportsByTriggerCharacter.get(lastChar);
            if (supports) {
                // keep existing items that where not computed by the
                // supports/providers that want to trigger now
                const providerItemsToReuse = new Map();
                if (this._completionModel) {
                    for (const [provider, items] of this._completionModel.getItemsByProvider()) {
                        if (!supports.has(provider)) {
                            providerItemsToReuse.set(provider, items);
                        }
                    }
                }
                this.trigger({
                    auto: true,
                    triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
                    triggerCharacter: lastChar,
                    retrigger: Boolean(this._completionModel),
                    clipboardText: this._completionModel?.clipboardText,
                    completionOptions: { providerFilter: supports, providerItemsToReuse }
                });
            }
        };
        this._triggerCharacterListener.add(this._editor.onDidType(checkTriggerCharacter));
        this._triggerCharacterListener.add(this._editor.onDidCompositionEnd(() => checkTriggerCharacter()));
    }
    // --- trigger/retrigger/cancel suggest
    get state() {
        if (!this._triggerState) {
            return 0 /* State.Idle */;
        }
        else if (!this._triggerState.auto) {
            return 1 /* State.Manual */;
        }
        else {
            return 2 /* State.Auto */;
        }
    }
    cancel(retrigger = false) {
        if (this._triggerState !== undefined) {
            this._triggerQuickSuggest.cancel();
            this._requestToken?.cancel();
            this._requestToken = undefined;
            this._triggerState = undefined;
            this._completionModel = undefined;
            this._context = undefined;
            this._onDidCancel.fire({ retrigger });
        }
    }
    clear() {
        this._completionDisposables.clear();
    }
    _updateActiveSuggestSession() {
        if (this._triggerState !== undefined) {
            if (!this._editor.hasModel() || !this._languageFeaturesService.completionProvider.has(this._editor.getModel())) {
                this.cancel();
            }
            else {
                this.trigger({ auto: this._triggerState.auto, retrigger: true });
            }
        }
    }
    _onCursorChange(e) {
        if (!this._editor.hasModel()) {
            return;
        }
        const prevSelection = this._currentSelection;
        this._currentSelection = this._editor.getSelection();
        if (!e.selection.isEmpty()
            || (e.reason !== 0 /* CursorChangeReason.NotSet */ && e.reason !== 3 /* CursorChangeReason.Explicit */)
            || (e.source !== 'keyboard' && e.source !== 'deleteLeft')) {
            // Early exit if nothing needs to be done!
            // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
            this.cancel();
            return;
        }
        if (this._triggerState === undefined && e.reason === 0 /* CursorChangeReason.NotSet */) {
            if (prevSelection.containsRange(this._currentSelection) || prevSelection.getEndPosition().isBeforeOrEqual(this._currentSelection.getPosition())) {
                // cursor did move RIGHT due to typing -> trigger quick suggest
                this._doTriggerQuickSuggest();
            }
        }
        else if (this._triggerState !== undefined && e.reason === 3 /* CursorChangeReason.Explicit */) {
            // suggest is active and something like cursor keys are used to move
            // the cursor. this means we can refilter at the new position
            this._refilterCompletionItems();
        }
    }
    _onCompositionEnd() {
        // trigger or refilter when composition ends
        if (this._triggerState === undefined) {
            this._doTriggerQuickSuggest();
        }
        else {
            this._refilterCompletionItems();
        }
    }
    _doTriggerQuickSuggest() {
        if (QuickSuggestionsOptions.isAllOff(this._editor.getOption(94 /* EditorOption.quickSuggestions */))) {
            // not enabled
            return;
        }
        if (this._editor.getOption(123 /* EditorOption.suggest */).snippetsPreventQuickSuggestions && SnippetController2.get(this._editor)?.isInSnippet()) {
            // no quick suggestion when in snippet mode
            return;
        }
        this.cancel();
        this._triggerQuickSuggest.cancelAndSet(() => {
            if (this._triggerState !== undefined) {
                return;
            }
            if (!LineContext.shouldAutoTrigger(this._editor)) {
                return;
            }
            if (!this._editor.hasModel() || !this._editor.hasWidgetFocus()) {
                return;
            }
            const model = this._editor.getModel();
            const pos = this._editor.getPosition();
            // validate enabled now
            const config = this._editor.getOption(94 /* EditorOption.quickSuggestions */);
            if (QuickSuggestionsOptions.isAllOff(config)) {
                return;
            }
            if (!QuickSuggestionsOptions.isAllOn(config)) {
                // Check the type of the token that triggered this
                model.tokenization.tokenizeIfCheap(pos.lineNumber);
                const lineTokens = model.tokenization.getLineTokens(pos.lineNumber);
                const tokenType = lineTokens.getStandardTokenType(lineTokens.findTokenIndexAtOffset(Math.max(pos.column - 1 - 1, 0)));
                if (QuickSuggestionsOptions.valueFor(config, tokenType) !== 'on') {
                    return;
                }
            }
            if (!canShowQuickSuggest(this._editor, this._contextKeyService, this._configurationService)) {
                // do not trigger quick suggestions if inline suggestions are shown
                return;
            }
            if (!this._languageFeaturesService.completionProvider.has(model)) {
                return;
            }
            // we made it till here -> trigger now
            this.trigger({ auto: true });
        }, this._editor.getOption(95 /* EditorOption.quickSuggestionsDelay */));
    }
    _refilterCompletionItems() {
        assertType(this._editor.hasModel());
        assertType(this._triggerState !== undefined);
        const model = this._editor.getModel();
        const position = this._editor.getPosition();
        const ctx = new LineContext(model, position, { ...this._triggerState, refilter: true });
        this._onNewContext(ctx);
    }
    trigger(options) {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        const ctx = new LineContext(model, this._editor.getPosition(), options);
        // Cancel previous requests, change state & update UI
        this.cancel(options.retrigger);
        this._triggerState = options;
        this._onDidTrigger.fire({ auto: options.auto, shy: options.shy ?? false, position: this._editor.getPosition() });
        // Capture context when request was sent
        this._context = ctx;
        // Build context for request
        let suggestCtx = { triggerKind: options.triggerKind ?? 0 /* CompletionTriggerKind.Invoke */ };
        if (options.triggerCharacter) {
            suggestCtx = {
                triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */,
                triggerCharacter: options.triggerCharacter
            };
        }
        this._requestToken = new CancellationTokenSource();
        // kind filter and snippet sort rules
        const snippetSuggestions = this._editor.getOption(117 /* EditorOption.snippetSuggestions */);
        let snippetSortOrder = 1 /* SnippetSortOrder.Inline */;
        switch (snippetSuggestions) {
            case 'top':
                snippetSortOrder = 0 /* SnippetSortOrder.Top */;
                break;
            // 	↓ that's the default anyways...
            // case 'inline':
            // 	snippetSortOrder = SnippetSortOrder.Inline;
            // 	break;
            case 'bottom':
                snippetSortOrder = 2 /* SnippetSortOrder.Bottom */;
                break;
        }
        const { itemKind: itemKindFilter, showDeprecated } = SuggestModel_1.createSuggestFilter(this._editor);
        const completionOptions = new CompletionOptions(snippetSortOrder, options.completionOptions?.kindFilter ?? itemKindFilter, options.completionOptions?.providerFilter, options.completionOptions?.providerItemsToReuse, showDeprecated);
        const wordDistance = WordDistance.create(this._editorWorkerService, this._editor);
        const completions = provideSuggestionItems(this._languageFeaturesService.completionProvider, model, this._editor.getPosition(), completionOptions, suggestCtx, this._requestToken.token);
        Promise.all([completions, wordDistance]).then(async ([completions, wordDistance]) => {
            this._requestToken?.dispose();
            if (!this._editor.hasModel()) {
                completions.disposable.dispose();
                return;
            }
            let clipboardText = options?.clipboardText;
            if (!clipboardText && completions.needsClipboard) {
                clipboardText = await this._clipboardService.readText();
            }
            if (this._triggerState === undefined) {
                completions.disposable.dispose();
                return;
            }
            const model = this._editor.getModel();
            // const items = completions.items;
            // if (existing) {
            // 	const cmpFn = getSuggestionComparator(snippetSortOrder);
            // 	items = items.concat(existing.items).sort(cmpFn);
            // }
            const ctx = new LineContext(model, this._editor.getPosition(), options);
            const fuzzySearchOptions = {
                ...FuzzyScoreOptions.default,
                firstMatchCanBeWeak: !this._editor.getOption(123 /* EditorOption.suggest */).matchOnWordStartOnly
            };
            this._completionModel = new CompletionModel(completions.items, this._context.column, {
                leadingLineContent: ctx.leadingLineContent,
                characterCountDelta: ctx.column - this._context.column
            }, wordDistance, this._editor.getOption(123 /* EditorOption.suggest */), this._editor.getOption(117 /* EditorOption.snippetSuggestions */), fuzzySearchOptions, clipboardText);
            // store containers so that they can be disposed later
            this._completionDisposables.add(completions.disposable);
            this._onNewContext(ctx);
            // finally report telemetry about durations
            this._reportDurationsTelemetry(completions.durations);
            // report invalid completions by source
            if (!this._envService.isBuilt || this._envService.isExtensionDevelopment) {
                for (const item of completions.items) {
                    if (item.isInvalid) {
                        this._logService.warn(`[suggest] did IGNORE invalid completion item from ${item.provider._debugDisplayName}`, item.completion);
                    }
                }
            }
        }).catch(onUnexpectedError);
    }
    /**
     * Report durations telemetry with a 1% sampling rate.
     * The telemetry is reported only if a random number between 0 and 100 is less than or equal to 1.
     */
    _reportDurationsTelemetry(durations) {
        if (Math.random() > 0.0001) { // 0.01%
            return;
        }
        setTimeout(() => {
            this._telemetryService.publicLog2('suggest.durations.json', { data: JSON.stringify(durations) });
            this._logService.debug('suggest.durations.json', durations);
        });
    }
    static createSuggestFilter(editor) {
        // kind filter and snippet sort rules
        const result = new Set();
        // snippet setting
        const snippetSuggestions = editor.getOption(117 /* EditorOption.snippetSuggestions */);
        if (snippetSuggestions === 'none') {
            result.add(27 /* CompletionItemKind.Snippet */);
        }
        // type setting
        const suggestOptions = editor.getOption(123 /* EditorOption.suggest */);
        if (!suggestOptions.showMethods) {
            result.add(0 /* CompletionItemKind.Method */);
        }
        if (!suggestOptions.showFunctions) {
            result.add(1 /* CompletionItemKind.Function */);
        }
        if (!suggestOptions.showConstructors) {
            result.add(2 /* CompletionItemKind.Constructor */);
        }
        if (!suggestOptions.showFields) {
            result.add(3 /* CompletionItemKind.Field */);
        }
        if (!suggestOptions.showVariables) {
            result.add(4 /* CompletionItemKind.Variable */);
        }
        if (!suggestOptions.showClasses) {
            result.add(5 /* CompletionItemKind.Class */);
        }
        if (!suggestOptions.showStructs) {
            result.add(6 /* CompletionItemKind.Struct */);
        }
        if (!suggestOptions.showInterfaces) {
            result.add(7 /* CompletionItemKind.Interface */);
        }
        if (!suggestOptions.showModules) {
            result.add(8 /* CompletionItemKind.Module */);
        }
        if (!suggestOptions.showProperties) {
            result.add(9 /* CompletionItemKind.Property */);
        }
        if (!suggestOptions.showEvents) {
            result.add(10 /* CompletionItemKind.Event */);
        }
        if (!suggestOptions.showOperators) {
            result.add(11 /* CompletionItemKind.Operator */);
        }
        if (!suggestOptions.showUnits) {
            result.add(12 /* CompletionItemKind.Unit */);
        }
        if (!suggestOptions.showValues) {
            result.add(13 /* CompletionItemKind.Value */);
        }
        if (!suggestOptions.showConstants) {
            result.add(14 /* CompletionItemKind.Constant */);
        }
        if (!suggestOptions.showEnums) {
            result.add(15 /* CompletionItemKind.Enum */);
        }
        if (!suggestOptions.showEnumMembers) {
            result.add(16 /* CompletionItemKind.EnumMember */);
        }
        if (!suggestOptions.showKeywords) {
            result.add(17 /* CompletionItemKind.Keyword */);
        }
        if (!suggestOptions.showWords) {
            result.add(18 /* CompletionItemKind.Text */);
        }
        if (!suggestOptions.showColors) {
            result.add(19 /* CompletionItemKind.Color */);
        }
        if (!suggestOptions.showFiles) {
            result.add(20 /* CompletionItemKind.File */);
        }
        if (!suggestOptions.showReferences) {
            result.add(21 /* CompletionItemKind.Reference */);
        }
        if (!suggestOptions.showColors) {
            result.add(22 /* CompletionItemKind.Customcolor */);
        }
        if (!suggestOptions.showFolders) {
            result.add(23 /* CompletionItemKind.Folder */);
        }
        if (!suggestOptions.showTypeParameters) {
            result.add(24 /* CompletionItemKind.TypeParameter */);
        }
        if (!suggestOptions.showSnippets) {
            result.add(27 /* CompletionItemKind.Snippet */);
        }
        if (!suggestOptions.showUsers) {
            result.add(25 /* CompletionItemKind.User */);
        }
        if (!suggestOptions.showIssues) {
            result.add(26 /* CompletionItemKind.Issue */);
        }
        return { itemKind: result, showDeprecated: suggestOptions.showDeprecated };
    }
    _onNewContext(ctx) {
        if (!this._context) {
            // happens when 24x7 IntelliSense is enabled and still in its delay
            return;
        }
        if (ctx.lineNumber !== this._context.lineNumber) {
            // e.g. happens when pressing Enter while IntelliSense is computed
            this.cancel();
            return;
        }
        if (getLeadingWhitespace(ctx.leadingLineContent) !== getLeadingWhitespace(this._context.leadingLineContent)) {
            // cancel IntelliSense when line start changes
            // happens when the current word gets outdented
            this.cancel();
            return;
        }
        if (ctx.column < this._context.column) {
            // typed -> moved cursor LEFT -> retrigger if still on a word
            if (ctx.leadingWord.word) {
                this.trigger({ auto: this._context.triggerOptions.auto, retrigger: true });
            }
            else {
                this.cancel();
            }
            return;
        }
        if (!this._completionModel) {
            // happens when IntelliSense is not yet computed
            return;
        }
        if (ctx.leadingWord.word.length !== 0 && ctx.leadingWord.startColumn > this._context.leadingWord.startColumn) {
            // started a new word while IntelliSense shows -> retrigger but reuse all items that we currently have
            const shouldAutoTrigger = LineContext.shouldAutoTrigger(this._editor);
            if (shouldAutoTrigger && this._context) {
                // shouldAutoTrigger forces tokenization, which can cause pending cursor change events to be emitted, which can cause
                // suggestions to be cancelled, which causes `this._context` to be undefined
                const map = this._completionModel.getItemsByProvider();
                this.trigger({
                    auto: this._context.triggerOptions.auto,
                    retrigger: true,
                    clipboardText: this._completionModel.clipboardText,
                    completionOptions: { providerItemsToReuse: map }
                });
            }
            return;
        }
        if (ctx.column > this._context.column && this._completionModel.getIncompleteProvider().size > 0 && ctx.leadingWord.word.length !== 0) {
            // typed -> moved cursor RIGHT & incomple model & still on a word -> retrigger
            const providerItemsToReuse = new Map();
            const providerFilter = new Set();
            for (const [provider, items] of this._completionModel.getItemsByProvider()) {
                if (items.length > 0 && items[0].container.incomplete) {
                    providerFilter.add(provider);
                }
                else {
                    providerItemsToReuse.set(provider, items);
                }
            }
            this.trigger({
                auto: this._context.triggerOptions.auto,
                triggerKind: 2 /* CompletionTriggerKind.TriggerForIncompleteCompletions */,
                retrigger: true,
                clipboardText: this._completionModel.clipboardText,
                completionOptions: { providerFilter, providerItemsToReuse }
            });
        }
        else {
            // typed -> moved cursor RIGHT -> update UI
            const oldLineContext = this._completionModel.lineContext;
            let isFrozen = false;
            this._completionModel.lineContext = {
                leadingLineContent: ctx.leadingLineContent,
                characterCountDelta: ctx.column - this._context.column
            };
            if (this._completionModel.items.length === 0) {
                const shouldAutoTrigger = LineContext.shouldAutoTrigger(this._editor);
                if (!this._context) {
                    // shouldAutoTrigger forces tokenization, which can cause pending cursor change events to be emitted, which can cause
                    // suggestions to be cancelled, which causes `this._context` to be undefined
                    this.cancel();
                    return;
                }
                if (shouldAutoTrigger && this._context.leadingWord.endColumn < ctx.leadingWord.startColumn) {
                    // retrigger when heading into a new word
                    this.trigger({ auto: this._context.triggerOptions.auto, retrigger: true });
                    return;
                }
                if (!this._context.triggerOptions.auto) {
                    // freeze when IntelliSense was manually requested
                    this._completionModel.lineContext = oldLineContext;
                    isFrozen = this._completionModel.items.length > 0;
                    if (isFrozen && ctx.leadingWord.word.length === 0) {
                        // there were results before but now there aren't
                        // and also we are not on a word anymore -> cancel
                        this.cancel();
                        return;
                    }
                }
                else {
                    // nothing left
                    this.cancel();
                    return;
                }
            }
            this._onDidSuggest.fire({
                completionModel: this._completionModel,
                triggerOptions: ctx.triggerOptions,
                isFrozen,
            });
        }
    }
};
SuggestModel = SuggestModel_1 = __decorate([
    __param(1, IEditorWorkerService),
    __param(2, IClipboardService),
    __param(3, ITelemetryService),
    __param(4, ILogService),
    __param(5, IContextKeyService),
    __param(6, IConfigurationService),
    __param(7, ILanguageFeaturesService),
    __param(8, IEnvironmentService)
], SuggestModel);
export { SuggestModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSzNHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUc5RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RCxPQUFPLEVBQXVDLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLHNCQUFzQixFQUFFLHVCQUF1QixFQUFvQixNQUFNLGNBQWMsQ0FBQztBQUVuTCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDeEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUE2QjdGLE1BQU0sT0FBTyxXQUFXO0lBRXZCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxNQUFtQjtRQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNqQyxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFbkQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxHQUFHLENBQUMsTUFBTTtZQUNoQyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLG1EQUFtRCxFQUFFLENBQUM7WUFDMUYsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMvQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFRRCxZQUFZLEtBQWlCLEVBQUUsUUFBa0IsRUFBRSxjQUFxQztRQUN2RixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ25HLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQztRQUN0QyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7SUFDdEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFOLElBQWtCLEtBSWpCO0FBSkQsV0FBa0IsS0FBSztJQUN0QixpQ0FBUSxDQUFBO0lBQ1IscUNBQVUsQ0FBQTtJQUNWLGlDQUFRLENBQUE7QUFDVCxDQUFDLEVBSmlCLEtBQUssS0FBTCxLQUFLLFFBSXRCO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxNQUFtQixFQUFFLGlCQUFxQyxFQUFFLG9CQUEyQztJQUNuSSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLDJCQUEyQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUM3RywwQ0FBMEM7UUFDMUMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBc0IsMkJBQTJCLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0ksSUFBSSxtQkFBbUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN2QyxPQUFPLENBQUMsbUJBQW1CLENBQUM7SUFDN0IsQ0FBQztJQUNELE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxxQ0FBNEIsQ0FBQyxtQkFBbUIsQ0FBQztBQUMxRSxDQUFDO0FBRUQsU0FBUyxpQ0FBaUMsQ0FBQyxNQUFtQixFQUFFLGlCQUFxQyxFQUFFLG9CQUEyQztJQUNqSixJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQy9FLDBDQUEwQztRQUMxQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxNQUFNLG1CQUFtQixHQUFHLGlCQUFpQixDQUFDLGtCQUFrQixDQUFzQiwyQkFBMkIsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzSSxJQUFJLG1CQUFtQixLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztJQUM3QixDQUFDO0lBQ0QsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLHFDQUE0QixDQUFDLG1CQUFtQixDQUFDO0FBQzFFLENBQUM7QUFFTSxJQUFNLFlBQVksb0JBQWxCLE1BQU0sWUFBWTtJQXFCeEIsWUFDa0IsT0FBb0IsRUFDZixvQkFBMkQsRUFDOUQsaUJBQXFELEVBQ3JELGlCQUFxRCxFQUMzRCxXQUF5QyxFQUNsQyxrQkFBdUQsRUFDcEQscUJBQTZELEVBQzFELHdCQUFtRSxFQUN4RSxXQUFpRDtRQVJyRCxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0UseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUM3QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3BDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDakIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3pDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDdkQsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBNUJ0RCxlQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNuQyw4QkFBeUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ2xELHlCQUFvQixHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7UUFFbkQsa0JBQWEsR0FBc0MsU0FBUyxDQUFDO1FBTXBELDJCQUFzQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDL0MsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQztRQUMzQyxrQkFBYSxHQUFHLElBQUksT0FBTyxFQUFpQixDQUFDO1FBQzdDLGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQWlCLENBQUM7UUFFckQsZ0JBQVcsR0FBd0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFDM0QsaUJBQVksR0FBeUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7UUFDOUQsaUJBQVksR0FBeUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7UUFhdEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEYsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3RELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRTtZQUM5RCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3JGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQztRQUM5QixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUMzRCxpQkFBaUIsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFO1lBQ3pELGlCQUFpQixHQUFHLEtBQUssQ0FBQztZQUMxQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvRCxtRUFBbUU7WUFDbkUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUM3RCxzRUFBc0U7WUFDdEUsOEJBQThCO1lBQzlCLDZEQUE2RDtZQUM3RCxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDNUQsSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN4QyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQ2hHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDMUIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFTyx3QkFBd0I7UUFDL0IsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXZDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QjtlQUM3QyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFO2VBQ3hCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG1EQUF5QyxFQUFFLENBQUM7WUFFdEUsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLDBCQUEwQixHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFDO1FBQ2xGLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyRyxLQUFLLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxHQUFHLEdBQUcsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ1YsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixFQUFFLENBQUM7b0JBQ2xELElBQUksY0FBYyxFQUFFLENBQUM7d0JBQ3BCLEdBQUcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQ3pCLENBQUM7b0JBQ0QsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDekMsQ0FBQztnQkFDRCxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBR0QsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLElBQWEsRUFBRSxFQUFFO1lBRS9DLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO2dCQUMzRyxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNqRCw0RUFBNEU7Z0JBQzVFLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNYLDBDQUEwQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUcsQ0FBQztnQkFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQztnQkFDdkMsSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqRixDQUFDO1lBRUQsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBQ2xCLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RELElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZELFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsMEJBQTBCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBRWQscURBQXFEO2dCQUNyRCw4Q0FBOEM7Z0JBQzlDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQTRDLENBQUM7Z0JBQ2pGLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQzNCLEtBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO3dCQUM1RSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDOzRCQUM3QixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUMzQyxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsT0FBTyxDQUFDO29CQUNaLElBQUksRUFBRSxJQUFJO29CQUNWLFdBQVcsZ0RBQXdDO29CQUNuRCxnQkFBZ0IsRUFBRSxRQUFRO29CQUMxQixTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDekMsYUFBYSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxhQUFhO29CQUNuRCxpQkFBaUIsRUFBRSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUU7aUJBQ3JFLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRixJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNsRixJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckcsQ0FBQztJQUVELHVDQUF1QztJQUV2QyxJQUFJLEtBQUs7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLDBCQUFrQjtRQUNuQixDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckMsNEJBQW9CO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsMEJBQWtCO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLFlBQXFCLEtBQUs7UUFDaEMsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO1lBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO1lBQy9CLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLENBQUM7WUFDbEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUM7WUFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hILElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNmLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FBQyxDQUErQjtRQUV0RCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBQzdDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXJELElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRTtlQUN0QixDQUFDLENBQUMsQ0FBQyxNQUFNLHNDQUE4QixJQUFJLENBQUMsQ0FBQyxNQUFNLHdDQUFnQyxDQUFDO2VBQ3BGLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxVQUFVLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxZQUFZLENBQUMsRUFDeEQsQ0FBQztZQUNGLDBDQUEwQztZQUMxQyw4R0FBOEc7WUFDOUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFHRCxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxNQUFNLHNDQUE4QixFQUFFLENBQUM7WUFDaEYsSUFBSSxhQUFhLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDakosK0RBQStEO2dCQUMvRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUMvQixDQUFDO1FBRUYsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sd0NBQWdDLEVBQUUsQ0FBQztZQUN6RixvRUFBb0U7WUFDcEUsNkRBQTZEO1lBQzdELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLDRDQUE0QztRQUM1QyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDL0IsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLHNCQUFzQjtRQUU3QixJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsd0NBQStCLENBQUMsRUFBRSxDQUFDO1lBQzdGLGNBQWM7WUFDZCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUFzQixDQUFDLCtCQUErQixJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUN6SSwyQ0FBMkM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFZCxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUMzQyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDbEQsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztnQkFDaEUsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkMsdUJBQXVCO1lBQ3ZCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyx3Q0FBK0IsQ0FBQztZQUNyRSxJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsa0RBQWtEO2dCQUNsRCxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ25ELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDcEUsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RILElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDbEUsT0FBTztnQkFDUixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO2dCQUM3RixtRUFBbUU7Z0JBQ25FLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbEUsT0FBTztZQUNSLENBQUM7WUFFRCxzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRTlCLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsNkNBQW9DLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRU8sd0JBQXdCO1FBQy9CLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDcEMsVUFBVSxDQUFDLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxDQUFDLENBQUM7UUFFN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVDLE1BQU0sR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQsT0FBTyxDQUFDLE9BQThCO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXhFLHFEQUFxRDtRQUNyRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxJQUFJLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakgsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDO1FBRXBCLDRCQUE0QjtRQUM1QixJQUFJLFVBQVUsR0FBc0IsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVcsd0NBQWdDLEVBQUUsQ0FBQztRQUN6RyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzlCLFVBQVUsR0FBRztnQkFDWixXQUFXLGdEQUF3QztnQkFDbkQsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQjthQUMxQyxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBRW5ELHFDQUFxQztRQUNyQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUywyQ0FBaUMsQ0FBQztRQUNuRixJQUFJLGdCQUFnQixrQ0FBMEIsQ0FBQztRQUMvQyxRQUFRLGtCQUFrQixFQUFFLENBQUM7WUFDNUIsS0FBSyxLQUFLO2dCQUNULGdCQUFnQiwrQkFBdUIsQ0FBQztnQkFDeEMsTUFBTTtZQUNQLG1DQUFtQztZQUNuQyxpQkFBaUI7WUFDakIsK0NBQStDO1lBQy9DLFVBQVU7WUFDVixLQUFLLFFBQVE7Z0JBQ1osZ0JBQWdCLGtDQUEwQixDQUFDO2dCQUMzQyxNQUFNO1FBQ1IsQ0FBQztRQUVELE1BQU0sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxHQUFHLGNBQVksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEcsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLElBQUksY0FBYyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZPLE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVsRixNQUFNLFdBQVcsR0FBRyxzQkFBc0IsQ0FDekMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGtCQUFrQixFQUNoRCxLQUFLLEVBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFDMUIsaUJBQWlCLEVBQ2pCLFVBQVUsRUFDVixJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FDeEIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFFLEVBQUU7WUFFbkYsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUU5QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO2dCQUM5QixXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqQyxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksYUFBYSxHQUFHLE9BQU8sRUFBRSxhQUFhLENBQUM7WUFDM0MsSUFBSSxDQUFDLGFBQWEsSUFBSSxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ2xELGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN6RCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqQyxPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEMsbUNBQW1DO1lBRW5DLGtCQUFrQjtZQUNsQiw0REFBNEQ7WUFDNUQscURBQXFEO1lBQ3JELElBQUk7WUFFSixNQUFNLEdBQUcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN4RSxNQUFNLGtCQUFrQixHQUFHO2dCQUMxQixHQUFHLGlCQUFpQixDQUFDLE9BQU87Z0JBQzVCLG1CQUFtQixFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUFzQixDQUFDLG9CQUFvQjthQUN2RixDQUFDO1lBQ0YsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JGLGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxrQkFBa0I7Z0JBQzFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVMsQ0FBQyxNQUFNO2FBQ3ZELEVBQ0EsWUFBWSxFQUNaLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxnQ0FBc0IsRUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLDJDQUFpQyxFQUN2RCxrQkFBa0IsRUFDbEIsYUFBYSxDQUNiLENBQUM7WUFFRixzREFBc0Q7WUFDdEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFeEQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUV4QiwyQ0FBMkM7WUFDM0MsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUV0RCx1Q0FBdUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDMUUsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3RDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUNwQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxxREFBcUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDaEksQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUVGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRDs7O09BR0c7SUFDSyx5QkFBeUIsQ0FBQyxTQUE4QjtRQUMvRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVE7WUFDckMsT0FBTztRQUNSLENBQUM7UUFFRCxVQUFVLENBQUMsR0FBRyxFQUFFO1lBT2YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBcUMsd0JBQXdCLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDckksSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQW1CO1FBQzdDLHFDQUFxQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBc0IsQ0FBQztRQUU3QyxrQkFBa0I7UUFDbEIsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsU0FBUywyQ0FBaUMsQ0FBQztRQUM3RSxJQUFJLGtCQUFrQixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxHQUFHLHFDQUE0QixDQUFDO1FBQ3hDLENBQUM7UUFFRCxlQUFlO1FBQ2YsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsZ0NBQXNCLENBQUM7UUFDOUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLG1DQUEyQixDQUFDO1FBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcscUNBQTZCLENBQUM7UUFBQyxDQUFDO1FBQy9FLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLHdDQUFnQyxDQUFDO1FBQUMsQ0FBQztRQUNyRixJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsa0NBQTBCLENBQUM7UUFBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyxxQ0FBNkIsQ0FBQztRQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLGtDQUEwQixDQUFDO1FBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsbUNBQTJCLENBQUM7UUFBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyxzQ0FBOEIsQ0FBQztRQUFDLENBQUM7UUFDakYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLG1DQUEyQixDQUFDO1FBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcscUNBQTZCLENBQUM7UUFBQyxDQUFDO1FBQ2hGLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztRQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLHNDQUE2QixDQUFDO1FBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztRQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLHNDQUE2QixDQUFDO1FBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyx3Q0FBK0IsQ0FBQztRQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLHFDQUE0QixDQUFDO1FBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztRQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLGtDQUF5QixDQUFDO1FBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsdUNBQThCLENBQUM7UUFBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyx5Q0FBZ0MsQ0FBQztRQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLG9DQUEyQixDQUFDO1FBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRywyQ0FBa0MsQ0FBQztRQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUFDLE1BQU0sQ0FBQyxHQUFHLHFDQUE0QixDQUFDO1FBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQUMsTUFBTSxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFBQyxNQUFNLENBQUMsR0FBRyxtQ0FBMEIsQ0FBQztRQUFDLENBQUM7UUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUM1RSxDQUFDO0lBRU8sYUFBYSxDQUFDLEdBQWdCO1FBRXJDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsbUVBQW1FO1lBQ25FLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakQsa0VBQWtFO1lBQ2xFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsS0FBSyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUM3Ryw4Q0FBOEM7WUFDOUMsK0NBQStDO1lBQy9DLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNkLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkMsNkRBQTZEO1lBQzdELElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDNUUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNmLENBQUM7WUFDRCxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixnREFBZ0Q7WUFDaEQsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDOUcsc0dBQXNHO1lBQ3RHLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0RSxJQUFJLGlCQUFpQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDeEMscUhBQXFIO2dCQUNySCw0RUFBNEU7Z0JBQzVFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUMsT0FBTyxDQUFDO29CQUNaLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUN2QyxTQUFTLEVBQUUsSUFBSTtvQkFDZixhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7b0JBQ2xELGlCQUFpQixFQUFFLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO2lCQUNoRCxDQUFDLENBQUM7WUFDSixDQUFDO1lBQ0QsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEksOEVBQThFO1lBRTlFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQTRDLENBQUM7WUFDakYsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQTBCLENBQUM7WUFDekQsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7Z0JBQzVFLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDdkQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzNDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSTtnQkFDdkMsV0FBVywrREFBdUQ7Z0JBQ2xFLFNBQVMsRUFBRSxJQUFJO2dCQUNmLGFBQWEsRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtnQkFDbEQsaUJBQWlCLEVBQUUsRUFBRSxjQUFjLEVBQUUsb0JBQW9CLEVBQUU7YUFDM0QsQ0FBQyxDQUFDO1FBRUosQ0FBQzthQUFNLENBQUM7WUFDUCwyQ0FBMkM7WUFDM0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQztZQUN6RCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7WUFFckIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsR0FBRztnQkFDbkMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLGtCQUFrQjtnQkFDMUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07YUFDdEQsQ0FBQztZQUVGLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBRTlDLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDcEIscUhBQXFIO29CQUNySCw0RUFBNEU7b0JBQzVFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDZCxPQUFPO2dCQUNSLENBQUM7Z0JBRUQsSUFBSSxpQkFBaUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDNUYseUNBQXlDO29CQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDM0UsT0FBTztnQkFDUixDQUFDO2dCQUVELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDeEMsa0RBQWtEO29CQUNsRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQztvQkFDbkQsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztvQkFFbEQsSUFBSSxRQUFRLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUNuRCxpREFBaUQ7d0JBQ2pELGtEQUFrRDt3QkFDbEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUNkLE9BQU87b0JBQ1IsQ0FBQztnQkFFRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsZUFBZTtvQkFDZixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2QsT0FBTztnQkFDUixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDO2dCQUN2QixlQUFlLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtnQkFDdEMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxjQUFjO2dCQUNsQyxRQUFRO2FBQ1IsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBaG5CWSxZQUFZO0lBdUJ0QixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsbUJBQW1CLENBQUE7R0E5QlQsWUFBWSxDQWduQnhCIn0=