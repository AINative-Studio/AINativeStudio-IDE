/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { prepareCommand } from '../../node/terminals.js';
suite('Debug - prepareCommand', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bash', () => {
        assert.strictEqual(prepareCommand('bash', ['{$} ('], false).trim(), '\\{\\$\\}\\ \\(');
        assert.strictEqual(prepareCommand('bash', ['hello', 'world', '--flag=true'], false).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('bash', [' space arg '], false).trim(), '\\ space\\ arg\\');
        assert.strictEqual(prepareCommand('bash', ['{$} ('], true).trim(), '{$} (');
        assert.strictEqual(prepareCommand('bash', ['hello', 'world', '--flag=true'], true).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('bash', [' space arg '], true).trim(), 'space arg');
    });
    test('bash - do not escape > and <', () => {
        assert.strictEqual(prepareCommand('bash', ['arg1', '>', '> hello.txt', '<', '<input.in'], false).trim(), 'arg1 > \\>\\ hello.txt < \\<input.in');
    });
    test('cmd', () => {
        assert.strictEqual(prepareCommand('cmd.exe', ['^!< '], false).trim(), '"^^^!^< "');
        assert.strictEqual(prepareCommand('cmd.exe', ['hello', 'world', '--flag=true'], false).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('cmd.exe', [' space arg '], false).trim(), '" space arg "');
        assert.strictEqual(prepareCommand('cmd.exe', ['"A>0"'], false).trim(), '"""A^>0"""');
        assert.strictEqual(prepareCommand('cmd.exe', [''], false).trim(), '""');
        assert.strictEqual(prepareCommand('cmd.exe', ['^!< '], true).trim(), '^!<');
        assert.strictEqual(prepareCommand('cmd.exe', ['hello', 'world', '--flag=true'], true).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('cmd.exe', [' space arg '], true).trim(), 'space arg');
        assert.strictEqual(prepareCommand('cmd.exe', ['"A>0"'], true).trim(), '"A>0"');
        assert.strictEqual(prepareCommand('cmd.exe', [''], true).trim(), '');
    });
    test('cmd - do not escape > and <', () => {
        assert.strictEqual(prepareCommand('cmd.exe', ['arg1', '>', '> hello.txt', '<', '<input.in'], false).trim(), 'arg1 > "^> hello.txt" < ^<input.in');
    });
    test('powershell', () => {
        assert.strictEqual(prepareCommand('powershell', ['!< '], false).trim(), `& '!< '`);
        assert.strictEqual(prepareCommand('powershell', ['hello', 'world', '--flag=true'], false).trim(), `& 'hello' 'world' '--flag=true'`);
        assert.strictEqual(prepareCommand('powershell', [' space arg '], false).trim(), `& ' space arg '`);
        assert.strictEqual(prepareCommand('powershell', ['"A>0"'], false).trim(), `& '"A>0"'`);
        assert.strictEqual(prepareCommand('powershell', [''], false).trim(), `& ''`);
        assert.strictEqual(prepareCommand('powershell', ['!< '], true).trim(), '!<');
        assert.strictEqual(prepareCommand('powershell', ['hello', 'world', '--flag=true'], true).trim(), 'hello world --flag=true');
        assert.strictEqual(prepareCommand('powershell', [' space arg '], true).trim(), 'space arg');
        assert.strictEqual(prepareCommand('powershell', ['"A>0"'], true).trim(), '"A>0"');
        assert.strictEqual(prepareCommand('powershell', [''], true).trim(), ``);
    });
    test('powershell - do not escape > and <', () => {
        assert.strictEqual(prepareCommand('powershell', ['arg1', '>', '> hello.txt', '<', '<input.in'], false).trim(), `& 'arg1' > '> hello.txt' < '<input.in'`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3Qvbm9kZS90ZXJtaW5hbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBR3pELEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUNqQixjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQy9DLGlCQUFpQixDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQ3ZFLHlCQUF5QixDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksRUFBRSxFQUNyRCxrQkFBa0IsQ0FBQyxDQUFDO1FBRXJCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVB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