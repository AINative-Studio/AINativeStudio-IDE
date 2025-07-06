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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVXb3JrZXJUb2tlbml6ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci9iYWNrZ3JvdW5kVG9rZW5pemF0aW9uL3dvcmtlci90ZXh0TWF0ZVdvcmtlclRva2VuaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUU5RSxPQUFPLEVBQXNCLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQzlILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUlqSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFReEUsTUFBTSxPQUFPLHVCQUF3QixTQUFRLGVBQWU7SUFPM0QsWUFDQyxHQUFRLEVBQ1IsS0FBZSxFQUNmLEdBQVcsRUFDWCxTQUFpQixFQUNBLEtBQWlDLEVBQzFD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