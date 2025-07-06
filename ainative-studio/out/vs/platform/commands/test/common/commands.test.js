/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { combinedDisposable } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CommandsRegistry } from '../../common/commands.js';
suite('Command Tests', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('register command - no handler', function () {
        assert.throws(() => CommandsRegistry.registerCommand('foo', null));
    });
    test('register/dispose', () => {
        const command = function () { };
        const reg = CommandsRegistry.registerCommand('foo', command);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command);
        reg.dispose();
        assert.ok(CommandsRegistry.getCommand('foo') === undefined);
    });
    test('register/register/dispose', () => {
        const command1 = function () { };
        const command2 = function () { };
        // dispose overriding command
        let reg1 = CommandsRegistry.registerCommand('foo', command1);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command1);
        let reg2 = CommandsRegistry.registerCommand('foo', command2);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command2);
        reg2.dispose();
        assert.ok(CommandsRegistry.getCommand('foo').handler === command1);
        reg1.dispose();
        assert.ok(CommandsRegistry.getCommand('foo') === undefined);
        // dispose override command first
        reg1 = CommandsRegistry.registerCommand('foo', command1);
        reg2 = CommandsRegistry.registerCommand('foo', command2);
        assert.ok(CommandsRegistry.getCommand('foo').handler === command2);
        reg1.dispose();
        assert.ok(CommandsRegistry.getCommand('foo').handler === command2);
        reg2.dispose();
        assert.ok(CommandsRegistry.getCommand('foo') === undefined);
    });
    test('command with description', function () {
        const r1 = CommandsRegistry.registerCommand('test', function (accessor, args) {
            assert.ok(typeof args === 'string');
        });
        const r2 = CommandsRegistry.registerCommand('test2', function (accessor, args) {
            assert.ok(typeof args === 'string');
        });
        const r3 = CommandsRegistry.registerCommand({
            id: 'test3',
            handler: function (accessor, args) {
                return true;
            },
            metadata: {
                description: 'a command',
                args: [{ name: 'value', constraint: Number }]
            }
        });
        CommandsRegistry.getCommands().get('test').handler.apply(undefined, [undefined, 'string']);
        CommandsRegistry.getCommands().get('test2').handler.apply(undefined, [undefined, 'string']);
        assert.throws(() => CommandsRegistry.getCommands().get('test3').handler.apply(undefined, [undefined, 'string']));
        assert.strictEqual(CommandsRegistry.getCommands().get('test3').handler.apply(undefined, [undefined, 1]), true);
        combinedDisposable(r1, r2, r3).dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29tbWFuZHMvdGVzdC9jb21tb24vY29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFNUQsS0FBSyxDQUFDLGVBQWUsRUFBRTtJQUV0Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywrQkFBK0IsRUFBRTtRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSyxDQUFDLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLENBQUM7UUFDaEMsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUUsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUM7UUFDbkUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtB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