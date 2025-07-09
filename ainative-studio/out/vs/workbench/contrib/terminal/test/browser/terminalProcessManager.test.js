/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalInstanceService } from '../../browser/terminal.js';
import { TerminalProcessManager } from '../../browser/terminalProcessManager.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
class TestTerminalChildProcess {
    get capabilities() { return []; }
    constructor(shouldPersist) {
        this.shouldPersist = shouldPersist;
        this.id = 0;
        this.onDidChangeProperty = Event.None;
        this.onProcessData = Event.None;
        this.onProcessExit = Event.None;
        this.onProcessReady = Event.None;
        this.onProcessTitleChanged = Event.None;
        this.onProcessShellTypeChanged = Event.None;
    }
    updateProperty(property, value) {
        throw new Error('Method not implemented.');
    }
    async start() { return undefined; }
    shutdown(immediate) { }
    input(data) { }
    resize(cols, rows) { }
    clearBuffer() { }
    acknowledgeDataEvent(charCount) { }
    async setUnicodeVersion(version) { }
    async getInitialCwd() { return ''; }
    async getCwd() { return ''; }
    async processBinary(data) { }
    refreshProperty(property) { return Promise.resolve(''); }
}
class TestTerminalInstanceService {
    getBackend() {
        return {
            onPtyHostExit: Event.None,
            onPtyHostUnresponsive: Event.None,
            onPtyHostResponsive: Event.None,
            onPtyHostRestart: Event.None,
            onDidMoveWindowInstance: Event.None,
            onDidRequestDetach: Event.None,
            createProcess: (shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, windowsEnableConpty, shouldPersist) => new TestTerminalChildProcess(shouldPersist),
            getLatency: () => Promise.resolve([])
        };
    }
}
suite('Workbench - TerminalProcessManager', () => {
    let manager;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        const configurationService = instantiationService.get(IConfigurationService);
        await configurationService.setUserConfiguration('editor', { fontFamily: 'foo' });
        await configurationService.setUserConfiguration('terminal', {
            integrated: {
                fontFamily: 'bar',
                enablePersistentSessions: true,
                shellIntegration: {
                    enabled: false
                }
            }
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        instantiationService.stub(ITerminalInstanceService, new TestTerminalInstanceService());
        manager = store.add(instantiationService.createInstance(TerminalProcessManager, 1, undefined, undefined, undefined));
    });
    suite('process persistence', () => {
        suite('local', () => {
            test('regular terminal should persist', async () => {
                const p = await manager.createProcess({}, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, true);
            });
            test('task terminal should not persist', async () => {
                const p = await manager.createProcess({
                    isFeatureTerminal: true
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, false);
            });
        });
        suite('remote', () => {
            const remoteCwd = URI.from({
                scheme: Schemas.vscodeRemote,
                path: 'test/cwd'
            });
            test('regular terminal should persist', async () => {
                const p = await manager.createProcess({
                    cwd: remoteCwd
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, true);
            });
            test('task terminal should not persist', async () => {
                const p = await manager.createProcess({
                    isFeatureTerminal: true,
                    cwd: remoteCwd
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, false);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFByb2Nlc3NNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUd0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVsRyxNQUFNLHdCQUF3QjtJQUU3QixJQUFJLFlBQVksS0FBSyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakMsWUFDVSxhQUFzQjtRQUF0QixrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQUhoQyxPQUFFLEdBQVcsQ0FBQyxDQUFDO1FBY2Ysd0JBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUNqQyxrQkFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDM0Isa0JBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzNCLG1CQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUM1QiwwQkFBcUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ25DLDhCQUF5QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFkdkMsQ0FBQztJQUNELGNBQWMsQ0FBQyxRQUFhLEVBQUUsS0FBVTtRQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQVlELEtBQUssQ0FBQyxLQUFLLEtBQXlCLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUN2RCxRQUFRLENBQUMsU0FBa0IsSUFBVSxDQUFDO0lBQ3RDLEtBQUssQ0FBQyxJQUFZLElBQVUsQ0FBQztJQUM3QixNQUFNLENBQUMsSUFBWSxFQUFFLElBQVksSUFBVSxDQUFDO0lBQzVDLFdBQVcsS0FBVyxDQUFDO0lBQ3ZCLG9CQUFvQixDQUFDLFNBQWlCLElBQVUsQ0FBQztJQUNqRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBbUIsSUFBbUIsQ0FBQztJQUMvRCxLQUFLLENBQUMsYUFBYSxLQUFzQixPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckQsS0FBSyxDQUFDLE1BQU0sS0FBc0IsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWSxJQUFtQixDQUFDO0lBQ3BELGVBQWUsQ0FBQyxRQUFhLElBQWtCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDNUU7QUFFRCxNQUFNLDJCQUEyQjtJQUNoQyxVQUFVO1FBQ1QsT0FBTztZQUNOLGFBQWEsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUN6QixxQkFBcUIsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNqQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUMvQixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUM1Qix1QkFBdUIsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNuQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUM5QixhQUFhLEVBQUUsQ0FDZCxpQkFBc0IsRUFDdEIsR0FBVyxFQUNYLElBQVksRUFDWixJQUFZLEVBQ1osY0FBMEIsRUFDMUIsR0FBUSxFQUNSLG1CQUE0QixFQUM1QixhQUFzQixFQUNyQixFQUFFLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxhQUFhLENBQUM7WUFDaEQsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQzlCLENBQUM7SUFDVixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBQ2hELElBQUksT0FBK0IsQ0FBQztJQUVwQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RSxNQUFNLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBNkIsQ0FBQztRQUN6RyxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRTtnQkFDWCxVQUFVLEVBQUUsS0FBSztnQkFDakIsd0JBQXdCLEVBQUUsSUFBSTtnQkFDOUIsZ0JBQWdCLEVBQUU7b0JBQ2pCLE9BQU8sRUFBRSxLQUFLO2lCQUNkO2FBQ0Q7U0FDRCxDQUFDLENBQUM7UUFDSCxvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7WUFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUM7UUFDVixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsSUFBSSwyQkFBMkIsRUFBRSxDQUFDLENBQUM7UUFFdkYsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdEgsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQ25CLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDbEQsTUFBTSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQ3JDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDaEIsV0FBVyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDMUIsV0FBVyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUMsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ25ELE1BQU0sQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQztvQkFDckMsaUJBQWlCLEVBQUUsSUFBSTtpQkFDdkIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNoQixXQUFXLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMxQixXQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzQyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7WUFDcEIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDMUIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZO2dCQUM1QixJQUFJLEVBQUUsVUFBVTthQUNoQixDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2xELE1BQU0sQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQztvQkFDckMsR0FBRyxFQUFFLFNBQVM7aUJBQ2QsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNoQixXQUFXLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMxQixXQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDbkQsTUFBTSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDO29CQUNyQyxpQkFBaUIsRUFBRSxJQUFJO29CQUN2QixHQUFHLEVBQUUsU0FBUztpQkFDZCxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzFCLFdBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNDLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=