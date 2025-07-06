/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Choice, FormatString, Placeholder, Scanner, SnippetParser, Text, TextmateSnippet, Transform, Variable } from '../../browser/snippetParser.js';
suite('SnippetParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Scanner', () => {
        const scanner = new Scanner();
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('abc');
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('{{abc}}');
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('abc() ');
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 10 /* TokenType.Format */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('abc 123');
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 10 /* TokenType.Format */);
        assert.strictEqual(scanner.next().type, 8 /* TokenType.Int */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('$foo');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('$foo_bar');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('$foo-bar');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 12 /* TokenType.Dash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('${foo}');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('${1223:foo}');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 8 /* TokenType.Int */);
        assert.strictEqual(scanner.next().type, 1 /* TokenType.Colon */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
        scanner.text('\\${}');
        assert.strictEqual(scanner.next().type, 5 /* TokenType.Backslash */);
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        scanner.text('${foo/regex/format/option}');
        assert.strictEqual(scanner.next().type, 0 /* TokenType.Dollar */);
        assert.strictEqual(scanner.next().type, 3 /* TokenType.CurlyOpen */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 6 /* TokenType.Forwardslash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 6 /* TokenType.Forwardslash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 6 /* TokenType.Forwardslash */);
        assert.strictEqual(scanner.next().type, 9 /* TokenType.VariableName */);
        assert.strictEqual(scanner.next().type, 4 /* TokenType.CurlyClose */);
        assert.strictEqual(scanner.next().type, 14 /* TokenType.EOF */);
    });
    function assertText(value, expected) {
        const actual = SnippetParser.asInsertText(value);
        assert.strictEqual(actual, expected);
    }
    function assertMarker(input, ...ctors) {
        let marker;
        if (input instanceof TextmateSnippet) {
            marker = [...input.children];
        }
        else if (typeof input === 'string') {
            const p = new SnippetParser();
            marker = p.parse(input).children;
        }
        else {
            marker = [...input];
        }
        while (marker.length > 0) {
            const m = marker.pop();
            const ctor = ctors.pop();
            assert.ok(m instanceof ctor);
        }
        assert.strictEqual(marker.length, ctors.length);
        assert.strictEqual(marker.length, 0);
    }
    function assertTextAndMarker(value, escaped, ...ctors) {
        assertText(value, escaped);
        assertMarker(value, ...ctors);
    }
    function assertEscaped(value, expected) {
        const actual = SnippetParser.escape(value);
        assert.strictEqual(actual, expected);
    }
    test('Parser, escaped', function () {
        assertEscaped('foo$0', 'foo\\$0');
        assertEscaped('foo\\$0', 'foo\\\\\\$0');
        assertEscaped('f$1oo$0', 'f\\$1oo\\$0');
        assertEscaped('${1:foo}$0', '\\${1:foo\\}\\$0');
        assertEscaped('$', '\\$');
    });
    test('Parser, text', () => {
        assertText('$', '$');
        assertText('\\\\$', '\\$');
        assertText('{', '{');
        assertText('\\}', '}');
        assertText('\\abc', '\\abc');
        assertText('foo${f:\\}}bar', 'foo}bar');
        assertText('\\{', '\\{');
        assertText('I need \\\\\\$', 'I need \\$');
        assertText('\\', '\\');
        assertText('\\{{', '\\{{');
        assertText('{{', '{{');
        assertText('{{dd', '{{dd');
        assertText('}}', '}}');
        assertText('ff}}', 'ff}}');
        assertText('farboo', 'farboo');
        assertText('far{{}}boo', 'far{{}}boo');
        assertText('far{{123}}boo', 'far{{123}}boo');
        assertText('far\\{{123}}boo', 'far\\{{123}}boo');
        assertText('far{{id:bern}}boo', 'far{{id:bern}}boo');
        assertText('far{{id:bern {{basel}}}}boo', 'far{{id:bern {{basel}}}}boo');
        assertText('far{{id:bern {{id:basel}}}}boo', 'far{{id:bern {{id:basel}}}}boo');
        assertText('far{{id:bern {{id2:basel}}}}boo', 'far{{id:bern {{id2:basel}}}}boo');
    });
    test('Parser, TM text', () => {
        assertTextAndMarker('foo${1:bar}}', 'foobar}', Text, Placeholder, Text);
        assertTextAndMarker('foo${1:bar}${2:foo}}', 'foobarfoo}', Text, Placeholder, Placeholder, Text);
        assertTextAndMarker('foo${1:bar\\}${2:foo}}', 'foobar}foo', Text, Placeholder);
        const [, placeholder] = new SnippetParser().parse('foo${1:bar\\}${2:foo}}').children;
        const { children } = placeholder;
        assert.strictEqual(placeholder.index, 1);
        assert.ok(children[0] instanceof Text);
        assert.strictEqual(children[0].toString(), 'bar}');
        assert.ok(children[1] instanceof Placeholder);
        assert.strictEqual(children[1].toString(), 'foo');
    });
    test('Parser, placeholder', () => {
        assertTextAndMarker('farboo', 'farboo', Text);
        assertTextAndMarker('far{{}}boo', 'far{{}}boo', Text);
        assertTextAndMarker('far{{123}}boo', 'far{{123}}boo', Text);
        assertTextAndMarker('far\\{{123}}boo', 'far\\{{123}}boo', Text);
    });
    test('Parser, literal code', () => {
        assertTextAndMarker('far`123`boo', 'far`123`boo', Text);
        assertTextAndMarker('far\\`123\\`boo', 'far\\`123\\`boo', Text);
    });
    test('Parser, variables/tabstop', () => {
        assertTextAndMarker('$far-boo', '-boo', Variable, Text);
        assertTextAndMarker('\\$far-boo', '$far-boo', Text);
        assertTextAndMarker('far$farboo', 'far', Text, Variable);
        assertTextAndMarker('far${farboo}', 'far', Text, Variable);
        assertTextAndMarker('$123', '', Placeholder);
        assertTextAndMarker('$farboo', '', Variable);
        assertTextAndMarker('$far12boo', '', Variable);
        assertTextAndMarker('000_${far}_000', '000__000', Text, Variable, Text);
        assertTextAndMarker('FFF_${TM_SELECTED_TEXT}_FFF$0', 'FFF__FFF', Text, Variable, Text, Placeholder);
    });
    test('Parser, variables/placeholder with defaults', () => {
        assertTextAndMarker('${name:value}', 'value', Variable);
        assertTextAndMarker('${1:value}', 'value', Placeholder);
        assertTextAndMarker('${1:bar${2:foo}bar}', 'barfoobar', Placeholder);
        assertTextAndMarker('${name:value', '${name:value', Text);
        assertTextAndMarker('${1:bar${2:foobar}', '${1:barfoobar', Text, Placeholder);
    });
    test('Parser, variable transforms', function () {
        assertTextAndMarker('${foo///}', '', Variable);
        assertTextAndMarker('${foo/regex/format/gmi}', '', Variable);
        assertTextAndMarker('${foo/([A-Z][a-z])/format/}', '', Variable);
        // invalid regex
        assertTextAndMarker('${foo/([A-Z][a-z])/format/GMI}', '${foo/([A-Z][a-z])/format/GMI}', Text);
        assertTextAndMarker('${foo/([A-Z][a-z])/format/funky}', '${foo/([A-Z][a-z])/format/funky}', Text);
        assertTextAndMarker('${foo/([A-Z][a-z]/format/}', '${foo/([A-Z][a-z]/format/}', Text);
        // tricky regex
        assertTextAndMarker('${foo/m\\/atch/$1/i}', '', Variable);
        assertMarker('${foo/regex\/format/options}', Text);
        // incomplete
        assertTextAndMarker('${foo///', '${foo///', Text);
        assertTextAndMarker('${foo/regex/format/options', '${foo/regex/format/options', Text);
        // format string
        assertMarker('${foo/.*/${0:fooo}/i}', Variable);
        assertMarker('${foo/.*/${1}/i}', Variable);
        assertMarker('${foo/.*/$1/i}', Variable);
        assertMarker('${foo/.*/This-$1-encloses/i}', Variable);
        assertMarker('${foo/.*/complex${1:else}/i}', Variable);
        assertMarker('${foo/.*/complex${1:-else}/i}', Variable);
        assertMarker('${foo/.*/complex${1:+if}/i}', Variable);
        assertMarker('${foo/.*/complex${1:?if:else}/i}', Variable);
        assertMarker('${foo/.*/complex${1:/upcase}/i}', Variable);
    });
    test('Parser, placeholder transforms', function () {
        assertTextAndMarker('${1///}', '', Placeholder);
        assertTextAndMarker('${1/regex/format/gmi}', '', Placeholder);
        assertTextAndMarker('${1/([A-Z][a-z])/format/}', '', Placeholder);
        // tricky regex
        assertTextAndMarker('${1/m\\/atch/$1/i}', '', Placeholder);
        assertMarker('${1/regex\/format/options}', Text);
        // incomplete
        assertTextAndMarker('${1///', '${1///', Text);
        assertTextAndMarker('${1/regex/format/options', '${1/regex/format/options', Text);
    });
    test('No way to escape forward slash in snippet regex #36715', function () {
        assertMarker('${TM_DIRECTORY/src\\//$1/}', Variable);
    });
    test('No way to escape forward slash in snippet format section #37562', function () {
        assertMarker('${TM_SELECTED_TEXT/a/\\/$1/g}', Variable);
        assertMarker('${TM_SELECTED_TEXT/a/in\\/$1ner/g}', Variable);
        assertMarker('${TM_SELECTED_TEXT/a/end\\//g}', Variable);
    });
    test('Parser, placeholder with choice', () => {
        assertTextAndMarker('${1|one,two,three|}', 'one', Placeholder);
        assertTextAndMarker('${1|one|}', 'one', Placeholder);
        assertTextAndMarker('${1|one1,two2|}', 'one1', Placeholder);
        assertTextAndMarker('${1|one1\\,two2|}', 'one1,two2', Placeholder);
        assertTextAndMarker('${1|one1\\|two2|}', 'one1|two2', Placeholder);
        assertTextAndMarker('${1|one1\\atwo2|}', 'one1\\atwo2', Placeholder);
        assertTextAndMarker('${1|one,two,three,|}', '${1|one,two,three,|}', Text);
        assertTextAndMarker('${1|one,', '${1|one,', Text);
        const snippet = new SnippetParser().parse('${1|one,two,three|}');
        const expected = [
            m => m instanceof Placeholder,
            m => m instanceof Choice && m.options.length === 3 && m.options.every(x => x instanceof Text),
        ];
        snippet.walk(marker => {
            assert.ok(expected.shift()(marker));
            return true;
        });
    });
    test('Snippet choices: unable to escape comma and pipe, #31521', function () {
        assertTextAndMarker('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(not, not);', Text, Placeholder, Text);
    });
    test('Marker, toTextmateString()', function () {
        function assertTextsnippetString(input, expected) {
            const snippet = new SnippetParser().parse(input);
            const actual = snippet.toTextmateString();
            assert.strictEqual(actual, expected);
        }
        assertTextsnippetString('$1', '$1');
        assertTextsnippetString('\\$1', '\\$1');
        assertTextsnippetString('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(${1|not\\, not, five, 5, 1   23|});');
        assertTextsnippetString('console.log(${1|not\\, not, \\| five, 5, 1   23|});', 'console.log(${1|not\\, not, \\| five, 5, 1   23|});');
        assertTextsnippetString('${1|cho\\,ices,wi\\|th,esc\\\\aping,chall\\\\\\,enges|}', '${1|cho\\,ices,wi\\|th,esc\\\\aping,chall\\\\\\,enges|}');
        assertTextsnippetString('this is text', 'this is text');
        assertTextsnippetString('this ${1:is ${2:nested with $var}}', 'this ${1:is ${2:nested with ${var}}}');
        assertTextsnippetString('this ${1:is ${2:nested with $var}}}', 'this ${1:is ${2:nested with ${var}}}\\}');
    });
    test('Marker, toTextmateString() <-> identity', function () {
        function assertIdent(input) {
            // full loop: (1) parse input, (2) generate textmate string, (3) parse, (4) ensure both trees are equal
            const snippet = new SnippetParser().parse(input);
            const input2 = snippet.toTextmateString();
            const snippet2 = new SnippetParser().parse(input2);
            function checkCheckChildren(marker1, marker2) {
                assert.ok(marker1 instanceof Object.getPrototypeOf(marker2).constructor);
                assert.ok(marker2 instanceof Object.getPrototypeOf(marker1).constructor);
                assert.strictEqual(marker1.children.length, marker2.children.length);
                assert.strictEqual(marker1.toString(), marker2.toString());
                for (let i = 0; i < marker1.children.length; i++) {
                    checkCheckChildren(marker1.children[i], marker2.children[i]);
                }
            }
            checkCheckChildren(snippet, snippet2);
        }
        assertIdent('$1');
        assertIdent('\\$1');
        assertIdent('console.log(${1|not\\, not, five, 5, 1   23|});');
        assertIdent('console.log(${1|not\\, not, \\| five, 5, 1   23|});');
        assertIdent('this is text');
        assertIdent('this ${1:is ${2:nested with $var}}');
        assertIdent('this ${1:is ${2:nested with $var}}}');
        assertIdent('this ${1:is ${2:nested with $var}} and repeating $1');
    });
    test('Parser, choise marker', () => {
        const { placeholders } = new SnippetParser().parse('${1|one,two,three|}');
        assert.strictEqual(placeholders.length, 1);
        assert.ok(placeholders[0].choice instanceof Choice);
        assert.ok(placeholders[0].children[0] instanceof Choice);
        assert.strictEqual(placeholders[0].children[0].options.length, 3);
        assertText('${1|one,two,three|}', 'one');
        assertText('\\${1|one,two,three|}', '${1|one,two,three|}');
        assertText('${1\\|one,two,three|}', '${1\\|one,two,three|}');
        assertText('${1||}', '${1||}');
    });
    test('Backslash character escape in choice tabstop doesn\'t work #58494', function () {
        const { placeholders } = new SnippetParser().parse('${1|\\,,},$,\\|,\\\\|}');
        assert.strictEqual(placeholders.length, 1);
        assert.ok(placeholders[0].choice instanceof Choice);
    });
    test('Parser, only textmate', () => {
        const p = new SnippetParser();
        assertMarker(p.parse('far{{}}boo'), Text);
        assertMarker(p.parse('far{{123}}boo'), Text);
        assertMarker(p.parse('far\\{{123}}boo'), Text);
        assertMarker(p.parse('far$0boo'), Text, Placeholder, Text);
        assertMarker(p.parse('far${123}boo'), Text, Placeholder, Text);
        assertMarker(p.parse('far\\${123}boo'), Text);
    });
    test('Parser, real world', () => {
        let marker = new SnippetParser().parse('console.warn(${1: $TM_SELECTED_TEXT })').children;
        assert.strictEqual(marker[0].toString(), 'console.warn(');
        assert.ok(marker[1] instanceof Placeholder);
        assert.strictEqual(marker[2].toString(), ')');
        const placeholder = marker[1];
        assert.strictEqual(placeholder.index, 1);
        assert.strictEqual(placeholder.children.length, 3);
        assert.ok(placeholder.children[0] instanceof Text);
        assert.ok(placeholder.children[1] instanceof Variable);
        assert.ok(placeholder.children[2] instanceof Text);
        assert.strictEqual(placeholder.children[0].toString(), ' ');
        assert.strictEqual(placeholder.children[1].toString(), '');
        assert.strictEqual(placeholder.children[2].toString(), ' ');
        const nestedVariable = placeholder.children[1];
        assert.strictEqual(nestedVariable.name, 'TM_SELECTED_TEXT');
        assert.strictEqual(nestedVariable.children.length, 0);
        marker = new SnippetParser().parse('$TM_SELECTED_TEXT').children;
        assert.strictEqual(marker.length, 1);
        assert.ok(marker[0] instanceof Variable);
    });
    test('Parser, transform example', () => {
        const { children } = new SnippetParser().parse('${1:name} : ${2:type}${3/\\s:=(.*)/${1:+ :=}${1}/};\n$0');
        //${1:name}
        assert.ok(children[0] instanceof Placeholder);
        assert.strictEqual(children[0].children.length, 1);
        assert.strictEqual(children[0].children[0].toString(), 'name');
        assert.strictEqual(children[0].transform, undefined);
        // :
        assert.ok(children[1] instanceof Text);
        assert.strictEqual(children[1].toString(), ' : ');
        //${2:type}
        assert.ok(children[2] instanceof Placeholder);
        assert.strictEqual(children[2].children.length, 1);
        assert.strictEqual(children[2].children[0].toString(), 'type');
        //${3/\\s:=(.*)/${1:+ :=}${1}/}
        assert.ok(children[3] instanceof Placeholder);
        assert.strictEqual(children[3].children.length, 0);
        assert.notStrictEqual(children[3].transform, undefined);
        const transform = children[3].transform;
        assert.deepStrictEqual(transform.regexp, /\s:=(.*)/);
        assert.strictEqual(transform.children.length, 2);
        assert.ok(transform.children[0] instanceof FormatString);
        assert.strictEqual(transform.children[0].index, 1);
        assert.strictEqual(transform.children[0].ifValue, ' :=');
        assert.ok(transform.children[1] instanceof FormatString);
        assert.strictEqual(transform.children[1].index, 1);
        assert.ok(children[4] instanceof Text);
        assert.strictEqual(children[4].toString(), ';\n');
    });
    // TODO @jrieken making this strictEqul causes circular json conversion errors
    test('Parser, default placeholder values', () => {
        assertMarker('errorContext: `${1:err}`, error: $1', Text, Placeholder, Text, Placeholder);
        const [, p1, , p2] = new SnippetParser().parse('errorContext: `${1:err}`, error:$1').children;
        assert.strictEqual(p1.index, 1);
        assert.strictEqual(p1.children.length, 1);
        assert.strictEqual(p1.children[0].toString(), 'err');
        assert.strictEqual(p2.index, 1);
        assert.strictEqual(p2.children.length, 1);
        assert.strictEqual(p2.children[0].toString(), 'err');
    });
    // TODO @jrieken making this strictEqul causes circular json conversion errors
    test('Parser, default placeholder values and one transform', () => {
        assertMarker('errorContext: `${1:err}`, error: ${1/err/ok/}', Text, Placeholder, Text, Placeholder);
        const [, p3, , p4] = new SnippetParser().parse('errorContext: `${1:err}`, error:${1/err/ok/}').children;
        assert.strictEqual(p3.index, 1);
        assert.strictEqual(p3.children.length, 1);
        assert.strictEqual(p3.children[0].toString(), 'err');
        assert.strictEqual(p3.transform, undefined);
        assert.strictEqual(p4.index, 1);
        assert.strictEqual(p4.children.length, 1);
        assert.strictEqual(p4.children[0].toString(), 'err');
        assert.notStrictEqual(p4.transform, undefined);
    });
    test('Repeated snippet placeholder should always inherit, #31040', function () {
        assertText('${1:foo}-abc-$1', 'foo-abc-foo');
        assertText('${1:foo}-abc-${1}', 'foo-abc-foo');
        assertText('${1:foo}-abc-${1:bar}', 'foo-abc-foo');
        assertText('${1}-abc-${1:foo}', 'foo-abc-foo');
    });
    test('backspace esapce in TM only, #16212', () => {
        const actual = SnippetParser.asInsertText('Foo \\\\${abc}bar');
        assert.strictEqual(actual, 'Foo \\bar');
    });
    test('colon as variable/placeholder value, #16717', () => {
        let actual = SnippetParser.asInsertText('${TM_SELECTED_TEXT:foo:bar}');
        assert.strictEqual(actual, 'foo:bar');
        actual = SnippetParser.asInsertText('${1:foo:bar}');
        assert.strictEqual(actual, 'foo:bar');
    });
    test('incomplete placeholder', () => {
        assertTextAndMarker('${1:}', '', Placeholder);
    });
    test('marker#len', () => {
        function assertLen(template, ...lengths) {
            const snippet = new SnippetParser().parse(template, true);
            snippet.walk(m => {
                const expected = lengths.shift();
                assert.strictEqual(m.len(), expected);
                return true;
            });
            assert.strictEqual(lengths.length, 0);
        }
        assertLen('text$0', 4, 0);
        assertLen('$1text$0', 0, 4, 0);
        assertLen('te$1xt$0', 2, 0, 2, 0);
        assertLen('errorContext: `${1:err}`, error: $0', 15, 0, 3, 10, 0);
        assertLen('errorContext: `${1:err}`, error: $1$0', 15, 0, 3, 10, 0, 3, 0);
        assertLen('$TM_SELECTED_TEXT$0', 0, 0);
        assertLen('${TM_SELECTED_TEXT:def}$0', 0, 3, 0);
    });
    test('parser, parent node', function () {
        let snippet = new SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 3);
        let [first, second] = snippet.placeholders;
        assert.strictEqual(first.index, 1);
        assert.strictEqual(second.index, 2);
        assert.ok(second.parent === first);
        assert.ok(first.parent === snippet);
        snippet = new SnippetParser().parse('${VAR:default${1:value}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 2);
        [first] = snippet.placeholders;
        assert.strictEqual(first.index, 1);
        assert.ok(snippet.children[0] instanceof Variable);
        assert.ok(first.parent === snippet.children[0]);
    });
    test('TextmateSnippet#enclosingPlaceholders', () => {
        const snippet = new SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
        const [first, second] = snippet.placeholders;
        assert.deepStrictEqual(snippet.enclosingPlaceholders(first), []);
        assert.deepStrictEqual(snippet.enclosingPlaceholders(second), [first]);
    });
    test('TextmateSnippet#offset', () => {
        let snippet = new SnippetParser().parse('te$1xt', true);
        assert.strictEqual(snippet.offset(snippet.children[0]), 0);
        assert.strictEqual(snippet.offset(snippet.children[1]), 2);
        assert.strictEqual(snippet.offset(snippet.children[2]), 2);
        snippet = new SnippetParser().parse('${TM_SELECTED_TEXT:def}', true);
        assert.strictEqual(snippet.offset(snippet.children[0]), 0);
        assert.strictEqual(snippet.offset(snippet.children[0].children[0]), 0);
        // forgein marker
        assert.strictEqual(snippet.offset(new Text('foo')), -1);
    });
    test('TextmateSnippet#placeholder', () => {
        let snippet = new SnippetParser().parse('te$1xt$0', true);
        let placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 2);
        snippet = new SnippetParser().parse('te$1xt$1$0', true);
        placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 3);
        snippet = new SnippetParser().parse('te$1xt$2$0', true);
        placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 3);
        snippet = new SnippetParser().parse('${1:bar${2:foo}bar}$0', true);
        placeholders = snippet.placeholders;
        assert.strictEqual(placeholders.length, 3);
    });
    test('TextmateSnippet#replace 1/2', function () {
        const snippet = new SnippetParser().parse('aaa${1:bbb${2:ccc}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 3);
        const [, second] = snippet.placeholders;
        assert.strictEqual(second.index, 2);
        const enclosing = snippet.enclosingPlaceholders(second);
        assert.strictEqual(enclosing.length, 1);
        assert.strictEqual(enclosing[0].index, 1);
        const nested = new SnippetParser().parse('ddd$1eee$0', true);
        snippet.replace(second, nested.children);
        assert.strictEqual(snippet.toString(), 'aaabbbdddeee');
        assert.strictEqual(snippet.placeholders.length, 4);
        assert.strictEqual(snippet.placeholders[0].index, 1);
        assert.strictEqual(snippet.placeholders[1].index, 1);
        assert.strictEqual(snippet.placeholders[2].index, 0);
        assert.strictEqual(snippet.placeholders[3].index, 0);
        const newEnclosing = snippet.enclosingPlaceholders(snippet.placeholders[1]);
        assert.ok(newEnclosing[0] === snippet.placeholders[0]);
        assert.strictEqual(newEnclosing.length, 1);
        assert.strictEqual(newEnclosing[0].index, 1);
    });
    test('TextmateSnippet#replace 2/2', function () {
        const snippet = new SnippetParser().parse('aaa${1:bbb${2:ccc}}$0', true);
        assert.strictEqual(snippet.placeholders.length, 3);
        const [, second] = snippet.placeholders;
        assert.strictEqual(second.index, 2);
        const nested = new SnippetParser().parse('dddeee$0', true);
        snippet.replace(second, nested.children);
        assert.strictEqual(snippet.toString(), 'aaabbbdddeee');
        assert.strictEqual(snippet.placeholders.length, 3);
    });
    test('Snippet order for placeholders, #28185', function () {
        const _10 = new Placeholder(10);
        const _2 = new Placeholder(2);
        assert.strictEqual(Placeholder.compareByIndex(_10, _2), 1);
    });
    test('Maximum call stack size exceeded, #28983', function () {
        new SnippetParser().parse('${1:${foo:${1}}}');
    });
    test('Snippet can freeze the editor, #30407', function () {
        const seen = new Set();
        seen.clear();
        new SnippetParser().parse('class ${1:${TM_FILENAME/(?:\\A|_)([A-Za-z0-9]+)(?:\\.rb)?/(?2::\\u$1)/g}} < ${2:Application}Controller\n  $3\nend').walk(marker => {
            assert.ok(!seen.has(marker));
            seen.add(marker);
            return true;
        });
        seen.clear();
        new SnippetParser().parse('${1:${FOO:abc$1def}}').walk(marker => {
            assert.ok(!seen.has(marker));
            seen.add(marker);
            return true;
        });
    });
    test('Snippets: make parser ignore `${0|choice|}`, #31599', function () {
        assertTextAndMarker('${0|foo,bar|}', '${0|foo,bar|}', Text);
        assertTextAndMarker('${1|foo,bar|}', 'foo', Placeholder);
    });
    test('Transform -> FormatString#resolve', function () {
        // shorthand functions
        assert.strictEqual(new FormatString(1, 'upcase').resolve('foo'), 'FOO');
        assert.strictEqual(new FormatString(1, 'downcase').resolve('FOO'), 'foo');
        assert.strictEqual(new FormatString(1, 'capitalize').resolve('bar'), 'Bar');
        assert.strictEqual(new FormatString(1, 'capitalize').resolve('bar no repeat'), 'Bar no repeat');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('bar-foo'), 'BarFoo');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('bar-42-foo'), 'Bar42Foo');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('snake_AndPascalCase'), 'SnakeAndPascalCase');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('kebab-AndPascalCase'), 'KebabAndPascalCase');
        assert.strictEqual(new FormatString(1, 'pascalcase').resolve('_justPascalCase'), 'JustPascalCase');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('bar-foo'), 'barFoo');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('bar-42-foo'), 'bar42Foo');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('snake_AndCamelCase'), 'snakeAndCamelCase');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('kebab-AndCamelCase'), 'kebabAndCamelCase');
        assert.strictEqual(new FormatString(1, 'camelcase').resolve('_JustCamelCase'), 'justCamelCase');
        assert.strictEqual(new FormatString(1, 'notKnown').resolve('input'), 'input');
        // if
        assert.strictEqual(new FormatString(1, undefined, 'foo', undefined).resolve(undefined), '');
        assert.strictEqual(new FormatString(1, undefined, 'foo', undefined).resolve(''), '');
        assert.strictEqual(new FormatString(1, undefined, 'foo', undefined).resolve('bar'), 'foo');
        // else
        assert.strictEqual(new FormatString(1, undefined, undefined, 'foo').resolve(undefined), 'foo');
        assert.strictEqual(new FormatString(1, undefined, undefined, 'foo').resolve(''), 'foo');
        assert.strictEqual(new FormatString(1, undefined, undefined, 'foo').resolve('bar'), 'bar');
        // if-else
        assert.strictEqual(new FormatString(1, undefined, 'bar', 'foo').resolve(undefined), 'foo');
        assert.strictEqual(new FormatString(1, undefined, 'bar', 'foo').resolve(''), 'foo');
        assert.strictEqual(new FormatString(1, undefined, 'bar', 'foo').resolve('baz'), 'bar');
    });
    test('Snippet variable transformation doesn\'t work if regex is complicated and snippet body contains \'$$\' #55627', function () {
        const snippet = new SnippetParser().parse('const fileName = "${TM_FILENAME/(.*)\\..+$/$1/}"');
        assert.strictEqual(snippet.toTextmateString(), 'const fileName = "${TM_FILENAME/(.*)\\..+$/${1}/}"');
    });
    test('[BUG] HTML attribute suggestions: Snippet session does not have end-position set, #33147', function () {
        const { placeholders } = new SnippetParser().parse('src="$1"', true);
        const [first, second] = placeholders;
        assert.strictEqual(placeholders.length, 2);
        assert.strictEqual(first.index, 1);
        assert.strictEqual(second.index, 0);
    });
    test('Snippet optional transforms are not applied correctly when reusing the same variable, #37702', function () {
        const transform = new Transform();
        transform.appendChild(new FormatString(1, 'upcase'));
        transform.appendChild(new FormatString(2, 'upcase'));
        transform.regexp = /^(.)|-(.)/g;
        assert.strictEqual(transform.resolve('my-file-name'), 'MyFileName');
        const clone = transform.clone();
        assert.strictEqual(clone.resolve('my-file-name'), 'MyFileName');
    });
    test('problem with snippets regex #40570', function () {
        const snippet = new SnippetParser().parse('${TM_DIRECTORY/.*src[\\/](.*)/$1/}');
        assertMarker(snippet, Variable);
    });
    test('Variable transformation doesn\'t work if undefined variables are used in the same snippet #51769', function () {
        const transform = new Transform();
        transform.appendChild(new Text('bar'));
        transform.regexp = new RegExp('foo', 'gi');
        assert.strictEqual(transform.toTextmateString(), '/foo/bar/ig');
    });
    test('Snippet parser freeze #53144', function () {
        const snippet = new SnippetParser().parse('${1/(void$)|(.+)/${1:?-\treturn nil;}/}');
        assertMarker(snippet, Placeholder);
    });
    test('snippets variable not resolved in JSON proposal #52931', function () {
        assertTextAndMarker('FOO${1:/bin/bash}', 'FOO/bin/bash', Text, Placeholder);
    });
    test('Mirroring sequence of nested placeholders not selected properly on backjumping #58736', function () {
        const snippet = new SnippetParser().parse('${3:nest1 ${1:nest2 ${2:nest3}}} $3');
        assert.strictEqual(snippet.children.length, 3);
        assert.ok(snippet.children[0] instanceof Placeholder);
        assert.ok(snippet.children[1] instanceof Text);
        assert.ok(snippet.children[2] instanceof Placeholder);
        function assertParent(marker) {
            marker.children.forEach(assertParent);
            if (!(marker instanceof Placeholder)) {
                return;
            }
            let found = false;
            let m = marker;
            while (m && !found) {
                if (m.parent === snippet) {
                    found = true;
                }
                m = m.parent;
            }
            assert.ok(found);
        }
        const [, , clone] = snippet.children;
        assertParent(clone);
    });
    test('Backspace can\'t be escaped in snippet variable transforms #65412', function () {
        const snippet = new SnippetParser().parse('namespace ${TM_DIRECTORY/[\\/]/\\\\/g};');
        assertMarker(snippet, Text, Variable, Text);
    });
    test('Snippet cannot escape closing bracket inside conditional insertion variable replacement #78883', function () {
        const snippet = new SnippetParser().parse('${TM_DIRECTORY/(.+)/${1:+import { hello \\} from world}/}');
        const variable = snippet.children[0];
        assert.strictEqual(snippet.children.length, 1);
        assert.ok(variable instanceof Variable);
        assert.ok(variable.transform);
        assert.strictEqual(variable.transform.children.length, 1);
        assert.ok(variable.transform.children[0] instanceof FormatString);
        assert.strictEqual(variable.transform.children[0].ifValue, 'import { hello } from world');
        assert.strictEqual(variable.transform.children[0].elseValue, undefined);
    });
    test('Snippet escape backslashes inside conditional insertion variable replacement #80394', function () {
        const snippet = new SnippetParser().parse('${CURRENT_YEAR/(.+)/${1:+\\\\}/}');
        const variable = snippet.children[0];
        assert.strictEqual(snippet.children.length, 1);
        assert.ok(variable instanceof Variable);
        assert.ok(variable.transform);
        assert.strictEqual(variable.transform.children.length, 1);
        assert.ok(variable.transform.children[0] instanceof FormatString);
        assert.strictEqual(variable.transform.children[0].ifValue, '\\');
        assert.strictEqual(variable.transform.children[0].elseValue, undefined);
    });
    test('Snippet placeholder empty right after expansion #152553', function () {
        const snippet = new SnippetParser().parse('${1:prog}: ${2:$1.cc} - $2');
        const actual = snippet.toString();
        assert.strictEqual(actual, 'prog: prog.cc - prog.cc');
        const snippet2 = new SnippetParser().parse('${1:prog}: ${3:${2:$1.cc}.33} - $2 $3');
        const actual2 = snippet2.toString();
        assert.strictEqual(actual2, 'prog: prog.cc.33 - prog.cc prog.cc.33');
        // cyclic references of placeholders
        const snippet3 = new SnippetParser().parse('${1:$2.one} <> ${2:$1.two}');
        const actual3 = snippet3.toString();
        assert.strictEqual(actual3, '.two.one.two.one <> .one.two.one.two');
    });
    test('Snippet choices are incorrectly escaped/applied #180132', function () {
        assertTextAndMarker('${1|aaa$aaa|}bbb\\$bbb', 'aaa$aaabbb$bbb', Placeholder, Text);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldFBhcnNlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc25pcHBldC90ZXN0L2Jyb3dzZXIvc25pcHBldFBhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBVSxXQUFXLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFhLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxSyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUUzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1FBRXBCLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQztRQUV2RCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksaUNBQXlCLENBQUM7UUFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSx5QkFBZ0IsQ0FBQztRQUV2RCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFB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Q0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXpDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVyRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVB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TSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFM0YsT0FBTztRQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTNGLFVBQVU7UUFDVixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRixN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