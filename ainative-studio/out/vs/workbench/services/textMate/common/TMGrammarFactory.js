/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { TMScopeRegistry } from './TMScopeRegistry.js';
export const missingTMGrammarErrorMessage = 'No TM Grammar registered for this language.';
export class TMGrammarFactory extends Disposable {
    constructor(host, grammarDefinitions, vscodeTextmate, onigLib) {
        super();
        this._host = host;
        this._initialState = vscodeTextmate.INITIAL;
        this._scopeRegistry = new TMScopeRegistry();
        this._injections = {};
        this._injectedEmbeddedLanguages = {};
        this._languageToScope = new Map();
        this._grammarRegistry = this._register(new vscodeTextmate.Registry({
            onigLib: onigLib,
            loadGrammar: async (scopeName) => {
                const grammarDefinition = this._scopeRegistry.getGrammarDefinition(scopeName);
                if (!grammarDefinition) {
                    this._host.logTrace(`No grammar found for scope ${scopeName}`);
                    return null;
                }
                const location = grammarDefinition.location;
                try {
                    const content = await this._host.readFile(location);
                    return vscodeTextmate.parseRawGrammar(content, location.path);
                }
                catch (e) {
                    this._host.logError(`Unable to load and parse grammar for scope ${scopeName} from ${location}`, e);
                    return null;
                }
            },
            getInjections: (scopeName) => {
                const scopeParts = scopeName.split('.');
                let injections = [];
                for (let i = 1; i <= scopeParts.length; i++) {
                    const subScopeName = scopeParts.slice(0, i).join('.');
                    injections = [...injections, ...(this._injections[subScopeName] || [])];
                }
                return injections;
            }
        }));
        for (const validGrammar of grammarDefinitions) {
            this._scopeRegistry.register(validGrammar);
            if (validGrammar.injectTo) {
                for (const injectScope of validGrammar.injectTo) {
                    let injections = this._injections[injectScope];
                    if (!injections) {
                        this._injections[injectScope] = injections = [];
                    }
                    injections.push(validGrammar.scopeName);
                }
                if (validGrammar.embeddedLanguages) {
                    for (const injectScope of validGrammar.injectTo) {
                        let injectedEmbeddedLanguages = this._injectedEmbeddedLanguages[injectScope];
                        if (!injectedEmbeddedLanguages) {
                            this._injectedEmbeddedLanguages[injectScope] = injectedEmbeddedLanguages = [];
                        }
                        injectedEmbeddedLanguages.push(validGrammar.embeddedLanguages);
                    }
                }
            }
            if (validGrammar.language) {
                this._languageToScope.set(validGrammar.language, validGrammar.scopeName);
            }
        }
    }
    has(languageId) {
        return this._languageToScope.has(languageId);
    }
    setTheme(theme, colorMap) {
        this._grammarRegistry.setTheme(theme, colorMap);
    }
    getColorMap() {
        return this._grammarRegistry.getColorMap();
    }
    async createGrammar(languageId, encodedLanguageId) {
        const scopeName = this._languageToScope.get(languageId);
        if (typeof scopeName !== 'string') {
            // No TM grammar defined
            throw new Error(missingTMGrammarErrorMessage);
        }
        const grammarDefinition = this._scopeRegistry.getGrammarDefinition(scopeName);
        if (!grammarDefinition) {
            // No TM grammar defined
            throw new Error(missingTMGrammarErrorMessage);
        }
        const embeddedLanguages = grammarDefinition.embeddedLanguages;
        if (this._injectedEmbeddedLanguages[scopeName]) {
            const injectedEmbeddedLanguages = this._injectedEmbeddedLanguages[scopeName];
            for (const injected of injectedEmbeddedLanguages) {
                for (const scope of Object.keys(injected)) {
                    embeddedLanguages[scope] = injected[scope];
                }
            }
        }
        const containsEmbeddedLanguages = (Object.keys(embeddedLanguages).length > 0);
        let grammar;
        try {
            grammar = await this._grammarRegistry.loadGrammarWithConfiguration(scopeName, encodedLanguageId, {
                embeddedLanguages,
                tokenTypes: grammarDefinition.tokenTypes,
                balancedBracketSelectors: grammarDefinition.balancedBracketSelectors,
                unbalancedBracketSelectors: grammarDefinition.unbalancedBracketSelectors,
            });
        }
        catch (err) {
            if (err.message && err.message.startsWith('No grammar provided for')) {
                // No TM grammar defined
                throw new Error(missingTMGrammarErrorMessage);
            }
            throw err;
        }
        return {
            languageId: languageId,
            grammar: grammar,
            initialState: this._initialState,
            containsEmbeddedLanguages: containsEmbeddedLanguages,
            sourceExtensionId: grammarDefinition.sourceExtensionId,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1HcmFtbWFyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvY29tbW9uL1RNR3JhbW1hckZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBdUQsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFpQjVHLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLDZDQUE2QyxDQUFDO0FBRTFGLE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO0lBVS9DLFlBQVksSUFBMkIsRUFBRSxrQkFBNkMsRUFBRSxjQUFnRCxFQUFFLE9BQTBCO1FBQ25LLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDbEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO1FBQzVDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsMEJBQTBCLEdBQUcsRUFBRSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUNsRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLENBQUM7WUFDbEUsT0FBTyxFQUFFLE9BQU87WUFDaEIsV0FBVyxFQUFFLEtBQUssRUFBRSxTQUFpQixFQUFFLEVBQUU7Z0JBQ3hDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxv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