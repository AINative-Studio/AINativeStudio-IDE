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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25Xb3JrZXIud29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL2JhY2tncm91bmRUb2tlbml6YXRpb24vd29ya2VyL3RleHRNYXRlVG9rZW5pemF0aW9uV29ya2VyLndvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLHNDQUFzQyxDQUFDO0FBRzFFLE9BQU8sRUFBd0IsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUc3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU3RCxNQUFNLFVBQVUsTUFBTSxDQUFDLFlBQThCO0lBQ3BELE9BQU8sSUFBSSwwQkFBMEIsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBeUJELE1BQU0sT0FBTywwQkFBMEI7SUFRdEMsWUFBWSxZQUE4QjtRQUp6QixZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXNELENBQUM7UUFDeEUsa0JBQWEsR0FBb0MsRUFBRSxDQUFDO1FBQzdELG9CQUFlLEdBQXFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFHakYsSUFBSSxDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBd0I7UUFDMUMsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENB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