/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { formatOptions, parseArgs } from '../../node/argv.js';
import { addArg } from '../../node/argvHelper.js';
function o(description, type = 'string') {
    return {
        description, type
    };
}
function c(description, options) {
    return {
        description, type: 'subcommand', options
    };
}
suite('formatOptions', () => {
    test('Text should display small columns correctly', () => {
        assert.deepStrictEqual(formatOptions({
            'add': o('bar')
        }, 80), ['  --add        bar']);
        assert.deepStrictEqual(formatOptions({
            'add': o('bar'),
            'wait': o('ba'),
            'trace': o('b')
        }, 80), [
            '  --add        bar',
            '  --wait       ba',
            '  --trace      b'
        ]);
    });
    test('Text should wrap', () => {
        assert.deepStrictEqual(formatOptions({
            'add': o('bar '.repeat(9))
        }, 40), [
            '  --add        bar bar bar bar bar bar',
            '               bar bar bar'
        ]);
    });
    test('Text should revert to the condensed view when the terminal is too narrow', () => {
        assert.deepStrictEqual(formatOptions({
            'add': o('bar '.repeat(9))
        }, 30), [
            '  --add',
            '      bar bar bar bar bar bar bar bar bar '
        ]);
    });
    test('addArg', () => {
        assert.deepStrictEqual(addArg([], 'foo'), ['foo']);
        assert.deepStrictEqual(addArg([], 'foo', 'bar'), ['foo', 'bar']);
        assert.deepStrictEqual(addArg(['foo'], 'bar'), ['foo', 'bar']);
        assert.deepStrictEqual(addArg(['--wait'], 'bar'), ['--wait', 'bar']);
        assert.deepStrictEqual(addArg(['--wait', '--', '--foo'], 'bar'), ['--wait', 'bar', '--', '--foo']);
        assert.deepStrictEqual(addArg(['--', '--foo'], 'bar'), ['bar', '--', '--foo']);
    });
    test('subcommands', () => {
        assert.deepStrictEqual(formatOptions({
            'testcmd': c('A test command', { add: o('A test command option') })
        }, 30), [
            '  --testcmd',
            '      A test command'
        ]);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('parseArgs', () => {
    function newErrorReporter(result = [], command = '') {
        const commandPrefix = command ? command + '-' : '';
        return {
            onDeprecatedOption: (deprecatedId) => result.push(`${commandPrefix}onDeprecatedOption ${deprecatedId}`),
            onUnknownOption: (id) => result.push(`${commandPrefix}onUnknownOption ${id}`),
            onEmptyValue: (id) => result.push(`${commandPrefix}onEmptyValue ${id}`),
            onMultipleValues: (id, usedValue) => result.push(`${commandPrefix}onMultipleValues ${id} ${usedValue}`),
            getSubcommandReporter: (c) => newErrorReporter(result, commandPrefix + c),
            result
        };
    }
    function assertParse(options, input, expected, expectedErrors) {
        const errorReporter = newErrorReporter();
        assert.deepStrictEqual(parseArgs(input, options, errorReporter), expected);
        assert.deepStrictEqual(errorReporter.result, expectedErrors);
    }
    test('subcommands', () => {
        const options1 = {
            'testcmd': c('A test command', {
                testArg: o('A test command option'),
                _: { type: 'string[]' }
            }),
            _: { type: 'string[]' }
        };
        assertParse(options1, ['testcmd', '--testArg=foo'], { testcmd: { testArg: 'foo', '_': [] }, '_': [] }, []);
        assertParse(options1, ['testcmd', '--testArg=foo', '--testX'], { testcmd: { testArg: 'foo', '_': [] }, '_': [] }, ['testcmd-onUnknownOption testX']);
        const options2 = {
            'testcmd': c('A test command', {
                testArg: o('A test command option')
            }),
            testX: { type: 'boolean', global: true, description: '' },
            _: { type: 'string[]' }
        };
        assertParse(options2, ['testcmd', '--testArg=foo', '--testX'], { testcmd: { testArg: 'foo', testX: true, '_': [] }, '_': [] }, []);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvdGVzdC9ub2RlL2FyZ3YudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGFBQWEsRUFBMEMsU0FBUyxFQUFpQixNQUFNLG9CQUFvQixDQUFDO0FBQ3JILE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVsRCxTQUFTLENBQUMsQ0FBQyxXQUFtQixFQUFFLE9BQTBDLFFBQVE7SUFDakYsT0FBTztRQUNOLFdBQVcsRUFBRSxJQUFJO0tBQ2pCLENBQUM7QUFDSCxDQUFDO0FBQ0QsU0FBUyxDQUFDLENBQUMsV0FBbUIsRUFBRSxPQUFnQztJQUMvRCxPQUFPO1FBQ04sV0FBVyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTztLQUN4QyxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBRTNCLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsYUFBYSxDQUFDO1lBQ2IsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7U0FDZixFQUFFLEVBQUUsQ0FBQyxFQUNOLENBQUMsb0JBQW9CLENBQUMsQ0FDdEIsQ0FBQztRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FBQztZQUNiLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ2YsTUFBTSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDZixP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