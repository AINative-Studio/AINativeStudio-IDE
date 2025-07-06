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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdFdvcmRDb3VudGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQW9CLE1BQU0saUNBQWlDLENBQUM7QUFFOUUsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUM3Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLFNBQVMsTUFBTSxDQUFDLEdBQVcsRUFBRSxNQUFjLEVBQUUsU0FBaUI7UUFDN0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxLQUFLLEdBQStCO2dCQUN6QyxDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUMzQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDO2dCQUNyQixDQUFDLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0QixDQUFDLCtCQUEr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