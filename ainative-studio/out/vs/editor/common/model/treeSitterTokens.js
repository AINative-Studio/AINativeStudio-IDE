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
import { TreeSitterTokenizationRegistry } from '../languages.js';
import { LineTokens } from '../tokens/lineTokens.js';
import { AbstractTokens } from './tokens.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { ITreeSitterTokenizationStoreService } from './treeSitterTokenStoreService.js';
import { Range } from '../core/range.js';
import { Emitter } from '../../../base/common/event.js';
let TreeSitterTokens = class TreeSitterTokens extends AbstractTokens {
    constructor(languageIdCodec, textModel, languageId, _tokenStore) {
        super(languageIdCodec, textModel, languageId);
        this._tokenStore = _tokenStore;
        this._tokenizationSupport = null;
        this._backgroundTokenizationState = 1 /* BackgroundTokenizationState.InProgress */;
        this._onDidChangeBackgroundTokenizationState = this._register(new Emitter());
        this.onDidChangeBackgroundTokenizationState = this._onDidChangeBackgroundTokenizationState.event;
        this._tokensChangedListener = this._register(new MutableDisposable());
        this._onDidChangeBackgroundTokenization = this._register(new MutableDisposable());
        this._initialize();
    }
    _initialize() {
        const newLanguage = this.getLanguageId();
        if (!this._tokenizationSupport || this._lastLanguageId !== newLanguage) {
            this._lastLanguageId = newLanguage;
            this._tokenizationSupport = TreeSitterTokenizationRegistry.get(newLanguage);
            this._tokensChangedListener.value = this._tokenizationSupport?.onDidChangeTokens((e) => {
                if (e.textModel === this._textModel) {
                    this._onDidChangeTokens.fire(e.changes);
                }
            });
            this._onDidChangeBackgroundTokenization.value = this._tokenizationSupport?.onDidChangeBackgroundTokenization(e => {
                if (e.textModel === this._textModel) {
                    this._backgroundTokenizationState = 2 /* BackgroundTokenizationState.Completed */;
                    this._onDidChangeBackgroundTokenizationState.fire();
                }
            });
        }
    }
    getLineTokens(lineNumber) {
        const content = this._textModel.getLineContent(lineNumber);
        if (this._tokenizationSupport && content.length > 0) {
            const rawTokens = this._tokenStore.getTokens(this._textModel, lineNumber);
            if (rawTokens && rawTokens.length > 0) {
                return new LineTokens(rawTokens, content, this._languageIdCodec);
            }
        }
        return LineTokens.createEmpty(content, this._languageIdCodec);
    }
    resetTokenization(fireTokenChangeEvent = true) {
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
        this._initialize();
    }
    handleDidChangeAttached() {
        // TODO @alexr00 implement for background tokenization
    }
    handleDidChangeContent(e) {
        if (e.isFlush) {
            // Don't fire the event, as the view might not have got the text change event yet
            this.resetTokenization(false);
        }
        else {
            this._tokenStore.handleContentChanged(this._textModel, e);
        }
    }
    forceTokenization(lineNumber) {
        if (this._tokenizationSupport && !this.hasAccurateTokensForLine(lineNumber)) {
            this._tokenizationSupport.tokenizeEncoded(lineNumber, this._textModel);
        }
    }
    hasAccurateTokensForLine(lineNumber) {
        return this._tokenStore.hasTokens(this._textModel, new Range(lineNumber, 1, lineNumber, this._textModel.getLineMaxColumn(lineNumber)));
    }
    isCheapToTokenize(lineNumber) {
        // TODO @alexr00 determine what makes it cheap to tokenize?
        return true;
    }
    getTokenTypeIfInsertingCharacter(lineNumber, column, character) {
        // TODO @alexr00 implement once we have custom parsing and don't just feed in the whole text model value
        return 0 /* StandardTokenType.Other */;
    }
    tokenizeLinesAt(lineNumber, lines) {
        if (this._tokenizationSupport) {
            const rawLineTokens = this._tokenizationSupport.guessTokensForLinesContent(lineNumber, this._textModel, lines);
            const lineTokens = [];
            if (rawLineTokens) {
                for (let i = 0; i < rawLineTokens.length; i++) {
                    lineTokens.push(new LineTokens(rawLineTokens[i], lines[i], this._languageIdCodec));
                }
                return lineTokens;
            }
        }
        return null;
    }
    get hasTokens() {
        return this._tokenStore.hasTokens(this._textModel);
    }
};
TreeSitterTokens = __decorate([
    __param(3, ITreeSitterTokenizationStoreService)
], TreeSitterTokens);
export { TreeSitterTokens };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3RyZWVTaXR0ZXJUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFvRCw4QkFBOEIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ25ILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUlyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzdDLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUV6QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFFeEQsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxjQUFjO0lBV25ELFlBQVksZUFBaUMsRUFDNUMsU0FBb0IsRUFDcEIsVUFBd0IsRUFDYSxXQUFpRTtRQUN0RyxLQUFLLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQURRLGdCQUFXLEdBQVgsV0FBVyxDQUFxQztRQWIvRix5QkFBb0IsR0FBMEMsSUFBSSxDQUFDO1FBRWpFLGlDQUE0QixrREFBdUU7UUFDMUYsNENBQXVDLEdBQWtCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2hHLDJDQUFzQyxHQUFnQixJQUFJLENBQUMsdUNBQXVDLENBQUMsS0FBSyxDQUFDO1FBR3hHLDJCQUFzQixHQUFtQyxJQUFJLENBQUMs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