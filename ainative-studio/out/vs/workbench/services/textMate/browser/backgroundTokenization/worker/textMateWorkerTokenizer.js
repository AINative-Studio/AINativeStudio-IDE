/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { observableValue } from '../../../../../../base/common/observable.js';
import { setTimeout0 } from '../../../../../../base/common/platform.js';
import { LineRange } from '../../../../../../editor/common/core/lineRange.js';
import { MirrorTextModel } from '../../../../../../editor/common/model/mirrorTextModel.js';
import { TokenizerWithStateStore } from '../../../../../../editor/common/model/textModelTokens.js';
import { ContiguousMultilineTokensBuilder } from '../../../../../../editor/common/tokens/contiguousMultilineTokensBuilder.js';
import { LineTokens } from '../../../../../../editor/common/tokens/lineTokens.js';
import { TextMateTokenizationSupport } from '../../tokenizationSupport/textMateTokenizationSupport.js';
import { TokenizationSupportWithLineLimit } from '../../tokenizationSupport/tokenizationSupportWithLineLimit.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
export class TextMateWorkerTokenizer extends MirrorTextModel {
    constructor(uri, lines, eol, versionId, _host, _languageId, _encodedLanguageId, maxTokenizationLineLength) {
        super(uri, lines, eol, versionId);
        this._host = _host;
        this._languageId = _languageId;
        this._encodedLanguageId = _encodedLanguageId;
        this._tokenizerWithStateStore = null;
        this._isDisposed = false;
        this._maxTokenizationLineLength = observableValue(this, -1);
        this._tokenizeDebouncer = new RunOnceScheduler(() => this._tokenize(), 10);
        this._maxTokenizationLineLength.set(maxTokenizationLineLength, undefined);
        this._resetTokenization();
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    onLanguageId(languageId, encodedLanguageId) {
        this._languageId = languageId;
        this._encodedLanguageId = encodedLanguageId;
        this._resetTokenization();
    }
    onEvents(e) {
        super.onEvents(e);
        this._tokenizerWithStateStore?.store.acceptChanges(e.changes);
        this._tokenizeDebouncer.schedule();
    }
    acceptMaxTokenizationLineLength(maxTokenizationLineLength) {
        this._maxTokenizationLineLength.set(maxTokenizationLineLength, undefined);
    }
    retokenize(startLineNumber, endLineNumberExclusive) {
        if (this._tokenizerWithStateStore) {
            this._tokenizerWithStateStore.store.invalidateEndStateRange(new LineRange(startLineNumber, endLineNumberExclusive));
            this._tokenizeDebouncer.schedule();
        }
    }
    async _resetTokenization() {
        this._tokenizerWithStateStore = null;
        const languageId = this._languageId;
        const encodedLanguageId = this._encodedLanguageId;
        const r = await this._host.getOrCreateGrammar(languageId, encodedLanguageId);
        if (this._isDisposed || languageId !== this._languageId || encodedLanguageId !== this._encodedLanguageId || !r) {
            return;
        }
        if (r.grammar) {
            const tokenizationSupport = new TokenizationSupportWithLineLimit(this._encodedLanguageId, new TextMateTokenizationSupport(r.grammar, r.initialState, false, undefined, () => false, (timeMs, lineLength, isRandomSample) => {
                this._host.reportTokenizationTime(timeMs, languageId, r.sourceExtensionId, lineLength, isRandomSample);
            }, false), Disposable.None, this._maxTokenizationLineLength);
            this._tokenizerWithStateStore = new TokenizerWithStateStore(this._lines.length, tokenizationSupport);
        }
        else {
            this._tokenizerWithStateStore = null;
        }
        this._tokenize();
    }
    async _tokenize() {
        if (this._isDisposed || !this._tokenizerWithStateStore) {
            return;
        }
        if (!this._diffStateStacksRefEqFn) {
            const { diffStateStacksRefEq } = await importAMDNodeModule('vscode-textmate', 'release/main.js');
            this._diffStateStacksRefEqFn = diffStateStacksRefEq;
        }
        const startTime = new Date().getTime();
        while (true) {
            let tokenizedLines = 0;
            const tokenBuilder = new ContiguousMultilineTokensBuilder();
            const stateDeltaBuilder = new StateDeltaBuilder();
            while (true) {
                const lineToTokenize = this._tokenizerWithStateStore.getFirstInvalidLine();
                if (lineToTokenize === null || tokenizedLines > 200) {
                    break;
                }
                tokenizedLines++;
                const text = this._lines[lineToTokenize.lineNumber - 1];
                const r = this._tokenizerWithStateStore.tokenizationSupport.tokenizeEncoded(text, true, lineToTokenize.startState);
                if (this._tokenizerWithStateStore.store.setEndState(lineToTokenize.lineNumber, r.endState)) {
                    const delta = this._diffStateStacksRefEqFn(lineToTokenize.startState, r.endState);
                    stateDeltaBuilder.setState(lineToTokenize.lineNumber, delta);
                }
                else {
                    stateDeltaBuilder.setState(lineToTokenize.lineNumber, null);
                }
                LineTokens.convertToEndOffset(r.tokens, text.length);
                tokenBuilder.add(lineToTokenize.lineNumber, r.tokens);
                const deltaMs = new Date().getTime() - startTime;
                if (deltaMs > 20) {
                    // yield to check for changes
                    break;
                }
            }
            if (tokenizedLines === 0) {
                break;
            }
            const stateDeltas = stateDeltaBuilder.getStateDeltas();
            this._host.setTokensAndStates(this._versionId, tokenBuilder.serialize(), stateDeltas);
            const deltaMs = new Date().getTime() - startTime;
            if (deltaMs > 20) {
                // yield to check for changes
                setTimeout0(() => this._tokenize());
                return;
            }
        }
    }
}
class StateDeltaBuilder {
    constructor() {
        this._lastStartLineNumber = -1;
        this._stateDeltas = [];
    }
    setState(lineNumber, stackDiff) {
        if (lineNumber === this._lastStartLineNumber + 1) {
            this._stateDeltas[this._stateDeltas.length - 1].stateDeltas.push(stackDiff);
        }
        else {
            this._stateDeltas.push({ startLineNumber: lineNumber, stateDeltas: [stackDiff] });
        }
        this._lastStartLineNumber = lineNumber;
    }
    getStateDeltas() {
        return this._stateDeltas;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJUb2tlbml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYmFja2dyb3VuZFRva2VuaXphdGlvbi93b3JrZXIvdGV4dE1hdGVXb3JrZXJUb2tlbml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFOUUsT0FBTyxFQUFzQixlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUM5SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDdkcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFJakgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBUXhFLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxlQUFlO0lBTzNELFlBQ0MsR0FBUSxFQUNSLEtBQWUsRUFDZixHQUFXLEVBQ1gsU0FBaUIsRUFDQSxLQUFpQyxFQUMx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