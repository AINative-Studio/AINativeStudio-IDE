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
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { ITextMateTokenizationService } from '../../../services/textMate/browser/textMateTokenizationFeature.js';
import { TokenizationRegistry, TreeSitterTokenizationRegistry } from '../../../../editor/common/languages.js';
import { TokenMetadata } from '../../../../editor/common/encodedTokenAttributes.js';
import { findMatchingThemeRule } from '../../../services/textMate/common/TMHelper.js';
import { Color } from '../../../../base/common/color.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { splitLines } from '../../../../base/common/strings.js';
import { ITreeSitterParserService } from '../../../../editor/common/services/treeSitterParserService.js';
import { findMetadata } from '../../../services/themes/common/colorThemeData.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Event } from '../../../../base/common/event.js';
import { Range } from '../../../../editor/common/core/range.js';
class ThemeDocument {
    constructor(theme) {
        this._theme = theme;
        this._cache = Object.create(null);
        this._defaultColor = '#000000';
        for (let i = 0, len = this._theme.tokenColors.length; i < len; i++) {
            const rule = this._theme.tokenColors[i];
            if (!rule.scope) {
                this._defaultColor = rule.settings.foreground;
            }
        }
    }
    _generateExplanation(selector, color) {
        return `${selector}: ${Color.Format.CSS.formatHexA(color, true).toUpperCase()}`;
    }
    explainTokenColor(scopes, color) {
        const matchingRule = this._findMatchingThemeRule(scopes);
        if (!matchingRule) {
            const expected = Color.fromHex(this._defaultColor);
            // No matching rule
            if (!color.equals(expected)) {
                throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected default ${Color.Format.CSS.formatHexA(expected)}`);
            }
            return this._generateExplanation('default', color);
        }
        const expected = Color.fromHex(matchingRule.settings.foreground);
        if (!color.equals(expected)) {
            throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected ${Color.Format.CSS.formatHexA(expected)} coming in from ${matchingRule.rawSelector}`);
        }
        return this._generateExplanation(matchingRule.rawSelector, color);
    }
    _findMatchingThemeRule(scopes) {
        if (!this._cache[scopes]) {
            this._cache[scopes] = findMatchingThemeRule(this._theme, scopes.split(' '));
        }
        return this._cache[scopes];
    }
}
let Snapper = class Snapper {
    constructor(languageService, themeService, textMateService, treeSitterParserService, modelService) {
        this.languageService = languageService;
        this.themeService = themeService;
        this.textMateService = textMateService;
        this.treeSitterParserService = treeSitterParserService;
        this.modelService = modelService;
    }
    _themedTokenize(grammar, lines) {
        const colorMap = TokenizationRegistry.getColorMap();
        let state = null;
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            const line = lines[i];
            const tokenizationResult = grammar.tokenizeLine2(line, state);
            for (let j = 0, lenJ = tokenizationResult.tokens.length >>> 1; j < lenJ; j++) {
                const startOffset = tokenizationResult.tokens[(j << 1)];
                const metadata = tokenizationResult.tokens[(j << 1) + 1];
                const endOffset = j + 1 < lenJ ? tokenizationResult.tokens[((j + 1) << 1)] : line.length;
                const tokenText = line.substring(startOffset, endOffset);
                const color = TokenMetadata.getForeground(metadata);
                result[resultLen++] = {
                    text: tokenText,
                    color: colorMap[color]
                };
            }
            state = tokenizationResult.ruleStack;
        }
        return result;
    }
    _themedTokenizeTreeSitter(tokens, languageId) {
        const colorMap = TokenizationRegistry.getColorMap();
        const result = Array(tokens.length);
        const colorThemeData = this.themeService.getColorTheme();
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const scopes = token.t.split(' ');
            const metadata = findMetadata(colorThemeData, scopes, this.languageService.languageIdCodec.encodeLanguageId(languageId), false);
            const color = TokenMetadata.getForeground(metadata);
            result[i] = {
                text: token.c,
                color: colorMap[color]
            };
        }
        return result;
    }
    _tokenize(grammar, lines) {
        let state = null;
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            const line = lines[i];
            const tokenizationResult = grammar.tokenizeLine(line, state);
            let lastScopes = null;
            for (let j = 0, lenJ = tokenizationResult.tokens.length; j < lenJ; j++) {
                const token = tokenizationResult.tokens[j];
                const tokenText = line.substring(token.startIndex, token.endIndex);
                const tokenScopes = token.scopes.join(' ');
                if (lastScopes === tokenScopes) {
                    result[resultLen - 1].c += tokenText;
                }
                else {
                    lastScopes = tokenScopes;
                    result[resultLen++] = {
                        c: tokenText,
                        t: tokenScopes,
                        r: {
                            dark_plus: undefined,
                            light_plus: undefined,
                            dark_vs: undefined,
                            light_vs: undefined,
                            hc_black: undefined,
                        }
                    };
                }
            }
            state = tokenizationResult.ruleStack;
        }
        return result;
    }
    async _getThemesResult(grammar, lines) {
        const currentTheme = this.themeService.getColorTheme();
        const getThemeName = (id) => {
            const part = 'vscode-theme-defaults-themes-';
            const startIdx = id.indexOf(part);
            if (startIdx !== -1) {
                return id.substring(startIdx + part.length, id.length - 5);
            }
            return undefined;
        };
        const result = {};
        const themeDatas = await this.themeService.getColorThemes();
        const defaultThemes = themeDatas.filter(themeData => !!getThemeName(themeData.id));
        for (const defaultTheme of defaultThemes) {
            const themeId = defaultTheme.id;
            const success = await this.themeService.setColorTheme(themeId, undefined);
            if (success) {
                const themeName = getThemeName(themeId);
                result[themeName] = {
                    document: new ThemeDocument(this.themeService.getColorTheme()),
                    tokens: this._themedTokenize(grammar, lines)
                };
            }
        }
        await this.themeService.setColorTheme(currentTheme.id, undefined);
        return result;
    }
    async _getTreeSitterThemesResult(tokens, languageId) {
        const currentTheme = this.themeService.getColorTheme();
        const getThemeName = (id) => {
            const part = 'vscode-theme-defaults-themes-';
            const startIdx = id.indexOf(part);
            if (startIdx !== -1) {
                return id.substring(startIdx + part.length, id.length - 5);
            }
            return undefined;
        };
        const result = {};
        const themeDatas = await this.themeService.getColorThemes();
        const defaultThemes = themeDatas.filter(themeData => !!getThemeName(themeData.id));
        for (const defaultTheme of defaultThemes) {
            const themeId = defaultTheme.id;
            const success = await this.themeService.setColorTheme(themeId, undefined);
            if (success) {
                const themeName = getThemeName(themeId);
                result[themeName] = {
                    document: new ThemeDocument(this.themeService.getColorTheme()),
                    tokens: this._themedTokenizeTreeSitter(tokens, languageId)
                };
            }
        }
        await this.themeService.setColorTheme(currentTheme.id, undefined);
        return result;
    }
    _enrichResult(result, themesResult) {
        const index = {};
        const themeNames = Object.keys(themesResult);
        for (const themeName of themeNames) {
            index[themeName] = 0;
        }
        for (let i = 0, len = result.length; i < len; i++) {
            const token = result[i];
            for (const themeName of themeNames) {
                const themedToken = themesResult[themeName].tokens[index[themeName]];
                themedToken.text = themedToken.text.substr(token.c.length);
                if (themedToken.color) {
                    token.r[themeName] = themesResult[themeName].document.explainTokenColor(token.t, themedToken.color);
                }
                if (themedToken.text.length === 0) {
                    index[themeName]++;
                }
            }
        }
    }
    _moveInjectionCursorToRange(cursor, injectionRange) {
        let continueCursor = cursor.gotoFirstChild();
        // Get into the first "real" child node, as the root nodes can extend outside the range.
        while (((cursor.startIndex < injectionRange.startIndex) || (cursor.endIndex > injectionRange.endIndex)) && continueCursor) {
            if (cursor.endIndex < injectionRange.startIndex) {
                continueCursor = cursor.gotoNextSibling();
            }
            else {
                continueCursor = cursor.gotoFirstChild();
            }
        }
    }
    _treeSitterTokenize(textModelTreeSitter, tree, languageId) {
        const cursor = tree.walk();
        cursor.gotoFirstChild();
        let cursorResult = true;
        const tokens = [];
        const tokenizationSupport = TreeSitterTokenizationRegistry.get(languageId);
        const cursors = [{ cursor, languageId, startOffset: 0, endOffset: textModelTreeSitter.textModel.getValueLength() }];
        do {
            const current = cursors[cursors.length - 1];
            const currentCursor = current.cursor;
            const currentLanguageId = current.languageId;
            const isOutsideRange = (currentCursor.currentNode.endIndex > current.endOffset);
            if (!isOutsideRange && (currentCursor.currentNode.childCount === 0)) {
                const range = new Range(currentCursor.currentNode.startPosition.row + 1, currentCursor.currentNode.startPosition.column + 1, currentCursor.currentNode.endPosition.row + 1, currentCursor.currentNode.endPosition.column + 1);
                const injection = textModelTreeSitter.getInjection(currentCursor.currentNode.startIndex, currentLanguageId);
                const treeSitterRange = injection?.ranges.find(r => r.startIndex <= currentCursor.currentNode.startIndex && r.endIndex >= currentCursor.currentNode.endIndex);
                if (injection?.tree && treeSitterRange && (treeSitterRange.startIndex === currentCursor.currentNode.startIndex)) {
                    const injectionLanguageId = injection.languageId;
                    const injectionTree = injection.tree;
                    const injectionCursor = injectionTree.walk();
                    this._moveInjectionCursorToRange(injectionCursor, treeSitterRange);
                    cursors.push({ cursor: injectionCursor, languageId: injectionLanguageId, startOffset: treeSitterRange.startIndex, endOffset: treeSitterRange.endIndex });
                    while ((currentCursor.endIndex <= treeSitterRange.endIndex) && (currentCursor.gotoNextSibling() || currentCursor.gotoParent())) { }
                }
                else {
                    const capture = tokenizationSupport?.captureAtRangeTree(range, tree, textModelTreeSitter);
                    tokens.push({
                        c: currentCursor.currentNode.text.replace(/\r/g, ''),
                        t: capture?.map(cap => cap.name).join(' ') ?? '',
                        r: {
                            dark_plus: undefined,
                            light_plus: undefined,
                            dark_vs: undefined,
                            light_vs: undefined,
                            hc_black: undefined,
                        }
                    });
                    while (!(cursorResult = currentCursor.gotoNextSibling())) {
                        if (!(cursorResult = currentCursor.gotoParent())) {
                            break;
                        }
                    }
                }
            }
            else {
                cursorResult = currentCursor.gotoFirstChild();
            }
            if (cursors.length > 1 && ((!cursorResult && currentCursor === cursors[cursors.length - 1].cursor) || isOutsideRange)) {
                cursors.pop();
                cursorResult = true;
            }
        } while (cursorResult);
        return tokens;
    }
    captureSyntaxTokens(fileName, content) {
        const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(fileName));
        return this.textMateService.createTokenizer(languageId).then((grammar) => {
            if (!grammar) {
                return [];
            }
            const lines = splitLines(content);
            const result = this._tokenize(grammar, lines);
            return this._getThemesResult(grammar, lines).then((themesResult) => {
                this._enrichResult(result, themesResult);
                return result.filter(t => t.c.length > 0);
            });
        });
    }
    async captureTreeSitterSyntaxTokens(resource, content) {
        const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
        if (languageId) {
            const hasLanguage = TreeSitterTokenizationRegistry.get(languageId);
            if (!hasLanguage) {
                return [];
            }
            const model = this.modelService.getModel(resource) ?? this.modelService.createModel(content, { languageId, onDidChange: Event.None }, resource);
            let textModelTreeSitter = this.treeSitterParserService.getParseResult(model);
            let tree = textModelTreeSitter?.parseResult?.tree;
            if (!textModelTreeSitter) {
                return [];
            }
            if (!tree) {
                let e = await Event.toPromise(this.treeSitterParserService.onDidUpdateTree);
                // Once more for injections
                if (e.hasInjections) {
                    e = await Event.toPromise(this.treeSitterParserService.onDidUpdateTree);
                }
                textModelTreeSitter = e.tree;
                tree = textModelTreeSitter.parseResult?.tree;
            }
            if (!tree) {
                return [];
            }
            const result = (await this._treeSitterTokenize(textModelTreeSitter, tree, languageId)).filter(t => t.c.length > 0);
            const themeTokens = await this._getTreeSitterThemesResult(result, languageId);
            this._enrichResult(result, themeTokens);
            return result;
        }
        return [];
    }
};
Snapper = __decorate([
    __param(0, ILanguageService),
    __param(1, IWorkbenchThemeService),
    __param(2, ITextMateTokenizationService),
    __param(3, ITreeSitterParserService),
    __param(4, IModelService)
], Snapper);
async function captureTokens(accessor, resource, treeSitter = false) {
    const process = (resource) => {
        const fileService = accessor.get(IFileService);
        const fileName = basename(resource);
        const snapper = accessor.get(IInstantiationService).createInstance(Snapper);
        return fileService.readFile(resource).then(content => {
            if (treeSitter) {
                return snapper.captureTreeSitterSyntaxTokens(resource, content.value.toString());
            }
            else {
                return snapper.captureSyntaxTokens(fileName, content.value.toString());
            }
        });
    };
    if (!resource) {
        const editorService = accessor.get(IEditorService);
        const file = editorService.activeEditor ? EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, { filterByScheme: Schemas.file }) : null;
        if (file) {
            process(file).then(result => {
                console.log(result);
            });
        }
        else {
            console.log('No file editor active');
        }
    }
    else {
        const processResult = await process(resource);
        return processResult;
    }
    return undefined;
}
CommandsRegistry.registerCommand('_workbench.captureSyntaxTokens', function (accessor, resource) {
    return captureTokens(accessor, resource);
});
CommandsRegistry.registerCommand('_workbench.captureTreeSitterSyntaxTokens', function (accessor, resource) {
    // If no resource is provided, use the active editor's resource
    // This is useful for testing the command
    if (!resource) {
        const editorService = accessor.get(IEditorService);
        resource = editorService.activeEditor?.resource;
    }
    return captureTokens(accessor, resource, true);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLnRlc3QuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RoZW1lcy9icm93c2VyL3RoZW1lcy50ZXN0LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxzQkFBc0IsRUFBd0IsTUFBTSwwREFBMEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDbkUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFFakgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBYSxxQkFBcUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFB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