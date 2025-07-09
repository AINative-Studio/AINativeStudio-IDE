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
var InspectTokensController_1;
import './inspectTokens.css';
import { $, append, reset } from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { TokenizationRegistry } from '../../../common/languages.js';
import { TokenMetadata } from '../../../common/encodedTokenAttributes.js';
import { NullState, nullTokenize, nullTokenizeEncoded } from '../../../common/languages/nullTokenize.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { IStandaloneThemeService } from '../../common/standaloneTheme.js';
import { InspectTokensNLS } from '../../../common/standaloneStrings.js';
let InspectTokensController = class InspectTokensController extends Disposable {
    static { InspectTokensController_1 = this; }
    static { this.ID = 'editor.contrib.inspectTokens'; }
    static get(editor) {
        return editor.getContribution(InspectTokensController_1.ID);
    }
    constructor(editor, standaloneColorService, languageService) {
        super();
        this._editor = editor;
        this._languageService = languageService;
        this._widget = null;
        this._register(this._editor.onDidChangeModel((e) => this.stop()));
        this._register(this._editor.onDidChangeModelLanguage((e) => this.stop()));
        this._register(TokenizationRegistry.onDidChange((e) => this.stop()));
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
        this._widget = new InspectTokensWidget(this._editor, this._languageService);
    }
    stop() {
        if (this._widget) {
            this._widget.dispose();
            this._widget = null;
        }
    }
};
InspectTokensController = InspectTokensController_1 = __decorate([
    __param(1, IStandaloneThemeService),
    __param(2, ILanguageService)
], InspectTokensController);
class InspectTokens extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inspectTokens',
            label: InspectTokensNLS.inspectTokensAction,
            alias: 'Developer: Inspect Tokens',
            precondition: undefined
        });
    }
    run(accessor, editor) {
        const controller = InspectTokensController.get(editor);
        controller?.launch();
    }
}
function renderTokenText(tokenText) {
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
function getSafeTokenizationSupport(languageIdCodec, languageId) {
    const tokenizationSupport = TokenizationRegistry.get(languageId);
    if (tokenizationSupport) {
        return tokenizationSupport;
    }
    const encodedLanguageId = languageIdCodec.encodeLanguageId(languageId);
    return {
        getInitialState: () => NullState,
        tokenize: (line, hasEOL, state) => nullTokenize(languageId, state),
        tokenizeEncoded: (line, hasEOL, state) => nullTokenizeEncoded(encodedLanguageId, state)
    };
}
class InspectTokensWidget extends Disposable {
    static { this._ID = 'editor.contrib.inspectTokensWidget'; }
    constructor(editor, languageService) {
        super();
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this._editor = editor;
        this._languageService = languageService;
        this._model = this._editor.getModel();
        this._domNode = document.createElement('div');
        this._domNode.className = 'tokens-inspect-widget';
        this._tokenizationSupport = getSafeTokenizationSupport(this._languageService.languageIdCodec, this._model.getLanguageId());
        this._compute(this._editor.getPosition());
        this._register(this._editor.onDidChangeCursorPosition((e) => this._compute(this._editor.getPosition())));
        this._editor.addContentWidget(this);
    }
    dispose() {
        this._editor.removeContentWidget(this);
        super.dispose();
    }
    getId() {
        return InspectTokensWidget._ID;
    }
    _compute(position) {
        const data = this._getTokensAtLine(position.lineNumber);
        let token1Index = 0;
        for (let i = data.tokens1.length - 1; i >= 0; i--) {
            const t = data.tokens1[i];
            if (position.column - 1 >= t.offset) {
                token1Index = i;
                break;
            }
        }
        let token2Index = 0;
        for (let i = (data.tokens2.length >>> 1); i >= 0; i--) {
            if (position.column - 1 >= data.tokens2[(i << 1)]) {
                token2Index = i;
                break;
            }
        }
        const lineContent = this._model.getLineContent(position.lineNumber);
        let tokenText = '';
        if (token1Index < data.tokens1.length) {
            const tokenStartIndex = data.tokens1[token1Index].offset;
            const tokenEndIndex = token1Index + 1 < data.tokens1.length ? data.tokens1[token1Index + 1].offset : lineContent.length;
            tokenText = lineContent.substring(tokenStartIndex, tokenEndIndex);
        }
        reset(this._domNode, $('h2.tm-token', undefined, renderTokenText(tokenText), $('span.tm-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'char' : 'chars'}`)));
        append(this._domNode, $('hr.tokens-inspect-separator', { 'style': 'clear:both' }));
        const metadata = (token2Index << 1) + 1 < data.tokens2.length ? this._decodeMetadata(data.tokens2[(token2Index << 1) + 1]) : null;
        append(this._domNode, $('table.tm-metadata-table', undefined, $('tbody', undefined, $('tr', undefined, $('td.tm-metadata-key', undefined, 'language'), $('td.tm-metadata-value', undefined, `${metadata ? metadata.languageId : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'token type'), $('td.tm-metadata-value', undefined, `${metadata ? this._tokenTypeToString(metadata.tokenType) : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'font style'), $('td.tm-metadata-value', undefined, `${metadata ? this._fontStyleToString(metadata.fontStyle) : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'foreground'), $('td.tm-metadata-value', undefined, `${metadata ? Color.Format.CSS.formatHex(metadata.foreground) : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'background'), $('td.tm-metadata-value', undefined, `${metadata ? Color.Format.CSS.formatHex(metadata.background) : '-?-'}`)))));
        append(this._domNode, $('hr.tokens-inspect-separator'));
        if (token1Index < data.tokens1.length) {
            append(this._domNode, $('span.tm-token-type', undefined, data.tokens1[token1Index].type));
        }
        this._editor.layoutContentWidget(this);
    }
    _decodeMetadata(metadata) {
        const colorMap = TokenizationRegistry.getColorMap();
        const languageId = TokenMetadata.getLanguageId(metadata);
        const tokenType = TokenMetadata.getTokenType(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        const foreground = TokenMetadata.getForeground(metadata);
        const background = TokenMetadata.getBackground(metadata);
        return {
            languageId: this._languageService.languageIdCodec.decodeLanguageId(languageId),
            tokenType: tokenType,
            fontStyle: fontStyle,
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
    _fontStyleToString(fontStyle) {
        let r = '';
        if (fontStyle & 1 /* FontStyle.Italic */) {
            r += 'italic ';
        }
        if (fontStyle & 2 /* FontStyle.Bold */) {
            r += 'bold ';
        }
        if (fontStyle & 4 /* FontStyle.Underline */) {
            r += 'underline ';
        }
        if (fontStyle & 8 /* FontStyle.Strikethrough */) {
            r += 'strikethrough ';
        }
        if (r.length === 0) {
            r = '---';
        }
        return r;
    }
    _getTokensAtLine(lineNumber) {
        const stateBeforeLine = this._getStateBeforeLine(lineNumber);
        const tokenizationResult1 = this._tokenizationSupport.tokenize(this._model.getLineContent(lineNumber), true, stateBeforeLine);
        const tokenizationResult2 = this._tokenizationSupport.tokenizeEncoded(this._model.getLineContent(lineNumber), true, stateBeforeLine);
        return {
            startState: stateBeforeLine,
            tokens1: tokenizationResult1.tokens,
            tokens2: tokenizationResult2.tokens,
            endState: tokenizationResult1.endState
        };
    }
    _getStateBeforeLine(lineNumber) {
        let state = this._tokenizationSupport.getInitialState();
        for (let i = 1; i < lineNumber; i++) {
            const tokenizationResult = this._tokenizationSupport.tokenize(this._model.getLineContent(i), true, state);
            state = tokenizationResult.endState;
        }
        return state;
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
registerEditorContribution(InspectTokensController.ID, InspectTokensController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(InspectTokens);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdFRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL2luc3BlY3RUb2tlbnMvaW5zcGVjdFRva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQztBQUM3QixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQW9CLG9CQUFvQixFQUFFLDBCQUEwQixFQUFtQyxNQUFNLHNDQUFzQyxDQUFDO0FBSXpLLE9BQU8sRUFBZ0Msb0JBQW9CLEVBQTJCLE1BQU0sOEJBQThCLENBQUM7QUFDM0gsT0FBTyxFQUFnQyxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR3hFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTs7YUFFeEIsT0FBRSxHQUFHLDhCQUE4QixBQUFqQyxDQUFrQztJQUVwRCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQ3BDLE9BQU8sTUFB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