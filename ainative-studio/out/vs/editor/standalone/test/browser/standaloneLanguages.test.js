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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL3Rlc3QvYnJvd3Nlci9zdGFuZGFsb25lTGFuZ3VhZ2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUF1QiwwQkFBMEIsRUFBa0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUV2SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFHekUsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUV6Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQztJQUMxQixvRkFBb0Y7SUFFcEYsTUFBTSxjQUFlLFNBQVEsVUFBVTtRQUV0QztZQUNDLEtBQUssQ0FBQyxJQUFLLEVBQUUsSUFBSyxDQUFDLENBQUM7WUFGYixZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBR3BCLENBQUM7UUFDZSxLQUFLLENBQUMsVUFB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