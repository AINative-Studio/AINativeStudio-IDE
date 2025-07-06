/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { localize } from '../../../../nls.js';
export class BaseTerminalBackend extends Disposable {
    get isResponsive() { return !this._isPtyHostUnresponsive; }
    constructor(_ptyHostController, _logService, historyService, configurationResolverService, statusBarService, _workspaceContextService) {
        super();
        this._ptyHostController = _ptyHostController;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
        this._isPtyHostUnresponsive = false;
        this._onPtyHostConnected = this._register(new Emitter());
        this.onPtyHostConnected = this._onPtyHostConnected.event;
        this._onPtyHostRestart = this._register(new Emitter());
        this.onPtyHostRestart = this._onPtyHostRestart.event;
        this._onPtyHostUnresponsive = this._register(new Emitter());
        this.onPtyHostUnresponsive = this._onPtyHostUnresponsive.event;
        this._onPtyHostResponsive = this._register(new Emitter());
        this.onPtyHostResponsive = this._onPtyHostResponsive.event;
        let unresponsiveStatusBarEntry;
        let statusBarAccessor;
        let hasStarted = false;
        // Attach pty host listeners
        this._register(this._ptyHostController.onPtyHostExit(() => {
            this._logService.error(`The terminal's pty host process exited, the connection to all terminal processes was lost`);
        }));
        this._register(this.onPtyHostConnected(() => hasStarted = true));
        this._register(this._ptyHostController.onPtyHostStart(() => {
            this._logService.debug(`The terminal's pty host process is starting`);
            // Only fire the _restart_ event after it has started
            if (hasStarted) {
                this._logService.trace('IPtyHostController#onPtyHostRestart');
                this._onPtyHostRestart.fire();
            }
            statusBarAccessor?.dispose();
            this._isPtyHostUnresponsive = false;
        }));
        this._register(this._ptyHostController.onPtyHostUnresponsive(() => {
            statusBarAccessor?.dispose();
            if (!unresponsiveStatusBarEntry) {
                unresponsiveStatusBarEntry = {
                    name: localize('ptyHostStatus', 'Pty Host Status'),
                    text: `$(debug-disconnect) ${localize('ptyHostStatus.short', 'Pty Host')}`,
                    tooltip: localize('nonResponsivePtyHost', "The connection to the terminal's pty host process is unresponsive, terminals may stop working. Click to manually restart the pty host."),
                    ariaLabel: localize('ptyHostStatus.ariaLabel', 'Pty Host is unresponsive'),
                    command: "workbench.action.terminal.restartPtyHost" /* TerminalContribCommandId.DeveloperRestartPtyHost */,
                    kind: 'warning'
                };
            }
            statusBarAccessor = statusBarService.addEntry(unresponsiveStatusBarEntry, 'ptyHostStatus', 0 /* StatusbarAlignment.LEFT */);
            this._isPtyHostUnresponsive = true;
            this._onPtyHostUnresponsive.fire();
        }));
        this._register(this._ptyHostController.onPtyHostResponsive(() => {
            if (!this._isPtyHostUnresponsive) {
                return;
            }
            this._logService.info('The pty host became responsive again');
            statusBarAccessor?.dispose();
            this._isPtyHostUnresponsive = false;
            this._onPtyHostResponsive.fire();
        }));
        this._register(this._ptyHostController.onPtyHostRequestResolveVariables(async (e) => {
            // Only answer requests for this workspace
            if (e.workspaceId !== this._workspaceContextService.getWorkspace().id) {
                return;
            }
            const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.file);
            const lastActiveWorkspaceRoot = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
            const resolveCalls = e.originalText.map(t => {
                return configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, t);
            });
            const result = await Promise.all(resolveCalls);
            this._ptyHostController.acceptPtyHostResolvedVariables(e.requestId, result);
        }));
    }
    restartPtyHost() {
        this._ptyHostController.restartPtyHost();
    }
    _deserializeTerminalState(serializedState) {
        if (serializedState === undefined) {
            return undefined;
        }
        const parsedUnknown = JSON.parse(serializedState);
        if (!('version' in parsedUnknown) || !('state' in parsedUnknown) || !Array.isArray(parsedUnknown.state)) {
            this._logService.warn('Could not revive serialized processes, wrong format', parsedUnknown);
            return undefined;
        }
        const parsedCrossVersion = parsedUnknown;
        if (parsedCrossVersion.version !== 1) {
            this._logService.warn(`Could not revive serialized processes, wrong version "${parsedCrossVersion.version}"`, parsedCrossVersion);
            return undefined;
        }
        return parsedCrossVersion.state;
    }
    _getWorkspaceId() {
        return this._workspaceContextService.getWorkspace().id;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRlcm1pbmFsQmFja2VuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvYmFzZVRlcm1pbmFsQmFja2VuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFROUMsTUFBTSxPQUFnQixtQkFBb0IsU0FBUSxVQUFVO0lBRzNELElBQUksWUFBWSxLQUFjLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0lBV3BFLFlBQ2tCLGtCQUFzQyxFQUNwQyxXQUFnQyxFQUNuRCxjQUErQixFQUMvQiw0QkFBMkQsRUFDM0QsZ0JBQW1DLEVBQ2hCLHdCQUFrRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQVBTLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDcEMsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBSWhDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFuQjlELDJCQUFzQixHQUFZLEtBQUssQ0FBQztRQUk3Qix3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNwRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBQzFDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2xFLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFDdEMsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDdkUsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUNoRCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNyRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBWTlELElBQUksMEJBQTJDLENBQUM7UUFDaEQsSUFBSSxpQkFBMEMsQ0FBQztRQUMvQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFFdkIsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDekQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMkZBQTJGLENBQUMsQ0FBQztRQUNySCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRTtZQUMxRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO1lBQ3RFLHFEQUFxRDtZQUNyRCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDL0IsQ0FBQztZQUNELGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxLQUFLLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsRUFBRTtZQUNqRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDakMsMEJBQTBCLEdBQUc7b0JBQzVCLElBQUksRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDO29CQUNsRCxJQUFJLEVBQUUsdUJBQXVCLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxVQUFVLENBQUMsRUFBRTtvQkFDMUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx3SUFBd0ksQ0FBQztvQkFDbkwsU0FBUyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQztvQkFDMUUsT0FBTyxtR0FBa0Q7b0JBQ3pELElBQUksRUFBRSxTQUFTO2lCQUNmLENBQUM7WUFDSCxDQUFDO1lBQ0QsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLGVBQWUsa0NBQTBCLENBQUM7WUFDcEgsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQztZQUNuQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRTtZQUMvRCxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQ2xDLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQztZQUM5RCxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1lBQ2pGLDBDQUEwQztZQUMxQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEtBQUssSUFBSSxDQUFDLHdCQUF3QixDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN2RSxPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sc0JBQXNCLEdBQUcsY0FBYyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RixNQUFNLHVCQUF1QixHQUFHLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUMzSixNQUFNLFlBQVksR0FBc0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlELE9BQU8sNEJBQTRCLENBQUMsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzlFLENBQUMsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsY0FBYztRQUNiLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRVMseUJBQXlCLENBQUMsZUFBbUM7UUFDdEUsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLENBQUMsU0FBUyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQzVGLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxNQUFNLGtCQUFrQixHQUFHLGFBQXFELENBQUM7UUFDakYsSUFBSSxrQkFBa0IsQ0FBQyxPQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMseURBQXlELGtCQUFrQixDQUFDLE9BQU8sR0FBRyxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDbEksT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sa0JBQWtCLENBQUMsS0FBbUMsQ0FBQztJQUMvRCxDQUFDO0lBRVMsZUFBZTtRQUN4QixPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDeEQsQ0FBQztDQUNEIn0=