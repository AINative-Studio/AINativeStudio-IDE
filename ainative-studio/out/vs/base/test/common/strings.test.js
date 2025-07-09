/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as strings from '../../common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Strings', () => {
    test('equalsIgnoreCase', () => {
        assert(strings.equalsIgnoreCase('', ''));
        assert(!strings.equalsIgnoreCase('', '1'));
        assert(!strings.equalsIgnoreCase('1', ''));
        assert(strings.equalsIgnoreCase('a', 'a'));
        assert(strings.equalsIgnoreCase('abc', 'Abc'));
        assert(strings.equalsIgnoreCase('abc', 'ABC'));
        assert(strings.equalsIgnoreCase('Höhenmeter', 'HÖhenmeter'));
        assert(strings.equalsIgnoreCase('ÖL', 'Öl'));
    });
    test('beginsWithIgnoreCase', () => {
        assert(strings.startsWithIgnoreCase('', ''));
        assert(!strings.startsWithIgnoreCase('', '1'));
        assert(strings.startsWithIgnoreCase('1', ''));
        assert(strings.startsWithIgnoreCase('a', 'a'));
        assert(strings.startsWithIgnoreCase('abc', 'Abc'));
        assert(strings.startsWithIgnoreCase('abc', 'ABC'));
        assert(strings.startsWithIgnoreCase('Höhenmeter', 'HÖhenmeter'));
        assert(strings.startsWithIgnoreCase('ÖL', 'Öl'));
        assert(strings.startsWithIgnoreCase('alles klar', 'a'));
        assert(strings.startsWithIgnoreCase('alles klar', 'A'));
        assert(strings.startsWithIgnoreCase('alles klar', 'alles k'));
        assert(strings.startsWithIgnoreCase('alles klar', 'alles K'));
        assert(strings.startsWithIgnoreCase('alles klar', 'ALLES K'));
        assert(strings.startsWithIgnoreCase('alles klar', 'alles klar'));
        assert(strings.startsWithIgnoreCase('alles klar', 'ALLES KLAR'));
        assert(!strings.startsWithIgnoreCase('alles klar', ' ALLES K'));
        assert(!strings.startsWithIgnoreCase('alles klar', 'ALLES K '));
        assert(!strings.startsWithIgnoreCase('alles klar', 'öALLES K '));
        assert(!strings.startsWithIgnoreCase('alles klar', ' '));
        assert(!strings.startsWithIgnoreCase('alles klar', 'ö'));
    });
    test('compareIgnoreCase', () => {
        function assertCompareIgnoreCase(a, b, recurse = true) {
            let actual = strings.compareIgnoreCase(a, b);
            actual = actual > 0 ? 1 : actual < 0 ? -1 : actual;
            let expected = strings.compare(a.toLowerCase(), b.toLowerCase());
            expected = expected > 0 ? 1 : expected < 0 ? -1 : expected;
            assert.strictEqual(actual, expected, `${a} <> ${b}`);
            if (recurse) {
                assertCompareIgnoreCase(b, a, false);
            }
        }
        assertCompareIgnoreCase('', '');
        assertCompareIgnoreCase('abc', 'ABC');
        assertCompareIgnoreCase('abc', 'ABc');
        assertCompareIgnoreCase('abc', 'ABcd');
        assertCompareIgnoreCase('abc', 'abcd');
        assertCompareIgnoreCase('foo', 'föo');
        assertCompareIgnoreCase('Code', 'code');
        assertCompareIgnoreCase('Code', 'cöde');
        assertCompareIgnoreCase('B', 'a');
        assertCompareIgnoreCase('a', 'B');
        assertCompareIgnoreCase('b', 'a');
        assertCompareIgnoreCase('a', 'b');
        assertCompareIgnoreCase('aa', 'ab');
        assertCompareIgnoreCase('aa', 'aB');
        assertCompareIgnoreCase('aa', 'aA');
        assertCompareIgnoreCase('a', 'aa');
        assertCompareIgnoreCase('ab', 'aA');
        assertCompareIgnoreCase('O', '/');
    });
    test('compareIgnoreCase (substring)', () => {
        function assertCompareIgnoreCase(a, b, aStart, aEnd, bStart, bEnd, recurse = true) {
            let actual = strings.compareSubstringIgnoreCase(a, b, aStart, aEnd, bStart, bEnd);
            actual = actual > 0 ? 1 : actual < 0 ? -1 : actual;
            let expected = strings.compare(a.toLowerCase().substring(aStart, aEnd), b.toLowerCase().substring(bStart, bEnd));
            expected = expected > 0 ? 1 : expected < 0 ? -1 : expected;
            assert.strictEqual(actual, expected, `${a} <> ${b}`);
            if (recurse) {
                assertCompareIgnoreCase(b, a, bStart, bEnd, aStart, aEnd, false);
            }
        }
        assertCompareIgnoreCase('', '', 0, 0, 0, 0);
        assertCompareIgnoreCase('abc', 'ABC', 0, 1, 0, 1);
        assertCompareIgnoreCase('abc', 'Aabc', 0, 3, 1, 4);
        assertCompareIgnoreCase('abcABc', 'ABcd', 3, 6, 0, 4);
    });
    test('format', () => {
        assert.strictEqual(strings.format('Foo Bar'), 'Foo Bar');
        assert.strictEqual(strings.format('Foo {0} Bar'), 'Foo {0} Bar');
        assert.strictEqual(strings.format('Foo {0} Bar', 'yes'), 'Foo yes Bar');
        assert.strictEqual(strings.format('Foo {0} Bar {0}', 'yes'), 'Foo yes Bar yes');
        assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes'), 'Foo yes Bar {1}{2}');
        assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes', undefined), 'Foo yes Bar undefined{2}');
        assert.strictEqual(strings.format('Foo {0} Bar {1}{2}', 'yes', 5, false), 'Foo yes Bar 5false');
        assert.strictEqual(strings.format('Foo {0} Bar. {1}', '(foo)', '.test'), 'Foo (foo) Bar. .test');
    });
    test('format2', () => {
        assert.strictEqual(strings.format2('Foo Bar', {}), 'Foo Bar');
        assert.strictEqual(strings.format2('Foo {oops} Bar', {}), 'Foo {oops} Bar');
        assert.strictEqual(strings.format2('Foo {foo} Bar', { foo: 'bar' }), 'Foo bar Bar');
        assert.strictEqual(strings.format2('Foo {foo} Bar {foo}', { foo: 'bar' }), 'Foo bar Bar bar');
        assert.strictEqual(strings.format2('Foo {foo} Bar {bar}{boo}', { foo: 'bar' }), 'Foo bar Bar {bar}{boo}');
        assert.strictEqual(strings.format2('Foo {foo} Bar {bar}{boo}', { foo: 'bar', bar: 'undefined' }), 'Foo bar Bar undefined{boo}');
        assert.strictEqual(strings.format2('Foo {foo} Bar {bar}{boo}', { foo: 'bar', bar: '5', boo: false }), 'Foo bar Bar 5false');
        assert.strictEqual(strings.format2('Foo {foo} Bar. {bar}', { foo: '(foo)', bar: '.test' }), 'Foo (foo) Bar. .test');
    });
    test('lcut', () => {
        assert.strictEqual(strings.lcut('foo bar', 0), '');
        assert.strictEqual(strings.lcut('foo bar', 1), 'bar');
        assert.strictEqual(strings.lcut('foo bar', 3), 'bar');
        assert.strictEqual(strings.lcut('foo bar', 4), 'bar'); // Leading whitespace trimmed
        assert.strictEqual(strings.lcut('foo bar', 5), 'foo bar');
        assert.strictEqual(strings.lcut('test string 0.1.2.3', 3), '2.3');
        assert.strictEqual(strings.lcut('foo bar', 0, '…'), '…');
        assert.strictEqual(strings.lcut('foo bar', 1, '…'), '…bar');
        assert.strictEqual(strings.lcut('foo bar', 3, '…'), '…bar');
        assert.strictEqual(strings.lcut('foo bar', 4, '…'), '…bar'); // Leading whitespace trimmed
        assert.strictEqual(strings.lcut('foo bar', 5, '…'), 'foo bar');
        assert.strictEqual(strings.lcut('test string 0.1.2.3', 3, '…'), '…2.3');
        assert.strictEqual(strings.lcut('', 10), '');
        assert.strictEqual(strings.lcut('a', 10), 'a');
        assert.strictEqual(strings.lcut(' a', 10), 'a');
        assert.strictEqual(strings.lcut('            a', 10), 'a');
        assert.strictEqual(strings.lcut(' bbbb       a', 10), 'bbbb       a');
        assert.strictEqual(strings.lcut('............a', 10), '............a');
        assert.strictEqual(strings.lcut('', 10, '…'), '');
        assert.strictEqual(strings.lcut('a', 10, '…'), 'a');
        assert.strictEqual(strings.lcut(' a', 10, '…'), 'a');
        assert.strictEqual(strings.lcut('            a', 10, '…'), 'a');
        assert.strictEqual(strings.lcut(' bbbb       a', 10, '…'), 'bbbb       a');
        assert.strictEqual(strings.lcut('............a', 10, '…'), '............a');
    });
    suite('rcut', () => {
        test('basic truncation', () => {
            assert.strictEqual(strings.rcut('foo bar', 0), 'foo');
            assert.strictEqual(strings.rcut('foo bar', 1), 'foo');
            assert.strictEqual(strings.rcut('foo bar', 4), 'foo');
            assert.strictEqual(strings.rcut('foo bar', 7), 'foo bar');
            assert.strictEqual(strings.rcut('test string 0.1.2.3', 3), 'test');
        });
        test('truncation with suffix', () => {
            assert.strictEqual(strings.rcut('foo bar', 0, '…'), 'foo…');
            assert.strictEqual(strings.rcut('foo bar', 1, '…'), 'foo…');
            assert.strictEqual(strings.rcut('foo bar', 4, '…'), 'foo…');
            assert.strictEqual(strings.rcut('foo bar', 7, '…'), 'foo bar');
            assert.strictEqual(strings.rcut('test string 0.1.2.3', 3, '…'), 'test…');
        });
    });
    test('escape', () => {
        assert.strictEqual(strings.escape(''), '');
        assert.strictEqual(strings.escape('foo'), 'foo');
        assert.strictEqual(strings.escape('foo bar'), 'foo bar');
        assert.strictEqual(strings.escape('<foo bar>'), '&lt;foo bar&gt;');
        assert.strictEqual(strings.escape('<foo>Hello</foo>'), '&lt;foo&gt;Hello&lt;/foo&gt;');
    });
    test('ltrim', () => {
        assert.strictEqual(strings.ltrim('foo', 'f'), 'oo');
        assert.strictEqual(strings.ltrim('foo', 'o'), 'foo');
        assert.strictEqual(strings.ltrim('http://www.test.de', 'http://'), 'www.test.de');
        assert.strictEqual(strings.ltrim('/foo/', '/'), 'foo/');
        assert.strictEqual(strings.ltrim('//foo/', '/'), 'foo/');
        assert.strictEqual(strings.ltrim('/', ''), '/');
        assert.strictEqual(strings.ltrim('/', '/'), '');
        assert.strictEqual(strings.ltrim('///', '/'), '');
        assert.strictEqual(strings.ltrim('', ''), '');
        assert.strictEqual(strings.ltrim('', '/'), '');
    });
    test('rtrim', () => {
        assert.strictEqual(strings.rtrim('foo', 'o'), 'f');
        assert.strictEqual(strings.rtrim('foo', 'f'), 'foo');
        assert.strictEqual(strings.rtrim('http://www.test.de', '.de'), 'http://www.test');
        assert.strictEqual(strings.rtrim('/foo/', '/'), '/foo');
        assert.strictEqual(strings.rtrim('/foo//', '/'), '/foo');
        assert.strictEqual(strings.rtrim('/', ''), '/');
        assert.strictEqual(strings.rtrim('/', '/'), '');
        assert.strictEqual(strings.rtrim('///', '/'), '');
        assert.strictEqual(strings.rtrim('', ''), '');
        assert.strictEqual(strings.rtrim('', '/'), '');
    });
    test('trim', () => {
        assert.strictEqual(strings.trim(' foo '), 'foo');
        assert.strictEqual(strings.trim('  foo'), 'foo');
        assert.strictEqual(strings.trim('bar  '), 'bar');
        assert.strictEqual(strings.trim('   '), '');
        assert.strictEqual(strings.trim('foo bar', 'bar'), 'foo ');
    });
    test('trimWhitespace', () => {
        assert.strictEqual(' foo '.trim(), 'foo');
        assert.strictEqual('	 foo	'.trim(), 'foo');
        assert.strictEqual('  foo'.trim(), 'foo');
        assert.strictEqual('bar  '.trim(), 'bar');
        assert.strictEqual('   '.trim(), '');
        assert.strictEqual(' 	  '.trim(), '');
    });
    test('lastNonWhitespaceIndex', () => {
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t '), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc'), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc\t'), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc '), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t '), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t abc \t \t '), 11);
        assert.strictEqual(strings.lastNonWhitespaceIndex('abc  \t \t abc \t \t ', 8), 2);
        assert.strictEqual(strings.lastNonWhitespaceIndex('  \t \t '), -1);
    });
    test('containsRTL', () => {
        assert.strictEqual(strings.containsRTL('a'), false);
        assert.strictEqual(strings.containsRTL(''), false);
        assert.strictEqual(strings.containsRTL(strings.UTF8_BOM_CHARACTER + 'a'), false);
        assert.strictEqual(strings.containsRTL('hello world!'), false);
        assert.strictEqual(strings.containsRTL('a📚📚b'), false);
        assert.strictEqual(strings.containsRTL('هناك حقيقة مثبتة منذ زمن طويل'), true);
        assert.strictEqual(strings.containsRTL('זוהי עובדה מבוססת שדעתו'), true);
    });
    test('issue #115221: isEmojiImprecise misses ⭐', () => {
        const codePoint = strings.getNextCodePoint('⭐', '⭐'.length, 0);
        assert.strictEqual(strings.isEmojiImprecise(codePoint), true);
    });
    test('isBasicASCII', () => {
        function assertIsBasicASCII(str, expected) {
            assert.strictEqual(strings.isBasicASCII(str), expected, str + ` (${str.charCodeAt(0)})`);
        }
        assertIsBasicASCII('abcdefghijklmnopqrstuvwxyz', true);
        assertIsBasicASCII('ABCDEFGHIJKLMNOPQRSTUVWXYZ', true);
        assertIsBasicASCII('1234567890', true);
        assertIsBasicASCII('`~!@#$%^&*()-_=+[{]}\\|;:\'",<.>/?', true);
        assertIsBasicASCII(' ', true);
        assertIsBasicASCII('\t', true);
        assertIsBasicASCII('\n', true);
        assertIsBasicASCII('\r', true);
        let ALL = '\r\t\n';
        for (let i = 32; i < 127; i++) {
            ALL += String.fromCharCode(i);
        }
        assertIsBasicASCII(ALL, true);
        assertIsBasicASCII(String.fromCharCode(31), false);
        assertIsBasicASCII(String.fromCharCode(127), false);
        assertIsBasicASCII('ü', false);
        assertIsBasicASCII('a📚📚b', false);
    });
    test('createRegExp', () => {
        // Empty
        assert.throws(() => strings.createRegExp('', false));
        // Escapes appropriately
        assert.strictEqual(strings.createRegExp('abc', false).source, 'abc');
        assert.strictEqual(strings.createRegExp('([^ ,.]*)', false).source, '\\(\\[\\^ ,\\.\\]\\*\\)');
        assert.strictEqual(strings.createRegExp('([^ ,.]*)', true).source, '([^ ,.]*)');
        // Whole word
        assert.strictEqual(strings.createRegExp('abc', false, { wholeWord: true }).source, '\\babc\\b');
        assert.strictEqual(strings.createRegExp('abc', true, { wholeWord: true }).source, '\\babc\\b');
        assert.strictEqual(strings.createRegExp(' abc', true, { wholeWord: true }).source, ' abc\\b');
        assert.strictEqual(strings.createRegExp('abc ', true, { wholeWord: true }).source, '\\babc ');
        assert.strictEqual(strings.createRegExp(' abc ', true, { wholeWord: true }).source, ' abc ');
        const regExpWithoutFlags = strings.createRegExp('abc', true);
        assert(!regExpWithoutFlags.global);
        assert(regExpWithoutFlags.ignoreCase);
        assert(!regExpWithoutFlags.multiline);
        const regExpWithFlags = strings.createRegExp('abc', true, { global: true, matchCase: true, multiline: true });
        assert(regExpWithFlags.global);
        assert(!regExpWithFlags.ignoreCase);
        assert(regExpWithFlags.multiline);
    });
    test('getLeadingWhitespace', () => {
        assert.strictEqual(strings.getLeadingWhitespace('  foo'), '  ');
        assert.strictEqual(strings.getLeadingWhitespace('  foo', 2), '');
        assert.strictEqual(strings.getLeadingWhitespace('  foo', 1, 1), '');
        assert.strictEqual(strings.getLeadingWhitespace('  foo', 0, 1), ' ');
        assert.strictEqual(strings.getLeadingWhitespace('  '), '  ');
        assert.strictEqual(strings.getLeadingWhitespace('  ', 1), ' ');
        assert.strictEqual(strings.getLeadingWhitespace('  ', 0, 1), ' ');
        assert.strictEqual(strings.getLeadingWhitespace('\t\tfunction foo(){', 0, 1), '\t');
        assert.strictEqual(strings.getLeadingWhitespace('\t\tfunction foo(){', 0, 2), '\t\t');
    });
    test('fuzzyContains', () => {
        assert.ok(!strings.fuzzyContains((undefined), null));
        assert.ok(strings.fuzzyContains('hello world', 'h'));
        assert.ok(!strings.fuzzyContains('hello world', 'q'));
        assert.ok(strings.fuzzyContains('hello world', 'hw'));
        assert.ok(strings.fuzzyContains('hello world', 'horl'));
        assert.ok(strings.fuzzyContains('hello world', 'd'));
        assert.ok(!strings.fuzzyContains('hello world', 'wh'));
        assert.ok(!strings.fuzzyContains('d', 'dd'));
    });
    test('startsWithUTF8BOM', () => {
        assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER));
        assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER + 'a'));
        assert(strings.startsWithUTF8BOM(strings.UTF8_BOM_CHARACTER + 'aaaaaaaaaa'));
        assert(!strings.startsWithUTF8BOM(' ' + strings.UTF8_BOM_CHARACTER));
        assert(!strings.startsWithUTF8BOM('foo'));
        assert(!strings.startsWithUTF8BOM(''));
    });
    test('stripUTF8BOM', () => {
        assert.strictEqual(strings.stripUTF8BOM(strings.UTF8_BOM_CHARACTER), '');
        assert.strictEqual(strings.stripUTF8BOM(strings.UTF8_BOM_CHARACTER + 'foobar'), 'foobar');
        assert.strictEqual(strings.stripUTF8BOM('foobar' + strings.UTF8_BOM_CHARACTER), 'foobar' + strings.UTF8_BOM_CHARACTER);
        assert.strictEqual(strings.stripUTF8BOM('abc'), 'abc');
        assert.strictEqual(strings.stripUTF8BOM(''), '');
    });
    test('containsUppercaseCharacter', () => {
        [
            [null, false],
            ['', false],
            ['foo', false],
            ['föö', false],
            ['ناك', false],
            ['מבוססת', false],
            ['😀', false],
            ['(#@()*&%()@*#&09827340982374}{:">?></\'\\~`', false],
            ['Foo', true],
            ['FOO', true],
            ['FöÖ', true],
            ['FöÖ', true],
            ['\\Foo', true],
        ].forEach(([str, result]) => {
            assert.strictEqual(strings.containsUppercaseCharacter(str), result, `Wrong result for ${str}`);
        });
    });
    test('containsUppercaseCharacter (ignoreEscapedChars)', () => {
        [
            ['\\Woo', false],
            ['f\\S\\S', false],
            ['foo', false],
            ['Foo', true],
        ].forEach(([str, result]) => {
            assert.strictEqual(strings.containsUppercaseCharacter(str, true), result, `Wrong result for ${str}`);
        });
    });
    test('uppercaseFirstLetter', () => {
        [
            ['', ''],
            ['foo', 'Foo'],
            ['f', 'F'],
            ['123', '123'],
            ['.a', '.a'],
        ].forEach(([inStr, result]) => {
            assert.strictEqual(strings.uppercaseFirstLetter(inStr), result, `Wrong result for ${inStr}`);
        });
    });
    test('getNLines', () => {
        assert.strictEqual(strings.getNLines('', 5), '');
        assert.strictEqual(strings.getNLines('foo', 5), 'foo');
        assert.strictEqual(strings.getNLines('foo\nbar', 5), 'foo\nbar');
        assert.strictEqual(strings.getNLines('foo\nbar', 2), 'foo\nbar');
        assert.strictEqual(strings.getNLines('foo\nbar', 1), 'foo');
        assert.strictEqual(strings.getNLines('foo\nbar'), 'foo');
        assert.strictEqual(strings.getNLines('foo\nbar\nsomething', 2), 'foo\nbar');
        assert.strictEqual(strings.getNLines('foo', 0), '');
    });
    test('getGraphemeBreakType', () => {
        assert.strictEqual(strings.getGraphemeBreakType(0xBC1), 7 /* strings.GraphemeBreakType.SpacingMark */);
    });
    test('truncate', () => {
        assert.strictEqual('hello world', strings.truncate('hello world', 100));
        assert.strictEqual('hello…', strings.truncate('hello world', 5));
    });
    test('truncateMiddle', () => {
        assert.strictEqual('hello world', strings.truncateMiddle('hello world', 100));
        assert.strictEqual('he…ld', strings.truncateMiddle('hello world', 5));
    });
    test('replaceAsync', async () => {
        let i = 0;
        assert.strictEqual(await strings.replaceAsync('abcabcabcabc', /b(.)/g, async (match, after) => {
            assert.strictEqual(match, 'bc');
            assert.strictEqual(after, 'c');
            return `${i++}${after}`;
        }), 'a0ca1ca2ca3c');
    });
    suite('removeAnsiEscapeCodes', () => {
        function testSequence(sequence) {
            assert.strictEqual(strings.removeAnsiEscapeCodes(`hello${sequence}world`), 'helloworld', `expect to remove ${JSON.stringify(sequence)}`);
            assert.deepStrictEqual([...strings.forAnsiStringParts(`hello${sequence}world`)], [{ isCode: false, str: 'hello' }, { isCode: true, str: sequence }, { isCode: false, str: 'world' }], `expect to forAnsiStringParts ${JSON.stringify(sequence)}`);
        }
        test('CSI sequences', () => {
            const CSI = '\x1b[';
            const sequences = [
                // Base cases from https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Functions-using-CSI-_-ordered-by-the-final-character_s_
                `${CSI}42@`,
                `${CSI}42 @`,
                `${CSI}42A`,
                `${CSI}42 A`,
                `${CSI}42B`,
                `${CSI}42C`,
                `${CSI}42D`,
                `${CSI}42E`,
                `${CSI}42F`,
                `${CSI}42G`,
                `${CSI}42;42H`,
                `${CSI}42I`,
                `${CSI}42J`,
                `${CSI}?42J`,
                `${CSI}42K`,
                `${CSI}?42K`,
                `${CSI}42L`,
                `${CSI}42M`,
                `${CSI}42P`,
                `${CSI}#P`,
                `${CSI}3#P`,
                `${CSI}#Q`,
                `${CSI}3#Q`,
                `${CSI}#R`,
                `${CSI}42S`,
                `${CSI}?1;2;3S`,
                `${CSI}42T`,
                `${CSI}42;42;42;42;42T`,
                `${CSI}>3T`,
                `${CSI}42X`,
                `${CSI}42Z`,
                `${CSI}42^`,
                `${CSI}42\``,
                `${CSI}42a`,
                `${CSI}42b`,
                `${CSI}42c`,
                `${CSI}=42c`,
                `${CSI}>42c`,
                `${CSI}42d`,
                `${CSI}42e`,
                `${CSI}42;42f`,
                `${CSI}42g`,
                `${CSI}3h`,
                `${CSI}?3h`,
                `${CSI}42i`,
                `${CSI}?42i`,
                `${CSI}3l`,
                `${CSI}?3l`,
                `${CSI}3m`,
                `${CSI}>0;0m`,
                `${CSI}>0m`,
                `${CSI}?0m`,
                `${CSI}42n`,
                `${CSI}>42n`,
                `${CSI}?42n`,
                `${CSI}>42p`,
                `${CSI}!p`,
                `${CSI}0;0"p`,
                `${CSI}42$p`,
                `${CSI}?42$p`,
                `${CSI}#p`,
                `${CSI}3#p`,
                `${CSI}>42q`,
                `${CSI}42q`,
                `${CSI}42 q`,
                `${CSI}42"q`,
                `${CSI}#q`,
                `${CSI}42;42r`,
                `${CSI}?3r`,
                `${CSI}0;0;0;0;3$r`,
                `${CSI}s`,
                `${CSI}0;0s`,
                `${CSI}>42s`,
                `${CSI}?3s`,
                `${CSI}42;42;42t`,
                `${CSI}>3t`,
                `${CSI}42 t`,
                `${CSI}0;0;0;0;3$t`,
                `${CSI}u`,
                `${CSI}42 u`,
                `${CSI}0;0;0;0;0;0;0;0$v`,
                `${CSI}42$w`,
                `${CSI}0;0;0;0'w`,
                `${CSI}42x`,
                `${CSI}42*x`,
                `${CSI}0;0;0;0;0$x`,
                `${CSI}42#y`,
                `${CSI}0;0;0;0;0;0*y`,
                `${CSI}42;0'z`,
                `${CSI}0;1;2;4$z`,
                `${CSI}3'{`,
                `${CSI}#{`,
                `${CSI}3#{`,
                `${CSI}0;0;0;0\${`,
                `${CSI}0;0;0;0#|`,
                `${CSI}42$|`,
                `${CSI}42'|`,
                `${CSI}42*|`,
                `${CSI}#}`,
                `${CSI}42'}`,
                `${CSI}42$}`,
                `${CSI}42'~`,
                `${CSI}42$~`,
                // Common SGR cases:
                `${CSI}1;31m`, // multiple attrs
                `${CSI}105m`, // bright background
                `${CSI}48:5:128m`, // 256 indexed color
                `${CSI}48;5;128m`, // 256 indexed color alt
                `${CSI}38:2:0:255:255:255m`, // truecolor
                `${CSI}38;2;255;255;255m`, // truecolor alt
            ];
            for (const sequence of sequences) {
                testSequence(sequence);
            }
        });
        suite('OSC sequences', () => {
            function testOscSequence(prefix, suffix) {
                const sequenceContent = [
                    `633;SetMark;`,
                    `633;P;Cwd=/foo`,
                    `7;file://local/Users/me/foo/bar`
                ];
                const sequences = [];
                for (const content of sequenceContent) {
                    sequences.push(`${prefix}${content}${suffix}`);
                }
                for (const sequence of sequences) {
                    testSequence(sequence);
                }
            }
            test('ESC ] Ps ; Pt ESC \\', () => {
                testOscSequence('\x1b]', '\x1b\\');
            });
            test('ESC ] Ps ; Pt BEL', () => {
                testOscSequence('\x1b]', '\x07');
            });
            test('ESC ] Ps ; Pt ST', () => {
                testOscSequence('\x1b]', '\x9c');
            });
            test('OSC Ps ; Pt ESC \\', () => {
                testOscSequence('\x9d', '\x1b\\');
            });
            test('OSC Ps ; Pt BEL', () => {
                testOscSequence('\x9d', '\x07');
            });
            test('OSC Ps ; Pt ST', () => {
                testOscSequence('\x9d', '\x9c');
            });
        });
        test('ESC sequences', () => {
            const sequenceContent = [
                ` F`,
                ` G`,
                ` L`,
                ` M`,
                ` N`,
                `#3`,
                `#4`,
                `#5`,
                `#6`,
                `#8`,
                `%@`,
                `%G`,
                `(C`,
                `)C`,
                `*C`,
                `+C`,
                `-C`,
                `.C`,
                `/C`
            ];
            const sequences = [];
            for (const content of sequenceContent) {
                sequences.push(`\x1b${content}`);
            }
            for (const sequence of sequences) {
                testSequence(sequence);
            }
        });
        suite('regression tests', () => {
            test('#209937', () => {
                assert.strictEqual(strings.removeAnsiEscapeCodes(`localhost:\x1b[31m1234`), 'localhost:1234');
            });
        });
    });
    test('removeAnsiEscapeCodesFromPrompt', () => {
        assert.strictEqual(strings.removeAnsiEscapeCodesFromPrompt('\u001b[31m$ \u001b[0m'), '$ ');
        assert.strictEqual(strings.removeAnsiEscapeCodesFromPrompt('\n\\[\u001b[01;34m\\]\\w\\[\u001b[00m\\]\n\\[\u001b[1;32m\\]> \\[\u001b[0m\\]'), '\n\\w\n> ');
    });
    test('count', () => {
        assert.strictEqual(strings.count('hello world', 'o'), 2);
        assert.strictEqual(strings.count('hello world', 'l'), 3);
        assert.strictEqual(strings.count('hello world', 'z'), 0);
        assert.strictEqual(strings.count('hello world', 'hello'), 1);
        assert.strictEqual(strings.count('hello world', 'world'), 1);
        assert.strictEqual(strings.count('hello world', 'hello world'), 1);
        assert.strictEqual(strings.count('hello world', 'foo'), 0);
    });
    test('containsAmbiguousCharacter', () => {
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('abcd'), false);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('üå'), false);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('(*&^)'), false);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('ο'), true);
        assert.strictEqual(strings.AmbiguousCharacters.getInstance(new Set()).containsAmbiguousCharacter('abɡc'), true);
    });
    test('containsInvisibleCharacter', () => {
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter('abcd'), false);
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter(' '), true);
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter('a\u{e004e}b'), true);
        assert.strictEqual(strings.InvisibleCharacters.containsInvisibleCharacter('a\u{e015a}\u000bb'), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
test('htmlAttributeEncodeValue', () => {
    assert.strictEqual(strings.htmlAttributeEncodeValue(''), '');
    assert.strictEqual(strings.htmlAttributeEncodeValue('abc'), 'abc');
    assert.strictEqual(strings.htmlAttributeEncodeValue('<script>alert("Hello")</script>'), '&lt;script&gt;alert(&quot;Hello&quot;)&lt;/script&gt;');
    assert.strictEqual(strings.htmlAttributeEncodeValue('Hello & World'), 'Hello &amp; World');
    assert.strictEqual(strings.htmlAttributeEncodeValue('"Hello"'), '&quot;Hello&quot;');
    assert.strictEqual(strings.htmlAttributeEncodeValue('\'Hello\''), '&apos;Hello&apos;');
    assert.strictEqual(strings.htmlAttributeEncodeValue('<>&\'"'), '&lt;&gt;&amp;&apos;&quot;');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5ncy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vc3RyaW5ncy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssT0FBTyxNQUFNLHlCQUF5QixDQUFDO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUVyRSxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUzQyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxPQUFPLENB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SSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFB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LElBQUk7Z0JBQ1YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLFNBQVM7Z0JBQ2YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLGlCQUFpQjtnQkFDdkIsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLFFBQVE7Z0JBQ2QsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLE9BQU87Z0JBQ2IsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLE9BQU87Z0JBQ2IsR0FBRyxHQUFHLE1BQU07Z0JBQ1osR0FBRyxHQUFHLE9BQU87Z0JBQ2IsR0FBRyxHQUFHLElBQUk7Z0JBQ1YsR0FBRyxHQUFHLEtBQUs7Z0JBQ1gsR0FB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