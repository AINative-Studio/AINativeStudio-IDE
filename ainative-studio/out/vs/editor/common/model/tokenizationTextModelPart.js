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
var TokenizationTextModelPart_1;
import { BugIndicatingError, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { countEOL } from '../core/eolCounter.js';
import { LineRange } from '../core/lineRange.js';
import { Position } from '../core/position.js';
import { getWordAtText } from '../core/wordHelper.js';
import { TokenizationRegistry, TreeSitterTokenizationRegistry } from '../languages.js';
import { ILanguageService } from '../languages/language.js';
import { ILanguageConfigurationService } from '../languages/languageConfigurationRegistry.js';
import { TextModelPart } from './textModelPart.js';
import { DefaultBackgroundTokenizer, TokenizerWithStateStoreAndTextModel, TrackingTokenizationStateStore } from './textModelTokens.js';
import { AbstractTokens, AttachedViewHandler } from './tokens.js';
import { TreeSitterTokens } from './treeSitterTokens.js';
import { ContiguousMultilineTokensBuilder } from '../tokens/contiguousMultilineTokensBuilder.js';
import { ContiguousTokensStore } from '../tokens/contiguousTokensStore.js';
import { SparseTokensStore } from '../tokens/sparseTokensStore.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
let TokenizationTextModelPart = TokenizationTextModelPart_1 = class TokenizationTextModelPart extends TextModelPart {
    constructor(_textModel, _bracketPairsTextModelPart, _languageId, _attachedViews, _languageService, _languageConfigurationService, _instantiationService) {
        super();
        this._textModel = _textModel;
        this._bracketPairsTextModelPart = _bracketPairsTextModelPart;
        this._languageId = _languageId;
        this._attachedViews = _attachedViews;
        this._languageService = _languageService;
        this._languageConfigurationService = _languageConfigurationService;
        this._instantiationService = _instantiationService;
        this._semanticTokens = new SparseTokensStore(this._languageService.languageIdCodec);
        this._onDidChangeLanguage = this._register(new Emitter());
        this.onDidChangeLanguage = this._onDidChangeLanguage.event;
        this._onDidChangeLanguageConfiguration = this._register(new Emitter());
        this.onDidChangeLanguageConfiguration = this._onDidChangeLanguageConfiguration.event;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
        this._tokensDisposables = this._register(new DisposableStore());
        // We just look at registry changes to determine whether to use tree sitter.
        // This means that removing a language from the setting will not cause a switch to textmate and will require a reload.
        // Adding a language to the setting will not need a reload, however.
        this._register(Event.filter(TreeSitterTokenizationRegistry.onDidChange, (e) => e.changedLanguages.includes(this._languageId))(() => {
            this.createPreferredTokenProvider();
        }));
        this.createPreferredTokenProvider();
    }
    createGrammarTokens() {
        return this._register(new GrammarTokens(this._languageService.languageIdCodec, this._textModel, () => this._languageId, this._attachedViews));
    }
    createTreeSitterTokens() {
        return this._register(this._instantiationService.createInstance(TreeSitterTokens, this._languageService.languageIdCodec, this._textModel, () => this._languageId));
    }
    createTokens(useTreeSitter) {
        const needsReset = this._tokens !== undefined;
        this._tokens?.dispose();
        this._tokens = useTreeSitter ? this.createTreeSitterTokens() : this.createGrammarTokens();
        this._tokensDisposables.clear();
        this._tokensDisposables.add(this._tokens.onDidChangeTokens(e => {
            this._emitModelTokensChangedEvent(e);
        }));
        this._tokensDisposables.add(this._tokens.onDidChangeBackgroundTokenizationState(e => {
            this._bracketPairsTextModelPart.handleDidChangeBackgroundTokenizationState();
        }));
        if (needsReset) {
            // We need to reset the tokenization, as the new token provider otherwise won't have a chance to provide tokens until some action happens in the editor.
            this._tokens.resetTokenization();
        }
    }
    createPreferredTokenProvider() {
        if (TreeSitterTokenizationRegistry.get(this._languageId)) {
            if (!(this._tokens instanceof TreeSitterTokens)) {
                this.createTokens(true);
            }
        }
        else {
            if (!(this._tokens instanceof GrammarTokens)) {
                this.createTokens(false);
            }
        }
    }
    _hasListeners() {
        return (this._onDidChangeLanguage.hasListeners()
            || this._onDidChangeLanguageConfiguration.hasListeners()
            || this._onDidChangeTokens.hasListeners());
    }
    handleLanguageConfigurationServiceChange(e) {
        if (e.affects(this._languageId)) {
            this._onDidChangeLanguageConfiguration.fire({});
        }
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            this._semanticTokens.flush();
        }
        else if (!e.isEolChange) { // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength, lastLineLength] = countEOL(c.text);
                this._semanticTokens.acceptEdit(c.range, eolCount, firstLineLength, lastLineLength, c.text.length > 0 ? c.text.charCodeAt(0) : 0 /* CharCode.Null */);
            }
        }
        this._tokens.handleDidChangeContent(e);
    }
    handleDidChangeAttached() {
        this._tokens.handleDidChangeAttached();
    }
    /**
     * Includes grammar and semantic tokens.
     */
    getLineTokens(lineNumber) {
        this.validateLineNumber(lineNumber);
        const syntacticTokens = this._tokens.getLineTokens(lineNumber);
        return this._semanticTokens.addSparseTokens(lineNumber, syntacticTokens);
    }
    _emitModelTokensChangedEvent(e) {
        if (!this._textModel._isDisposing()) {
            this._bracketPairsTextModelPart.handleDidChangeTokens(e);
            this._onDidChangeTokens.fire(e);
        }
    }
    // #region Grammar Tokens
    validateLineNumber(lineNumber) {
        if (lineNumber < 1 || lineNumber > this._textModel.getLineCount()) {
            throw new BugIndicatingError('Illegal value for lineNumber');
        }
    }
    get hasTokens() {
        return this._tokens.hasTokens;
    }
    resetTokenization() {
        this._tokens.resetTokenization();
    }
    get backgroundTokenizationState() {
        return this._tokens.backgroundTokenizationState;
    }
    forceTokenization(lineNumber) {
        this.validateLineNumber(lineNumber);
        this._tokens.forceTokenization(lineNumber);
    }
    hasAccurateTokensForLine(lineNumber) {
        this.validateLineNumber(lineNumber);
        return this._tokens.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        this.validateLineNumber(lineNumber);
        return this._tokens.isCheapToTokenize(lineNumber);
    }
    tokenizeIfCheap(lineNumber) {
        this.validateLineNumber(lineNumber);
        this._tokens.tokenizeIfCheap(lineNumber);
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        return this._tokens.getTokenTypeIfInsertingCharacter(lineNumber, column, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        return this._tokens.tokenizeLinesAt(lineNumber, lines);
    }
    // #endregion
    // #region Semantic Tokens
    setSemanticTokens(tokens, isComplete) {
        this._semanticTokens.set(tokens, isComplete);
        this._emitModelTokensChangedEvent({
            semanticTokensApplied: tokens !== null,
            ranges: [{ fromLineNumber: 1, toLineNumber: this._textModel.getLineCount() }],
        });
    }
    hasCompleteSemanticTokens() {
        return this._semanticTokens.isComplete();
    }
    hasSomeSemanticTokens() {
        return !this._semanticTokens.isEmpty();
    }
    setPartialSemanticTokens(range, tokens) {
        if (this.hasCompleteSemanticTokens()) {
            return;
        }
        const changedRange = this._textModel.validateRange(this._semanticTokens.setPartial(range, tokens));
        this._emitModelTokensChangedEvent({
            semanticTokensApplied: true,
            ranges: [
                {
                    fromLineNumber: changedRange.startLineNumber,
                    toLineNumber: changedRange.endLineNumber,
                },
            ],
        });
    }
    // #endregion
    // #region Utility Methods
    getWordAtPosition(_position) {
        this.assertNotDisposed();
        const position = this._textModel.validatePosition(_position);
        const lineContent = this._textModel.getLineContent(position.lineNumber);
        const lineTokens = this.getLineTokens(position.lineNumber);
        const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
        // (1). First try checking right biased word
        const [rbStartOffset, rbEndOffset] = TokenizationTextModelPart_1._findLanguageBoundaries(lineTokens, tokenIndex);
        const rightBiasedWord = getWordAtText(position.column, this.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex)).getWordDefinition(), lineContent.substring(rbStartOffset, rbEndOffset), rbStartOffset);
        // Make sure the result touches the original passed in position
        if (rightBiasedWord &&
            rightBiasedWord.startColumn <= _position.column &&
            _position.column <= rightBiasedWord.endColumn) {
            return rightBiasedWord;
        }
        // (2). Else, if we were at a language boundary, check the left biased word
        if (tokenIndex > 0 && rbStartOffset === position.column - 1) {
            // edge case, where `position` sits between two tokens belonging to two different languages
            const [lbStartOffset, lbEndOffset] = TokenizationTextModelPart_1._findLanguageBoundaries(lineTokens, tokenIndex - 1);
            const leftBiasedWord = getWordAtText(position.column, this.getLanguageConfiguration(lineTokens.getLanguageId(tokenIndex - 1)).getWordDefinition(), lineContent.substring(lbStartOffset, lbEndOffset), lbStartOffset);
            // Make sure the result touches the original passed in position
            if (leftBiasedWord &&
                leftBiasedWord.startColumn <= _position.column &&
                _position.column <= leftBiasedWord.endColumn) {
                return leftBiasedWord;
            }
        }
        return null;
    }
    getLanguageConfiguration(languageId) {
        return this._languageConfigurationService.getLanguageConfiguration(languageId);
    }
    static _findLanguageBoundaries(lineTokens, tokenIndex) {
        const languageId = lineTokens.getLanguageId(tokenIndex);
        // go left until a different language is hit
        let startOffset = 0;
        for (let i = tokenIndex; i >= 0 && lineTokens.getLanguageId(i) === languageId; i--) {
            startOffset = lineTokens.getStartOffset(i);
        }
        // go right until a different language is hit
        let endOffset = lineTokens.getLineContent().length;
        for (let i = tokenIndex, tokenCount = lineTokens.getCount(); i < tokenCount && lineTokens.getLanguageId(i) === languageId; i++) {
            endOffset = lineTokens.getEndOffset(i);
        }
        return [startOffset, endOffset];
    }
    getWordUntilPosition(position) {
        const wordAtPosition = this.getWordAtPosition(position);
        if (!wordAtPosition) {
            return { word: '', startColumn: position.column, endColumn: position.column, };
        }
        return {
            word: wordAtPosition.word.substr(0, position.column - wordAtPosition.startColumn),
            startColumn: wordAtPosition.startColumn,
            endColumn: position.column,
        };
    }
    // #endregion
    // #region Language Id handling
    getLanguageId() {
        return this._languageId;
    }
    getLanguageIdAtPosition(lineNumber, column) {
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        const lineTokens = this.getLineTokens(position.lineNumber);
        return lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(position.column - 1));
    }
    setLanguageId(languageId, source = 'api') {
        if (this._languageId === languageId) {
            // There's nothing to do
            return;
        }
        const e = {
            oldLanguage: this._languageId,
            newLanguage: languageId,
            source
        };
        this._languageId = languageId;
        this._bracketPairsTextModelPart.handleDidChangeLanguage(e);
        this._tokens.resetTokenization();
        this.createPreferredTokenProvider();
        this._onDidChangeLanguage.fire(e);
        this._onDidChangeLanguageConfiguration.fire({});
    }
};
TokenizationTextModelPart = TokenizationTextModelPart_1 = __decorate([
    __param(4, ILanguageService),
    __param(5, ILanguageConfigurationService),
    __param(6, IInstantiationService)
], TokenizationTextModelPart);
export { TokenizationTextModelPart };
class GrammarTokens extends AbstractTokens {
    constructor(languageIdCodec, textModel, getLanguageId, attachedViews) {
        super(languageIdCodec, textModel, getLanguageId);
        this._tokenizer = null;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        this._defaultBackgroundTokenizer = null;
        this._backgroundTokenizer = this._register(new MutableDisposable());
        this._tokens = new ContiguousTokensStore(this._languageIdCodec);
        this._debugBackgroundTokenizer = this._register(new MutableDisposable());
        this._attachedViewStates = this._register(new DisposableMap());
        this._register(TokenizationRegistry.onDidChange((e) => {
            const languageId = this.getLanguageId();
            if (e.changedLanguages.indexOf(languageId) === -1) {
                return;
            }
            this.resetTokenization();
        }));
        this.resetTokenization();
        this._register(attachedViews.onDidChangeVisibleRanges(({ view, state }) => {
            if (state) {
                let existing = this._attachedViewStates.get(view);
                if (!existing) {
                    existing = new AttachedViewHandler(() => this.refreshRanges(existing.lineRanges));
                    this._attachedViewStates.set(view, existing);
                }
                existing.handleStateChange(state);
            }
            else {
                this._attachedViewStates.deleteAndDispose(view);
            }
        }));
    }
    resetTokenization(fireTokenChangeEvent = true) {
        this._tokens.flush();
        this._debugBackgroundTokens?.flush();
        if (this._debugBackgroundStates) {
            this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
        }
        if (fireTokenChangeEvent) {
            this._onDidChangeTokens.fire({
                semanticTokensApplied: false,
                ranges: [
                    {
                        fromLineNumber: 1,
                        toLineNumber: this._textModel.getLineCount(),
                    },
                ],
            });
        }
        const initializeTokenization = () => {
            if (this._textModel.isTooLargeForTokenization()) {
                return [null, null];
            }
            const tokenizationSupport = TokenizationRegistry.get(this.getLanguageId());
            if (!tokenizationSupport) {
                return [null, null];
            }
            let initialState;
            try {
                initialState = tokenizationSupport.getInitialState();
            }
            catch (e) {
                onUnexpectedError(e);
                return [null, null];
            }
            return [tokenizationSupport, initialState];
        };
        const [tokenizationSupport, initialState] = initializeTokenization();
        if (tokenizationSupport && initialState) {
            this._tokenizer = new TokenizerWithStateStoreAndTextModel(this._textModel.getLineCount(), tokenizationSupport, this._textModel, this._languageIdCodec);
        }
        else {
            this._tokenizer = null;
        }
        this._backgroundTokenizer.clear();
        this._defaultBackgroundTokenizer = null;
        if (this._tokenizer) {
            const b = {
                setTokens: (tokens) => {
                    this.setTokens(tokens);
                },
                backgroundTokenizationFinished: () => {
                    if (this._backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
                        // We already did a full tokenization and don't go back to progressing.
                        return;
                    }
                    const newState = 2 /* BackgroundTokenizationState.Completed */;
                    this._backgroundTokenizationState = newState;
                    this._onDidChangeBackgroundTokenizationState.fire();
                },
                setEndState: (lineNumber, state) => {
                    if (!this._tokenizer) {
                        return;
                    }
                    const firstInvalidEndStateLineNumber = this._tokenizer.store.getFirstInvalidEndStateLineNumber();
                    // Don't accept states for definitely valid states, the renderer is ahead of the worker!
                    if (firstInvalidEndStateLineNumber !== null && lineNumber >= firstInvalidEndStateLineNumber) {
                        this._tokenizer?.store.setEndState(lineNumber, state);
                    }
                },
            };
            if (tokenizationSupport && tokenizationSupport.createBackgroundTokenizer && !tokenizationSupport.backgroundTokenizerShouldOnlyVerifyTokens) {
                this._backgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, b);
            }
            if (!this._backgroundTokenizer.value && !this._textModel.isTooLargeForTokenization()) {
                this._backgroundTokenizer.value = this._defaultBackgroundTokenizer =
                    new DefaultBackgroundTokenizer(this._tokenizer, b);
                this._defaultBackgroundTokenizer.handleChanges();
            }
            if (tokenizationSupport?.backgroundTokenizerShouldOnlyVerifyTokens && tokenizationSupport.createBackgroundTokenizer) {
                this._debugBackgroundTokens = new ContiguousTokensStore(this._languageIdCodec);
                this._debugBackgroundStates = new TrackingTokenizationStateStore(this._textModel.getLineCount());
                this._debugBackgroundTokenizer.clear();
                this._debugBackgroundTokenizer.value = tokenizationSupport.createBackgroundTokenizer(this._textModel, {
                    setTokens: (tokens) => {
                        this._debugBackgroundTokens?.setMultilineTokens(tokens, this._textModel);
                    },
                    backgroundTokenizationFinished() {
                        // NO OP
                    },
                    setEndState: (lineNumber, state) => {
                        this._debugBackgroundStates?.setEndState(lineNumber, state);
                    },
                });
            }
            else {
                this._debugBackgroundTokens = undefined;
                this._debugBackgroundStates = undefined;
                this._debugBackgroundTokenizer.value = undefined;
            }
        }
        this.refreshAllVisibleLineTokens();
    }
    handleDidChangeAttached() {
        this._defaultBackgroundTokenizer?.handleChanges();
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.resetTokenization(false);
        }
        else if (!e.isEolChange) { // We don't have to do anything on an EOL change
            for (const c of e.changes) {
                const [eolCount, firstLineLength] = countEOL(c.text);
                this._tokens.acceptEdit(c.range, eolCount, firstLineLength);
                this._debugBackgroundTokens?.acceptEdit(c.range, eolCount, firstLineLength);
            }
            this._debugBackgroundStates?.acceptChanges(e.changes);
            if (this._tokenizer) {
                this._tokenizer.store.acceptChanges(e.changes);
            }
            this._defaultBackgroundTokenizer?.handleChanges();
        }
    }
    setTokens(tokens) {
        const { changes } = this._tokens.setMultilineTokens(tokens, this._textModel);
        if (changes.length > 0) {
            this._onDidChangeTokens.fire({ semanticTokensApplied: false, ranges: changes, });
        }
        return { changes: changes };
    }
    refreshAllVisibleLineTokens() {
        const ranges = LineRange.joinMany([...this._attachedViewStates].map(([_, s]) => s.lineRanges));
        this.refreshRanges(ranges);
    }
    refreshRanges(ranges) {
        for (const range of ranges) {
            this.refreshRange(range.startLineNumber, range.endLineNumberExclusive - 1);
        }
    }
    refreshRange(startLineNumber, endLineNumber) {
        if (!this._tokenizer) {
            return;
        }
        startLineNumber = Math.max(1, Math.min(this._textModel.getLineCount(), startLineNumber));
        endLineNumber = Math.min(this._textModel.getLineCount(), endLineNumber);
        const builder = new ContiguousMultilineTokensBuilder();
        const { heuristicTokens } = this._tokenizer.tokenizeHeuristically(builder, startLineNumber, endLineNumber);
        const changedTokens = this.setTokens(builder.finalize());
        if (heuristicTokens) {
            // We overrode tokens with heuristically computed ones.
            // Because old states might get reused (thus stopping invalidation),
            // we have to explicitly request the tokens for the changed ranges again.
            for (const c of changedTokens.changes) {
                this._backgroundTokenizer.value?.requestTokens(c.fromLineNumber, c.toLineNumber + 1);
            }
        }
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    forceTokenization(lineNumber) {
        const builder = new ContiguousMultilineTokensBuilder();
        this._tokenizer?.updateTokensUntilLine(builder, lineNumber);
        this.setTokens(builder.finalize());
        this._defaultBackgroundTokenizer?.checkFinished();
    }
    hasAccurateTokensForLine(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.hasAccurateTokensForLine(lineNumber);
    }
    isCheapToTokenize(lineNumber) {
        if (!this._tokenizer) {
            return true;
        }
        return this._tokenizer.isCheapToTokenize(lineNumber);
    }
    getLineTokens(lineNumber) {
        const lineText = this._textModel.getLineContent(lineNumber);
        const result = this._tokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
        if (this._debugBackgroundTokens && this._debugBackgroundStates && this._tokenizer) {
            if (this._debugBackgroundStates.getFirstInvalidEndStateLineNumberOrMax() > lineNumber && this._tokenizer.store.getFirstInvalidEndStateLineNumberOrMax() > lineNumber) {
                const backgroundResult = this._debugBackgroundTokens.getTokens(this._textModel.getLanguageId(), lineNumber - 1, lineText);
                if (!result.equals(backgroundResult) && this._debugBackgroundTokenizer.value?.reportMismatchingTokens) {
                    this._debugBackgroundTokenizer.value.reportMismatchingTokens(lineNumber);
                }
            }
        }
        return result;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        if (!this._tokenizer) {
            return 0 /* StandardTokenType.Other */;
        }
        const position = this._textModel.validatePosition(new Position(lineNumber, column));
        this.forceTokenization(position.lineNumber);
        return this._tokenizer.getTokenTypeIfInsertingCharacter(position, character);
    }
    tokenizeLinesAt(lineNumber, lines) {
        if (!this._tokenizer) {
            return null;
        }
        this.forceTokenization(lineNumber);
        return this._tokenizer.tokenizeLinesAt(lineNumber, lines);
    }
    get hasTokens() {
        return this._tokens.hasTokens;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5pemF0aW9uVGV4dE1vZGVsUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3Rva2VuaXphdGlvblRleHRNb2RlbFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2pELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUUxRCxPQUFPLEVBQW1CLGFBQWEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXZFLE9BQU8sRUFBc0csb0JBQW9CLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzTCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsNkJBQTZCLEVBQTBFLE1BQU0sK0NBQStDLENBQUM7QUFJdEssT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxtQ0FBbUMsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3ZJLE9BQU8sRUFBRSxjQUFjLEVBQUUsbUJBQW1CLEVBQWlCLE1BQU0sYUFB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