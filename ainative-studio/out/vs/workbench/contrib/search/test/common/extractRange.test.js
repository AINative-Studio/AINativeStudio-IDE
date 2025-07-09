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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0cmFjdFJhbmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvY29tbW9uL2V4dHJhY3RSYW5nZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVoRSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBRXBDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLO1FBQ25CLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFMUQsS0FBSyxNQUFNLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakQsS0FBSyxNQUFNLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxJQUFJLEdBQUcscUJBQXFCLENBQUM7Z0JBRW5DLElBQUksR0FBRyxHQUFHLHNCQUFzQixDQUFDLEdBQUcsSUFBSSxHQUFHLE9BQU8sSUFBSSxDQUFDLENBQUM7Z0JBQ3hE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