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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJndi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L3Rlc3Qvbm9kZS9hcmd2LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQTBDLFNBQVMsRUFBaUIsTUFBTSxvQkFBb0IsQ0FBQztBQUNySCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFbEQsU0FBUyxDQUFDLENBQUMsV0FBbUIsRUFBRSxPQUEwQyxRQUFRO0lBQ2pGLE9BQU87UUFDTixXQUFXLEVBQUUsSUFBSTtLQUNqQixDQUFDO0FBQ0gsQ0FBQztBQUNELFNBQVMsQ0FBQyxDQUFDLFdBQW1CLEVBQUUsT0FBZ0M7SUFDL0QsT0FBTztRQUNOLFdBQVcsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLE9BQU87S0FDeEMsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUUzQixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGFBQWEsQ0FBQztZQUNiLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1NBQ2YsRUFBRSxFQUFFLENBQUMsRUFDTixDQUFDLG9CQUFvQixDQUFDLENBQ3RCLENBQUM7UUFDRixNQUFNLENBQUMsZUFBZSxDQUNyQixhQUFhLENBQUM7WUFDYixLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNmLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2Ys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