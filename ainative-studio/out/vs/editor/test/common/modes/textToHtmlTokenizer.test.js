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
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EncodedTokenizationResult, TokenizationRegistry } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { _tokenizeToString, tokenizeLineToHTML } from '../../../common/languages/textToHtmlTokenizer.js';
import { LanguageIdCodec } from '../../../common/services/languagesRegistry.js';
import { TestLineToken, TestLineTokens } from '../core/testLineToken.js';
import { createModelServices } from '../testTextModel.js';
suite('Editor Modes - textToHtmlTokenizer', () => {
    let disposables;
    let instantiationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function toStr(pieces) {
        const resultArr = pieces.map((t) => `<span class="${t.className}">${t.text}</span>`);
        return resultArr.join('');
    }
    test('TextToHtmlTokenizer 1', () => {
        const mode = disposables.add(instantiationService.createInstance(Mode));
        const support = TokenizationRegistry.get(mode.languageId);
        const actual = _tokenizeToString('.abc..def...gh', new LanguageIdCodec(), support);
        const expected = [
            { className: 'mtk7', text: '.' },
            { className: 'mtk9', text: 'abc' },
            { className: 'mtk7', text: '..' },
            { className: 'mtk9', text: 'def' },
            { className: 'mtk7', text: '...' },
            { className: 'mtk9', text: 'gh' },
        ];
        const expectedStr = `<div class="monaco-tokenized-source">${toStr(expected)}</div>`;
        assert.strictEqual(actual, expectedStr);
    });
    test('TextToHtmlTokenizer 2', () => {
        const mode = disposables.add(instantiationService.createInstance(Mode));
        const support = TokenizationRegistry.get(mode.languageId);
        const actual = _tokenizeToString('.abc..def...gh\n.abc..def...gh', new LanguageIdCodec(), support);
        const expected1 = [
            { className: 'mtk7', text: '.' },
            { className: 'mtk9', text: 'abc' },
            { className: 'mtk7', text: '..' },
            { className: 'mtk9', text: 'def' },
            { className: 'mtk7', text: '...' },
            { className: 'mtk9', text: 'gh' },
        ];
        const expected2 = [
            { className: 'mtk7', text: '.' },
            { className: 'mtk9', text: 'abc' },
            { className: 'mtk7', text: '..' },
            { className: 'mtk9', text: 'def' },
            { className: 'mtk7', text: '...' },
            { className: 'mtk9', text: 'gh' },
        ];
        const expectedStr1 = toStr(expected1);
        const expectedStr2 = toStr(expected2);
        const expectedStr = `<div class="monaco-tokenized-source">${expectedStr1}<br/>${expectedStr2}</div>`;
        assert.strictEqual(actual, expectedStr);
    });
    test('tokenizeLineToHTML', () => {
        const text = 'Ciao hello world!';
        const lineTokens = new TestLineTokens([
            new TestLineToken(4, ((3 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                | ((2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>> 0),
            new TestLineToken(5, ((1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(10, ((4 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(11, ((1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(17, ((5 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                | ((4 /* FontStyle.Underline */) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>> 0)
        ]);
        const colorMap = [null, '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 17, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">world!</span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 12, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">w</span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 11, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 1, 11, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">iao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 4, 11, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160;</span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 5, 11, 4, true), [
            '<div>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 5, 10, 4, true), [
            '<div>',
            '<span style="color: #00ff00;">hello</span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 6, 9, 4, true), [
            '<div>',
            '<span style="color: #00ff00;">ell</span>',
            '</div>'
        ].join(''));
    });
    test('tokenizeLineToHTML handle spaces #35954', () => {
        const text = '  Ciao   hello world!';
        const lineTokens = new TestLineTokens([
            new TestLineToken(2, ((1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(6, ((3 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                | ((2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>> 0),
            new TestLineToken(9, ((1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(14, ((4 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(15, ((1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0),
            new TestLineToken(21, ((5 << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                | ((4 /* FontStyle.Underline */) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>> 0)
        ]);
        const colorMap = [null, '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 21, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160; </span>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> &#160; </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">world!</span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 17, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160; </span>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> &#160; </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">wo</span>',
            '</div>'
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 3, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160; </span>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">C</span>',
            '</div>'
        ].join(''));
    });
});
let Mode = class Mode extends Disposable {
    constructor(languageService) {
        super();
        this.languageId = 'textToHtmlTokenizerMode';
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(TokenizationRegistry.register(this.languageId, {
            getInitialState: () => null,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokensArr = [];
                let prevColor = -1;
                for (let i = 0; i < line.length; i++) {
                    const colorId = (line.charAt(i) === '.' ? 7 : 9);
                    if (prevColor !== colorId) {
                        tokensArr.push(i);
                        tokensArr.push((colorId << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0);
                    }
                    prevColor = colorId;
                }
                const tokens = new Uint32Array(tokensArr.length);
                for (let i = 0; i < tokens.length; i++) {
                    tokens[i] = tokensArr[i];
                }
                return new EncodedTokenizationResult(tokens, null);
            }
        }));
    }
};
Mode = __decorate([
    __param(0, ILanguageService)
], Mode);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9tb2Rlcy90ZXh0VG9IdG1sVG9rZW5pemVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFVLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHMUQsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUVoRCxJQUFJLFdBQTRCLENBQUM7SUFDakMsSUFBSSxvQkFBOEMsQ0FBQztJQUVuRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDcEMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekQsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMs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