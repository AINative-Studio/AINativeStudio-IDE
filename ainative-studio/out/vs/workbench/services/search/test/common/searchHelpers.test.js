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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoSGVscGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9jb21tb24vc2VhcmNoSGVscGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBYyxNQUFNLHVDQUF1QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXJILEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDOUMsdUNBQXVDLEVBQUUsQ0FBQztRQUMxQyxNQUFNLGFBQWEsR0FBRztZQUNyQixjQUFjLENBQUMsVUFBa0I7Z0JBQ2hDLE9BQU8sRUFBRSxHQUFHLFVBQVUsQ0FBQztZQUN4QixDQUFDO1NBQ2EsQ0FBQztRQUVoQixTQUFTLGlCQUFpQixDQUFDLE1BQXFDLEVBQUUsUUFBd0I7WUFDekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsdUNBQXVDO2dCQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbkQsbURBQW1EO1lB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