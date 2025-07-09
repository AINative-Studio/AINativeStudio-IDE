/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { StopWatch } from '../../../../../base/common/stopwatch.js';
import { TokenMetadata } from '../../../../../editor/common/encodedTokenAttributes.js';
import { EncodedTokenizationResult } from '../../../../../editor/common/languages.js';
export class TextMateTokenizationSupport extends Disposable {
    constructor(_grammar, _initialState, _containsEmbeddedLanguages, _createBackgroundTokenizer, _backgroundTokenizerShouldOnlyVerifyTokens, _reportTokenizationTime, _reportSlowTokenization) {
        super();
        this._grammar = _grammar;
        this._initialState = _initialState;
        this._containsEmbeddedLanguages = _containsEmbeddedLanguages;
        this._createBackgroundTokenizer = _createBackgroundTokenizer;
        this._backgroundTokenizerShouldOnlyVerifyTokens = _backgroundTokenizerShouldOnlyVerifyTokens;
        this._reportTokenizationTime = _reportTokenizationTime;
        this._reportSlowTokenization = _reportSlowTokenization;
        this._seenLanguages = [];
        this._onDidEncounterLanguage = this._register(new Emitter());
        this.onDidEncounterLanguage = this._onDidEncounterLanguage.event;
    }
    get backgroundTokenizerShouldOnlyVerifyTokens() {
        return this._backgroundTokenizerShouldOnlyVerifyTokens();
    }
    getInitialState() {
        return this._initialState;
    }
    tokenize(line, hasEOL, state) {
        throw new Error('Not supported!');
    }
    createBackgroundTokenizer(textModel, store) {
        if (this._createBackgroundTokenizer) {
            return this._createBackgroundTokenizer(textModel, store);
        }
        return undefined;
    }
    tokenizeEncoded(line, hasEOL, state) {
        const isRandomSample = Math.random() * 10_000 < 1;
        const shouldMeasure = this._reportSlowTokenization || isRandomSample;
        const sw = shouldMeasure ? new StopWatch(true) : undefined;
        const textMateResult = this._grammar.tokenizeLine2(line, state, 500);
        if (shouldMeasure) {
            const timeMS = sw.elapsed();
            if (isRandomSample || timeMS > 32) {
                this._reportTokenizationTime(timeMS, line.length, isRandomSample);
            }
        }
        if (textMateResult.stoppedEarly) {
            console.warn(`Time limit reached when tokenizing line: ${line.substring(0, 100)}`);
            // return the state at the beginning of the line
            return new EncodedTokenizationResult(textMateResult.tokens, state);
        }
        if (this._containsEmbeddedLanguages) {
            const seenLanguages = this._seenLanguages;
            const tokens = textMateResult.tokens;
            // Must check if any of the embedded languages was hit
            for (let i = 0, len = (tokens.length >>> 1); i < len; i++) {
                const metadata = tokens[(i << 1) + 1];
                const languageId = TokenMetadata.getLanguageId(metadata);
                if (!seenLanguages[languageId]) {
                    seenLanguages[languageId] = true;
                    this._onDidEncounterLanguage.fire(languageId);
                }
            }
        }
        let endState;
        // try to save an object if possible
        if (state.equals(textMateResult.ruleStack)) {
            endState = state;
        }
        else {
            endState = textMateResult.ruleStack;
        }
        return new EncodedTokenizationResult(textMateResult.tokens, endState);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25TdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL3Rva2VuaXphdGlvblN1cHBvcnQvdGV4dE1hdGVUb2tlbml6YXRpb25TdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUseUJBQXlCLEVBQXdHLE1BQU0sMkNBQTJDLENBQUM7QUFJNUwsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFVBQVU7SUFLMUQsWUFDa0IsUUFBa0IsRUFDbEIsYUFBeUIsRUFDekIsMEJBQW1DLEVBQ25DLDBCQUErSSxFQUMvSSwwQ0FBeUQsRUFDekQsdUJBQThGLEVBQzlGLHVCQUFnQztRQUVqRCxLQUFLLEVBQUUsQ0FBQztRQVJTLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsa0JBQWEsR0FBYixhQUFhLENBQVk7UUFDekIsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUFTO1FBQ25DLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBcUg7UUFDL0ksK0NBQTBDLEdBQTFDLDBDQUEwQyxDQUFlO1FBQ3pELDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBdUU7UUFDOUYsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUFTO1FBWGpDLG1CQUFjLEdBQWMsRUFBRSxDQUFDO1FBQy9CLDRCQUF1QixHQUF3QixJQUFJ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