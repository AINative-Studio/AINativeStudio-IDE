/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepEqual, deepStrictEqual, strictEqual } from 'assert';
import * as sinon from 'sinon';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { deserializeMessage, parseKeyValueAssignment, parseMarkSequence, ShellIntegrationAddon } from '../../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
class TestShellIntegrationAddon extends ShellIntegrationAddon {
    getCommandDetectionMock(terminal) {
        const capability = super._createOrGetCommandDetection(terminal);
        this.capabilities.add(2 /* TerminalCapability.CommandDetection */, capability);
        return sinon.mock(capability);
    }
    getCwdDectionMock() {
        const capability = super._createOrGetCwdDetection();
        this.capabilities.add(0 /* TerminalCapability.CwdDetection */, capability);
        return sinon.mock(capability);
    }
}
suite('ShellIntegrationAddon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let shellIntegrationAddon;
    let capabilities;
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 }));
        shellIntegrationAddon = store.add(new TestShellIntegrationAddon('', true, undefined, new NullLogService()));
        xterm.loadAddon(shellIntegrationAddon);
        capabilities = shellIntegrationAddon.capabilities;
    });
    suite('cwd detection', () => {
        test('should activate capability on the cwd sequence (OSC 633 ; P ; Cwd=<cwd> ST)', async () => {
            strictEqual(capabilities.has(0 /* TerminalCapability.CwdDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(0 /* TerminalCapability.CwdDetection */), false);
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            strictEqual(capabilities.has(0 /* TerminalCapability.CwdDetection */), true);
        });
        test('should pass cwd sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCwdDectionMock();
            mock.expects('updateCwd').once().withExactArgs('/foo');
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            mock.verify();
        });
        test('detect ITerm sequence: `OSC 1337 ; CurrentDir=<Cwd> ST`', async () => {
            const cases = [
                ['root', '/', '/'],
                ['non-root', '/some/path', '/some/path'],
            ];
            for (const x of cases) {
                const [title, input, expected] = x;
                const mock = shellIntegrationAddon.getCwdDectionMock();
                mock.expects('updateCwd').once().withExactArgs(expected).named(title);
                await writeP(xterm, `\x1b]1337;CurrentDir=${input}\x07`);
                mock.verify();
            }
        });
        suite('detect `SetCwd` sequence: `OSC 7; scheme://cwd ST`', () => {
            test('should accept well-formatted URLs', async () => {
                const cases = [
                    // Different hostname values:
                    ['empty hostname, pointing root', 'file:///', '/'],
                    ['empty hostname', 'file:///test-root/local', '/test-root/local'],
                    ['non-empty hostname', 'file://some-hostname/test-root/local', '/test-root/local'],
                    // URL-encoded chars:
                    ['URL-encoded value (1)', 'file:///test-root/%6c%6f%63%61%6c', '/test-root/local'],
                    ['URL-encoded value (2)', 'file:///test-root/local%22', '/test-root/local"'],
                    ['URL-encoded value (3)', 'file:///test-root/local"', '/test-root/local"'],
                ];
                for (const x of cases) {
                    const [title, input, expected] = x;
                    const mock = shellIntegrationAddon.getCwdDectionMock();
                    mock.expects('updateCwd').once().withExactArgs(expected).named(title);
                    await writeP(xterm, `\x1b]7;${input}\x07`);
                    mock.verify();
                }
            });
            test('should ignore ill-formatted URLs', async () => {
                const cases = [
                    // Different hostname values:
                    ['no hostname, pointing root', 'file://'],
                    // Non-`file` scheme values:
                    ['no scheme (1)', '/test-root'],
                    ['no scheme (2)', '//test-root'],
                    ['no scheme (3)', '///test-root'],
                    ['no scheme (4)', ':///test-root'],
                    ['http', 'http:///test-root'],
                    ['ftp', 'ftp:///test-root'],
                    ['ssh', 'ssh:///test-root'],
                ];
                for (const x of cases) {
                    const [title, input] = x;
                    const mock = shellIntegrationAddon.getCwdDectionMock();
                    mock.expects('updateCwd').never().named(title);
                    await writeP(xterm, `\x1b]7;${input}\x07`);
                    mock.verify();
                }
            });
        });
        test('detect `SetWindowsFrindlyCwd` sequence: `OSC 9 ; 9 ; <cwd> ST`', async () => {
            const cases = [
                ['root', '/', '/'],
                ['non-root', '/some/path', '/some/path'],
            ];
            for (const x of cases) {
                const [title, input, expected] = x;
                const mock = shellIntegrationAddon.getCwdDectionMock();
                mock.expects('updateCwd').once().withExactArgs(expected).named(title);
                await writeP(xterm, `\x1b]9;9;${input}\x07`);
                mock.verify();
            }
        });
    });
    suite('command tracking', () => {
        test('should activate capability on the prompt start sequence (OSC 633 ; A ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;A\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass prompt start sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handlePromptStart').once().withExactArgs();
            await writeP(xterm, '\x1b]633;A\x07');
            mock.verify();
        });
        test('should activate capability on the command start sequence (OSC 633 ; B ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;B\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass command start sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handleCommandStart').once().withExactArgs();
            await writeP(xterm, '\x1b]633;B\x07');
            mock.verify();
        });
        test('should activate capability on the command executed sequence (OSC 633 ; C ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;C\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass command executed sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handleCommandExecuted').once().withExactArgs();
            await writeP(xterm, '\x1b]633;C\x07');
            mock.verify();
        });
        test('should activate capability on the command finished sequence (OSC 633 ; D ; <ExitCode> ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;D;7\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), true);
        });
        test('should pass command finished sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('handleCommandFinished').once().withExactArgs(7);
            await writeP(xterm, '\x1b]633;D;7\x07');
            mock.verify();
        });
        test('should pass command line sequence to the capability', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('setCommandLine').once().withExactArgs('', false);
            await writeP(xterm, '\x1b]633;E\x07');
            mock.verify();
            const mock2 = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock2.expects('setCommandLine').twice().withExactArgs('cmd', false);
            await writeP(xterm, '\x1b]633;E;cmd\x07');
            await writeP(xterm, '\x1b]633;E;cmd;invalid-nonce\x07');
            mock2.verify();
        });
        test('should not activate capability on the cwd sequence (OSC 633 ; P=Cwd=<cwd> ST)', async () => {
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            strictEqual(capabilities.has(2 /* TerminalCapability.CommandDetection */), false);
        });
        test('should pass cwd sequence to the capability if it\'s initialized', async () => {
            const mock = shellIntegrationAddon.getCommandDetectionMock(xterm);
            mock.expects('setCwd').once().withExactArgs('/foo');
            await writeP(xterm, '\x1b]633;P;Cwd=/foo\x07');
            mock.verify();
        });
    });
    suite('BufferMarkCapability', () => {
        test('SetMark', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        test('SetMark - ID', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;1;\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        test('SetMark - hidden', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;;Hidden\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        test('SetMark - hidden & ID', async () => {
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, 'foo');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), false);
            await writeP(xterm, '\x1b]633;SetMark;1;Hidden\x07');
            strictEqual(capabilities.has(4 /* TerminalCapability.BufferMarkDetection */), true);
        });
        suite('parseMarkSequence', () => {
            test('basic', async () => {
                deepEqual(parseMarkSequence(['', '']), { id: undefined, hidden: false });
            });
            test('ID', async () => {
                deepEqual(parseMarkSequence(['Id=3', '']), { id: "3", hidden: false });
            });
            test('hidden', async () => {
                deepEqual(parseMarkSequence(['', 'Hidden']), { id: undefined, hidden: true });
            });
            test('ID + hidden', async () => {
                deepEqual(parseMarkSequence(['Id=4555', 'Hidden']), { id: "4555", hidden: true });
            });
        });
    });
    suite('deserializeMessage', () => {
        // A single literal backslash, in order to avoid confusion about whether we are escaping test data or testing escapes.
        const Backslash = '\\';
        const Newline = '\n';
        const Semicolon = ';';
        const cases = [
            ['empty', '', ''],
            ['basic', 'value', 'value'],
            ['space', 'some thing', 'some thing'],
            ['escaped backslash', `${Backslash}${Backslash}`, Backslash],
            ['non-initial escaped backslash', `foo${Backslash}${Backslash}`, `foo${Backslash}`],
            ['two escaped backslashes', `${Backslash}${Backslash}${Backslash}${Backslash}`, `${Backslash}${Backslash}`],
            ['escaped backslash amidst text', `Hello${Backslash}${Backslash}there`, `Hello${Backslash}there`],
            ['backslash escaped literally and as hex', `${Backslash}${Backslash} is same as ${Backslash}x5c`, `${Backslash} is same as ${Backslash}`],
            ['escaped semicolon', `${Backslash}x3b`, Semicolon],
            ['non-initial escaped semicolon', `foo${Backslash}x3b`, `foo${Semicolon}`],
            ['escaped semicolon (upper hex)', `${Backslash}x3B`, Semicolon],
            ['escaped backslash followed by literal "x3b" is not a semicolon', `${Backslash}${Backslash}x3b`, `${Backslash}x3b`],
            ['non-initial escaped backslash followed by literal "x3b" is not a semicolon', `foo${Backslash}${Backslash}x3b`, `foo${Backslash}x3b`],
            ['escaped backslash followed by escaped semicolon', `${Backslash}${Backslash}${Backslash}x3b`, `${Backslash}${Semicolon}`],
            ['escaped semicolon amidst text', `some${Backslash}x3bthing`, `some${Semicolon}thing`],
            ['escaped newline', `${Backslash}x0a`, Newline],
            ['non-initial escaped newline', `foo${Backslash}x0a`, `foo${Newline}`],
            ['escaped newline (upper hex)', `${Backslash}x0A`, Newline],
            ['escaped backslash followed by literal "x0a" is not a newline', `${Backslash}${Backslash}x0a`, `${Backslash}x0a`],
            ['non-initial escaped backslash followed by literal "x0a" is not a newline', `foo${Backslash}${Backslash}x0a`, `foo${Backslash}x0a`],
            ['PS1 simple', '[\\u@\\h \\W]\\$', '[\\u@\\h \\W]\\$'],
            ['PS1 VSC SI', `${Backslash}x1b]633;A${Backslash}x07\\[${Backslash}x1b]0;\\u@\\h:\\w\\a\\]${Backslash}x1b]633;B${Backslash}x07`, '\x1b]633;A\x07\\[\x1b]0;\\u@\\h:\\w\\a\\]\x1b]633;B\x07']
        ];
        cases.forEach(([title, input, expected]) => {
            test(title, () => strictEqual(deserializeMessage(input), expected));
        });
    });
    test('parseKeyValueAssignment', () => {
        const cases = [
            ['empty', '', ['', undefined]],
            ['no "=" sign', 'some-text', ['some-text', undefined]],
            ['empty value', 'key=', ['key', '']],
            ['empty key', '=value', ['', 'value']],
            ['normal', 'key=value', ['key', 'value']],
            ['multiple "=" signs (1)', 'key==value', ['key', '=value']],
            ['multiple "=" signs (2)', 'key=value===true', ['key', 'value===true']],
            ['just a "="', '=', ['', '']],
            ['just a "=="', '==', ['', '=']],
        ];
        cases.forEach(x => {
            const [title, input, [key, value]] = x;
            deepStrictEqual(parseKeyValueAssignment(input), { key, value }, title);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci94dGVybS9zaGVsbEludGVncmF0aW9uQWRkb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDakUsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ2xMLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVqRSxNQUFNLHlCQUEwQixTQUFRLHFCQUFxQjtJQUM1RCx1QkFBdUIsQ0FBQyxRQUFrQjtRQUN6QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLDhDQUFzQyxVQUFVLENBQUMsQ0FBQztRQUN2RSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUNELGlCQUFpQjtRQUNoQixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsQ0FB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