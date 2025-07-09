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
var TextMateTokenizationFeature_1;
import { canASAR, importAMDNodeModule, resolveAmdNodeModulePath } from '../../../../amdX.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { equals as equalArray } from '../../../../base/common/arrays.js';
import { Color } from '../../../../base/common/color.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { FileAccess, nodeModulesAsarUnpackedPath, nodeModulesPath } from '../../../../base/common/network.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import { isWeb } from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import * as types from '../../../../base/common/types.js';
import { LazyTokenizationSupport, TokenizationRegistry } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { TextMateTokenizationSupport } from './tokenizationSupport/textMateTokenizationSupport.js';
import { TokenizationSupportWithLineLimit } from './tokenizationSupport/tokenizationSupportWithLineLimit.js';
import { ThreadedBackgroundTokenizerFactory } from './backgroundTokenization/threadedBackgroundTokenizerFactory.js';
import { TMGrammarFactory, missingTMGrammarErrorMessage } from '../common/TMGrammarFactory.js';
import { grammarsExtPoint } from '../common/TMGrammars.js';
import { IWorkbenchThemeService } from '../../themes/common/workbenchThemeService.js';
let TextMateTokenizationFeature = class TextMateTokenizationFeature extends Disposable {
    static { TextMateTokenizationFeature_1 = this; }
    static { this.reportTokenizationTimeCounter = { sync: 0, async: 0 }; }
    constructor(_languageService, _themeService, _extensionResourceLoaderService, _notificationService, _logService, _configurationService, _progressService, _environmentService, _instantiationService, _telemetryService) {
        super();
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._notificationService = _notificationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._progressService = _progressService;
        this._environmentService = _environmentService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._createdModes = [];
        this._encounteredLanguages = [];
        this._debugMode = false;
        this._debugModePrintFunc = () => { };
        this._grammarDefinitions = null;
        this._grammarFactory = null;
        this._tokenizersRegistrations = this._register(new DisposableStore());
        this._currentTheme = null;
        this._currentTokenColorMap = null;
        this._threadedBackgroundTokenizerFactory = this._instantiationService.createInstance(ThreadedBackgroundTokenizerFactory, (timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) => this._reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, true, isRandomSample), () => this.getAsyncTokenizationEnabled());
        this._vscodeOniguruma = null;
        this._styleElement = domStylesheets.createStyleSheet();
        this._styleElement.className = 'vscode-tokens-styles';
        grammarsExtPoint.setHandler((extensions) => this._handleGrammarsExtPoint(extensions));
        this._updateTheme(this._themeService.getColorTheme(), true);
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._updateTheme(this._themeService.getColorTheme(), false);
        }));
        this._register(this._languageService.onDidRequestRichLanguageFeatures((languageId) => {
            this._createdModes.push(languageId);
        }));
    }
    getAsyncTokenizationEnabled() {
        return !!this._configurationService.getValue('editor.experimental.asyncTokenization');
    }
    getAsyncTokenizationVerification() {
        return !!this._configurationService.getValue('editor.experimental.asyncTokenizationVerification');
    }
    _handleGrammarsExtPoint(extensions) {
        this._grammarDefinitions = null;
        if (this._grammarFactory) {
            this._grammarFactory.dispose();
            this._grammarFactory = null;
        }
        this._tokenizersRegistrations.clear();
        this._grammarDefinitions = [];
        for (const extension of extensions) {
            const grammars = extension.value;
            for (const grammar of grammars) {
                const validatedGrammar = this._validateGrammarDefinition(extension, grammar);
                if (validatedGrammar) {
                    this._grammarDefinitions.push(validatedGrammar);
                    if (validatedGrammar.language) {
                        const lazyTokenizationSupport = new LazyTokenizationSupport(() => this._createTokenizationSupport(validatedGrammar.language));
                        this._tokenizersRegistrations.add(lazyTokenizationSupport);
                        this._tokenizersRegistrations.add(TokenizationRegistry.registerFactory(validatedGrammar.language, lazyTokenizationSupport));
                    }
                }
            }
        }
        this._threadedBackgroundTokenizerFactory.setGrammarDefinitions(this._grammarDefinitions);
        for (const createdMode of this._createdModes) {
            TokenizationRegistry.getOrCreate(createdMode);
        }
    }
    _validateGrammarDefinition(extension, grammar) {
        if (!validateGrammarExtensionPoint(extension.description.extensionLocation, grammar, extension.collector, this._languageService)) {
            return null;
        }
        const grammarLocation = resources.joinPath(extension.description.extensionLocation, grammar.path);
        const embeddedLanguages = Object.create(null);
        if (grammar.embeddedLanguages) {
            const scopes = Object.keys(grammar.embeddedLanguages);
            for (let i = 0, len = scopes.length; i < len; i++) {
                const scope = scopes[i];
                const language = grammar.embeddedLanguages[scope];
                if (typeof language !== 'string') {
                    // never hurts to be too careful
                    continue;
                }
                if (this._languageService.isRegisteredLanguageId(language)) {
                    embeddedLanguages[scope] = this._languageService.languageIdCodec.encodeLanguageId(language);
                }
            }
        }
        const tokenTypes = Object.create(null);
        if (grammar.tokenTypes) {
            const scopes = Object.keys(grammar.tokenTypes);
            for (const scope of scopes) {
                const tokenType = grammar.tokenTypes[scope];
                switch (tokenType) {
                    case 'string':
                        tokenTypes[scope] = 2 /* StandardTokenType.String */;
                        break;
                    case 'other':
                        tokenTypes[scope] = 0 /* StandardTokenType.Other */;
                        break;
                    case 'comment':
                        tokenTypes[scope] = 1 /* StandardTokenType.Comment */;
                        break;
                }
            }
        }
        const validLanguageId = grammar.language && this._languageService.isRegisteredLanguageId(grammar.language) ? grammar.language : undefined;
        function asStringArray(array, defaultValue) {
            if (!Array.isArray(array)) {
                return defaultValue;
            }
            if (!array.every(e => typeof e === 'string')) {
                return defaultValue;
            }
            return array;
        }
        return {
            location: grammarLocation,
            language: validLanguageId,
            scopeName: grammar.scopeName,
            embeddedLanguages: embeddedLanguages,
            tokenTypes: tokenTypes,
            injectTo: grammar.injectTo,
            balancedBracketSelectors: asStringArray(grammar.balancedBracketScopes, ['*']),
            unbalancedBracketSelectors: asStringArray(grammar.unbalancedBracketScopes, []),
            sourceExtensionId: extension.description.id,
        };
    }
    startDebugMode(printFn, onStop) {
        if (this._debugMode) {
            this._notificationService.error(nls.localize('alreadyDebugging', "Already Logging."));
            return;
        }
        this._debugModePrintFunc = printFn;
        this._debugMode = true;
        if (this._debugMode) {
            this._progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                buttons: [nls.localize('stop', "Stop")]
            }, (progress) => {
                progress.report({
                    message: nls.localize('progress1', "Preparing to log TM Grammar parsing. Press Stop when finished.")
                });
                return this._getVSCodeOniguruma().then((vscodeOniguruma) => {
                    vscodeOniguruma.setDefaultDebugCall(true);
                    progress.report({
                        message: nls.localize('progress2', "Now logging TM Grammar parsing. Press Stop when finished.")
                    });
                    return new Promise((resolve, reject) => { });
                });
            }, (choice) => {
                this._getVSCodeOniguruma().then((vscodeOniguruma) => {
                    this._debugModePrintFunc = () => { };
                    this._debugMode = false;
                    vscodeOniguruma.setDefaultDebugCall(false);
                    onStop();
                });
            });
        }
    }
    _canCreateGrammarFactory() {
        // Check if extension point is ready
        return !!this._grammarDefinitions;
    }
    async _getOrCreateGrammarFactory() {
        if (this._grammarFactory) {
            return this._grammarFactory;
        }
        const [vscodeTextmate, vscodeOniguruma] = await Promise.all([importAMDNodeModule('vscode-textmate', 'release/main.js'), this._getVSCodeOniguruma()]);
        const onigLib = Promise.resolve({
            createOnigScanner: (sources) => vscodeOniguruma.createOnigScanner(sources),
            createOnigString: (str) => vscodeOniguruma.createOnigString(str)
        });
        // Avoid duplicate instantiations
        if (this._grammarFactory) {
            return this._grammarFactory;
        }
        this._grammarFactory = new TMGrammarFactory({
            logTrace: (msg) => this._logService.trace(msg),
            logError: (msg, err) => this._logService.error(msg, err),
            readFile: (resource) => this._extensionResourceLoaderService.readExtensionResource(resource)
        }, this._grammarDefinitions || [], vscodeTextmate, onigLib);
        this._updateTheme(this._themeService.getColorTheme(), true);
        return this._grammarFactory;
    }
    async _createTokenizationSupport(languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return null;
        }
        if (!this._canCreateGrammarFactory()) {
            return null;
        }
        try {
            const grammarFactory = await this._getOrCreateGrammarFactory();
            if (!grammarFactory.has(languageId)) {
                return null;
            }
            const encodedLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
            const r = await grammarFactory.createGrammar(languageId, encodedLanguageId);
            if (!r.grammar) {
                return null;
            }
            const maxTokenizationLineLength = observableConfigValue('editor.maxTokenizationLineLength', languageId, -1, this._configurationService);
            const store = new DisposableStore();
            const tokenization = store.add(new TextMateTokenizationSupport(r.grammar, r.initialState, r.containsEmbeddedLanguages, (textModel, tokenStore) => this._threadedBackgroundTokenizerFactory.createBackgroundTokenizer(textModel, tokenStore, maxTokenizationLineLength), () => this.getAsyncTokenizationVerification(), (timeMs, lineLength, isRandomSample) => {
                this._reportTokenizationTime(timeMs, languageId, r.sourceExtensionId, lineLength, false, isRandomSample);
            }, true));
            store.add(tokenization.onDidEncounterLanguage((encodedLanguageId) => {
                if (!this._encounteredLanguages[encodedLanguageId]) {
                    const languageId = this._languageService.languageIdCodec.decodeLanguageId(encodedLanguageId);
                    this._encounteredLanguages[encodedLanguageId] = true;
                    this._languageService.requestBasicLanguageFeatures(languageId);
                }
            }));
            return new TokenizationSupportWithLineLimit(encodedLanguageId, tokenization, store, maxTokenizationLineLength);
        }
        catch (err) {
            if (err.message && err.message === missingTMGrammarErrorMessage) {
                // Don't log this error message
                return null;
            }
            onUnexpectedError(err);
            return null;
        }
    }
    _updateTheme(colorTheme, forceUpdate) {
        if (!forceUpdate && this._currentTheme && this._currentTokenColorMap && equalsTokenRules(this._currentTheme.settings, colorTheme.tokenColors)
            && equalArray(this._currentTokenColorMap, colorTheme.tokenColorMap)) {
            return;
        }
        this._currentTheme = { name: colorTheme.label, settings: colorTheme.tokenColors };
        this._currentTokenColorMap = colorTheme.tokenColorMap;
        this._grammarFactory?.setTheme(this._currentTheme, this._currentTokenColorMap);
        const colorMap = toColorMap(this._currentTokenColorMap);
        const cssRules = generateTokensCSSForColorMap(colorMap);
        this._styleElement.textContent = cssRules;
        TokenizationRegistry.setColorMap(colorMap);
        if (this._currentTheme && this._currentTokenColorMap) {
            this._threadedBackgroundTokenizerFactory.acceptTheme(this._currentTheme, this._currentTokenColorMap);
        }
    }
    async createTokenizer(languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return null;
        }
        const grammarFactory = await this._getOrCreateGrammarFactory();
        if (!grammarFactory.has(languageId)) {
            return null;
        }
        const encodedLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
        const { grammar } = await grammarFactory.createGrammar(languageId, encodedLanguageId);
        return grammar;
    }
    _getVSCodeOniguruma() {
        if (!this._vscodeOniguruma) {
            this._vscodeOniguruma = (async () => {
                const [vscodeOniguruma, wasm] = await Promise.all([importAMDNodeModule('vscode-oniguruma', 'release/main.js'), this._loadVSCodeOnigurumaWASM()]);
                await vscodeOniguruma.loadWASM({
                    data: wasm,
                    print: (str) => {
                        this._debugModePrintFunc(str);
                    }
                });
                return vscodeOniguruma;
            })();
        }
        return this._vscodeOniguruma;
    }
    async _loadVSCodeOnigurumaWASM() {
        if (isWeb) {
            const response = await fetch(resolveAmdNodeModulePath('vscode-oniguruma', 'release/onig.wasm'));
            // Using the response directly only works if the server sets the MIME type 'application/wasm'.
            // Otherwise, a TypeError is thrown when using the streaming compiler.
            // We therefore use the non-streaming compiler :(.
            return await response.arrayBuffer();
        }
        else {
            const response = await fetch(canASAR && this._environmentService.isBuilt
                ? FileAccess.asBrowserUri(`${nodeModulesAsarUnpackedPath}/vscode-oniguruma/release/onig.wasm`).toString(true)
                : FileAccess.asBrowserUri(`${nodeModulesPath}/vscode-oniguruma/release/onig.wasm`).toString(true));
            return response;
        }
    }
    _reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, fromWorker, isRandomSample) {
        const key = fromWorker ? 'async' : 'sync';
        // 50 events per hour (one event has a low probability)
        if (TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key] > 50) {
            // Don't flood telemetry with too many events
            return;
        }
        if (TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key] === 0) {
            setTimeout(() => {
                TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key] = 0;
            }, 1000 * 60 * 60);
        }
        TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key]++;
        this._telemetryService.publicLog2('editor.tokenizedLine', {
            timeMs,
            languageId,
            lineLength,
            fromWorker,
            sourceExtensionId,
            isRandomSample,
            tokenizationSetting: this.getAsyncTokenizationEnabled() ? (this.getAsyncTokenizationVerification() ? 2 : 1) : 0,
        });
    }
};
TextMateTokenizationFeature = TextMateTokenizationFeature_1 = __decorate([
    __param(0, ILanguageService),
    __param(1, IWorkbenchThemeService),
    __param(2, IExtensionResourceLoaderService),
    __param(3, INotificationService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, IProgressService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IInstantiationService),
    __param(9, ITelemetryService)
], TextMateTokenizationFeature);
export { TextMateTokenizationFeature };
function toColorMap(colorMap) {
    const result = [null];
    for (let i = 1, len = colorMap.length; i < len; i++) {
        result[i] = Color.fromHex(colorMap[i]);
    }
    return result;
}
function equalsTokenRules(a, b) {
    if (!b || !a || b.length !== a.length) {
        return false;
    }
    for (let i = b.length - 1; i >= 0; i--) {
        const r1 = b[i];
        const r2 = a[i];
        if (r1.scope !== r2.scope) {
            return false;
        }
        const s1 = r1.settings;
        const s2 = r2.settings;
        if (s1 && s2) {
            if (s1.fontStyle !== s2.fontStyle || s1.foreground !== s2.foreground || s1.background !== s2.background) {
                return false;
            }
        }
        else if (!s1 || !s2) {
            return false;
        }
    }
    return true;
}
function validateGrammarExtensionPoint(extensionLocation, syntax, collector, _languageService) {
    if (syntax.language && ((typeof syntax.language !== 'string') || !_languageService.isRegisteredLanguageId(syntax.language))) {
        collector.error(nls.localize('invalid.language', "Unknown language in `contributes.{0}.language`. Provided value: {1}", grammarsExtPoint.name, String(syntax.language)));
        return false;
    }
    if (!syntax.scopeName || (typeof syntax.scopeName !== 'string')) {
        collector.error(nls.localize('invalid.scopeName', "Expected string in `contributes.{0}.scopeName`. Provided value: {1}", grammarsExtPoint.name, String(syntax.scopeName)));
        return false;
    }
    if (!syntax.path || (typeof syntax.path !== 'string')) {
        collector.error(nls.localize('invalid.path.0', "Expected string in `contributes.{0}.path`. Provided value: {1}", grammarsExtPoint.name, String(syntax.path)));
        return false;
    }
    if (syntax.injectTo && (!Array.isArray(syntax.injectTo) || syntax.injectTo.some(scope => typeof scope !== 'string'))) {
        collector.error(nls.localize('invalid.injectTo', "Invalid value in `contributes.{0}.injectTo`. Must be an array of language scope names. Provided value: {1}", grammarsExtPoint.name, JSON.stringify(syntax.injectTo)));
        return false;
    }
    if (syntax.embeddedLanguages && !types.isObject(syntax.embeddedLanguages)) {
        collector.error(nls.localize('invalid.embeddedLanguages', "Invalid value in `contributes.{0}.embeddedLanguages`. Must be an object map from scope name to language. Provided value: {1}", grammarsExtPoint.name, JSON.stringify(syntax.embeddedLanguages)));
        return false;
    }
    if (syntax.tokenTypes && !types.isObject(syntax.tokenTypes)) {
        collector.error(nls.localize('invalid.tokenTypes', "Invalid value in `contributes.{0}.tokenTypes`. Must be an object map from scope name to token type. Provided value: {1}", grammarsExtPoint.name, JSON.stringify(syntax.tokenTypes)));
        return false;
    }
    const grammarLocation = resources.joinPath(extensionLocation, syntax.path);
    if (!resources.isEqualOrParent(grammarLocation, extensionLocation)) {
        collector.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", grammarsExtPoint.name, grammarLocation.path, extensionLocation.path));
    }
    return true;
}
function observableConfigValue(key, languageId, defaultValue, configurationService) {
    return observableFromEvent((handleChange) => configurationService.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(key, { overrideIdentifier: languageId })) {
            handleChange(e);
        }
    }), () => configurationService.getValue(key, { overrideIdentifier: languageId }) ?? defaultValue);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25GZWF0dXJlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvYnJvd3Nlci90ZXh0TWF0ZVRva2VuaXphdGlvbkZlYXR1cmVJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDN0YsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsTUFBTSxJQUFJLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsMkJBQTJCLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUcsT0FBTyxFQUFlLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQztBQUcxRCxPQUFPLEVBQXdCLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0gsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENB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