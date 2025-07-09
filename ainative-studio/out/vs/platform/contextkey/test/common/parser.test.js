/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Parser } from '../../common/contextkey.js';
function parseToStr(input) {
    const parser = new Parser();
    const prints = [];
    const print = (...ss) => { ss.forEach(s => prints.push(s)); };
    const expr = parser.parse(input);
    if (expr === undefined) {
        if (parser.lexingErrors.length > 0) {
            print('Lexing errors:', '\n\n');
            parser.lexingErrors.forEach(lexingError => print(`Unexpected token '${lexingError.lexeme}' at offset ${lexingError.offset}. ${lexingError.additionalInfo}`, '\n'));
        }
        if (parser.parsingErrors.length > 0) {
            if (parser.lexingErrors.length > 0) {
                print('\n --- \n');
            }
            print('Parsing errors:', '\n\n');
            parser.parsingErrors.forEach(parsingError => print(`Unexpected '${parsingError.lexeme}' at offset ${parsingError.offset}.`, '\n'));
        }
    }
    else {
        print(expr.serialize());
    }
    return prints.join('');
}
suite('Context Key Parser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test(' foo', () => {
        const input = ' foo';
        assert.deepStrictEqual(parseToStr(input), "foo");
    });
    test('!foo', () => {
        const input = '!foo';
        assert.deepStrictEqual(parseToStr(input), "!foo");
    });
    test('foo =~ /bar/', () => {
        const input = 'foo =~ /bar/';
        assert.deepStrictEqual(parseToStr(input), "foo =~ /bar/");
    });
    test(`foo || (foo =~ /bar/ && baz)`, () => {
        const input = `foo || (foo =~ /bar/ && baz)`;
        assert.deepStrictEqual(parseToStr(input), "foo || baz && foo =~ /bar/");
    });
    test('foo || (foo =~ /bar/ || baz)', () => {
        const input = 'foo || (foo =~ /bar/ || baz)';
        assert.deepStrictEqual(parseToStr(input), "baz || foo || foo =~ /bar/");
    });
    test(`(foo || bar) && (jee || jar)`, () => {
        const input = `(foo || bar) && (jee || jar)`;
        assert.deepStrictEqual(parseToStr(input), "bar && jar || bar && jee || foo && jar || foo && jee");
    });
    test('foo && foo =~ /zee/i', () => {
        const input = 'foo && foo =~ /zee/i';
        assert.deepStrictEqual(parseToStr(input), "foo && foo =~ /zee/i");
    });
    test('foo.bar==enabled', () => {
        const input = 'foo.bar==enabled';
        assert.deepStrictEqual(parseToStr(input), "foo.bar == 'enabled'");
    });
    test(`foo.bar == 'enabled'`, () => {
        const input = `foo.bar == 'enabled'`;
        assert.deepStrictEqual(parseToStr(input), `foo.bar == 'enabled'`);
    });
    test('foo.bar:zed==completed - equality with no space', () => {
        const input = 'foo.bar:zed==completed';
        assert.deepStrictEqual(parseToStr(input), "foo.bar:zed == 'completed'");
    });
    test('a && b || c', () => {
        const input = 'a && b || c';
        assert.deepStrictEqual(parseToStr(input), "c || a && b");
    });
    test('fooBar && baz.jar && fee.bee<K-loo+1>', () => {
        const input = 'fooBar && baz.jar && fee.bee<K-loo+1>';
        assert.deepStrictEqual(parseToStr(input), "baz.jar && fee.bee<K-loo+1> && fooBar");
    });
    test('foo.barBaz<C-r> < 2', () => {
        const input = 'foo.barBaz<C-r> < 2';
        assert.deepStrictEqual(parseToStr(input), `foo.barBaz<C-r> < 2`);
    });
    test('foo.bar >= -1', () => {
        const input = 'foo.bar >= -1';
        assert.deepStrictEqual(parseToStr(input), "foo.bar >= -1");
    });
    test(`key contains &nbsp: view == vsc-packages-activitybar-folders && vsc-packages-folders-loaded`, () => {
        const input = `view == vsc-packages-activitybar-folders && vsc-packages-folders-loaded`;
        assert.deepStrictEqual(parseToStr(input), "vsc-packages-folders-loaded && view == 'vsc-packages-activitybar-folders'");
    });
    test('foo.bar <= -1', () => {
        const input = 'foo.bar <= -1';
        assert.deepStrictEqual(parseToStr(input), `foo.bar <= -1`);
    });
    test('!cmake:hideBuildCommand \u0026\u0026 cmake:enableFullFeatureSet', () => {
        const input = '!cmake:hideBuildCommand \u0026\u0026 cmake:enableFullFeatureSet';
        assert.deepStrictEqual(parseToStr(input), "cmake:enableFullFeatureSet && !cmake:hideBuildCommand");
    });
    test('!(foo && bar)', () => {
        const input = '!(foo && bar)';
        assert.deepStrictEqual(parseToStr(input), "!bar || !foo");
    });
    test('!(foo && bar || boar) || deer', () => {
        const input = '!(foo && bar || boar) || deer';
        assert.deepStrictEqual(parseToStr(input), "deer || !bar && !boar || !boar && !foo");
    });
    test(`!(!foo)`, () => {
        const input = `!(!foo)`;
        assert.deepStrictEqual(parseToStr(input), "foo");
    });
    suite('controversial', () => {
        /*
            new parser KEEPS old one's behavior:

            old parser output: { key: 'debugState', op: '==', value: '"stopped"' }
            new parser output: { key: 'debugState', op: '==', value: '"stopped"' }

            TODO@ulugbekna: we should consider breaking old parser's behavior, and not take double quotes as part of the `value` because that's not what user expects.
        */
        test(`debugState == "stopped"`, () => {
            const input = `debugState == "stopped"`;
            assert.deepStrictEqual(parseToStr(input), "debugState == '\"stopped\"'");
        });
        /*
            new parser BREAKS old one's behavior:

            old parser output: { key: 'viewItem', op: '==', value: 'VSCode WorkSpace' }
            new parser output: { key: 'viewItem', op: '==', value: 'VSCode' }

            TODO@ulugbekna: since this's breaking, we can have hacky code that tries detecting such cases and replicate old parser's behavior.
        */
        test(` viewItem == VSCode WorkSpace`, () => {
            const input = ` viewItem == VSCode WorkSpace`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected 'WorkSpace' at offset 20.\n");
        });
    });
    suite('regex', () => {
        test(`resource =~ //foo/(barr|door/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(/.*)*$/`, () => {
            const input = `resource =~ //foo/(barr|door/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(/.*)*$/`;
            assert.deepStrictEqual(parseToStr(input), "resource =~ /\\/foo\\/(barr|door\\/(Foo-Bar%20Templates|Soo%20Looo)|Web%20Site%Jjj%20Llll)(\\/.*)*$/");
        });
        test(`resource =~ /((/scratch/(?!update)(.*)/)|((/src/).*/)).*$/`, () => {
            const input = `resource =~ /((/scratch/(?!update)(.*)/)|((/src/).*/)).*$/`;
            assert.deepStrictEqual(parseToStr(input), "resource =~ /((\\/scratch\\/(?!update)(.*)\\/)|((\\/src\\/).*\\/)).*$/");
        });
        test(`resourcePath =~ /\.md(\.yml|\.txt)*$/giym`, () => {
            const input = `resourcePath =~ /\.md(\.yml|\.txt)*$/giym`;
            assert.deepStrictEqual(parseToStr(input), "resourcePath =~ /.md(.yml|.txt)*$/im");
        });
    });
    suite('error handling', () => {
        test(`/foo`, () => {
            const input = `/foo`;
            assert.deepStrictEqual(parseToStr(input), "Lexing errors:\n\nUnexpected token '/foo' at offset 0. Did you forget to escape the '/' (slash) character? Put two backslashes before it to escape, e.g., '\\\\/'.\n\n --- \nParsing errors:\n\nUnexpected '/foo' at offset 0.\n");
        });
        test(`!b == 'true'`, () => {
            const input = `!b == 'true'`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '==' at offset 3.\n");
        });
        test('!foo &&  in bar', () => {
            const input = '!foo &&  in bar';
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected 'in' at offset 9.\n");
        });
        test('vim<c-r> == 1 && vim<2<=3', () => {
            const input = 'vim<c-r> == 1 && vim<2<=3';
            assert.deepStrictEqual(parseToStr(input), "Lexing errors:\n\nUnexpected token '=' at offset 23. Did you mean == or =~?\n\n --- \nParsing errors:\n\nUnexpected '=' at offset 23.\n"); // FIXME
        });
        test(`foo && 'bar`, () => {
            const input = `foo && 'bar`;
            assert.deepStrictEqual(parseToStr(input), "Lexing errors:\n\nUnexpected token ''bar' at offset 7. Did you forget to open or close the quote?\n\n --- \nParsing errors:\n\nUnexpected ''bar' at offset 7.\n");
        });
        test(`config.foo &&  &&bar =~ /^foo$|^bar-foo$|^joo$|^jar$/ && !foo`, () => {
            const input = `config.foo &&  &&bar =~ /^foo$|^bar-foo$|^joo$|^jar$/ && !foo`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '&&' at offset 15.\n");
        });
        test(`!foo == 'test'`, () => {
            const input = `!foo == 'test'`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '==' at offset 5.\n");
        });
        test(`!!foo`, function () {
            const input = `!!foo`;
            assert.deepStrictEqual(parseToStr(input), "Parsing errors:\n\nUnexpected '!' at offset 1.\n");
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dGtleS90ZXN0L2NvbW1vbi9wYXJzZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRXBELFNBQVMsVUFBVSxDQUFDLEtBQWE7SUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUU1QixNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUM7SUFFNUIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLEVBQVksRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV4RSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3hCLElBQUksTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLHFCQUFxQixXQUFXLENBQUMsTUFBTSxlQUFlLFdBQVcsQ0FBQyxNQUFNLEtBQUssV0FBVyxDQUFDLGNBQWMs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