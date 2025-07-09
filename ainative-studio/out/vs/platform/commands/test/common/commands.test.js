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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb21tYW5kcy90ZXN0L2NvbW1vbi9jb21tYW5kcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU1RCxLQUFLLENBQUMsZUFBZSxFQUFFO0lBRXRCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLCtCQUErQixFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsQ0FBQztRQUNoQyxNQUFNLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBRSxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsQ0FBQztRQUNuRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZCxNQUFNLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxT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