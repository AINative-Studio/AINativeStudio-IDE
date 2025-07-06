/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Token } from '../../../common/languages.js';
import { TokenTheme } from '../../../common/languages/supports/tokenization.js';
import { LanguageService } from '../../../common/services/languageService.js';
import { TokenizationSupportAdapter } from '../../browser/standaloneLanguages.js';
import { UnthemedProductIconTheme } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
suite('TokenizationSupport2Adapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const languageId = 'tttt';
    // const tokenMetadata = (LanguageId.PlainText << MetadataConsts.LANGUAGEID_OFFSET);
    class MockTokenTheme extends TokenTheme {
        constructor() {
            super(null, null);
            this.counter = 0;
        }
        match(languageId, token) {
            return (((this.counter++) << 15 /* MetadataConsts.FOREGROUND_OFFSET */)
                | (languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)) >>> 0;
        }
    }
    class MockThemeService {
        constructor() {
            this._builtInProductIconTheme = new UnthemedProductIconTheme();
            this.onDidColorThemeChange = new Emitter().event;
            this.onDidFileIconThemeChange = new Emitter().event;
            this.onDidProductIconThemeChange = new Emitter().event;
        }
        setTheme(themeName) {
            throw new Error('Not implemented');
        }
        setAutoDetectHighContrast(autoDetectHighContrast) {
            throw new Error('Not implemented');
        }
        defineTheme(themeName, themeData) {
            throw new Error('Not implemented');
        }
        getColorTheme() {
            return {
                label: 'mock',
                tokenTheme: new MockTokenTheme(),
                themeName: ColorScheme.LIGHT,
                type: ColorScheme.LIGHT,
                getColor: (color, useDefault) => {
                    throw new Error('Not implemented');
                },
                defines: (color) => {
                    throw new Error('Not implemented');
                },
                getTokenStyleMetadata: (type, modifiers, modelLanguage) => {
                    return undefined;
                },
                semanticHighlighting: false,
                tokenColorMap: []
            };
        }
        setColorMapOverride(colorMapOverride) {
        }
        getFileIconTheme() {
            return {
                hasFileIcons: false,
                hasFolderIcons: false,
                hidesExplorerArrows: false
            };
        }
        getProductIconTheme() {
            return this._builtInProductIconTheme;
        }
    }
    class MockState {
        static { this.INSTANCE = new MockState(); }
        constructor() { }
        clone() {
            return this;
        }
        equals(other) {
            return this === other;
        }
    }
    function testBadTokensProvider(providerTokens, expectedClassicTokens, expectedModernTokens) {
        class BadTokensProvider {
            getInitialState() {
                return MockState.INSTANCE;
            }
            tokenize(line, state) {
                return {
                    tokens: providerTokens,
                    endState: MockState.INSTANCE
                };
            }
        }
        const disposables = new DisposableStore();
        const languageService = disposables.add(new LanguageService());
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const adapter = new TokenizationSupportAdapter(languageId, new BadTokensProvider(), languageService, new MockThemeService());
        const actualClassicTokens = adapter.tokenize('whatever', true, MockState.INSTANCE);
        assert.deepStrictEqual(actualClassicTokens.tokens, expectedClassicTokens);
        const actualModernTokens = adapter.tokenizeEncoded('whatever', true, MockState.INSTANCE);
        const modernTokens = [];
        for (let i = 0; i < actualModernTokens.tokens.length; i++) {
            modernTokens[i] = actualModernTokens.tokens[i];
        }
        // Add the encoded language id to the expected tokens
        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(languageId);
        const tokenLanguageMetadata = (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
        for (let i = 1; i < expectedModernTokens.length; i += 2) {
            expectedModernTokens[i] |= tokenLanguageMetadata;
        }
        assert.deepStrictEqual(modernTokens, expectedModernTokens);
        disposables.dispose();
    }
    test('tokens always start at index 0', () => {
        testBadTokensProvider([
            { startIndex: 7, scopes: 'foo' },
            { startIndex: 0, scopes: 'bar' }
        ], [
            new Token(0, 'foo', languageId),
            new Token(0, 'bar', languageId),
        ], [
            0, (0 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            0, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */
        ]);
    });
    test('tokens always start after each other', () => {
        testBadTokensProvider([
            { startIndex: 0, scopes: 'foo' },
            { startIndex: 5, scopes: 'bar' },
            { startIndex: 3, scopes: 'foo' },
        ], [
            new Token(0, 'foo', languageId),
            new Token(5, 'bar', languageId),
            new Token(5, 'foo', languageId),
        ], [
            0, (0 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            5, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */,
            5, (2 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvdGVzdC9icm93c2VyL3N0YW5kYWxvbmVMYW5ndWFnZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQXVCLDBCQUEwQixFQUFrQixNQUFNLHNDQUFzQyxDQUFDO0FBRXZILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRWpHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUd6RSxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBRXpDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDO0lBQzFCLG9GQUFvRjtJQUVwRixNQUFNLGNBQWUsU0FBUSxVQUFVO1FBRXRDO1lBQ0MsS0FBSyxDQUFDLElBQUssRUFBRSxJQUFLLENBQUMsQ0FBQztZQUZiLFlBQU8sR0FBRyxDQUFDLENBQUM7UUFHcEIsQ0FBQztRQUNlLEtBQUssQ0FBQyxVQUFz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