/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { getTextSearchMatchWithModelContext, editorMatchesToTextSearchResults } from '../../common/searchHelpers.js';
suite('SearchHelpers', () => {
    suite('editorMatchesToTextSearchResults', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        const mockTextModel = {
            getLineContent(lineNumber) {
                return '' + lineNumber;
            }
        };
        function assertRangesEqual(actual, expected) {
            if (!Array.isArray(actual)) {
                // All of these tests are for arrays...
                throw new Error('Expected array of ranges');
            }
            assert.strictEqual(actual.length, expected.length);
            // These are sometimes Range, sometimes SearchRange
            actual.forEach((r, i) => {
                const expectedRange = expected[i];
                assert.deepStrictEqual({ startLineNumber: r.startLineNumber, startColumn: r.startColumn, endLineNumber: r.endLineNumber, endColumn: r.endColumn }, { startLineNumber: expectedRange.startLineNumber, startColumn: expectedRange.startColumn, endLineNumber: expectedRange.endLineNumber, endColumn: expectedRange.endColumn });
            });
        }
        test('simple', () => {
            const results = editorMatchesToTextSearchResults([new FindMatch(new Range(6, 1, 6, 2), null)], mockTextModel);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].previewText, '6\n');
            assertRangesEqual(results[0].rangeLocations.map(e => e.preview), [new Range(0, 0, 0, 1)]);
            assertRangesEqual(results[0].rangeLocations.map(e => e.source), [new Range(5, 0, 5, 1)]);
        });
        test('multiple', () => {
            const results = editorMatchesToTextSearchResults([
                new FindMatch(new Range(6, 1, 6, 2), null),
                new FindMatch(new Range(6, 4, 8, 2), null),
                new FindMatch(new Range(9, 1, 10, 3), null),
            ], mockTextModel);
            assert.strictEqual(results.length, 2);
            assertRangesEqual(results[0].rangeLocations.map(e => e.preview), [
                new Range(0, 0, 0, 1),
                new Range(0, 3, 2, 1),
            ]);
            assertRangesEqual(results[0].rangeLocations.map(e => e.source), [
                new Range(5, 0, 5, 1),
                new Range(5, 3, 7, 1),
            ]);
            assert.strictEqual(results[0].previewText, '6\n7\n8\n');
            assertRangesEqual(results[1].rangeLocations.map(e => e.preview), [
                new Range(0, 0, 1, 2),
            ]);
            assertRangesEqual(results[1].rangeLocations.map(e => e.source), [
                new Range(8, 0, 9, 2),
            ]);
            assert.strictEqual(results[1].previewText, '9\n10\n');
        });
    });
    suite('addContextToEditorMatches', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        const MOCK_LINE_COUNT = 100;
        const mockTextModel = {
            getLineContent(lineNumber) {
                if (lineNumber < 1 || lineNumber > MOCK_LINE_COUNT) {
                    throw new Error(`invalid line count: ${lineNumber}`);
                }
                return '' + lineNumber;
            },
            getLineCount() {
                return MOCK_LINE_COUNT;
            }
        };
        function getQuery(surroundingContext) {
            return {
                folderQueries: [],
                type: 2 /* QueryType.Text */,
                contentPattern: { pattern: 'test' },
                surroundingContext,
            };
        }
        test('no context', () => {
            const matches = [{
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(0, 0, 0, 10)
                        }
                    ]
                }];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery()), matches);
        });
        test('simple', () => {
            const matches = [{
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(1, 0, 1, 10)
                        }
                    ]
                }
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery(1)), [
                {
                    text: '1',
                    lineNumber: 1
                },
                ...matches,
                {
                    text: '3',
                    lineNumber: 3
                },
            ]);
        });
        test('multiple matches next to each other', () => {
            const matches = [
                {
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(1, 0, 1, 10)
                        }
                    ]
                },
                {
                    previewText: 'bar',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(2, 0, 2, 10)
                        }
                    ]
                }
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery(1)), [
                {
                    text: '1',
                    lineNumber: 1
                },
                ...matches,
                {
                    text: '4',
                    lineNumber: 4
                },
            ]);
        });
        test('boundaries', () => {
            const matches = [
                {
                    previewText: 'foo',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(0, 0, 0, 10)
                        }
                    ]
                },
                {
                    previewText: 'bar',
                    rangeLocations: [
                        {
                            preview: new Range(0, 0, 0, 10),
                            source: new Range(MOCK_LINE_COUNT - 1, 0, MOCK_LINE_COUNT - 1, 10)
                        }
                    ]
                }
            ];
            assert.deepStrictEqual(getTextSearchMatchWithModelContext(matches, mockTextModel, getQuery(1)), [
                matches[0],
                {
                    text: '2',
                    lineNumber: 2
                },
                {
                    text: '' + (MOCK_LINE_COUNT - 1),
                    lineNumber: MOCK_LINE_COUNT - 1
                },
                matches[1]
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL3Rlc3QvY29tbW9uL3NlYXJjaEhlbHBlcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQWMsTUFBTSx1Q0FBdUMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVySCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQixLQUFLLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzlDLHVDQUF1QyxFQUFFLENBQUM7UUFDMUMsTUFBTSxhQUFhLEdBQUc7WUFDckIsY0FBYyxDQUFDLFVBQWtCO2dCQUNoQyxPQUFPLEVBQUUsR0FBRyxVQUFVLENBQUM7WUFDeEIsQ0FBQztTQUNhLENBQUM7UUFFaEIsU0FBUyxpQkFBaUIsQ0FBQyxNQUFxQyxFQUFFLFFBQXdCO1lBQ3pGLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLHVDQUF1QztnQkFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRW5ELG1EQUFt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