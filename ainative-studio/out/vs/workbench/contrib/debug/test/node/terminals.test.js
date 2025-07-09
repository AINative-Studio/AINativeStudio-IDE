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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9ub2RlL3Rlcm1pbmFscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHekQsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFDL0MsaUJBQWlCLENBQUMsQ0FBQztRQUNwQixNQUFNLENBQUMsV0FBVyxDQUNqQixjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFDdkUseUJBQXlCLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsV0FBVyxDQUNqQixjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQ3JELGtCQUFrQixDQUFDLENBQUM7UUFFckIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxF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