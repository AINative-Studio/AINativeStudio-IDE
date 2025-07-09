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
var InspectEditorTokensController_1;
import './inspectEditorTokens.css';
import * as nls from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { Color } from '../../../../../base/common/color.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TreeSitterTokenizationRegistry } from '../../../../../editor/common/languages.js';
import { TokenMetadata } from '../../../../../editor/common/encodedTokenAttributes.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { findMatchingThemeRule } from '../../../../services/textMate/common/TMHelper.js';
import { ITextMateTokenizationService } from '../../../../services/textMate/browser/textMateTokenizationFeature.js';
import { IWorkbenchThemeService } from '../../../../services/themes/common/workbenchThemeService.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { SemanticTokenRule } from '../../../../../platform/theme/common/tokenClassificationRegistry.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { SEMANTIC_HIGHLIGHTING_SETTING_ID } from '../../../../../editor/contrib/semanticTokens/common/semanticTokensConfig.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { ITreeSitterParserService } from '../../../../../editor/common/services/treeSitterParserService.js';
const $ = dom.$;
let InspectEditorTokensController = class InspectEditorTokensController extends Disposable {
    static { InspectEditorTokensController_1 = this; }
    static { this.ID = 'editor.contrib.inspectEditorTokens'; }
    static get(editor) {
        return editor.getContribution(InspectEditorTokensController_1.ID);
    }
    constructor(editor, textMateService, treeSitterService, languageService, themeService, notificationService, configurationService, languageFeaturesService) {
        super();
        this._editor = editor;
        this._textMateService = textMateService;
        this._treeSitterService = treeSitterService;
        this._themeService = themeService;
        this._languageService = languageService;
        this._notificationService = notificationService;
        this._configurationService = configurationService;
        this._languageFeaturesService = languageFeaturesService;
        this._widget = null;
        this._register(this._editor.onDidChangeModel((e) => this.stop()));
        this._register(this._editor.onDidChangeModelLanguage((e) => this.stop()));
        this._register(this._editor.onKeyUp((e) => e.keyCode === 9 /* KeyCode.Escape */ && this.stop()));
    }
    dispose() {
        this.stop();
        super.dispose();
    }
    launch() {
        if (this._widget) {
            return;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._editor.getModel().uri.scheme === Schemas.vscodeNotebookCell) {
            // disable in notebooks
            return;
        }
        this._widget = new InspectEditorTokensWidget(this._editor, this._textMateService, this._treeSitterService, this._languageService, this._themeService, this._notificationService, this._configurationService, this._languageFeaturesService);
    }
    stop() {
        if (this._widget) {
            this._widget.dispose();
            this._widget = null;
        }
    }
    toggle() {
        if (!this._widget) {
            this.launch();
        }
        else {
            this.stop();
        }
    }
};
InspectEditorTokensController = InspectEditorTokensController_1 = __decorate([
    __param(1, ITextMateTokenizationService),
    __param(2, ITreeSitterParserService),
    __param(3, ILanguageService),
    __param(4, IWorkbenchThemeService),
    __param(5, INotificationService),
    __param(6, IConfigurationService),
    __param(7, ILanguageFeaturesService)
], InspectEditorTokensController);
export { InspectEditorTokensController };
class InspectEditorTokens extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inspectTMScopes',
            label: nls.localize2('inspectEditorTokens', "Developer: Inspect Editor Tokens and Scopes"),
            precondition: undefined
        });
    }
    run(accessor, editor) {
        const controller = InspectEditorTokensController.get(editor);
        controller?.toggle();
    }
}
function renderTokenText(tokenText) {
    if (tokenText.length > 40) {
        tokenText = tokenText.substr(0, 20) + '…' + tokenText.substr(tokenText.length - 20);
    }
    let result = '';
    for (let charIndex = 0, len = tokenText.length; charIndex < len; charIndex++) {
        const charCode = tokenText.charCodeAt(charIndex);
        switch (charCode) {
            case 9 /* CharCode.Tab */:
                result += '\u2192'; // &rarr;
                break;
            case 32 /* CharCode.Space */:
                result += '\u00B7'; // &middot;
                break;
            default:
                result += String.fromCharCode(charCode);
        }
    }
    return result;
}
class InspectEditorTokensWidget extends Disposable {
    static { this._ID = 'editor.contrib.inspectEditorTokensWidget'; }
    constructor(editor, textMateService, treeSitterService, languageService, themeService, notificationService, configurationService, languageFeaturesService) {
        super();
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this._isDisposed = false;
        this._editor = editor;
        this._languageService = languageService;
        this._themeService = themeService;
        this._textMateService = textMateService;
        this._treeSitterService = treeSitterService;
        this._notificationService = notificationService;
        this._configurationService = configurationService;
        this._languageFeaturesService = languageFeaturesService;
        this._model = this._editor.getModel();
        this._domNode = document.createElement('div');
        this._domNode.className = 'token-inspect-widget';
        this._currentRequestCancellationTokenSource = new CancellationTokenSource();
        this._beginCompute(this._editor.getPosition());
        this._register(this._editor.onDidChangeCursorPosition((e) => this._beginCompute(this._editor.getPosition())));
        this._register(themeService.onDidColorThemeChange(_ => this._beginCompute(this._editor.getPosition())));
        this._register(configurationService.onDidChangeConfiguration(e => e.affectsConfiguration('editor.semanticHighlighting.enabled') && this._beginCompute(this._editor.getPosition())));
        this._editor.addContentWidget(this);
    }
    dispose() {
        this._isDisposed = true;
        this._editor.removeContentWidget(this);
        this._currentRequestCancellationTokenSource.cancel();
        super.dispose();
    }
    getId() {
        return InspectEditorTokensWidget._ID;
    }
    _beginCompute(position) {
        const grammar = this._textMateService.createTokenizer(this._model.getLanguageId());
        const semanticTokens = this._computeSemanticTokens(position);
        const tree = this._treeSitterService.getParseResult(this._model);
        dom.clearNode(this._domNode);
        this._domNode.appendChild(document.createTextNode(nls.localize('inspectTMScopesWidget.loading', "Loading...")));
        Promise.all([grammar, semanticTokens]).then(([grammar, semanticTokens]) => {
            if (this._isDisposed) {
                return;
            }
            this._compute(grammar, semanticTokens, tree, position);
            this._domNode.style.maxWidth = `${Math.max(this._editor.getLayoutInfo().width * 0.66, 500)}px`;
            this._editor.layoutContentWidget(this);
        }, (err) => {
            this._notificationService.warn(err);
            setTimeout(() => {
                InspectEditorTokensController.get(this._editor)?.stop();
            });
        });
    }
    _isSemanticColoringEnabled() {
        const setting = this._configurationService.getValue(SEMANTIC_HIGHLIGHTING_SETTING_ID, { overrideIdentifier: this._model.getLanguageId(), resource: this._model.uri })?.enabled;
        if (typeof setting === 'boolean') {
            return setting;
        }
        return this._themeService.getColorTheme().semanticHighlighting;
    }
    _compute(grammar, semanticTokens, tree, position) {
        const textMateTokenInfo = grammar && this._getTokensAtPosition(grammar, position);
        const semanticTokenInfo = semanticTokens && this._getSemanticTokenAtPosition(semanticTokens, position);
        const treeSitterTokenInfo = tree && this._getTreeSitterTokenAtPosition(tree, position);
        if (!textMateTokenInfo && !semanticTokenInfo && !treeSitterTokenInfo) {
            dom.reset(this._domNode, 'No grammar or semantic tokens available.');
            return;
        }
        const tmMetadata = textMateTokenInfo?.metadata;
        const semMetadata = semanticTokenInfo?.metadata;
        const semTokenText = semanticTokenInfo && renderTokenText(this._model.getValueInRange(semanticTokenInfo.range));
        const tmTokenText = textMateTokenInfo && renderTokenText(this._model.getLineContent(position.lineNumber).substring(textMateTokenInfo.token.startIndex, textMateTokenInfo.token.endIndex));
        const tokenText = semTokenText || tmTokenText || '';
        dom.reset(this._domNode, $('h2.tiw-token', undefined, tokenText, $('span.tiw-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'char' : 'chars'}`)));
        dom.append(this._domNode, $('hr.tiw-metadata-separator', { 'style': 'clear:both' }));
        dom.append(this._domNode, $('table.tiw-metadata-table', undefined, $('tbody', undefined, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'language'), $('td.tiw-metadata-value', undefined, tmMetadata?.languageId || '')), $('tr', undefined, $('td.tiw-metadata-key', undefined, 'standard token type'), $('td.tiw-metadata-value', undefined, this._tokenTypeToString(tmMetadata?.tokenType || 0 /* StandardTokenType.Other */))), ...this._formatMetadata(semMetadata, tmMetadata))));
        if (semanticTokenInfo) {
            dom.append(this._domNode, $('hr.tiw-metadata-separator'));
            const table = dom.append(this._domNode, $('table.tiw-metadata-table', undefined));
            const tbody = dom.append(table, $('tbody', undefined, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'semantic token type'), $('td.tiw-metadata-value', undefined, semanticTokenInfo.type))));
            if (semanticTokenInfo.modifiers.length) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'modifiers'), $('td.tiw-metadata-value', undefined, semanticTokenInfo.modifiers.join(' '))));
            }
            if (semanticTokenInfo.metadata) {
                const properties = ['foreground', 'bold', 'italic', 'underline', 'strikethrough'];
                const propertiesByDefValue = {};
                const allDefValues = new Array(); // remember the order
                // first collect to detect when the same rule is used for multiple properties
                for (const property of properties) {
                    if (semanticTokenInfo.metadata[property] !== undefined) {
                        const definition = semanticTokenInfo.definitions[property];
                        const defValue = this._renderTokenStyleDefinition(definition, property);
                        const defValueStr = defValue.map(el => dom.isHTMLElement(el) ? el.outerHTML : el).join();
                        let properties = propertiesByDefValue[defValueStr];
                        if (!properties) {
                            propertiesByDefValue[defValueStr] = properties = [];
                            allDefValues.push([defValue, defValueStr]);
                        }
                        properties.push(property);
                    }
                }
                for (const [defValue, defValueStr] of allDefValues) {
                    dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, propertiesByDefValue[defValueStr].join(', ')), $('td.tiw-metadata-value', undefined, ...defValue)));
                }
            }
        }
        if (textMateTokenInfo) {
            const theme = this._themeService.getColorTheme();
            dom.append(this._domNode, $('hr.tiw-metadata-separator'));
            const table = dom.append(this._domNode, $('table.tiw-metadata-table'));
            const tbody = dom.append(table, $('tbody'));
            if (tmTokenText && tmTokenText !== tokenText) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'textmate token'), $('td.tiw-metadata-value', undefined, `${tmTokenText} (${tmTokenText.length})`)));
            }
            const scopes = new Array();
            for (let i = textMateTokenInfo.token.scopes.length - 1; i >= 0; i--) {
                scopes.push(textMateTokenInfo.token.scopes[i]);
                if (i > 0) {
                    scopes.push($('br'));
                }
            }
            dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'textmate scopes'), $('td.tiw-metadata-value.tiw-metadata-scopes', undefined, ...scopes)));
            const matchingRule = findMatchingThemeRule(theme, textMateTokenInfo.token.scopes, false);
            const semForeground = semanticTokenInfo?.metadata?.foreground;
            if (matchingRule) {
                if (semForeground !== textMateTokenInfo.metadata.foreground) {
                    let defValue = $('code.tiw-theme-selector', undefined, matchingRule.rawSelector, $('br'), JSON.stringify(matchingRule.settings, null, '\t'));
                    if (semForeground) {
                        defValue = $('s', undefined, defValue);
                    }
                    dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'foreground'), $('td.tiw-metadata-value', undefined, defValue)));
                }
            }
            else if (!semForeground) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'foreground'), $('td.tiw-metadata-value', undefined, 'No theme selector')));
            }
        }
        if (treeSitterTokenInfo) {
            const lastTokenInfo = treeSitterTokenInfo[treeSitterTokenInfo.length - 1];
            dom.append(this._domNode, $('hr.tiw-metadata-separator'));
            const table = dom.append(this._domNode, $('table.tiw-metadata-table'));
            const tbody = dom.append(table, $('tbody'));
            dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, `tree-sitter token ${lastTokenInfo.id}`), $('td.tiw-metadata-value', undefined, `${lastTokenInfo.text}`)));
            const scopes = new Array();
            let i = treeSitterTokenInfo.length - 1;
            let node = treeSitterTokenInfo[i];
            while (node.parent || i > 0) {
                scopes.push(node.type);
                node = node.parent ?? treeSitterTokenInfo[--i];
                if (node) {
                    scopes.push($('br'));
                }
            }
            dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'tree-sitter tree'), $('td.tiw-metadata-value.tiw-metadata-scopes', undefined, ...scopes)));
            const tokenizationSupport = TreeSitterTokenizationRegistry.get(this._model.getLanguageId());
            const captures = tokenizationSupport?.captureAtPosition(position.lineNumber, position.column, this._model);
            if (captures && captures.length > 0) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'foreground'), $('td.tiw-metadata-value', undefined, captures.map(cap => cap.name).join(' '))));
            }
        }
    }
    _formatMetadata(semantic, tm) {
        const elements = new Array();
        function render(property) {
            const value = semantic?.[property] || tm?.[property];
            if (value !== undefined) {
                const semanticStyle = semantic?.[property] ? 'tiw-metadata-semantic' : '';
                elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, property), $(`td.tiw-metadata-value.${semanticStyle}`, undefined, value)));
            }
            return value;
        }
        const foreground = render('foreground');
        const background = render('background');
        if (foreground && background) {
            const backgroundColor = Color.fromHex(background), foregroundColor = Color.fromHex(foreground);
            if (backgroundColor.isOpaque()) {
                elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, 'contrast ratio'), $('td.tiw-metadata-value', undefined, backgroundColor.getContrastRatio(foregroundColor.makeOpaque(backgroundColor)).toFixed(2))));
            }
            else {
                elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, 'Contrast ratio cannot be precise for background colors that use transparency'), $('td.tiw-metadata-value')));
            }
        }
        const fontStyleLabels = new Array();
        function addStyle(key) {
            let label;
            if (semantic && semantic[key]) {
                label = $('span.tiw-metadata-semantic', undefined, key);
            }
            else if (tm && tm[key]) {
                label = key;
            }
            if (label) {
                if (fontStyleLabels.length) {
                    fontStyleLabels.push(' ');
                }
                fontStyleLabels.push(label);
            }
        }
        addStyle('bold');
        addStyle('italic');
        addStyle('underline');
        addStyle('strikethrough');
        if (fontStyleLabels.length) {
            elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, 'font style'), $('td.tiw-metadata-value', undefined, ...fontStyleLabels)));
        }
        return elements;
    }
    _decodeMetadata(metadata) {
        const colorMap = this._themeService.getColorTheme().tokenColorMap;
        const languageId = TokenMetadata.getLanguageId(metadata);
        const tokenType = TokenMetadata.getTokenType(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        const foreground = TokenMetadata.getForeground(metadata);
        const background = TokenMetadata.getBackground(metadata);
        return {
            languageId: this._languageService.languageIdCodec.decodeLanguageId(languageId),
            tokenType: tokenType,
            bold: (fontStyle & 2 /* FontStyle.Bold */) ? true : undefined,
            italic: (fontStyle & 1 /* FontStyle.Italic */) ? true : undefined,
            underline: (fontStyle & 4 /* FontStyle.Underline */) ? true : undefined,
            strikethrough: (fontStyle & 8 /* FontStyle.Strikethrough */) ? true : undefined,
            foreground: colorMap[foreground],
            background: colorMap[background]
        };
    }
    _tokenTypeToString(tokenType) {
        switch (tokenType) {
            case 0 /* StandardTokenType.Other */: return 'Other';
            case 1 /* StandardTokenType.Comment */: return 'Comment';
            case 2 /* StandardTokenType.String */: return 'String';
            case 3 /* StandardTokenType.RegEx */: return 'RegEx';
            default: return '??';
        }
    }
    _getTokensAtPosition(grammar, position) {
        const lineNumber = position.lineNumber;
        const stateBeforeLine = this._getStateBeforeLine(grammar, lineNumber);
        const tokenizationResult1 = grammar.tokenizeLine(this._model.getLineContent(lineNumber), stateBeforeLine);
        const tokenizationResult2 = grammar.tokenizeLine2(this._model.getLineContent(lineNumber), stateBeforeLine);
        let token1Index = 0;
        for (let i = tokenizationResult1.tokens.length - 1; i >= 0; i--) {
            const t = tokenizationResult1.tokens[i];
            if (position.column - 1 >= t.startIndex) {
                token1Index = i;
                break;
            }
        }
        let token2Index = 0;
        for (let i = (tokenizationResult2.tokens.length >>> 1); i >= 0; i--) {
            if (position.column - 1 >= tokenizationResult2.tokens[(i << 1)]) {
                token2Index = i;
                break;
            }
        }
        return {
            token: tokenizationResult1.tokens[token1Index],
            metadata: this._decodeMetadata(tokenizationResult2.tokens[(token2Index << 1) + 1])
        };
    }
    _getStateBeforeLine(grammar, lineNumber) {
        let state = null;
        for (let i = 1; i < lineNumber; i++) {
            const tokenizationResult = grammar.tokenizeLine(this._model.getLineContent(i), state);
            state = tokenizationResult.ruleStack;
        }
        return state;
    }
    isSemanticTokens(token) {
        return token && token.data;
    }
    async _computeSemanticTokens(position) {
        if (!this._isSemanticColoringEnabled()) {
            return null;
        }
        const tokenProviders = this._languageFeaturesService.documentSemanticTokensProvider.ordered(this._model);
        if (tokenProviders.length) {
            const provider = tokenProviders[0];
            const tokens = await Promise.resolve(provider.provideDocumentSemanticTokens(this._model, null, this._currentRequestCancellationTokenSource.token));
            if (this.isSemanticTokens(tokens)) {
                return { tokens, legend: provider.getLegend() };
            }
        }
        const rangeTokenProviders = this._languageFeaturesService.documentRangeSemanticTokensProvider.ordered(this._model);
        if (rangeTokenProviders.length) {
            const provider = rangeTokenProviders[0];
            const lineNumber = position.lineNumber;
            const range = new Range(lineNumber, 1, lineNumber, this._model.getLineMaxColumn(lineNumber));
            const tokens = await Promise.resolve(provider.provideDocumentRangeSemanticTokens(this._model, range, this._currentRequestCancellationTokenSource.token));
            if (this.isSemanticTokens(tokens)) {
                return { tokens, legend: provider.getLegend() };
            }
        }
        return null;
    }
    _getSemanticTokenAtPosition(semanticTokens, pos) {
        const tokenData = semanticTokens.tokens.data;
        const defaultLanguage = this._model.getLanguageId();
        let lastLine = 0;
        let lastCharacter = 0;
        const posLine = pos.lineNumber - 1, posCharacter = pos.column - 1; // to 0-based position
        for (let i = 0; i < tokenData.length; i += 5) {
            const lineDelta = tokenData[i], charDelta = tokenData[i + 1], len = tokenData[i + 2], typeIdx = tokenData[i + 3], modSet = tokenData[i + 4];
            const line = lastLine + lineDelta; // 0-based
            const character = lineDelta === 0 ? lastCharacter + charDelta : charDelta; // 0-based
            if (posLine === line && character <= posCharacter && posCharacter < character + len) {
                const type = semanticTokens.legend.tokenTypes[typeIdx] || 'not in legend (ignored)';
                const modifiers = [];
                let modifierSet = modSet;
                for (let modifierIndex = 0; modifierSet > 0 && modifierIndex < semanticTokens.legend.tokenModifiers.length; modifierIndex++) {
                    if (modifierSet & 1) {
                        modifiers.push(semanticTokens.legend.tokenModifiers[modifierIndex]);
                    }
                    modifierSet = modifierSet >> 1;
                }
                if (modifierSet > 0) {
                    modifiers.push('not in legend (ignored)');
                }
                const range = new Range(line + 1, character + 1, line + 1, character + 1 + len);
                const definitions = {};
                const colorMap = this._themeService.getColorTheme().tokenColorMap;
                const theme = this._themeService.getColorTheme();
                const tokenStyle = theme.getTokenStyleMetadata(type, modifiers, defaultLanguage, true, definitions);
                let metadata = undefined;
                if (tokenStyle) {
                    metadata = {
                        languageId: undefined,
                        tokenType: 0 /* StandardTokenType.Other */,
                        bold: tokenStyle?.bold,
                        italic: tokenStyle?.italic,
                        underline: tokenStyle?.underline,
                        strikethrough: tokenStyle?.strikethrough,
                        foreground: colorMap[tokenStyle?.foreground || 0 /* ColorId.None */],
                        background: undefined
                    };
                }
                return { type, modifiers, range, metadata, definitions };
            }
            lastLine = line;
            lastCharacter = character;
        }
        return null;
    }
    _walkTreeforPosition(cursor, pos) {
        const offset = this._model.getOffsetAt(pos);
        cursor.gotoFirstChild();
        let goChild = false;
        let lastGoodNode = null;
        do {
            if (cursor.currentNode.startIndex <= offset && offset < cursor.currentNode.endIndex) {
                goChild = true;
                lastGoodNode = cursor.currentNode;
            }
            else {
                goChild = false;
            }
        } while (goChild ? cursor.gotoFirstChild() : cursor.gotoNextSibling());
        return lastGoodNode;
    }
    _getTreeSitterTokenAtPosition(textModelTreeSitter, pos) {
        let tree = textModelTreeSitter.parseResult;
        if (!tree?.tree) {
            return null;
        }
        const nodes = [];
        do {
            const cursor = tree.tree.walk();
            const node = this._walkTreeforPosition(cursor, pos);
            if (node) {
                nodes.push(node);
                tree = textModelTreeSitter.getInjection(node.startIndex, tree.languageId);
            }
            else {
                tree = undefined;
            }
        } while (tree?.tree);
        return nodes.length > 0 ? nodes : null;
    }
    _renderTokenStyleDefinition(definition, property) {
        const elements = new Array();
        if (definition === undefined) {
            return elements;
        }
        const theme = this._themeService.getColorTheme();
        if (Array.isArray(definition)) {
            const scopesDefinition = {};
            theme.resolveScopes(definition, scopesDefinition);
            const matchingRule = scopesDefinition[property];
            if (matchingRule && scopesDefinition.scope) {
                const scopes = $('ul.tiw-metadata-values');
                const strScopes = Array.isArray(matchingRule.scope) ? matchingRule.scope : [String(matchingRule.scope)];
                for (const strScope of strScopes) {
                    scopes.appendChild($('li.tiw-metadata-value.tiw-metadata-scopes', undefined, strScope));
                }
                elements.push(scopesDefinition.scope.join(' '), scopes, $('code.tiw-theme-selector', undefined, JSON.stringify(matchingRule.settings, null, '\t')));
                return elements;
            }
            return elements;
        }
        else if (SemanticTokenRule.is(definition)) {
            const scope = theme.getTokenStylingRuleScope(definition);
            if (scope === 'setting') {
                elements.push(`User settings: ${definition.selector.id} - ${this._renderStyleProperty(definition.style, property)}`);
                return elements;
            }
            else if (scope === 'theme') {
                elements.push(`Color theme: ${definition.selector.id} - ${this._renderStyleProperty(definition.style, property)}`);
                return elements;
            }
            return elements;
        }
        else {
            const style = theme.resolveTokenStyleValue(definition);
            elements.push(`Default: ${style ? this._renderStyleProperty(style, property) : ''}`);
            return elements;
        }
    }
    _renderStyleProperty(style, property) {
        switch (property) {
            case 'foreground': return style.foreground ? Color.Format.CSS.formatHexA(style.foreground, true) : '';
            default: return style[property] !== undefined ? String(style[property]) : '';
        }
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            position: this._editor.getPosition(),
            preference: [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */]
        };
    }
}
registerEditorContribution(InspectEditorTokensController.ID, InspectEditorTokensController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(InspectEditorTokens);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdEVkaXRvclRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvaW5zcGVjdEVkaXRvclRva2Vucy9pbnNwZWN0RWRpdG9yVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxZQUFZLEVBQW9CLG9CQUFvQixFQUFFLDBCQUEwQixFQUFtQyxNQUFNLG1EQUFtRCxDQUFDO0FBRXRMLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUduRSxPQUFPLEVBQXdDLDhCQUE4QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDakksT0FBTyxFQUF5QyxhQUFhLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUVwSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsdUJB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