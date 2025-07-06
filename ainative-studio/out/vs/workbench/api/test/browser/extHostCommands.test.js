/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ExtHostCommands } from '../../common/extHostCommands.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostCommands', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('dispose calls unregister', function () {
        let lastUnregister;
        const shape = new class extends mock() {
            $registerCommand(id) {
                //
            }
            $unregisterCommand(id) {
                lastUnregister = id;
            }
        };
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        commands.registerCommand(true, 'foo', () => { }).dispose();
        assert.strictEqual(lastUnregister, 'foo');
        assert.strictEqual(CommandsRegistry.getCommand('foo'), undefined);
    });
    test('dispose bubbles only once', function () {
        let unregisterCounter = 0;
        const shape = new class extends mock() {
            $registerCommand(id) {
                //
            }
            $unregisterCommand(id) {
                unregisterCounter += 1;
            }
        };
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        const reg = commands.registerCommand(true, 'foo', () => { });
        reg.dispose();
        reg.dispose();
        reg.dispose();
        assert.strictEqual(unregisterCounter, 1);
    });
    test('execute with retry', async function () {
        let count = 0;
        const shape = new class extends mock() {
            $registerCommand(id) {
                //
            }
            async $executeCommand(id, args, retry) {
                count++;
                assert.strictEqual(retry, count === 1);
                if (count === 1) {
                    assert.strictEqual(retry, true);
                    throw new Error('$executeCommand:retry');
                }
                else {
                    assert.strictEqual(retry, false);
                    return 17;
                }
            }
        };
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        const result = await commands.executeCommand('fooo', [this, true]);
        assert.strictEqual(result, 17);
        assert.strictEqual(count, 2);
    });
    test('onCommand:abc activates extensions when executed from command palette, but not when executed programmatically with vscode.commands.executeCommand #150293', async function () {
        const activationEvents = [];
        const shape = new class extends mock() {
            $registerCommand(id) {
                //
            }
            $fireCommandActivationEvent(id) {
                activationEvents.push(id);
            }
        };
        const commands = new ExtHostCommands(SingleProxyRPCProtocol(shape), new NullLogService(), new class extends mock() {
            onExtensionError() {
                return true;
            }
        });
        commands.registerCommand(true, 'extCmd', (args) => args);
        const result = await commands.executeCommand('extCmd', this);
        assert.strictEqual(result, this);
        assert.deepStrictEqual(activationEvents, ['extCmd']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1hbmRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0Q29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLGlCQUFpQixFQUFFO0lBQ3hCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFO1FBRWhDLElBQUksY0FBc0IsQ0FBQztRQUUzQixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQTJCO1lBQ3JELGdCQUFnQixDQUFDLEVBQVU7Z0JBQ25DLEVBQUU7WUFDSCxDQUFDO1lBQ1Esa0JBQWtCLENBQUMsRUFBVTtnQkFDckMsY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUNyQixDQUFDO1NBQ0QsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxDQUNuQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsRUFDN0IsSUFBSSxjQUFjLEVBQUUsRUFDcEIsSUFBSSxLQUFNLFNBQVEsSUFBSSxFQUFxQjtZ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