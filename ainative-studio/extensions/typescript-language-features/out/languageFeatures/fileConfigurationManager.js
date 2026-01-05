"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlayHintSettingNames = void 0;
exports.getInlayHintsPreferences = getInlayHintsPreferences;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const fileSchemes = __importStar(require("../configuration/fileSchemes"));
const languageIds_1 = require("../configuration/languageIds");
const api_1 = require("../tsServer/api");
const dispose_1 = require("../utils/dispose");
const objects_1 = require("../utils/objects");
const resourceMap_1 = require("../utils/resourceMap");
function areFileConfigurationsEqual(a, b) {
    return (0, objects_1.equals)(a, b);
}
class FileConfigurationManager extends dispose_1.Disposable {
    constructor(client, onCaseInsensitiveFileSystem) {
        super();
        this.client = client;
        this.formatOptions = new resourceMap_1.ResourceMap(undefined, { onCaseInsensitiveFileSystem });
        vscode.workspace.onDidCloseTextDocument(textDocument => {
            // When a document gets closed delete the cached formatting options.
            // This is necessary since the tsserver now closed a project when its
            // last file in it closes which drops the stored formatting options
            // as well.
            this.formatOptions.delete(textDocument.uri);
        }, undefined, this._disposables);
    }
    async ensureConfigurationForDocument(document, token) {
        const formattingOptions = this.getFormattingOptions(document);
        if (formattingOptions) {
            return this.ensureConfigurationOptions(document, formattingOptions, token);
        }
    }
    getFormattingOptions(document) {
        const editor = vscode.window.visibleTextEditors.find(editor => editor.document.uri.toString() === document.uri.toString());
        if (!editor) {
            return undefined;
        }
        return {
            tabSize: typeof editor.options.tabSize === 'number' ? editor.options.tabSize : undefined,
            insertSpaces: typeof editor.options.insertSpaces === 'boolean' ? editor.options.insertSpaces : undefined,
        };
    }
    async ensureConfigurationOptions(document, options, token) {
        const file = this.client.toOpenTsFilePath(document);
        if (!file) {
            return;
        }
        const currentOptions = this.getFileOptions(document, options);
        const cachedOptions = this.formatOptions.get(document.uri);
        if (cachedOptions) {
            const cachedOptionsValue = await cachedOptions;
            if (token.isCancellationRequested) {
                return;
            }
            if (cachedOptionsValue && areFileConfigurationsEqual(cachedOptionsValue, currentOptions)) {
                return;
            }
        }
        const task = (async () => {
            try {
                const response = await this.client.execute('configure', { file, ...currentOptions }, token);
                return response.type === 'response' ? currentOptions : undefined;
            }
            catch {
                return undefined;
            }
        })();
        this.formatOptions.set(document.uri, task);
        await task;
    }
    async setGlobalConfigurationFromDocument(document, token) {
        const formattingOptions = this.getFormattingOptions(document);
        if (!formattingOptions) {
            return;
        }
        const args = {
            file: undefined /*global*/,
            ...this.getFileOptions(document, formattingOptions),
        };
        await this.client.execute('configure', args, token);
    }
    reset() {
        this.formatOptions.clear();
    }
    getFileOptions(document, options) {
        return {
            formatOptions: this.getFormatOptions(document, options),
            preferences: this.getPreferences(document)
        };
    }
    getFormatOptions(document, options) {
        const config = vscode.workspace.getConfiguration((0, languageIds_1.isTypeScriptDocument)(document) ? 'typescript.format' : 'javascript.format', document.uri);
        return {
            tabSize: options.tabSize,
            indentSize: options.tabSize,
            convertTabsToSpaces: options.insertSpaces,
            // We can use \n here since the editor normalizes later on to its line endings.
            newLineCharacter: '\n',
            insertSpaceAfterCommaDelimiter: config.get('insertSpaceAfterCommaDelimiter'),
            insertSpaceAfterConstructor: config.get('insertSpaceAfterConstructor'),
            insertSpaceAfterSemicolonInForStatements: config.get('insertSpaceAfterSemicolonInForStatements'),
            insertSpaceBeforeAndAfterBinaryOperators: config.get('insertSpaceBeforeAndAfterBinaryOperators'),
            insertSpaceAfterKeywordsInControlFlowStatements: config.get('insertSpaceAfterKeywordsInControlFlowStatements'),
            insertSpaceAfterFunctionKeywordForAnonymousFunctions: config.get('insertSpaceAfterFunctionKeywordForAnonymousFunctions'),
            insertSpaceBeforeFunctionParenthesis: config.get('insertSpaceBeforeFunctionParenthesis'),
            insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: config.get('insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis'),
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: config.get('insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets'),
            insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: config.get('insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces'),
            insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: config.get('insertSpaceAfterOpeningAndBeforeClosingEmptyBraces'),
            insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: config.get('insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces'),
            insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: config.get('insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces'),
            insertSpaceAfterTypeAssertion: config.get('insertSpaceAfterTypeAssertion'),
            placeOpenBraceOnNewLineForFunctions: config.get('placeOpenBraceOnNewLineForFunctions'),
            placeOpenBraceOnNewLineForControlBlocks: config.get('placeOpenBraceOnNewLineForControlBlocks'),
            semicolons: config.get('semicolons'),
            indentSwitchCase: config.get('indentSwitchCase'),
        };
    }
    getPreferences(document) {
        const config = vscode.workspace.getConfiguration((0, languageIds_1.isTypeScriptDocument)(document) ? 'typescript' : 'javascript', document);
        const preferencesConfig = vscode.workspace.getConfiguration((0, languageIds_1.isTypeScriptDocument)(document) ? 'typescript.preferences' : 'javascript.preferences', document);
        const preferences = {
            ...config.get('unstable'),
            quotePreference: this.getQuoteStylePreference(preferencesConfig),
            importModuleSpecifierPreference: getImportModuleSpecifierPreference(preferencesConfig),
            importModuleSpecifierEnding: getImportModuleSpecifierEndingPreference(preferencesConfig),
            jsxAttributeCompletionStyle: getJsxAttributeCompletionStyle(preferencesConfig),
            allowTextChangesInNewFiles: document.uri.scheme === fileSchemes.file,
            providePrefixAndSuffixTextForRename: preferencesConfig.get('renameShorthandProperties', true) === false ? false : preferencesConfig.get('useAliasesForRenames', true),
            allowRenameOfImportPath: true,
            includeAutomaticOptionalChainCompletions: config.get('suggest.includeAutomaticOptionalChainCompletions', true),
            provideRefactorNotApplicableReason: true,
            generateReturnInDocTemplate: config.get('suggest.jsdoc.generateReturns', true),
            includeCompletionsForImportStatements: config.get('suggest.includeCompletionsForImportStatements', true),
            includeCompletionsWithSnippetText: true,
            includeCompletionsWithClassMemberSnippets: config.get('suggest.classMemberSnippets.enabled', true),
            includeCompletionsWithObjectLiteralMethodSnippets: config.get('suggest.objectLiteralMethodSnippets.enabled', true),
            autoImportFileExcludePatterns: this.getAutoImportFileExcludePatternsPreference(preferencesConfig, vscode.workspace.getWorkspaceFolder(document.uri)?.uri),
            autoImportSpecifierExcludeRegexes: preferencesConfig.get('autoImportSpecifierExcludeRegexes'),
            preferTypeOnlyAutoImports: preferencesConfig.get('preferTypeOnlyAutoImports', false),
            useLabelDetailsInCompletionEntries: true,
            allowIncompleteCompletions: true,
            displayPartsForJSDoc: true,
            disableLineTextInReferences: true,
            interactiveInlayHints: true,
            includeCompletionsForModuleExports: config.get('suggest.autoImports'),
            ...getInlayHintsPreferences(config),
            ...this.getOrganizeImportsPreferences(preferencesConfig),
        };
        return preferences;
    }
    getQuoteStylePreference(config) {
        switch (config.get('quoteStyle')) {
            case 'single': return 'single';
            case 'double': return 'double';
            default: return 'auto';
        }
    }
    getAutoImportFileExcludePatternsPreference(config, workspaceFolder) {
        return workspaceFolder && config.get('autoImportFileExcludePatterns')?.map(p => {
            // Normalization rules: https://github.com/microsoft/TypeScript/pull/49578
            const isRelative = /^\.\.?($|[\/\\])/.test(p);
            // In TypeScript < 5.3, the first path component cannot be a wildcard, so we need to prefix
            // it with a path root (e.g. `/` or `c:\`)
            const wildcardPrefix = this.client.apiVersion.gte(api_1.API.v540)
                ? ''
                : path.parse(this.client.toTsFilePath(workspaceFolder)).root;
            return path.isAbsolute(p) ? p :
                p.startsWith('*') ? wildcardPrefix + p :
                    isRelative ? this.client.toTsFilePath(vscode.Uri.joinPath(workspaceFolder, p)) :
                        wildcardPrefix + '**' + path.sep + p;
        });
    }
    getOrganizeImportsPreferences(config) {
        const organizeImportsCollation = config.get('organizeImports.unicodeCollation');
        const organizeImportsCaseSensitivity = config.get('organizeImports.caseSensitivity');
        return {
            // More specific settings
            organizeImportsTypeOrder: withDefaultAsUndefined(config.get('organizeImports.typeOrder', 'auto'), 'auto'),
            organizeImportsIgnoreCase: organizeImportsCaseSensitivity === 'caseInsensitive' ? true
                : organizeImportsCaseSensitivity === 'caseSensitive' ? false
                    : 'auto',
            organizeImportsCollation,
            // The rest of the settings are only applicable when using unicode collation
            ...(organizeImportsCollation === 'unicode' ? {
                organizeImportsCaseFirst: organizeImportsCaseSensitivity === 'caseInsensitive' ? undefined : withDefaultAsUndefined(config.get('organizeImports.caseFirst', false), 'default'),
                organizeImportsAccentCollation: config.get('organizeImports.accentCollation'),
                organizeImportsLocale: config.get('organizeImports.locale'),
                organizeImportsNumericCollation: config.get('organizeImports.numericCollation'),
            } : {}),
        };
    }
}
exports.default = FileConfigurationManager;
function withDefaultAsUndefined(value, def) {
    return value === def ? undefined : value;
}
class InlayHintSettingNames {
}
exports.InlayHintSettingNames = InlayHintSettingNames;
InlayHintSettingNames.parameterNamesSuppressWhenArgumentMatchesName = 'inlayHints.parameterNames.suppressWhenArgumentMatchesName';
InlayHintSettingNames.parameterNamesEnabled = 'inlayHints.parameterTypes.enabled';
InlayHintSettingNames.variableTypesEnabled = 'inlayHints.variableTypes.enabled';
InlayHintSettingNames.variableTypesSuppressWhenTypeMatchesName = 'inlayHints.variableTypes.suppressWhenTypeMatchesName';
InlayHintSettingNames.propertyDeclarationTypesEnabled = 'inlayHints.propertyDeclarationTypes.enabled';
InlayHintSettingNames.functionLikeReturnTypesEnabled = 'inlayHints.functionLikeReturnTypes.enabled';
InlayHintSettingNames.enumMemberValuesEnabled = 'inlayHints.enumMemberValues.enabled';
function getInlayHintsPreferences(config) {
    return {
        includeInlayParameterNameHints: getInlayParameterNameHintsPreference(config),
        includeInlayParameterNameHintsWhenArgumentMatchesName: !config.get(InlayHintSettingNames.parameterNamesSuppressWhenArgumentMatchesName, true),
        includeInlayFunctionParameterTypeHints: config.get(InlayHintSettingNames.parameterNamesEnabled, false),
        includeInlayVariableTypeHints: config.get(InlayHintSettingNames.variableTypesEnabled, false),
        includeInlayVariableTypeHintsWhenTypeMatchesName: !config.get(InlayHintSettingNames.variableTypesSuppressWhenTypeMatchesName, true),
        includeInlayPropertyDeclarationTypeHints: config.get(InlayHintSettingNames.propertyDeclarationTypesEnabled, false),
        includeInlayFunctionLikeReturnTypeHints: config.get(InlayHintSettingNames.functionLikeReturnTypesEnabled, false),
        includeInlayEnumMemberValueHints: config.get(InlayHintSettingNames.enumMemberValuesEnabled, false),
    };
}
function getInlayParameterNameHintsPreference(config) {
    switch (config.get('inlayHints.parameterNames.enabled')) {
        case 'none': return 'none';
        case 'literals': return 'literals';
        case 'all': return 'all';
        default: return undefined;
    }
}
function getImportModuleSpecifierPreference(config) {
    switch (config.get('importModuleSpecifier')) {
        case 'project-relative': return 'project-relative';
        case 'relative': return 'relative';
        case 'non-relative': return 'non-relative';
        default: return undefined;
    }
}
function getImportModuleSpecifierEndingPreference(config) {
    switch (config.get('importModuleSpecifierEnding')) {
        case 'minimal': return 'minimal';
        case 'index': return 'index';
        case 'js': return 'js';
        default: return 'auto';
    }
}
function getJsxAttributeCompletionStyle(config) {
    switch (config.get('jsxAttributeCompletionStyle')) {
        case 'braces': return 'braces';
        case 'none': return 'none';
        default: return 'auto';
    }
}
//# sourceMappingURL=fileConfigurationManager.js.map