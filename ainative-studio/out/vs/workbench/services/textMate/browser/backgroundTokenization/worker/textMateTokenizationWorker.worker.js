/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
import { TMGrammarFactory } from '../../../common/TMGrammarFactory.js';
import { TextMateWorkerTokenizer } from './textMateWorkerTokenizer.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { TextMateWorkerHost } from './textMateWorkerHost.js';
export function create(workerServer) {
    return new TextMateTokenizationWorker(workerServer);
}
export class TextMateTokenizationWorker {
    constructor(workerServer) {
        this._models = new Map();
        this._grammarCache = [];
        this._grammarFactory = Promise.resolve(null);
        this._host = TextMateWorkerHost.getChannel(workerServer);
    }
    async $init(_createData) {
        const grammarDefinitions = _createData.grammarDefinitions.map((def) => {
            return {
                location: URI.revive(def.location),
                language: def.language,
                scopeName: def.scopeName,
                embeddedLanguages: def.embeddedLanguages,
                tokenTypes: def.tokenTypes,
                injectTo: def.injectTo,
                balancedBracketSelectors: def.balancedBracketSelectors,
                unbalancedBracketSelectors: def.unbalancedBracketSelectors,
                sourceExtensionId: def.sourceExtensionId,
            };
        });
        this._grammarFactory = this._loadTMGrammarFactory(grammarDefinitions, _createData.onigurumaWASMUri);
    }
    async _loadTMGrammarFactory(grammarDefinitions, onigurumaWASMUri) {
        const vscodeTextmate = await importAMDNodeModule('vscode-textmate', 'release/main.js');
        const vscodeOniguruma = await importAMDNodeModule('vscode-oniguruma', 'release/main.js');
        const response = await fetch(onigurumaWASMUri);
        // Using the response directly only works if the server sets the MIME type 'application/wasm'.
        // Otherwise, a TypeError is thrown when using the streaming compiler.
        // We therefore use the non-streaming compiler :(.
        const bytes = await response.arrayBuffer();
        await vscodeOniguruma.loadWASM(bytes);
        const onigLib = Promise.resolve({
            createOnigScanner: (sources) => vscodeOniguruma.createOnigScanner(sources),
            createOnigString: (str) => vscodeOniguruma.createOnigString(str)
        });
        return new TMGrammarFactory({
            logTrace: (msg) => { },
            logError: (msg, err) => console.error(msg, err),
            readFile: (resource) => this._host.$readFile(resource)
        }, grammarDefinitions, vscodeTextmate, onigLib);
    }
    // These methods are called by the renderer
    $acceptNewModel(data) {
        const uri = URI.revive(data.uri);
        const that = this;
        this._models.set(data.controllerId, new TextMateWorkerTokenizer(uri, data.lines, data.EOL, data.versionId, {
            async getOrCreateGrammar(languageId, encodedLanguageId) {
                const grammarFactory = await that._grammarFactory;
                if (!grammarFactory) {
                    return Promise.resolve(null);
                }
                if (!that._grammarCache[encodedLanguageId]) {
                    that._grammarCache[encodedLanguageId] = grammarFactory.createGrammar(languageId, encodedLanguageId);
                }
                return that._grammarCache[encodedLanguageId];
            },
            setTokensAndStates(versionId, tokens, stateDeltas) {
                that._host.$setTokensAndStates(data.controllerId, versionId, tokens, stateDeltas);
            },
            reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) {
                that._host.$reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample);
            },
        }, data.languageId, data.encodedLanguageId, data.maxTokenizationLineLength));
    }
    $acceptModelChanged(controllerId, e) {
        this._models.get(controllerId).onEvents(e);
    }
    $retokenize(controllerId, startLineNumber, endLineNumberExclusive) {
        this._models.get(controllerId).retokenize(startLineNumber, endLineNumberExclusive);
    }
    $acceptModelLanguageChanged(controllerId, newLanguageId, newEncodedLanguageId) {
        this._models.get(controllerId).onLanguageId(newLanguageId, newEncodedLanguageId);
    }
    $acceptRemovedModel(controllerId) {
        const model = this._models.get(controllerId);
        if (model) {
            model.dispose();
            this._models.delete(controllerId);
        }
    }
    async $acceptTheme(theme, colorMap) {
        const grammarFactory = await this._grammarFactory;
        grammarFactory?.setTheme(theme, colorMap);
    }
    $acceptMaxTokenizationLineLength(controllerId, value) {
        this._models.get(controllerId).acceptMaxTokenizationLineLength(value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25Xb3JrZXIud29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYmFja2dyb3VuZFRva2VuaXphdGlvbi93b3JrZXIvdGV4dE1hdGVUb2tlbml6YXRpb25Xb3JrZXIud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sc0NBQXNDLENBQUM7QUFHMUUsT0FBTyxFQUF3QixnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTdELE1BQU0sVUFBVSxNQUFNLENBQUMsWUFBOEI7SUFDcEQsT0FBTyxJQUFJLDBCQUEwQixDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUF5QkQsTUFBTSxPQUFPLDBCQUEwQjtJQVF0QyxZQUFZLFlBQThCO1FBSnpCLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBc0QsQ0FBQztRQUN4RSxrQkFBYSxHQUFvQyxFQUFFLENBQUM7UUFDN0Qsb0JBQWUsR0FBcUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUdqRixJQUFJLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRU0sS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUF3QjtRQUMxQyxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FB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