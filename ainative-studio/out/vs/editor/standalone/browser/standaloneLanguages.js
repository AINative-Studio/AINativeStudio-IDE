/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../base/common/color.js';
import { Range } from '../../common/core/range.js';
import * as languages from '../../common/languages.js';
import { ILanguageService } from '../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ModesRegistry } from '../../common/languages/modesRegistry.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import * as standaloneEnums from '../../common/standalone/standaloneEnums.js';
import { StandaloneServices } from './standaloneServices.js';
import { compile } from '../common/monarch/monarchCompile.js';
import { MonarchTokenizer } from '../common/monarch/monarchLexer.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
/**
 * Register information about a new language.
 */
export function register(language) {
    // Intentionally using the `ModesRegistry` here to avoid
    // instantiating services too quickly in the standalone editor.
    ModesRegistry.registerLanguage(language);
}
/**
 * Get the information of all the registered languages.
 */
export function getLanguages() {
    let result = [];
    result = result.concat(ModesRegistry.getLanguages());
    return result;
}
export function getEncodedLanguageId(languageId) {
    const languageService = StandaloneServices.get(ILanguageService);
    return languageService.languageIdCodec.encodeLanguageId(languageId);
}
/**
 * An event emitted when a language is associated for the first time with a text model.
 * @event
 */
export function onLanguage(languageId, callback) {
    return StandaloneServices.withServices(() => {
        const languageService = StandaloneServices.get(ILanguageService);
        const disposable = languageService.onDidRequestRichLanguageFeatures((encounteredLanguageId) => {
            if (encounteredLanguageId === languageId) {
                // stop listening
                disposable.dispose();
                // invoke actual listener
                callback();
            }
        });
        return disposable;
    });
}
/**
 * An event emitted when a language is associated for the first time with a text model or
 * when a language is encountered during the tokenization of another language.
 * @event
 */
export function onLanguageEncountered(languageId, callback) {
    return StandaloneServices.withServices(() => {
        const languageService = StandaloneServices.get(ILanguageService);
        const disposable = languageService.onDidRequestBasicLanguageFeatures((encounteredLanguageId) => {
            if (encounteredLanguageId === languageId) {
                // stop listening
                disposable.dispose();
                // invoke actual listener
                callback();
            }
        });
        return disposable;
    });
}
/**
 * Set the editing configuration for a language.
 */
export function setLanguageConfiguration(languageId, configuration) {
    const languageService = StandaloneServices.get(ILanguageService);
    if (!languageService.isRegisteredLanguageId(languageId)) {
        throw new Error(`Cannot set configuration for unknown language ${languageId}`);
    }
    const languageConfigurationService = StandaloneServices.get(ILanguageConfigurationService);
    return languageConfigurationService.register(languageId, configuration, 100);
}
/**
 * @internal
 */
export class EncodedTokenizationSupportAdapter {
    constructor(languageId, actual) {
        this._languageId = languageId;
        this._actual = actual;
    }
    dispose() {
        // NOOP
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    tokenize(line, hasEOL, state) {
        if (typeof this._actual.tokenize === 'function') {
            return TokenizationSupportAdapter.adaptTokenize(this._languageId, this._actual, line, state);
        }
        throw new Error('Not supported!');
    }
    tokenizeEncoded(line, hasEOL, state) {
        const result = this._actual.tokenizeEncoded(line, state);
        return new languages.EncodedTokenizationResult(result.tokens, result.endState);
    }
}
/**
 * @internal
 */
export class TokenizationSupportAdapter {
    constructor(_languageId, _actual, _languageService, _standaloneThemeService) {
        this._languageId = _languageId;
        this._actual = _actual;
        this._languageService = _languageService;
        this._standaloneThemeService = _standaloneThemeService;
    }
    dispose() {
        // NOOP
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    static _toClassicTokens(tokens, language) {
        const result = [];
        let previousStartIndex = 0;
        for (let i = 0, len = tokens.length; i < len; i++) {
            const t = tokens[i];
            let startIndex = t.startIndex;
            // Prevent issues stemming from a buggy external tokenizer.
            if (i === 0) {
                // Force first token to start at first index!
                startIndex = 0;
            }
            else if (startIndex < previousStartIndex) {
                // Force tokens to be after one another!
                startIndex = previousStartIndex;
            }
            result[i] = new languages.Token(startIndex, t.scopes, language);
            previousStartIndex = startIndex;
        }
        return result;
    }
    static adaptTokenize(language, actual, line, state) {
        const actualResult = actual.tokenize(line, state);
        const tokens = TokenizationSupportAdapter._toClassicTokens(actualResult.tokens, language);
        let endState;
        // try to save an object if possible
        if (actualResult.endState.equals(state)) {
            endState = state;
        }
        else {
            endState = actualResult.endState;
        }
        return new languages.TokenizationResult(tokens, endState);
    }
    tokenize(line, hasEOL, state) {
        return TokenizationSupportAdapter.adaptTokenize(this._languageId, this._actual, line, state);
    }
    _toBinaryTokens(languageIdCodec, tokens) {
        const languageId = languageIdCodec.encodeLanguageId(this._languageId);
        const tokenTheme = this._standaloneThemeService.getColorTheme().tokenTheme;
        const result = [];
        let resultLen = 0;
        let previousStartIndex = 0;
        for (let i = 0, len = tokens.length; i < len; i++) {
            const t = tokens[i];
            const metadata = tokenTheme.match(languageId, t.scopes) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
            if (resultLen > 0 && result[resultLen - 1] === metadata) {
                // same metadata
                continue;
            }
            let startIndex = t.startIndex;
            // Prevent issues stemming from a buggy external tokenizer.
            if (i === 0) {
                // Force first token to start at first index!
                startIndex = 0;
            }
            else if (startIndex < previousStartIndex) {
                // Force tokens to be after one another!
                startIndex = previousStartIndex;
            }
            result[resultLen++] = startIndex;
            result[resultLen++] = metadata;
            previousStartIndex = startIndex;
        }
        const actualResult = new Uint32Array(resultLen);
        for (let i = 0; i < resultLen; i++) {
            actualResult[i] = result[i];
        }
        return actualResult;
    }
    tokenizeEncoded(line, hasEOL, state) {
        const actualResult = this._actual.tokenize(line, state);
        const tokens = this._toBinaryTokens(this._languageService.languageIdCodec, actualResult.tokens);
        let endState;
        // try to save an object if possible
        if (actualResult.endState.equals(state)) {
            endState = state;
        }
        else {
            endState = actualResult.endState;
        }
        return new languages.EncodedTokenizationResult(tokens, endState);
    }
}
function isATokensProvider(provider) {
    return (typeof provider.getInitialState === 'function');
}
function isEncodedTokensProvider(provider) {
    return 'tokenizeEncoded' in provider;
}
function isThenable(obj) {
    return obj && typeof obj.then === 'function';
}
/**
 * Change the color map that is used for token colors.
 * Supported formats (hex): #RRGGBB, $RRGGBBAA, #RGB, #RGBA
 */
export function setColorMap(colorMap) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    if (colorMap) {
        const result = [null];
        for (let i = 1, len = colorMap.length; i < len; i++) {
            result[i] = Color.fromHex(colorMap[i]);
        }
        standaloneThemeService.setColorMapOverride(result);
    }
    else {
        standaloneThemeService.setColorMapOverride(null);
    }
}
/**
 * @internal
 */
function createTokenizationSupportAdapter(languageId, provider) {
    if (isEncodedTokensProvider(provider)) {
        return new EncodedTokenizationSupportAdapter(languageId, provider);
    }
    else {
        return new TokenizationSupportAdapter(languageId, provider, StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService));
    }
}
/**
 * Register a tokens provider factory for a language. This tokenizer will be exclusive with a tokenizer
 * set using `setTokensProvider` or one created using `setMonarchTokensProvider`, but will work together
 * with a tokens provider set using `registerDocumentSemanticTokensProvider` or `registerDocumentRangeSemanticTokensProvider`.
 */
export function registerTokensProviderFactory(languageId, factory) {
    const adaptedFactory = new languages.LazyTokenizationSupport(async () => {
        const result = await Promise.resolve(factory.create());
        if (!result) {
            return null;
        }
        if (isATokensProvider(result)) {
            return createTokenizationSupportAdapter(languageId, result);
        }
        return new MonarchTokenizer(StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService), languageId, compile(languageId, result), StandaloneServices.get(IConfigurationService));
    });
    return languages.TokenizationRegistry.registerFactory(languageId, adaptedFactory);
}
/**
 * Set the tokens provider for a language (manual implementation). This tokenizer will be exclusive
 * with a tokenizer created using `setMonarchTokensProvider`, or with `registerTokensProviderFactory`,
 * but will work together with a tokens provider set using `registerDocumentSemanticTokensProvider`
 * or `registerDocumentRangeSemanticTokensProvider`.
 */
export function setTokensProvider(languageId, provider) {
    const languageService = StandaloneServices.get(ILanguageService);
    if (!languageService.isRegisteredLanguageId(languageId)) {
        throw new Error(`Cannot set tokens provider for unknown language ${languageId}`);
    }
    if (isThenable(provider)) {
        return registerTokensProviderFactory(languageId, { create: () => provider });
    }
    return languages.TokenizationRegistry.register(languageId, createTokenizationSupportAdapter(languageId, provider));
}
/**
 * Set the tokens provider for a language (monarch implementation). This tokenizer will be exclusive
 * with a tokenizer set using `setTokensProvider`, or with `registerTokensProviderFactory`, but will
 * work together with a tokens provider set using `registerDocumentSemanticTokensProvider` or
 * `registerDocumentRangeSemanticTokensProvider`.
 */
export function setMonarchTokensProvider(languageId, languageDef) {
    const create = (languageDef) => {
        return new MonarchTokenizer(StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService), languageId, compile(languageId, languageDef), StandaloneServices.get(IConfigurationService));
    };
    if (isThenable(languageDef)) {
        return registerTokensProviderFactory(languageId, { create: () => languageDef });
    }
    return languages.TokenizationRegistry.register(languageId, create(languageDef));
}
/**
 * Register a reference provider (used by e.g. reference search).
 */
export function registerReferenceProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.referenceProvider.register(languageSelector, provider);
}
/**
 * Register a rename provider (used by e.g. rename symbol).
 */
export function registerRenameProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.renameProvider.register(languageSelector, provider);
}
/**
 * Register a new symbol-name provider (e.g., when a symbol is being renamed, show new possible symbol-names)
 */
export function registerNewSymbolNameProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.newSymbolNamesProvider.register(languageSelector, provider);
}
/**
 * Register a signature help provider (used by e.g. parameter hints).
 */
export function registerSignatureHelpProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.signatureHelpProvider.register(languageSelector, provider);
}
/**
 * Register a hover provider (used by e.g. editor hover).
 */
export function registerHoverProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.hoverProvider.register(languageSelector, {
        provideHover: async (model, position, token, context) => {
            const word = model.getWordAtPosition(position);
            return Promise.resolve(provider.provideHover(model, position, token, context)).then((value) => {
                if (!value) {
                    return undefined;
                }
                if (!value.range && word) {
                    value.range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                }
                if (!value.range) {
                    value.range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
                }
                return value;
            });
        }
    });
}
/**
 * Register a document symbol provider (used by e.g. outline).
 */
export function registerDocumentSymbolProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentSymbolProvider.register(languageSelector, provider);
}
/**
 * Register a document highlight provider (used by e.g. highlight occurrences).
 */
export function registerDocumentHighlightProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentHighlightProvider.register(languageSelector, provider);
}
/**
 * Register an linked editing range provider.
 */
export function registerLinkedEditingRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.linkedEditingRangeProvider.register(languageSelector, provider);
}
/**
 * Register a definition provider (used by e.g. go to definition).
 */
export function registerDefinitionProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.definitionProvider.register(languageSelector, provider);
}
/**
 * Register a implementation provider (used by e.g. go to implementation).
 */
export function registerImplementationProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.implementationProvider.register(languageSelector, provider);
}
/**
 * Register a type definition provider (used by e.g. go to type definition).
 */
export function registerTypeDefinitionProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.typeDefinitionProvider.register(languageSelector, provider);
}
/**
 * Register a code lens provider (used by e.g. inline code lenses).
 */
export function registerCodeLensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.codeLensProvider.register(languageSelector, provider);
}
/**
 * Register a code action provider (used by e.g. quick fix).
 */
export function registerCodeActionProvider(languageSelector, provider, metadata) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.codeActionProvider.register(languageSelector, {
        providedCodeActionKinds: metadata?.providedCodeActionKinds,
        documentation: metadata?.documentation,
        provideCodeActions: (model, range, context, token) => {
            const markerService = StandaloneServices.get(IMarkerService);
            const markers = markerService.read({ resource: model.uri }).filter(m => {
                return Range.areIntersectingOrTouching(m, range);
            });
            return provider.provideCodeActions(model, range, { markers, only: context.only, trigger: context.trigger }, token);
        },
        resolveCodeAction: provider.resolveCodeAction
    });
}
/**
 * Register a formatter that can handle only entire models.
 */
export function registerDocumentFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a formatter that can handle a range inside a model.
 */
export function registerDocumentRangeFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentRangeFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a formatter than can do formatting as the user types.
 */
export function registerOnTypeFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.onTypeFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a link provider that can find links in text.
 */
export function registerLinkProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.linkProvider.register(languageSelector, provider);
}
/**
 * Register a completion item provider (use by e.g. suggestions).
 */
export function registerCompletionItemProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.completionProvider.register(languageSelector, provider);
}
/**
 * Register a document color provider (used by Color Picker, Color Decorator).
 */
export function registerColorProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.colorProvider.register(languageSelector, provider);
}
/**
 * Register a folding range provider
 */
export function registerFoldingRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.foldingRangeProvider.register(languageSelector, provider);
}
/**
 * Register a declaration provider
 */
export function registerDeclarationProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.declarationProvider.register(languageSelector, provider);
}
/**
 * Register a selection range provider
 */
export function registerSelectionRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.selectionRangeProvider.register(languageSelector, provider);
}
/**
 * Register a document semantic tokens provider. A semantic tokens provider will complement and enhance a
 * simple top-down tokenizer. Simple top-down tokenizers can be set either via `setMonarchTokensProvider`
 * or `setTokensProvider`.
 *
 * For the best user experience, register both a semantic tokens provider and a top-down tokenizer.
 */
export function registerDocumentSemanticTokensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentSemanticTokensProvider.register(languageSelector, provider);
}
/**
 * Register a document range semantic tokens provider. A semantic tokens provider will complement and enhance a
 * simple top-down tokenizer. Simple top-down tokenizers can be set either via `setMonarchTokensProvider`
 * or `setTokensProvider`.
 *
 * For the best user experience, register both a semantic tokens provider and a top-down tokenizer.
 */
export function registerDocumentRangeSemanticTokensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentRangeSemanticTokensProvider.register(languageSelector, provider);
}
/**
 * Register an inline completions provider.
 */
export function registerInlineCompletionsProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlineCompletionsProvider.register(languageSelector, provider);
}
export function registerInlineEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlineEditProvider.register(languageSelector, provider);
}
/**
 * Register an inlay hints provider.
 */
export function registerInlayHintsProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlayHintsProvider.register(languageSelector, provider);
}
/**
 * @internal
 */
export function createMonacoLanguagesAPI() {
    return {
        register: register,
        getLanguages: getLanguages,
        onLanguage: onLanguage,
        onLanguageEncountered: onLanguageEncountered,
        getEncodedLanguageId: getEncodedLanguageId,
        // provider methods
        setLanguageConfiguration: setLanguageConfiguration,
        setColorMap: setColorMap,
        registerTokensProviderFactory: registerTokensProviderFactory,
        setTokensProvider: setTokensProvider,
        setMonarchTokensProvider: setMonarchTokensProvider,
        registerReferenceProvider: registerReferenceProvider,
        registerRenameProvider: registerRenameProvider,
        registerNewSymbolNameProvider: registerNewSymbolNameProvider,
        registerCompletionItemProvider: registerCompletionItemProvider,
        registerSignatureHelpProvider: registerSignatureHelpProvider,
        registerHoverProvider: registerHoverProvider,
        registerDocumentSymbolProvider: registerDocumentSymbolProvider,
        registerDocumentHighlightProvider: registerDocumentHighlightProvider,
        registerLinkedEditingRangeProvider: registerLinkedEditingRangeProvider,
        registerDefinitionProvider: registerDefinitionProvider,
        registerImplementationProvider: registerImplementationProvider,
        registerTypeDefinitionProvider: registerTypeDefinitionProvider,
        registerCodeLensProvider: registerCodeLensProvider,
        registerCodeActionProvider: registerCodeActionProvider,
        registerDocumentFormattingEditProvider: registerDocumentFormattingEditProvider,
        registerDocumentRangeFormattingEditProvider: registerDocumentRangeFormattingEditProvider,
        registerOnTypeFormattingEditProvider: registerOnTypeFormattingEditProvider,
        registerLinkProvider: registerLinkProvider,
        registerColorProvider: registerColorProvider,
        registerFoldingRangeProvider: registerFoldingRangeProvider,
        registerDeclarationProvider: registerDeclarationProvider,
        registerSelectionRangeProvider: registerSelectionRangeProvider,
        registerDocumentSemanticTokensProvider: registerDocumentSemanticTokensProvider,
        registerDocumentRangeSemanticTokensProvider: registerDocumentRangeSemanticTokensProvider,
        registerInlineCompletionsProvider: registerInlineCompletionsProvider,
        registerInlineEditProvider: registerInlineEditProvider,
        registerInlayHintsProvider: registerInlayHintsProvider,
        // enums
        DocumentHighlightKind: standaloneEnums.DocumentHighlightKind,
        CompletionItemKind: standaloneEnums.CompletionItemKind,
        CompletionItemTag: standaloneEnums.CompletionItemTag,
        CompletionItemInsertTextRule: standaloneEnums.CompletionItemInsertTextRule,
        SymbolKind: standaloneEnums.SymbolKind,
        SymbolTag: standaloneEnums.SymbolTag,
        IndentAction: standaloneEnums.IndentAction,
        CompletionTriggerKind: standaloneEnums.CompletionTriggerKind,
        SignatureHelpTriggerKind: standaloneEnums.SignatureHelpTriggerKind,
        InlayHintKind: standaloneEnums.InlayHintKind,
        InlineCompletionTriggerKind: standaloneEnums.InlineCompletionTriggerKind,
        InlineEditTriggerKind: standaloneEnums.InlineEditTriggerKind,
        CodeActionTriggerType: standaloneEnums.CodeActionTriggerType,
        NewSymbolNameTag: standaloneEnums.NewSymbolNameTag,
        NewSymbolNameTriggerKind: standaloneEnums.NewSymbolNameTriggerKind,
        PartialAcceptTriggerKind: standaloneEnums.PartialAcceptTriggerKind,
        HoverVerbosityAction: standaloneEnums.HoverVerbosityAction,
        // classes
        FoldingRangeKind: languages.FoldingRangeKind,
        SelectedSuggestionInfo: languages.SelectedSuggestionInfo,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVMYW5ndWFnZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUVuRCxPQUFPLEtBQUssU0FBUyxNQUFNLDJCQUEyQixDQUFDO0FBQ3ZELE9BQU8sRUFBMkIsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUUvRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckYsT0FBTyxLQUFLLGVBQWUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFckUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTFGOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFFBQVEsQ0FBQyxRQUFpQztJQUN6RCx3REFBd0Q7SUFDeEQsK0RB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