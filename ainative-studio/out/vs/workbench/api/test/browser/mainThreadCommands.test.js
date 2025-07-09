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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZENvbW1hbmRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBbUIsTUFBTSxrREFBa0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUV0RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLG9CQUFvQixFQUFFO0lBRTNCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1FBRTdCLE1BQU0sUUFBUSxHQUFHLElBQUksa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBVSxFQUFFLElBQUksS0FBTSxTQUFRLElBQUksRUFBcUI7U0FBSSxDQUFDLENBQUM7UUFDbkksTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFbEUsV0FBVztRQUNYLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTlDLGFBQWE7UUFD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