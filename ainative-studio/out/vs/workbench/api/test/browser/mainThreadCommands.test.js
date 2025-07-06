/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadCommands } from '../../browser/mainThreadCommands.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadCommands', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('dispose on unregister', function () {
        const commands = new MainThreadCommands(SingleProxyRPCProtocol(null), undefined, new class extends mock() {
        });
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        // register
        commands.$registerCommand('foo');
        assert.ok(CommandsRegistry.getCommand('foo'));
        // unregister
        commands.$unregisterCommand('foo');
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        commands.dispose();
    });
    test('unregister all on dispose', function () {
        const commands = new MainThreadCommands(SingleProxyRPCProtocol(null), undefined, new class extends mock() {
        });
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        commands.$registerCommand('foo');
        commands.$registerCommand('bar');
        assert.ok(CommandsRegistry.getCommand('foo'));
        assert.ok(CommandsRegistry.getCommand('bar'));
        commands.dispose();
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
        assert.strictEqual(CommandsRegistry.getCommand('bar'), undefined);
    });
    test('activate and throw when needed', async function () {
        const activations = [];
        const runs = [];
        const commands = new MainThreadCommands(SingleProxyRPCProtocol(null), new class extends mock() {
            executeCommand(id) {
                runs.push(id);
                return Promise.resolve(undefined);
            }
        }, new class extends mock() {
            activateByEvent(id) {
                activations.push(id);
                return Promise.resolve();
            }
        });
        // case 1: arguments and retry
        try {
            activations.length = 0;
            await commands.$executeCommand('bazz', [1, 2, { n: 3 }], true);
            assert.ok(false);
        }
        catch (e) {
            assert.deepStrictEqual(activations, ['onCommand:bazz']);
            assert.strictEqual(e.message, '$executeCommand:retry');
        }
        // case 2: no arguments and retry
        runs.length = 0;
        await commands.$executeCommand('bazz', [], true);
        assert.deepStrictEqual(runs, ['bazz']);
        // case 3: arguments and no retry
        runs.length = 0;
        await commands.$executeCommand('bazz', [1, 2, true], false);
        assert.deepStrictEqual(runs, ['bazz']);
        commands.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRDb21tYW5kcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQW1CLE1BQU0sa0RBQWtELENBQUM7QUFDckcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhHLEtBQUssQ0FBQyxvQkFBb0IsRUFBRTtJQUUzQix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtRQUU3QixNQUFNLFFBQVEsR0FBRyxJQUFJLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVUsRUFBRSxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQXFCO1NBQUksQ0FBQyxDQUFDO1FBQ25JLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRWxFLFdBQVc7UUFDWCxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU5QyxhQUFh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