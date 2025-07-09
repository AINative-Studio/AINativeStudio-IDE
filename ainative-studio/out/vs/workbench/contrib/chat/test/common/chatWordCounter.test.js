/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getNWords } from '../../common/chatWordCounter.js';
suite('ChatWordCounter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function doTest(str, nWords, resultStr) {
        const result = getNWords(str, nWords);
        assert.strictEqual(result.value, resultStr);
        assert.strictEqual(result.returnedWordCount, nWords);
    }
    suite('getNWords', () => {
        test('matching actualWordCount', () => {
            const cases = [
                ['hello world', 1, 'hello'],
                ['hello', 1, 'hello'],
                ['hello world', 0, ''],
                ['here\'s, some.   punctuation?', 3, 'here\'s, some.   punctuation?'],
                ['| markdown | _table_ | header |', 3, '| markdown | _table_ | header |'],
                ['| --- | --- | --- |', 1, '| ---'],
                ['| --- | --- | --- |', 3, '| --- | --- | --- |'],
                [' \t some \n whitespace     \n\n\nhere   ', 3, ' \t some \n whitespace     \n\n\nhere   '],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
        test('whitespace', () => {
            assert.deepStrictEqual(getNWords('hello ', 1), {
                value: 'hello ',
                returnedWordCount: 1,
                isFullString: true,
                totalWordCount: 1,
            });
            assert.deepStrictEqual(getNWords('hello\n\n', 1), {
                value: 'hello\n\n',
                returnedWordCount: 1,
                isFullString: true,
                totalWordCount: 1,
            });
            assert.deepStrictEqual(getNWords('\nhello', 1), {
                value: '\nhello',
                returnedWordCount: 1,
                isFullString: true,
                totalWordCount: 1,
            });
        });
        test('matching links', () => {
            const cases = [
                ['[hello](https://example.com) world', 1, '[hello](https://example.com)'],
                ['[hello](https://example.com) world', 2, '[hello](https://example.com) world'],
                ['oh [hello](https://example.com "title") world', 1, 'oh'],
                ['oh [hello](https://example.com "title") world', 2, 'oh [hello](https://example.com "title")'],
                // Parens in link destination
                ['[hello](https://example.com?()) world', 1, '[hello](https://example.com?())'],
                // Escaped brackets in link text
                ['[he \\[l\\] \\]lo](https://example.com?()) world', 1, '[he \\[l\\] \\]lo](https://example.com?())'],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
        test('code', () => {
            const cases = [
                ['let a=1-2', 2, 'let a'],
                ['let a=1-2', 3, 'let a='],
                ['let a=1-2', 4, 'let a=1'],
                ['const myVar = 1+2', 4, 'const myVar = 1'],
                ['<div id="myDiv"></div>', 3, '<div id='],
                ['<div id="myDiv"></div>', 4, '<div id="myDiv"></div>'],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
        test('chinese characters', () => {
            const cases = [
                ['我喜欢中国菜', 3, '我喜欢'],
            ];
            cases.forEach(([str, nWords, result]) => doTest(str, nWords, result));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0V29yZENvdW50ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBb0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUU5RSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsU0FBUyxNQUFNLENBQUMsR0FBVyxFQUFFLE1BQWMsRUFBRSxTQUFpQjtRQUM3RCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdkIsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtZQUNyQyxNQUFNLEtBQUssR0FBK0I7Z0JBQ3pDLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQzNCLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUM7Z0JBQ3JCLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3RCLENBQUMsK0JBQStCLEVB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