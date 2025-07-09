/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { buildReplaceStringWithCasePreserved } from '../../../../../base/common/search.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { parseReplaceString, ReplacePattern, ReplacePiece } from '../../browser/replacePattern.js';
suite('Replace Pattern test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse replace string', () => {
        const testParse = (input, expectedPieces) => {
            const actual = parseReplaceString(input);
            const expected = new ReplacePattern(expectedPieces);
            assert.deepStrictEqual(actual, expected, 'Parsing ' + input);
        };
        // no backslash => no treatment
        testParse('hello', [ReplacePiece.staticValue('hello')]);
        // \t => TAB
        testParse('\\thello', [ReplacePiece.staticValue('\thello')]);
        testParse('h\\tello', [ReplacePiece.staticValue('h\tello')]);
        testParse('hello\\t', [ReplacePiece.staticValue('hello\t')]);
        // \n => LF
        testParse('\\nhello', [ReplacePiece.staticValue('\nhello')]);
        // \\t => \t
        testParse('\\\\thello', [ReplacePiece.staticValue('\\thello')]);
        testParse('h\\\\tello', [ReplacePiece.staticValue('h\\tello')]);
        testParse('hello\\\\t', [ReplacePiece.staticValue('hello\\t')]);
        // \\\t => \TAB
        testParse('\\\\\\thello', [ReplacePiece.staticValue('\\\thello')]);
        // \\\\t => \\t
        testParse('\\\\\\\\thello', [ReplacePiece.staticValue('\\\\thello')]);
        // \ at the end => no treatment
        testParse('hello\\', [ReplacePiece.staticValue('hello\\')]);
        // \ with unknown char => no treatment
        testParse('hello\\x', [ReplacePiece.staticValue('hello\\x')]);
        // \ with back reference => no treatment
        testParse('hello\\0', [ReplacePiece.staticValue('hello\\0')]);
        testParse('hello$&', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0)]);
        testParse('hello$0', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0)]);
        testParse('hello$02', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(0), ReplacePiece.staticValue('2')]);
        testParse('hello$1', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1)]);
        testParse('hello$2', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(2)]);
        testParse('hello$9', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(9)]);
        testParse('$9hello', [ReplacePiece.matchIndex(9), ReplacePiece.staticValue('hello')]);
        testParse('hello$12', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(12)]);
        testParse('hello$99', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(99)]);
        testParse('hello$99a', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(99), ReplacePiece.staticValue('a')]);
        testParse('hello$1a', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1), ReplacePiece.staticValue('a')]);
        testParse('hello$100', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(10), ReplacePiece.staticValue('0')]);
        testParse('hello$100a', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(10), ReplacePiece.staticValue('0a')]);
        testParse('hello$10a0', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(10), ReplacePiece.staticValue('a0')]);
        testParse('hello$$', [ReplacePiece.staticValue('hello$')]);
        testParse('hello$$0', [ReplacePiece.staticValue('hello$0')]);
        testParse('hello$`', [ReplacePiece.staticValue('hello$`')]);
        testParse('hello$\'', [ReplacePiece.staticValue('hello$\'')]);
    });
    test('parse replace string with case modifiers', () => {
        const testParse = (input, expectedPieces) => {
            const actual = parseReplaceString(input);
            const expected = new ReplacePattern(expectedPieces);
            assert.deepStrictEqual(actual, expected, 'Parsing ' + input);
        };
        function assertReplace(target, search, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.strictEqual(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
        }
        // \U, \u => uppercase  \L, \l => lowercase  \E => cancel
        testParse('hello\\U$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['U'])]);
        assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\U$1(', 'func PRIVATEFUNC(');
        testParse('hello\\u$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['u'])]);
        assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\u$1(', 'func PrivateFunc(');
        testParse('hello\\L$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['L'])]);
        assertReplace('func privateFunc(', /func (\w+)\(/, 'func \\L$1(', 'func privatefunc(');
        testParse('hello\\l$1', [ReplacePiece.staticValue('hello'), ReplacePiece.caseOps(1, ['l'])]);
        assertReplace('func PrivateFunc(', /func (\w+)\(/, 'func \\l$1(', 'func privateFunc(');
        testParse('hello$1\\u\\u\\U$4goodbye', [ReplacePiece.staticValue('hello'), ReplacePiece.matchIndex(1), ReplacePiece.caseOps(4, ['u', 'u', 'U']), ReplacePiece.staticValue('goodbye')]);
        assertReplace('hellogooDbye', /hello(\w+)/, 'hello\\u\\u\\l\\l\\U$1', 'helloGOodBYE');
    });
    test('replace has JavaScript semantics', () => {
        const testJSReplaceSemantics = (target, search, replaceString, expected) => {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.deepStrictEqual(actual, expected, `${target}.replace(${search}, ${replaceString})`);
        };
        testJSReplaceSemantics('hi', /hi/, 'hello', 'hi'.replace(/hi/, 'hello'));
        testJSReplaceSemantics('hi', /hi/, '\\t', 'hi'.replace(/hi/, '\t'));
        testJSReplaceSemantics('hi', /hi/, '\\n', 'hi'.replace(/hi/, '\n'));
        testJSReplaceSemantics('hi', /hi/, '\\\\t', 'hi'.replace(/hi/, '\\t'));
        testJSReplaceSemantics('hi', /hi/, '\\\\n', 'hi'.replace(/hi/, '\\n'));
        // implicit capture group 0
        testJSReplaceSemantics('hi', /hi/, 'hello$&', 'hi'.replace(/hi/, 'hello$&'));
        testJSReplaceSemantics('hi', /hi/, 'hello$0', 'hi'.replace(/hi/, 'hello$&'));
        testJSReplaceSemantics('hi', /hi/, 'hello$&1', 'hi'.replace(/hi/, 'hello$&1'));
        testJSReplaceSemantics('hi', /hi/, 'hello$01', 'hi'.replace(/hi/, 'hello$&1'));
        // capture groups have funny semantics in replace strings
        // the replace string interprets $nn as a captured group only if it exists in the search regex
        testJSReplaceSemantics('hi', /(hi)/, 'hello$10', 'hi'.replace(/(hi)/, 'hello$10'));
        testJSReplaceSemantics('hi', /(hi)()()()()()()()()()/, 'hello$10', 'hi'.replace(/(hi)()()()()()()()()()/, 'hello$10'));
        testJSReplaceSemantics('hi', /(hi)/, 'hello$100', 'hi'.replace(/(hi)/, 'hello$100'));
        testJSReplaceSemantics('hi', /(hi)/, 'hello$20', 'hi'.replace(/(hi)/, 'hello$20'));
    });
    test('get replace string if given text is a complete match', () => {
        function assertReplace(target, search, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.strictEqual(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
        }
        assertReplace('bla', /bla/, 'hello', 'hello');
        assertReplace('bla', /(bla)/, 'hello', 'hello');
        assertReplace('bla', /(bla)/, 'hello$0', 'hellobla');
        const searchRegex = /let\s+(\w+)\s*=\s*require\s*\(\s*['"]([\w\.\-/]+)\s*['"]\s*\)\s*/;
        assertReplace('let fs = require(\'fs\')', searchRegex, 'import * as $1 from \'$2\';', 'import * as fs from \'fs\';');
        assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $1 from \'$2\';', 'import * as something from \'fs\';');
        assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $1 from \'$1\';', 'import * as something from \'something\';');
        assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $2 from \'$1\';', 'import * as fs from \'something\';');
        assertReplace('let something = require(\'fs\')', searchRegex, 'import * as $0 from \'$0\';', 'import * as let something = require(\'fs\') from \'let something = require(\'fs\')\';');
        assertReplace('let fs = require(\'fs\')', searchRegex, 'import * as $1 from \'$2\';', 'import * as fs from \'fs\';');
        assertReplace('for ()', /for(.*)/, 'cat$1', 'cat ()');
        // issue #18111
        assertReplace('HRESULT OnAmbientPropertyChange(DISPID   dispid);', /\b\s{3}\b/, ' ', ' ');
    });
    test('get replace string if match is sub-string of the text', () => {
        function assertReplace(target, search, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const m = search.exec(target);
            const actual = replacePattern.buildReplaceString(m);
            assert.strictEqual(actual, expected, `${target}.replace(${search}, ${replaceString}) === ${expected}`);
        }
        assertReplace('this is a bla text', /bla/, 'hello', 'hello');
        assertReplace('this is a bla text', /this(?=.*bla)/, 'that', 'that');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1at', 'that');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1e', 'the');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1ere', 'there');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$1', 'th');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, 'ma$1', 'math');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, 'ma$1s', 'maths');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$0', 'this');
        assertReplace('this is a bla text', /(th)is(?=.*bla)/, '$0$1', 'thisth');
        assertReplace('this is a bla text', /bla(?=\stext$)/, 'foo', 'foo');
        assertReplace('this is a bla text', /b(la)(?=\stext$)/, 'f$1', 'fla');
        assertReplace('this is a bla text', /b(la)(?=\stext$)/, 'f$0', 'fbla');
        assertReplace('this is a bla text', /b(la)(?=\stext$)/, '$0ah', 'blaah');
    });
    test('issue #19740 Find and replace capture group/backreference inserts `undefined` instead of empty string', () => {
        const replacePattern = parseReplaceString('a{$1}');
        const matches = /a(z)?/.exec('abcd');
        const actual = replacePattern.buildReplaceString(matches);
        assert.strictEqual(actual, 'a{}');
    });
    test('buildReplaceStringWithCasePreserved test', () => {
        function assertReplace(target, replaceString, expected) {
            let actual = '';
            actual = buildReplaceStringWithCasePreserved(target, replaceString);
            assert.strictEqual(actual, expected);
        }
        assertReplace(['abc'], 'Def', 'def');
        assertReplace(['Abc'], 'Def', 'Def');
        assertReplace(['ABC'], 'Def', 'DEF');
        assertReplace(['abc', 'Abc'], 'Def', 'def');
        assertReplace(['Abc', 'abc'], 'Def', 'Def');
        assertReplace(['ABC', 'abc'], 'Def', 'DEF');
        assertReplace(['aBc', 'abc'], 'Def', 'def');
        assertReplace(['AbC'], 'Def', 'Def');
        assertReplace(['aBC'], 'Def', 'def');
        assertReplace(['aBc'], 'DeF', 'deF');
        assertReplace(['Foo-Bar'], 'newfoo-newbar', 'Newfoo-Newbar');
        assertReplace(['Foo-Bar-Abc'], 'newfoo-newbar-newabc', 'Newfoo-Newbar-Newabc');
        assertReplace(['Foo-Bar-abc'], 'newfoo-newbar', 'Newfoo-newbar');
        assertReplace(['foo-Bar'], 'newfoo-newbar', 'newfoo-Newbar');
        assertReplace(['foo-BAR'], 'newfoo-newbar', 'newfoo-NEWBAR');
        assertReplace(['foO-BAR'], 'NewFoo-NewBar', 'newFoo-NEWBAR');
        assertReplace(['Foo_Bar'], 'newfoo_newbar', 'Newfoo_Newbar');
        assertReplace(['Foo_Bar_Abc'], 'newfoo_newbar_newabc', 'Newfoo_Newbar_Newabc');
        assertReplace(['Foo_Bar_abc'], 'newfoo_newbar', 'Newfoo_newbar');
        assertReplace(['Foo_Bar-abc'], 'newfoo_newbar-abc', 'Newfoo_newbar-abc');
        assertReplace(['foo_Bar'], 'newfoo_newbar', 'newfoo_Newbar');
        assertReplace(['Foo_BAR'], 'newfoo_newbar', 'Newfoo_NEWBAR');
    });
    test('preserve case', () => {
        function assertReplace(target, replaceString, expected) {
            const replacePattern = parseReplaceString(replaceString);
            const actual = replacePattern.buildReplaceString(target, true);
            assert.strictEqual(actual, expected);
        }
        assertReplace(['abc'], 'Def', 'def');
        assertReplace(['Abc'], 'Def', 'Def');
        assertReplace(['ABC'], 'Def', 'DEF');
        assertReplace(['abc', 'Abc'], 'Def', 'def');
        assertReplace(['Abc', 'abc'], 'Def', 'Def');
        assertReplace(['ABC', 'abc'], 'Def', 'DEF');
        assertReplace(['aBc', 'abc'], 'Def', 'def');
        assertReplace(['AbC'], 'Def', 'Def');
        assertReplace(['aBC'], 'Def', 'def');
        assertReplace(['aBc'], 'DeF', 'deF');
        assertReplace(['Foo-Bar'], 'newfoo-newbar', 'Newfoo-Newbar');
        assertReplace(['Foo-Bar-Abc'], 'newfoo-newbar-newabc', 'Newfoo-Newbar-Newabc');
        assertReplace(['Foo-Bar-abc'], 'newfoo-newbar', 'Newfoo-newbar');
        assertReplace(['foo-Bar'], 'newfoo-newbar', 'newfoo-Newbar');
        assertReplace(['foo-BAR'], 'newfoo-newbar', 'newfoo-NEWBAR');
        assertReplace(['foO-BAR'], 'NewFoo-NewBar', 'newFoo-NEWBAR');
        assertReplace(['Foo_Bar'], 'newfoo_newbar', 'Newfoo_Newbar');
        assertReplace(['Foo_Bar_Abc'], 'newfoo_newbar_newabc', 'Newfoo_Newbar_Newabc');
        assertReplace(['Foo_Bar_abc'], 'newfoo_newbar', 'Newfoo_newbar');
        assertReplace(['Foo_Bar-abc'], 'newfoo_newbar-abc', 'Newfoo_newbar-abc');
        assertReplace(['foo_Bar'], 'newfoo_newbar', 'newfoo_Newbar');
        assertReplace(['foo_BAR'], 'newfoo_newbar', 'newfoo_NEWBAR');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZVBhdHRlcm4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL3Rlc3QvYnJvd3Nlci9yZXBsYWNlUGF0dGVybi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRW5HLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFFbEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBYSxFQUFFLGNBQThCLEVBQUUsRUFBRTtZQUNuRSxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQztRQUVGLCtCQUErQjtRQUMvQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFeEQsWUFBWTtRQUNaLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RCxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0QsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdELFdBQVc7UUFDWCxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0QsWUFBWTtRQUNaLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEUsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWhFLGVBQWU7UUFDZixTQUFTLENBQUMsY0FBYyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkUsZUFBZTtRQUNmLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRFLCtCQUErQjtRQUMvQixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUQsc0NBQXNDO1FBQ3RDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RCx3Q0FBd0M7UUFDeEMsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlELFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEgsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEYsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEYsU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFDLFlBQVksQ0FB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