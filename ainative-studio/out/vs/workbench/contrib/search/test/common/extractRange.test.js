/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { extractRangeFromFilter } from '../../common/search.js';
suite('extractRangeFromFilter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('basics', async function () {
        assert.ok(!extractRangeFromFilter(''));
        assert.ok(!extractRangeFromFilter('/some/path'));
        assert.ok(!extractRangeFromFilter('/some/path/file.txt'));
        for (const lineSep of [':', '#', '(', ':line ']) {
            for (const colSep of [':', '#', ',']) {
                const base = '/some/path/file.txt';
                let res = extractRangeFromFilter(`${base}${lineSep}20`);
                assert.strictEqual(res?.filter, base);
                assert.strictEqual(res?.range.startLineNumber, 20);
                assert.strictEqual(res?.range.startColumn, 1);
                res = extractRangeFromFilter(`${base}${lineSep}20${colSep}`);
                assert.strictEqual(res?.filter, base);
                assert.strictEqual(res?.range.startLineNumber, 20);
                assert.strictEqual(res?.range.startColumn, 1);
                res = extractRangeFromFilter(`${base}${lineSep}20${colSep}3`);
                assert.strictEqual(res?.filter, base);
                assert.strictEqual(res?.range.startLineNumber, 20);
                assert.strictEqual(res?.range.startColumn, 3);
            }
        }
    });
    test('allow space after path', async function () {
        const res = extractRangeFromFilter('/some/path/file.txt (19,20)');
        assert.strictEqual(res?.filter, '/some/path/file.txt');
        assert.strictEqual(res?.range.startLineNumber, 19);
        assert.strictEqual(res?.range.startColumn, 20);
    });
    suite('unless', function () {
        const testSpecs = [
            // alpha-only symbol after unless
            { filter: '/some/path/file.txt@alphasymbol', unless: ['@'], result: undefined },
            // unless as first char
            { filter: '@/some/path/file.txt (19,20)', unless: ['@'], result: undefined },
            // unless as last char
            { filter: '/some/path/file.txt (19,20)@', unless: ['@'], result: undefined },
            // unless before ,
            {
                filter: '/some/@path/file.txt (19,20)', unless: ['@'], result: {
                    filter: '/some/@path/file.txt',
                    range: {
                        endColumn: 20,
                        endLineNumber: 19,
                        startColumn: 20,
                        startLineNumber: 19
                    }
                }
            },
            // unless before :
            {
                filter: '/some/@path/file.txt:19:20', unless: ['@'], result: {
                    filter: '/some/@path/file.txt',
                    range: {
                        endColumn: 20,
                        endLineNumber: 19,
                        startColumn: 20,
                        startLineNumber: 19
                    }
                }
            },
            // unless before #
            {
                filter: '/some/@path/file.txt#19', unless: ['@'], result: {
                    filter: '/some/@path/file.txt',
                    range: {
                        endColumn: 1,
                        endLineNumber: 19,
                        startColumn: 1,
                        startLineNumber: 19
                    }
                }
            },
        ];
        for (const { filter, unless, result } of testSpecs) {
            test(`${filter} - ${JSON.stringify(unless)}`, () => {
                assert.deepStrictEqual(extractRangeFromFilter(filter, unless), result);
            });
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdFJhbmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2NvbW1vbi9leHRyYWN0UmFuZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFaEUsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUVwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSztRQUNuQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO1FBRTFELEtBQUssTUFBTSxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDO2dCQUVuQyxJQUFJLEdBQUcsR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLElBQUksQ0FBQyxDQUFDO2dC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