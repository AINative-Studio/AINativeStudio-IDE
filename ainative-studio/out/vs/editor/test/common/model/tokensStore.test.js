/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TokenMetadata } from '../../../common/encodedTokenAttributes.js';
import { ILanguageConfigurationService, LanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { LanguageIdCodec } from '../../../common/services/languagesRegistry.js';
import { LineTokens } from '../../../common/tokens/lineTokens.js';
import { SparseMultilineTokens } from '../../../common/tokens/sparseMultilineTokens.js';
import { SparseTokensStore } from '../../../common/tokens/sparseTokensStore.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../testTextModel.js';
suite('TokensStore', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const SEMANTIC_COLOR = 5;
    function parseTokensState(state) {
        const text = [];
        const tokens = [];
        let baseLine = 1;
        for (let i = 0; i < state.length; i++) {
            const line = state[i];
            let startOffset = 0;
            let lineText = '';
            while (true) {
                const firstPipeOffset = line.indexOf('|', startOffset);
                if (firstPipeOffset === -1) {
                    break;
                }
                const secondPipeOffset = line.indexOf('|', firstPipeOffset + 1);
                if (secondPipeOffset === -1) {
                    break;
                }
                if (firstPipeOffset + 1 === secondPipeOffset) {
                    // skip ||
                    lineText += line.substring(startOffset, secondPipeOffset + 1);
                    startOffset = secondPipeOffset + 1;
                    continue;
                }
                lineText += line.substring(startOffset, firstPipeOffset);
                const tokenStartCharacter = lineText.length;
                const tokenLength = secondPipeOffset - firstPipeOffset - 1;
                const metadata = (SEMANTIC_COLOR << 15 /* MetadataConsts.FOREGROUND_OFFSET */
                    | 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */);
                if (tokens.length === 0) {
                    baseLine = i + 1;
                }
                tokens.push(i + 1 - baseLine, tokenStartCharacter, tokenStartCharacter + tokenLength, metadata);
                lineText += line.substr(firstPipeOffset + 1, tokenLength);
                startOffset = secondPipeOffset + 1;
            }
            lineText += line.substring(startOffset);
            text.push(lineText);
        }
        return {
            text: text.join('\n'),
            tokens: SparseMultilineTokens.create(baseLine, new Uint32Array(tokens))
        };
    }
    function extractState(model) {
        const result = [];
        for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const lineContent = model.getLineContent(lineNumber);
            let lineText = '';
            for (let i = 0; i < lineTokens.getCount(); i++) {
                const tokenStartCharacter = lineTokens.getStartOffset(i);
                const tokenEndCharacter = lineTokens.getEndOffset(i);
                const metadata = lineTokens.getMetadata(i);
                const color = TokenMetadata.getForeground(metadata);
                const tokenText = lineContent.substring(tokenStartCharacter, tokenEndCharacter);
                if (color === SEMANTIC_COLOR) {
                    lineText += `|${tokenText}|`;
                }
                else {
                    lineText += tokenText;
                }
            }
            result.push(lineText);
        }
        return result;
    }
    function testTokensAdjustment(rawInitialState, edits, rawFinalState) {
        const initialState = parseTokensState(rawInitialState);
        const model = createTextModel(initialState.text);
        model.tokenization.setSemanticTokens([initialState.tokens], true);
        model.applyEdits(edits);
        const actualState = extractState(model);
        assert.deepStrictEqual(actualState, rawFinalState);
        model.dispose();
    }
    test('issue #86303 - color shifting between different tokens', () => {
        testTokensAdjustment([
            `import { |URI| } from 'vs/base/common/uri';`,
            `const foo = |URI|.parse('hey');`
        ], [
            { range: new Range(2, 9, 2, 10), text: '' }
        ], [
            `import { |URI| } from 'vs/base/common/uri';`,
            `const fo = |URI|.parse('hey');`
        ]);
    });
    test('deleting a newline', () => {
        testTokensAdjustment([
            `import { |URI| } from 'vs/base/common/uri';`,
            `const foo = |URI|.parse('hey');`
        ], [
            { range: new Range(1, 42, 2, 1), text: '' }
        ], [
            `import { |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`
        ]);
    });
    test('inserting a newline', () => {
        testTokensAdjustment([
            `import { |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`
        ], [
            { range: new Range(1, 42, 1, 42), text: '\n' }
        ], [
            `import { |URI| } from 'vs/base/common/uri';`,
            `const foo = |URI|.parse('hey');`
        ]);
    });
    test('deleting a newline 2', () => {
        testTokensAdjustment([
            `import { `,
            `    |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`
        ], [
            { range: new Range(1, 10, 2, 5), text: '' }
        ], [
            `import { |URI| } from 'vs/base/common/uri';const foo = |URI|.parse('hey');`
        ]);
    });
    test('issue #179268: a complex edit', () => {
        testTokensAdjustment([
            `|export| |'interior_material_selector.dart'|;`,
            `|export| |'mileage_selector.dart'|;`,
            `|export| |'owners_selector.dart'|;`,
            `|export| |'price_selector.dart'|;`,
            `|export| |'seat_count_selector.dart'|;`,
            `|export| |'year_selector.dart'|;`,
            `|export| |'winter_options_selector.dart'|;|export| |'camera_selector.dart'|;`
        ], [
            { range: new Range(1, 9, 1, 9), text: `camera_selector.dart';\nexport '` },
            { range: new Range(6, 9, 7, 9), text: `` },
            { range: new Range(7, 39, 7, 39), text: `\n` },
            { range: new Range(7, 47, 7, 48), text: `ye` },
            { range: new Range(7, 49, 7, 51), text: `` },
            { range: new Range(7, 52, 7, 53), text: `` },
        ], [
            `|export| |'|camera_selector.dart';`,
            `export 'interior_material_selector.dart';`,
            `|export| |'mileage_selector.dart'|;`,
            `|export| |'owners_selector.dart'|;`,
            `|export| |'price_selector.dart'|;`,
            `|export| |'seat_count_selector.dart'|;`,
            `|export| |'||winter_options_selector.dart'|;`,
            `|export| |'year_selector.dart'|;`
        ]);
    });
    test('issue #91936: Semantic token color highlighting fails on line with selected text', () => {
        const model = createTextModel('                    else if ($s = 08) then \'\\b\'');
        model.tokenization.setSemanticTokens([
            SparseMultilineTokens.create(1, new Uint32Array([
                0, 20, 24, 0b01111000000000010000,
                0, 25, 27, 0b01111000000000010000,
                0, 28, 29, 0b00001000000000010000,
                0, 29, 31, 0b10000000000000010000,
                0, 32, 33, 0b00001000000000010000,
                0, 34, 36, 0b00110000000000010000,
                0, 36, 37, 0b00001000000000010000,
                0, 38, 42, 0b01111000000000010000,
                0, 43, 47, 0b01011000000000010000,
            ]))
        ], true);
        const lineTokens = model.tokenization.getLineTokens(1);
        const decodedTokens = [];
        for (let i = 0, len = lineTokens.getCount(); i < len; i++) {
            decodedTokens.push(lineTokens.getEndOffset(i), lineTokens.getMetadata(i));
        }
        assert.deepStrictEqual(decodedTokens, [
            20, 0b10000000001000010000000001,
            24, 0b10000001111000010000000001,
            25, 0b10000000001000010000000001,
            27, 0b10000001111000010000000001,
            28, 0b10000000001000010000000001,
            29, 0b10000000001000010000000001,
            31, 0b10000010000000010000000001,
            32, 0b10000000001000010000000001,
            33, 0b10000000001000010000000001,
            34, 0b10000000001000010000000001,
            36, 0b10000000110000010000000001,
            37, 0b10000000001000010000000001,
            38, 0b10000000001000010000000001,
            42, 0b10000001111000010000000001,
            43, 0b10000000001000010000000001,
            47, 0b10000001011000010000000001
        ]);
        model.dispose();
    });
    test('issue #147944: Language id "vs.editor.nullLanguage" is not configured nor known', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables, [
            [ILanguageConfigurationService, LanguageConfigurationService]
        ]);
        const model = disposables.add(instantiateTextModel(instantiationService, '--[[\n\n]]'));
        model.tokenization.setSemanticTokens([
            SparseMultilineTokens.create(1, new Uint32Array([
                0, 2, 4, 0b100000000000010000,
                1, 0, 0, 0b100000000000010000,
                2, 0, 2, 0b100000000000010000,
            ]))
        ], true);
        assert.strictEqual(model.getWordAtPosition(new Position(2, 1)), null);
        disposables.dispose();
    });
    test('partial tokens 1', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1,
                5, 5, 10, 2,
                10, 5, 10, 3,
                15, 5, 10, 4,
                20, 5, 10, 5,
                25, 5, 10, 6,
            ]))
        ]);
        // setPartial: [18,1 -> 42,1], [(20,5-10),(25,5-10),(30,5-10),(35,5-10),(40,5-10)]
        store.setPartial(new Range(18, 1, 42, 1), [
            SparseMultilineTokens.create(20, new Uint32Array([
                0, 5, 10, 4,
                5, 5, 10, 5,
                10, 5, 10, 6,
                15, 5, 10, 7,
                20, 5, 10, 8,
            ]))
        ]);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1,
                5, 5, 10, 2,
                10, 5, 10, 3,
                15, 5, 10, 4,
                20, 5, 10, 5,
                25, 5, 10, 6,
            ]))
        ]);
        const lineTokens = store.addSparseTokens(10, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 3);
    });
    test('partial tokens 2', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1,
                5, 5, 10, 2,
                10, 5, 10, 3,
                15, 5, 10, 4,
                20, 5, 10, 5,
                25, 5, 10, 6,
            ]))
        ]);
        // setPartial: [6,1 -> 36,2], [(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10),(35,5-10)]
        store.setPartial(new Range(6, 1, 36, 2), [
            SparseMultilineTokens.create(10, new Uint32Array([
                0, 5, 10, 2,
                5, 5, 10, 3,
                10, 5, 10, 4,
                15, 5, 10, 5,
                20, 5, 10, 6,
            ]))
        ]);
        // setPartial: [17,1 -> 42,1], [(20,5-10),(25,5-10),(30,5-10),(35,5-10),(40,5-10)]
        store.setPartial(new Range(17, 1, 42, 1), [
            SparseMultilineTokens.create(20, new Uint32Array([
                0, 5, 10, 4,
                5, 5, 10, 5,
                10, 5, 10, 6,
                15, 5, 10, 7,
                20, 5, 10, 8,
            ]))
        ]);
        const lineTokens = store.addSparseTokens(20, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 3);
    });
    test('partial tokens 3', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 31,2], [(5,5-10),(10,5-10),(15,5-10),(20,5-10),(25,5-10),(30,5-10)]
        store.setPartial(new Range(1, 1, 31, 2), [
            SparseMultilineTokens.create(5, new Uint32Array([
                0, 5, 10, 1,
                5, 5, 10, 2,
                10, 5, 10, 3,
                15, 5, 10, 4,
                20, 5, 10, 5,
                25, 5, 10, 6,
            ]))
        ]);
        // setPartial: [11,1 -> 16,2], [(15,5-10),(20,5-10)]
        store.setPartial(new Range(11, 1, 16, 2), [
            SparseMultilineTokens.create(10, new Uint32Array([
                0, 5, 10, 3,
                5, 5, 10, 4,
            ]))
        ]);
        const lineTokens = store.addSparseTokens(5, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 3);
    });
    test('issue #94133: Semantic colors stick around when using (only) range provider', () => {
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial: [1,1 -> 1,20] [(1,9-11)]
        store.setPartial(new Range(1, 1, 1, 20), [
            SparseMultilineTokens.create(1, new Uint32Array([
                0, 9, 11, 1,
            ]))
        ]);
        // setPartial: [1,1 -> 1,20], []
        store.setPartial(new Range(1, 1, 1, 20), []);
        const lineTokens = store.addSparseTokens(1, new LineTokens(new Uint32Array([12, 1]), `enum Enum1 {`, codec));
        assert.strictEqual(lineTokens.getCount(), 1);
    });
    test('bug', () => {
        function createTokens(str) {
            str = str.replace(/^\[\(/, '');
            str = str.replace(/\)\]$/, '');
            const strTokens = str.split('),(');
            const result = [];
            let firstLineNumber = 0;
            for (const strToken of strTokens) {
                const pieces = strToken.split(',');
                const chars = pieces[1].split('-');
                const lineNumber = parseInt(pieces[0], 10);
                const startChar = parseInt(chars[0], 10);
                const endChar = parseInt(chars[1], 10);
                if (firstLineNumber === 0) {
                    // this is the first line
                    firstLineNumber = lineNumber;
                }
                result.push(lineNumber - firstLineNumber, startChar, endChar, (lineNumber + startChar) % 13);
            }
            return SparseMultilineTokens.create(firstLineNumber, new Uint32Array(result));
        }
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        // setPartial [36446,1 -> 36475,115] [(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62)]
        store.setPartial(new Range(36446, 1, 36475, 115), [createTokens('[(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62)]')]);
        // setPartial [36436,1 -> 36464,142] [(36437,33-37),(36437,38-42),(36437,47-57),(36437,58-67),(36438,35-53),(36438,54-62),(36440,24-29),(36440,33-46),(36440,47-53),(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62)]
        store.setPartial(new Range(36436, 1, 36464, 142), [createTokens('[(36437,33-37),(36437,38-42),(36437,47-57),(36437,58-67),(36438,35-53),(36438,54-62),(36440,24-29),(36440,33-46),(36440,47-53),(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62)]')]);
        // setPartial [36457,1 -> 36485,140] [(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62),(36477,28-32),(36477,33-37),(36477,42-52),(36477,53-69),(36478,32-36),(36478,37-41),(36478,46-56),(36478,57-74),(36479,32-36),(36479,37-41),(36479,46-56),(36479,57-76),(36480,32-36),(36480,37-41),(36480,46-56),(36480,57-68),(36481,32-36),(36481,37-41),(36481,46-56),(36481,57-68),(36482,39-57),(36482,58-66),(36484,34-38),(36484,39-45),(36484,46-50),(36484,55-65),(36484,66-82),(36484,86-97),(36484,98-102),(36484,103-109),(36484,111-124),(36484,125-133),(36485,39-57),(36485,58-66)]
        store.setPartial(new Range(36457, 1, 36485, 140), [createTokens('[(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35),(36470,38-46),(36473,25-35),(36473,36-51),(36474,28-33),(36474,36-49),(36474,50-58),(36475,35-53),(36475,54-62),(36477,28-32),(36477,33-37),(36477,42-52),(36477,53-69),(36478,32-36),(36478,37-41),(36478,46-56),(36478,57-74),(36479,32-36),(36479,37-41),(36479,46-56),(36479,57-76),(36480,32-36),(36480,37-41),(36480,46-56),(36480,57-68),(36481,32-36),(36481,37-41),(36481,46-56),(36481,57-68),(36482,39-57),(36482,58-66),(36484,34-38),(36484,39-45),(36484,46-50),(36484,55-65),(36484,66-82),(36484,86-97),(36484,98-102),(36484,103-109),(36484,111-124),(36484,125-133),(36485,39-57),(36485,58-66)]')]);
        // setPartial [36441,1 -> 36469,56] [(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35)]
        store.setPartial(new Range(36441, 1, 36469, 56), [createTokens('[(36442,25-35),(36442,36-50),(36443,30-39),(36443,42-46),(36443,47-53),(36443,54-58),(36443,63-73),(36443,74-84),(36443,87-91),(36443,92-98),(36443,101-105),(36443,106-112),(36443,113-119),(36444,28-37),(36444,38-42),(36444,47-57),(36444,58-75),(36444,80-95),(36444,96-105),(36445,35-53),(36445,54-62),(36448,24-29),(36448,33-46),(36448,47-54),(36450,25-35),(36450,36-50),(36451,28-33),(36451,36-49),(36451,50-57),(36452,35-53),(36452,54-62),(36454,33-38),(36454,41-54),(36454,55-60),(36455,35-53),(36455,54-62),(36457,33-44),(36457,45-49),(36457,50-56),(36457,62-83),(36457,84-88),(36458,35-53),(36458,54-62),(36460,33-37),(36460,38-42),(36460,47-57),(36460,58-67),(36461,35-53),(36461,54-62),(36463,34-38),(36463,39-45),(36463,46-51),(36463,54-63),(36463,64-71),(36463,76-80),(36463,81-87),(36463,88-92),(36463,97-107),(36463,108-119),(36464,35-53),(36464,54-62),(36466,33-71),(36466,72-76),(36467,35-53),(36467,54-62),(36469,24-29),(36469,33-46),(36469,47-54),(36470,24-35)]')]);
        const lineTokens = store.addSparseTokens(36451, new LineTokens(new Uint32Array([60, 1]), `                        if (flags & ModifierFlags.Ambient) {`, codec));
        assert.strictEqual(lineTokens.getCount(), 7);
    });
    test('issue #95949: Identifiers are colored in bold when targetting keywords', () => {
        function createTMMetadata(foreground, fontStyle, languageId) {
            return ((languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */)
                | (fontStyle << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)
                | (foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */)) >>> 0;
        }
        function toArr(lineTokens) {
            const r = [];
            for (let i = 0; i < lineTokens.getCount(); i++) {
                r.push(lineTokens.getEndOffset(i));
                r.push(lineTokens.getMetadata(i));
            }
            return r;
        }
        const codec = new LanguageIdCodec();
        const store = new SparseTokensStore(codec);
        store.set([
            SparseMultilineTokens.create(1, new Uint32Array([
                0, 6, 11, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) | 16 /* MetadataConsts.SEMANTIC_USE_FOREGROUND */,
            ]))
        ], true);
        const lineTokens = store.addSparseTokens(1, new LineTokens(new Uint32Array([
            5, createTMMetadata(5, 2 /* FontStyle.Bold */, 53),
            14, createTMMetadata(1, 0 /* FontStyle.None */, 53),
            17, createTMMetadata(6, 0 /* FontStyle.None */, 53),
            18, createTMMetadata(1, 0 /* FontStyle.None */, 53),
        ]), `const hello = 123;`, codec));
        const actual = toArr(lineTokens);
        assert.deepStrictEqual(actual, [
            5, createTMMetadata(5, 2 /* FontStyle.Bold */, 53),
            6, createTMMetadata(1, 0 /* FontStyle.None */, 53),
            11, createTMMetadata(1, 0 /* FontStyle.None */, 53),
            14, createTMMetadata(1, 0 /* FontStyle.None */, 53),
            17, createTMMetadata(6, 0 /* FontStyle.None */, 53),
            18, createTMMetadata(1, 0 /* FontStyle.None */, 53)
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5zU3RvcmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvdG9rZW5zU3RvcmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFzQyxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUV6SSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVqRyxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUV6Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sY0FBYyxHQUFHLENBQVksQ0FBQztJQUVwQyxTQUFTLGdCQUFnQixDQUFDLEtBQWU7UUFDeEMsTUFBTSxJ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LEVBQUUsQ0FBQztnQkFDWixFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQ1osQ0FBQyxDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBRUgsMkZBQTJGO1FBQzNGLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDeEMscUJBQXFCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLFdBQVcsQ0FBQztnQkFDaEQsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDWCxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNYLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQ1osRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDWixFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQ1osQ0FBQyxDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBRUgsa0ZBQWtGO1FBQ2xGLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUU7WUFDekMscUJBQXFCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLFdBQVcsQ0FBQztnQkFDaEQsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDWCxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUNYLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQ1osRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDWixFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQ1osQ0FBQyxDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxFQUFF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