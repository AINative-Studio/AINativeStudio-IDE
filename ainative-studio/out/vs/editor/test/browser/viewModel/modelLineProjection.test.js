/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as languages from '../../../common/languages.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { ModelLineProjectionData } from '../../../common/modelLineProjectionData.js';
import { createModelLineProjection } from '../../../common/viewModel/modelLineProjection.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModelLinesFromProjectedModel } from '../../../common/viewModel/viewModelLines.js';
import { TestConfiguration } from '../config/testConfiguration.js';
import { createTextModel } from '../../common/testTextModel.js';
suite('Editor ViewModel - SplitLinesCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('SplitLine', () => {
        let model1 = createModel('My First LineMy Second LineAnd another one');
        let line1 = createSplitLine([13, 14, 15], [13, 13 + 14, 13 + 14 + 15], 0);
        assert.strictEqual(line1.getViewLineCount(), 3);
        assert.strictEqual(line1.getViewLineContent(model1, 1, 0), 'My First Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 1), 'My Second Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 2), 'And another one');
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 0), 14);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 1), 15);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 2), 16);
        for (let col = 1; col <= 14; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(0, col), col, 'getInputColumnOfOutputPosition(0, ' + col + ')');
        }
        for (let col = 1; col <= 15; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(1, col), 13 + col, 'getInputColumnOfOutputPosition(1, ' + col + ')');
        }
        for (let col = 1; col <= 16; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(2, col), 13 + 14 + col, 'getInputColumnOfOutputPosition(2, ' + col + ')');
        }
        for (let col = 1; col <= 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(0, col), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13; col <= 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(1, col - 13), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13 + 14; col <= 15 + 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(2, col - 13 - 14), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        model1 = createModel('My First LineMy Second LineAnd another one');
        line1 = createSplitLine([13, 14, 15], [13, 13 + 14, 13 + 14 + 15], 4);
        assert.strictEqual(line1.getViewLineCount(), 3);
        assert.strictEqual(line1.getViewLineContent(model1, 1, 0), 'My First Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 1), '    My Second Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 2), '    And another one');
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 0), 14);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 1), 19);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 2), 20);
        const actualViewColumnMapping = [];
        for (let lineIndex = 0; lineIndex < line1.getViewLineCount(); lineIndex++) {
            const actualLineViewColumnMapping = [];
            for (let col = 1; col <= line1.getViewLineMaxColumn(model1, 1, lineIndex); col++) {
                actualLineViewColumnMapping.push(line1.getModelColumnOfViewPosition(lineIndex, col));
            }
            actualViewColumnMapping.push(actualLineViewColumnMapping);
        }
        assert.deepStrictEqual(actualViewColumnMapping, [
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            [14, 14, 14, 14, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
            [28, 28, 28, 28, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
        ]);
        for (let col = 1; col <= 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(0, col), '6.getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13; col <= 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(1, 4 + col - 13), '7.getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13 + 14; col <= 15 + 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(2, 4 + col - 13 - 14), '8.getOutputPositionOfInputPosition(' + col + ')');
        }
    });
    function withSplitLinesCollection(text, callback) {
        const config = new TestConfiguration({});
        const wrappingInfo = config.options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = config.options.get(52 /* EditorOption.fontInfo */);
        const wordWrapBreakAfterCharacters = config.options.get(138 /* EditorOption.wordWrapBreakAfterCharacters */);
        const wordWrapBreakBeforeCharacters = config.options.get(139 /* EditorOption.wordWrapBreakBeforeCharacters */);
        const wrappingIndent = config.options.get(143 /* EditorOption.wrappingIndent */);
        const wordBreak = config.options.get(134 /* EditorOption.wordBreak */);
        const lineBreaksComputerFactory = new MonospaceLineBreaksComputerFactory(wordWrapBreakBeforeCharacters, wordWrapBreakAfterCharacters);
        const model = createTextModel([
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n'));
        const linesCollection = new ViewModelLinesFromProjectedModel(1, model, lineBreaksComputerFactory, lineBreaksComputerFactory, fontInfo, model.getOptions().tabSize, 'simple', wrappingInfo.wrappingColumn, wrappingIndent, wordBreak);
        callback(model, linesCollection);
        linesCollection.dispose();
        model.dispose();
        config.dispose();
    }
    test('Invalid line numbers', () => {
        const text = [
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n');
        withSplitLinesCollection(text, (model, linesCollection) => {
            assert.strictEqual(linesCollection.getViewLineCount(), 6);
            // getOutputIndentGuide
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(-1, -1), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(0, 0), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(1, 1), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(2, 2), [1]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(3, 3), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(4, 4), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(5, 5), [1]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(6, 6), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(7, 7), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(0, 7), [0, 1, 0, 0, 1, 0]);
            // getOutputLineContent
            assert.strictEqual(linesCollection.getViewLineContent(-1), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(0), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(1), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(2), '\tprintf("Hello world!");');
            assert.strictEqual(linesCollection.getViewLineContent(3), '}');
            assert.strictEqual(linesCollection.getViewLineContent(4), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(5), '\tprintf("Hello world!");');
            assert.strictEqual(linesCollection.getViewLineContent(6), '}');
            assert.strictEqual(linesCollection.getViewLineContent(7), '}');
            // getOutputLineMinColumn
            assert.strictEqual(linesCollection.getViewLineMinColumn(-1), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(0), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(1), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(2), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(3), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(4), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(5), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(6), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(7), 1);
            // getOutputLineMaxColumn
            assert.strictEqual(linesCollection.getViewLineMaxColumn(-1), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(0), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(1), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(2), 25);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(3), 2);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(4), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(5), 25);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(6), 2);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(7), 2);
            // convertOutputPositionToInputPosition
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(-1, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(0, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(1, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(2, 1), new Position(2, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(3, 1), new Position(3, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(4, 1), new Position(4, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(5, 1), new Position(5, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(6, 1), new Position(6, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(7, 1), new Position(6, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(8, 1), new Position(6, 1));
        });
    });
    test('issue #3662', () => {
        const text = [
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n');
        withSplitLinesCollection(text, (model, linesCollection) => {
            linesCollection.setHiddenAreas([
                new Range(1, 1, 3, 1),
                new Range(5, 1, 6, 1)
            ]);
            const viewLineCount = linesCollection.getViewLineCount();
            assert.strictEqual(viewLineCount, 1, 'getOutputLineCount()');
            const modelLineCount = model.getLineCount();
            for (let lineNumber = 0; lineNumber <= modelLineCount + 1; lineNumber++) {
                const lineMinColumn = (lineNumber >= 1 && lineNumber <= modelLineCount) ? model.getLineMinColumn(lineNumber) : 1;
                const lineMaxColumn = (lineNumber >= 1 && lineNumber <= modelLineCount) ? model.getLineMaxColumn(lineNumber) : 1;
                for (let column = lineMinColumn - 1; column <= lineMaxColumn + 1; column++) {
                    const viewPosition = linesCollection.convertModelPositionToViewPosition(lineNumber, column);
                    // validate view position
                    let viewLineNumber = viewPosition.lineNumber;
                    let viewColumn = viewPosition.column;
                    if (viewLineNumber < 1) {
                        viewLineNumber = 1;
                    }
                    const lineCount = linesCollection.getViewLineCount();
                    if (viewLineNumber > lineCount) {
                        viewLineNumber = lineCount;
                    }
                    const viewMinColumn = linesCollection.getViewLineMinColumn(viewLineNumber);
                    const viewMaxColumn = linesCollection.getViewLineMaxColumn(viewLineNumber);
                    if (viewColumn < viewMinColumn) {
                        viewColumn = viewMinColumn;
                    }
                    if (viewColumn > viewMaxColumn) {
                        viewColumn = viewMaxColumn;
                    }
                    const validViewPosition = new Position(viewLineNumber, viewColumn);
                    assert.strictEqual(viewPosition.toString(), validViewPosition.toString(), 'model->view for ' + lineNumber + ', ' + column);
                }
            }
            for (let lineNumber = 0; lineNumber <= viewLineCount + 1; lineNumber++) {
                const lineMinColumn = linesCollection.getViewLineMinColumn(lineNumber);
                const lineMaxColumn = linesCollection.getViewLineMaxColumn(lineNumber);
                for (let column = lineMinColumn - 1; column <= lineMaxColumn + 1; column++) {
                    const modelPosition = linesCollection.convertViewPositionToModelPosition(lineNumber, column);
                    const validModelPosition = model.validatePosition(modelPosition);
                    assert.strictEqual(modelPosition.toString(), validModelPosition.toString(), 'view->model for ' + lineNumber + ', ' + column);
                }
            }
        });
    });
});
suite('SplitLinesCollection', () => {
    const _text = [
        'class Nice {',
        '	function hi() {',
        '		console.log("Hello world");',
        '	}',
        '	function hello() {',
        '		console.log("Hello world, this is a somewhat longer line");',
        '	}',
        '}',
    ];
    const _tokens = [
        [
            { startIndex: 0, value: 1 },
            { startIndex: 5, value: 2 },
            { startIndex: 6, value: 3 },
            { startIndex: 10, value: 4 },
        ],
        [
            { startIndex: 0, value: 5 },
            { startIndex: 1, value: 6 },
            { startIndex: 9, value: 7 },
            { startIndex: 10, value: 8 },
            { startIndex: 12, value: 9 },
        ],
        [
            { startIndex: 0, value: 10 },
            { startIndex: 2, value: 11 },
            { startIndex: 9, value: 12 },
            { startIndex: 10, value: 13 },
            { startIndex: 13, value: 14 },
            { startIndex: 14, value: 15 },
            { startIndex: 27, value: 16 },
        ],
        [
            { startIndex: 0, value: 17 },
        ],
        [
            { startIndex: 0, value: 18 },
            { startIndex: 1, value: 19 },
            { startIndex: 9, value: 20 },
            { startIndex: 10, value: 21 },
            { startIndex: 15, value: 22 },
        ],
        [
            { startIndex: 0, value: 23 },
            { startIndex: 2, value: 24 },
            { startIndex: 9, value: 25 },
            { startIndex: 10, value: 26 },
            { startIndex: 13, value: 27 },
            { startIndex: 14, value: 28 },
            { startIndex: 59, value: 29 },
        ],
        [
            { startIndex: 0, value: 30 },
        ],
        [
            { startIndex: 0, value: 31 },
        ]
    ];
    let model;
    let languageRegistration;
    setup(() => {
        let _lineIndex = 0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokens = _tokens[_lineIndex++];
                const result = new Uint32Array(2 * tokens.length);
                for (let i = 0; i < tokens.length; i++) {
                    result[2 * i] = tokens[i].startIndex;
                    result[2 * i + 1] = (tokens[i].value << 15 /* MetadataConsts.FOREGROUND_OFFSET */);
                }
                return new languages.EncodedTokenizationResult(result, state);
            }
        };
        const LANGUAGE_ID = 'modelModeTest1';
        languageRegistration = languages.TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        model = createTextModel(_text.join('\n'), LANGUAGE_ID);
        // force tokenization
        model.tokenization.forceTokenization(model.getLineCount());
    });
    teardown(() => {
        model.dispose();
        languageRegistration.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertViewLineTokens(_actual, expected) {
        const actual = [];
        for (let i = 0, len = _actual.getCount(); i < len; i++) {
            actual[i] = {
                endIndex: _actual.getEndOffset(i),
                value: _actual.getForeground(i)
            };
        }
        assert.deepStrictEqual(actual, expected);
    }
    function assertMinimapLineRenderingData(actual, expected) {
        if (actual === null && expected === null) {
            assert.ok(true);
            return;
        }
        if (expected === null) {
            assert.ok(false);
        }
        assert.strictEqual(actual.content, expected.content);
        assert.strictEqual(actual.minColumn, expected.minColumn);
        assert.strictEqual(actual.maxColumn, expected.maxColumn);
        assertViewLineTokens(actual.tokens, expected.tokens);
    }
    function assertMinimapLinesRenderingData(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assertMinimapLineRenderingData(actual[i], expected[i]);
        }
    }
    function assertAllMinimapLinesRenderingData(splitLinesCollection, all) {
        const lineCount = all.length;
        for (let line = 1; line <= lineCount; line++) {
            assert.strictEqual(splitLinesCollection.getViewLineData(line).content, splitLinesCollection.getViewLineContent(line));
        }
        for (let start = 1; start <= lineCount; start++) {
            for (let end = start; end <= lineCount; end++) {
                const count = end - start + 1;
                for (let desired = Math.pow(2, count) - 1; desired >= 0; desired--) {
                    const needed = [];
                    const expected = [];
                    for (let i = 0; i < count; i++) {
                        needed[i] = (desired & (1 << i)) ? true : false;
                        expected[i] = (needed[i] ? all[start - 1 + i] : null);
                    }
                    const actual = splitLinesCollection.getViewLinesData(start, end, needed);
                    assertMinimapLinesRenderingData(actual, expected);
                    // Comment out next line to test all possible combinations
                    break;
                }
            }
        }
    }
    test('getViewLinesData - no wrapping', () => {
        withSplitLinesCollection(model, 'off', 0, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 8);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            const _expected = [
                {
                    content: 'class Nice {',
                    minColumn: 1,
                    maxColumn: 13,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 10, value: 3 },
                        { endIndex: 12, value: 4 },
                    ]
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ]
                },
                {
                    content: '		console.log("Hello world");',
                    minColumn: 1,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 27, value: 15 },
                        { endIndex: 29, value: 16 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 17 },
                    ]
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ]
                },
                {
                    content: '		console.log("Hello world, this is a somewhat longer line");',
                    minColumn: 1,
                    maxColumn: 62,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 59, value: 28 },
                        { endIndex: 61, value: 29 },
                    ]
                },
                {
                    minColumn: 1,
                    maxColumn: 3,
                    content: '	}',
                    tokens: [
                        { endIndex: 2, value: 30 },
                    ]
                },
                {
                    minColumn: 1,
                    maxColumn: 2,
                    content: '}',
                    tokens: [
                        { endIndex: 1, value: 31 },
                    ]
                }
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
            ]);
            splitLinesCollection.setHiddenAreas([new Range(2, 1, 4, 1)]);
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 5);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
            ]);
        });
    });
    test('getViewLinesData - with wrapping', () => {
        withSplitLinesCollection(model, 'wordWrapColumn', 30, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 12);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            const _expected = [
                {
                    content: 'class Nice {',
                    minColumn: 1,
                    maxColumn: 13,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 10, value: 3 },
                        { endIndex: 12, value: 4 },
                    ]
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 21, value: 15 },
                    ]
                },
                {
                    content: '            world");',
                    minColumn: 13,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 18, value: 15 },
                        { endIndex: 20, value: 16 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 17 },
                    ]
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 21, value: 28 },
                    ]
                },
                {
                    content: '            world, this is a ',
                    minColumn: 13,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 29, value: 28 },
                    ]
                },
                {
                    content: '            somewhat longer ',
                    minColumn: 13,
                    maxColumn: 29,
                    tokens: [
                        { endIndex: 28, value: 28 },
                    ]
                },
                {
                    content: '            line");',
                    minColumn: 13,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 17, value: 28 },
                        { endIndex: 19, value: 29 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 30 },
                    ]
                },
                {
                    content: '}',
                    minColumn: 1,
                    maxColumn: 2,
                    tokens: [
                        { endIndex: 1, value: 31 },
                    ]
                }
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
            splitLinesCollection.setHiddenAreas([new Range(2, 1, 4, 1)]);
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 8);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
        });
    });
    test('getViewLinesData - with wrapping and injected text', () => {
        model.deltaDecorations([], [{
                range: new Range(1, 9, 1, 9),
                options: {
                    description: 'example',
                    after: {
                        content: 'very very long injected text that causes a line break',
                        inlineClassName: 'myClassName'
                    },
                    showIfCollapsed: true,
                }
            }]);
        withSplitLinesCollection(model, 'wordWrapColumn', 30, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 14);
            assert.strictEqual(splitLinesCollection.getViewLineMaxColumn(1), 24);
            const _expected = [
                {
                    content: 'class Nivery very long ',
                    minColumn: 1,
                    maxColumn: 24,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 8, value: 3 },
                        { endIndex: 23, value: 1 },
                    ]
                },
                {
                    content: '    injected text that causes ',
                    minColumn: 5,
                    maxColumn: 31,
                    tokens: [{ endIndex: 30, value: 1 }]
                },
                {
                    content: '    a line breakce {',
                    minColumn: 5,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 16, value: 1 },
                        { endIndex: 18, value: 3 },
                        { endIndex: 20, value: 4 }
                    ]
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 21, value: 15 },
                    ]
                },
                {
                    content: '            world");',
                    minColumn: 13,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 18, value: 15 },
                        { endIndex: 20, value: 16 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 17 },
                    ]
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ]
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 21, value: 28 },
                    ]
                },
                {
                    content: '            world, this is a ',
                    minColumn: 13,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 29, value: 28 },
                    ]
                },
                {
                    content: '            somewhat longer ',
                    minColumn: 13,
                    maxColumn: 29,
                    tokens: [
                        { endIndex: 28, value: 28 },
                    ]
                },
                {
                    content: '            line");',
                    minColumn: 13,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 17, value: 28 },
                        { endIndex: 19, value: 29 },
                    ]
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [
                        { endIndex: 2, value: 30 },
                    ]
                },
                {
                    content: '}',
                    minColumn: 1,
                    maxColumn: 2,
                    tokens: [
                        { endIndex: 1, value: 31 },
                    ]
                }
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
            const data = splitLinesCollection.getViewLinesData(1, 14, new Array(14).fill(true));
            assert.deepStrictEqual(data.map((d) => ({
                inlineDecorations: d.inlineDecorations?.map((d) => ({
                    startOffset: d.startOffset,
                    endOffset: d.endOffset,
                })),
            })), [
                { inlineDecorations: [{ startOffset: 8, endOffset: 23 }] },
                { inlineDecorations: [{ startOffset: 4, endOffset: 30 }] },
                { inlineDecorations: [{ startOffset: 4, endOffset: 16 }] },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
            ]);
        });
    });
    function withSplitLinesCollection(model, wordWrap, wordWrapColumn, callback) {
        const configuration = new TestConfiguration({
            wordWrap: wordWrap,
            wordWrapColumn: wordWrapColumn,
            wrappingIndent: 'indent'
        });
        const wrappingInfo = configuration.options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = configuration.options.get(52 /* EditorOption.fontInfo */);
        const wordWrapBreakAfterCharacters = configuration.options.get(138 /* EditorOption.wordWrapBreakAfterCharacters */);
        const wordWrapBreakBeforeCharacters = configuration.options.get(139 /* EditorOption.wordWrapBreakBeforeCharacters */);
        const wrappingIndent = configuration.options.get(143 /* EditorOption.wrappingIndent */);
        const wordBreak = configuration.options.get(134 /* EditorOption.wordBreak */);
        const lineBreaksComputerFactory = new MonospaceLineBreaksComputerFactory(wordWrapBreakBeforeCharacters, wordWrapBreakAfterCharacters);
        const linesCollection = new ViewModelLinesFromProjectedModel(1, model, lineBreaksComputerFactory, lineBreaksComputerFactory, fontInfo, model.getOptions().tabSize, 'simple', wrappingInfo.wrappingColumn, wrappingIndent, wordBreak);
        callback(linesCollection);
        configuration.dispose();
    }
});
function pos(lineNumber, column) {
    return new Position(lineNumber, column);
}
function createSplitLine(splitLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth, isVisible = true) {
    return createModelLineProjection(createLineBreakData(splitLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth), isVisible);
}
function createLineBreakData(breakingLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth) {
    const sums = [];
    for (let i = 0; i < breakingLengths.length; i++) {
        sums[i] = (i > 0 ? sums[i - 1] : 0) + breakingLengths[i];
    }
    return new ModelLineProjectionData(null, null, sums, breakingOffsetsVisibleColumn, wrappedTextIndentWidth);
}
function createModel(text) {
    return {
        tokenization: {
            getLineTokens: (lineNumber) => {
                return null;
            },
        },
        getLineContent: (lineNumber) => {
            return text;
        },
        getLineLength: (lineNumber) => {
            return text.length;
        },
        getLineMinColumn: (lineNumber) => {
            return 1;
        },
        getLineMaxColumn: (lineNumber) => {
            return text.length + 1;
        },
        getValueInRange: (range, eol) => {
            return text.substring(range.startColumn - 1, range.endColumn - 1);
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvdmlld01vZGVsL21vZGVsTGluZVByb2plY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU5RCxPQUFPLEtBQUssU0FBUyxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUd0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUdyRixPQUFPLEVBQXNDLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakksT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWhFLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7SUFFckQsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsNENBQTRDLENBQUMsQ0FBQztR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QyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0MsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDNUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ2hGLENBQUMsQ0FBQztRQUVILEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNwQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxxQ0FBcUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDdEksQ0FBQztRQUNELEtBQUssSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUscUNBQXFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQy9JLENBQUM7UUFDRCxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLHFDQUFxQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNwSixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLHdCQUF3QixDQUFDLElBQVksRUFBRSxRQUF1RjtRQUN0SSxNQUFNLE1BQU0sR0FBRyxJQUFJLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxxQ0FBMkIsQ0FBQztRQUNuRSxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsZ0NBQXVCLENBQUM7UUFDM0QsTUFBTSw0QkFBNEIsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcscURBQTJDLENBQUM7UUFDbkcsTUFBTSw2QkFBNkIsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsc0RBQTRDLENBQUM7UUFDckcsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLHVDQUE2QixDQUFDO1FBQ3ZFLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxrQ0FBd0IsQ0FBQztRQUM3RCxNQUFNLHlCQUF5QixHQUFHLElBQUksa0NBQWtDLENBQUMsNkJBQTZCLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUV0SSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUM7WUFDN0IsY0FBYztZQUNkLDJCQUEyQjtZQUMzQixHQUFHO1lBQ0gsY0FBYztZQUNkLDJCQUEyQjtZQUMzQixHQUFHO1NBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVkLE1BQU0sZUFBZSxHQUFHLElBQUksZ0NBQWdDLENBQzNELENBQUMsRUFDRCxLQUFLLEVBQ0wseUJBQXlCLEVBQ3pCLHlCQUF5QixFQUN6QixRQUFRLEVBQ1IsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sRUFDMUIsUUFBUSxFQUNSLFlBQVksQ0FBQyxjQUFjLEVBQzNCLGNBQWMsRUFDZCxTQUFTLENBQ1QsQ0FBQztRQUVGLFFBQVEsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFakMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNoQixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEIsQ0FBQztJQUVELElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFFakMsTUFBTSxJQUFJLEdBQUc7WUFDWixjQUFjO1lBQ2QsMkJBQTJCO1lBQzNCLEdBQUc7WUFDSCxjQUFjO1lBQ2QsMkJBQTJCO1lBQzNCLEdBQUc7U0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUViLHdCQUF3QixDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRTtZQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRTFELHVCQUF1QjtZQUN2QixNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM5RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFNUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTNGLHVCQUF1QjtZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLENBQUM7WUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztZQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUUvRCx5QkFBeUI7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUvRCx5QkFBeUI7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUvRCx1Q0FBdUM7WUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JHLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxR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LEVBQUU7WUFDM0IsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7U0FDNUI7UUFDRDtZQUNDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1lBQzNCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1lBQzNCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1lBQzNCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1lBQzVCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1NBQzVCO1FBQ0Q7WUFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM3QixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM3QixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM3QixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtTQUM3QjtRQUNEO1lBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7U0FDNUI7UUFDRDtZQUNDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzVCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQzVCLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVB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