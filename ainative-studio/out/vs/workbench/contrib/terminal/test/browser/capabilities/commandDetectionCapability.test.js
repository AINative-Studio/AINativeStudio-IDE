/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, ok } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { writeP } from '../../../browser/terminalTestHelpers.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
class TestCommandDetectionCapability extends CommandDetectionCapability {
    clearCommands() {
        this._commands.length = 0;
    }
}
suite('CommandDetectionCapability', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let capability;
    let addEvents;
    function assertCommands(expectedCommands) {
        deepStrictEqual(capability.commands.map(e => e.command), expectedCommands.map(e => e.command));
        deepStrictEqual(capability.commands.map(e => e.cwd), expectedCommands.map(e => e.cwd));
        deepStrictEqual(capability.commands.map(e => e.exitCode), expectedCommands.map(e => e.exitCode));
        deepStrictEqual(capability.commands.map(e => e.marker?.line), expectedCommands.map(e => e.marker?.line));
        // Ensure timestamps are set and were captured recently
        for (const command of capability.commands) {
            ok(Math.abs(Date.now() - command.timestamp) < 2000);
        }
        deepStrictEqual(addEvents, capability.commands);
        // Clear the commands to avoid re-asserting past commands
        addEvents.length = 0;
        capability.clearCommands();
    }
    async function printStandardCommand(prompt, command, output, cwd, exitCode) {
        if (cwd !== undefined) {
            capability.setCwd(cwd);
        }
        capability.handlePromptStart();
        await writeP(xterm, `\r${prompt}`);
        capability.handleCommandStart();
        await writeP(xterm, command);
        capability.handleCommandExecuted();
        await writeP(xterm, `\r\n${output}\r\n`);
        capability.handleCommandFinished(exitCode);
    }
    async function printCommandStart(prompt) {
        capability.handlePromptStart();
        await writeP(xterm, `\r${prompt}`);
        capability.handleCommandStart();
    }
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80 }));
        const instantiationService = workbenchInstantiationService(undefined, store);
        capability = store.add(instantiationService.createInstance(TestCommandDetectionCapability, xterm));
        addEvents = [];
        store.add(capability.onCommandFinished(e => addEvents.push(e)));
        assertCommands([]);
    });
    test('should not add commands when no capability methods are triggered', async () => {
        await writeP(xterm, 'foo\r\nbar\r\n');
        assertCommands([]);
        await writeP(xterm, 'baz\r\n');
        assertCommands([]);
    });
    test('should add commands for expected capability method calls', async () => {
        await printStandardCommand('$ ', 'echo foo', 'foo', undefined, 0);
        await printCommandStart('$ ');
        assertCommands([{
                command: 'echo foo',
                exitCode: 0,
                cwd: undefined,
                marker: { line: 0 }
            }]);
    });
    test('should trim the command when command executed appears on the following line', async () => {
        await printStandardCommand('$ ', 'echo foo\r\n', 'foo', undefined, 0);
        await printCommandStart('$ ');
        assertCommands([{
                command: 'echo foo',
                exitCode: 0,
                cwd: undefined,
                marker: { line: 0 }
            }]);
    });
    suite('cwd', () => {
        test('should add cwd to commands when it\'s set', async () => {
            await printStandardCommand('$ ', 'echo foo', 'foo', '/home', 0);
            await printStandardCommand('$ ', 'echo bar', 'bar', '/home/second', 0);
            await printCommandStart('$ ');
            assertCommands([
                { command: 'echo foo', exitCode: 0, cwd: '/home', marker: { line: 0 } },
                { command: 'echo bar', exitCode: 0, cwd: '/home/second', marker: { line: 2 } }
            ]);
        });
        test('should add old cwd to commands if no cwd sequence is output', async () => {
            await printStandardCommand('$ ', 'echo foo', 'foo', '/home', 0);
            await printStandardCommand('$ ', 'echo bar', 'bar', undefined, 0);
            await printCommandStart('$ ');
            assertCommands([
                { command: 'echo foo', exitCode: 0, cwd: '/home', marker: { line: 0 } },
                { command: 'echo bar', exitCode: 0, cwd: '/home', marker: { line: 2 } }
            ]);
        });
        test('should use an undefined cwd if it\'s not set initially', async () => {
            await printStandardCommand('$ ', 'echo foo', 'foo', undefined, 0);
            await printStandardCommand('$ ', 'echo bar', 'bar', '/home', 0);
            await printCommandStart('$ ');
            assertCommands([
                { command: 'echo foo', exitCode: 0, cwd: undefined, marker: { line: 0 } },
                { command: 'echo bar', exitCode: 0, cwd: '/home', marker: { line: 2 } }
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci9jYXBhYmlsaXRpZXMvY29tbWFuZERldGVjdGlvbkNhcGFiaWxpdHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RkFBdUYsQ0FBQztBQUNuSSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFJckcsTUFBTSw4QkFBK0IsU0FBUSwwQkFBMEI7SUFDdEUsYUFBYTtRQUNaLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxLQUFlLENBQUM7SUFDcEIsSUFBSSxVQUEwQyxDQUFDO0lBQy9DLElBQUksU0FBNkIsQ0FBQztJQUVsQyxTQUFTLGNBQWMsQ0FBQyxnQkFBNEM7UUFDbkUsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9GLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN2RixlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDakcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDekcsdURBQXVEO1FBQ3ZELEtBQUssTUFBTSxPQUFPLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDckQsQ0FBQztRQUNELGVBQWUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELHlEQUF5RDtRQUN6RCxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztRQUNyQixVQUFVLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDNUIsQ0FBQztJQUVELEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxNQUFjLEVBQUUsT0FBZSxFQUFFLE1BQWMsRUFBRSxHQUF1QixFQUFFLFFBQWdCO1FBQzdILElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUNELFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxLQUFLLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDbkMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDaEMsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ25DLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxPQUFPLE1BQU0sTUFBTSxDQUFDLENBQUM7UUFDekMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxLQUFLLFVBQVUsaUJBQWlCLENBQUMsTUFBYztRQUM5QyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMvQixNQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsS0FBSyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFHRCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFFekgsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxRSxNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RSxVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsOEJBQThCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNuRyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRSxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0VBQWtFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkYsTUFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdEMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25CLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUMvQixjQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMERBQTBELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0UsTUFBTSxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEUsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixjQUFjLENBQUMsQ0FBQztnQkFDZixPQUFPLEVBQUUsVUFBVTtnQkFDbkIsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsR0FBRyxFQUFFLFNBQVM7Z0JBQ2QsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRTthQUNuQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlGLE1BQU0sb0JBQW9CLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0saUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsY0FBYyxDQUFDLENBQUM7Z0JBQ2YsT0FBTyxFQUFFLFVBQVU7Z0JBQ25CLFFBQVEsRUFBRSxDQUFDO2dCQUNYLEdBQUcsRUFBRSxTQUFTO2dCQUNkLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUU7YUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQ2pCLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxNQUFNLG9CQUFvQixDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRSxNQUFNLG9CQUFvQixDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN2RSxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLGNBQWMsQ0FBQztnQkFDZCxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDdkUsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7YUFDOUUsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsNkRBQTZELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUUsTUFBTSxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEUsTUFBTSxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QixjQUFjLENBQUM7Z0JBQ2QsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3ZFLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO2FBQ3ZFLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pFLE1BQU0sb0JBQW9CLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sb0JBQW9CLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLE1BQU0saUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsY0FBYyxDQUFDO2dCQUNkLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUN6RSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTthQUN2RSxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==