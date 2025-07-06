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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIveHRlcm0vc2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2pFLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsdUJBQXVCLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUNsTCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFakUsTUFBTSx5QkFBMEIsU0FBUSxxQkFBcUI7SUFDNUQsdUJBQXVCLENBQUMsUUFBa0I7UUFDekMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyw4Q0FBc0MsVUFBVSxDQUFDLENBQUM7UUFDdkUsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFDRCxpQkFBaUI7UUFDaEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHdCQUF3QixFQUFFLENBQUM7UUFD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