/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ReplacePattern } from '../../common/replace.js';
suite('Replace Pattern test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse replace string', () => {
        const testParse = (input, expected, expectedHasParameters) => {
            let actual = new ReplacePattern(input, { pattern: 'somepattern', isRegExp: true });
            assert.strictEqual(expected, actual.pattern);
            assert.strictEqual(expectedHasParameters, actual.hasParameters);
            actual = new ReplacePattern('hello' + input + 'hi', { pattern: 'sonepattern', isRegExp: true });
            assert.strictEqual('hello' + expected + 'hi', actual.pattern);
            assert.strictEqual(expectedHasParameters, actual.hasParameters);
        };
        // no backslash => no treatment
        testParse('hello', 'hello', false);
        // \t => TAB
        testParse('\\thello', '\thello', false);
        // \n => LF
        testParse('\\nhello', '\nhello', false);
        // \\t => \t
        testParse('\\\\thello', '\\thello', false);
        // \\\t => \TAB
        testParse('\\\\\\thello', '\\\thello', false);
        // \\\\t => \\t
        testParse('\\\\\\\\thello', '\\\\thello', false);
        // \ at the end => no treatment
        testParse('hello\\', 'hello\\', false);
        // \ with unknown char => no treatment
        testParse('hello\\x', 'hello\\x', false);
        // \ with back reference => no treatment
        testParse('hello\\0', 'hello\\0', false);
        // $1 => no treatment
        testParse('hello$1', 'hello$1', true);
        // $2 => no treatment
        testParse('hello$2', 'hello$2', true);
        // $12 => no treatment
        testParse('hello$12', 'hello$12', true);
        // $99 => no treatment
        testParse('hello$99', 'hello$99', true);
        // $99a => no treatment
        testParse('hello$99a', 'hello$99a', true);
        // $100 => no treatment
        testParse('hello$100', 'hello$100', false);
        // $100a => no treatment
        testParse('hello$100a', 'hello$100a', false);
        // $10a0 => no treatment
        testParse('hello$10a0', 'hello$10a0', true);
        // $$ => no treatment
        testParse('hello$$', 'hello$$', false);
        // $$0 => no treatment
        testParse('hello$$0', 'hello$$0', false);
        // $0 => $&
        testParse('hello$0', 'hello$&', true);
        testParse('hello$02', 'hello$&2', true);
        testParse('hello$`', 'hello$`', true);
        testParse('hello$\'', 'hello$\'', true);
    });
    test('create pattern by passing regExp', () => {
        let expected = /abc/;
        let actual = new ReplacePattern('hello', false, expected).regExp;
        assert.deepStrictEqual(actual, expected);
        expected = /abc/;
        actual = new ReplacePattern('hello', false, /abc/g).regExp;
        assert.deepStrictEqual(actual, expected);
        let testObject = new ReplacePattern('hello$0', false, /abc/g);
        assert.strictEqual(testObject.hasParameters, false);
        testObject = new ReplacePattern('hello$0', true, /abc/g);
        assert.strictEqual(testObject.hasParameters, true);
    });
    test('get replace string if given text is a complete match', () => {
        let testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: true });
        let actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: false });
        actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello', { pattern: '(bla)', isRegExp: true });
        actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello$0', { pattern: '(bla)', isRegExp: true });
        actual = testObject.getReplaceString('bla');
        assert.strictEqual(actual, 'hellobla');
        testObject = new ReplacePattern('import * as $1 from \'$2\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
        actual = testObject.getReplaceString('let fs = require(\'fs\')');
        assert.strictEqual(actual, 'import * as fs from \'fs\';');
        actual = testObject.getReplaceString('let something = require(\'fs\')');
        assert.strictEqual(actual, 'import * as something from \'fs\';');
        actual = testObject.getReplaceString('let require(\'fs\')');
        assert.strictEqual(actual, null);
        testObject = new ReplacePattern('import * as $1 from \'$1\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
        actual = testObject.getReplaceString('let something = require(\'fs\')');
        assert.strictEqual(actual, 'import * as something from \'something\';');
        testObject = new ReplacePattern('import * as $2 from \'$1\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
        actual = testObject.getReplaceString('let something = require(\'fs\')');
        assert.strictEqual(actual, 'import * as fs from \'something\';');
        testObject = new ReplacePattern('import * as $0 from \'$0\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
        actual = testObject.getReplaceString('let something = require(\'fs\');');
        assert.strictEqual(actual, 'import * as let something = require(\'fs\') from \'let something = require(\'fs\')\';');
        testObject = new ReplacePattern('import * as $1 from \'$2\';', { pattern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: false });
        actual = testObject.getReplaceString('let fs = require(\'fs\');');
        assert.strictEqual(actual, null);
        testObject = new ReplacePattern('cat$1', { pattern: 'for(.*)', isRegExp: true });
        actual = testObject.getReplaceString('for ()');
        assert.strictEqual(actual, 'cat ()');
    });
    test('case operations', () => {
        const testObject = new ReplacePattern('a\\u$1l\\u\\l\\U$2M$3n', { pattern: 'a(l)l(good)m(e)n', isRegExp: true });
        const actual = testObject.getReplaceString('allgoodmen');
        assert.strictEqual(actual, 'aLlGoODMen');
    });
    test('case operations - no false positive', () => {
        let testObject = new ReplacePattern('\\left $1', { pattern: '(pattern)', isRegExp: true });
        let actual = testObject.getReplaceString('pattern');
        assert.strictEqual(actual, '\\left pattern');
        testObject = new ReplacePattern('\\hi \\left $1', { pattern: '(pattern)', isRegExp: true });
        actual = testObject.getReplaceString('pattern');
        assert.strictEqual(actual, '\\hi \\left pattern');
        testObject = new ReplacePattern('\\left \\L$1', { pattern: 'PATT(ERN)', isRegExp: true });
        actual = testObject.getReplaceString('PATTERN');
        assert.strictEqual(actual, '\\left ern');
    });
    test('case operations and newline', () => {
        const testObject = new ReplacePattern('$1\n\\U$2', { pattern: '(multi)(line)', isRegExp: true });
        const actual = testObject.getReplaceString('multiline');
        assert.strictEqual(actual, 'multi\nLINE');
    });
    test('get replace string for no matches', () => {
        let testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: true });
        let actual = testObject.getReplaceString('foo');
        assert.strictEqual(actual, null);
        testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: false });
        actual = testObject.getReplaceString('foo');
        assert.strictEqual(actual, null);
    });
    test('get replace string if match is sub-string of the text', () => {
        let testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: true });
        let actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('hello', { pattern: 'bla', isRegExp: false });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'hello');
        testObject = new ReplacePattern('that', { pattern: 'this(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'that');
        testObject = new ReplacePattern('$1at', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'that');
        testObject = new ReplacePattern('$1e', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'the');
        testObject = new ReplacePattern('$1ere', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'there');
        testObject = new ReplacePattern('$1', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'th');
        testObject = new ReplacePattern('ma$1', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'math');
        testObject = new ReplacePattern('ma$1s', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'maths');
        testObject = new ReplacePattern('ma$1s', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'maths');
        testObject = new ReplacePattern('$0', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'this');
        testObject = new ReplacePattern('$0$1', { pattern: '(th)is(?=.*bla)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'thisth');
        testObject = new ReplacePattern('foo', { pattern: 'bla(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'foo');
        testObject = new ReplacePattern('f$1', { pattern: 'b(la)(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'fla');
        testObject = new ReplacePattern('f$0', { pattern: 'b(la)(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'fbla');
        testObject = new ReplacePattern('$0ah', { pattern: 'b(la)(?=\\stext$)', isRegExp: true });
        actual = testObject.getReplaceString('this is a bla text');
        assert.strictEqual(actual, 'blaah');
        testObject = new ReplacePattern('newrege$1', true, /Testrege(\w*)/);
        actual = testObject.getReplaceString('Testregex', true);
        assert.strictEqual(actual, 'Newregex');
        testObject = new ReplacePattern('newrege$1', true, /TESTREGE(\w*)/);
        actual = testObject.getReplaceString('TESTREGEX', true);
        assert.strictEqual(actual, 'NEWREGEX');
        testObject = new ReplacePattern('new_rege$1', true, /Test_Rege(\w*)/);
        actual = testObject.getReplaceString('Test_Regex', true);
        assert.strictEqual(actual, 'New_Regex');
        testObject = new ReplacePattern('new-rege$1', true, /Test-Rege(\w*)/);
        actual = testObject.getReplaceString('Test-Regex', true);
        assert.strictEqual(actual, 'New-Regex');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvdGVzdC9jb21tb24vcmVwbGFjZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFekQsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFhLEVBQUUsUUFBZ0IsRUFBRSxxQkFBOEIsRUFBRSxFQUFFO1lBQ3JGLElBQUksTUFBTSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRWhFLE1BQU0sR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEdBQUcsS0FBSyxHQUFHLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDaEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsUUFBUSxHQUFHLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFDO1FBRUYsK0JBQStCO1FBQy9CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRW5DLFlBQVk7UUFDWixTQUFTLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QyxXQUFXO1FBQ1gsU0FBUyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEMsWUFBWTtRQUNaLFNBQVMsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTNDLGVBQWU7UUFDZixTQUFTLENBQUMsY0FBYyxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU5QyxlQUFlO1FBQ2YsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVqRCwrQkFBK0I7UUFDL0IsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdkMsc0NBQXNDO1FBQ3RDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXpDLHdDQUF3QztRQUN4QyxTQUFTLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUl6QyxxQkFBcUI7UUFDckIsU0FBUyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEMscUJBQXFCO1FBQ3JCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLHNCQUFzQjtRQUN0QixTQUFTLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxzQkFBc0I7UUFDdEIsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEMsdUJBQXVCO1FBQ3ZCLFNBQVMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLHVCQUF1QjtRQUN2QixTQUFTLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQyx3QkFBd0I7UUFDeEIsU0FBUyxDQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0Msd0JBQXdCO1FBQ3hCLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVDLHFCQUFxQjtRQUNyQixTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2QyxzQkFBc0I7UUFDdEIsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekMsV0FBVztRQUNYLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXhDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDckIsSUFBSSxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFekMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUNqQixNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFekMsSUFBSSxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFcEQsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEdBQUcsRUFBRTtRQUNqRSxJQUFJLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVwQyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM5RSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXBDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQy9FLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUV2QyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0ZBQWtGLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEwsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLDZCQUE2QixDQUFDLENBQUM7UUFFMUQsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFFakUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLE9BQU8sRUFBRSxrRkFBa0YsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNoTCxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsMkNBQTJDLENBQUMsQ0FBQztRQUV4RSxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsNkJBQTZCLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0ZBQWtGLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDaEwsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFFakUsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLDZCQUE2QixFQUFFLEVBQUUsT0FBTyxFQUFFLGtGQUFrRixFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2hMLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSx1RkFBdUYsQ0FBQyxDQUFDO1FBRXBILFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLE9BQU8sRUFBRSxrRkFBa0YsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNqTCxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakgsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxJQUFJLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNGLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBRTdDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDNUYsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBRWxELFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakcsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzNDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUM5QyxJQUFJLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVqQyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM5RSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEdBQUcsRUFBRTtRQUNsRSxJQUFJLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXBDLFVBQVUsR0FBRyxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVwQyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN0RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN2RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN0RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFakMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN0RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFckMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN2RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxRixNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFdkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEUsTUFBTSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFdkMsVUFBVSxHQUFHLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN0RSxNQUFNLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV4QyxVQUFVLEdBQUcsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==