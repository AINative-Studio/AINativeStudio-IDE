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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRlcm1pbmFsQmFja2VuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL2Jhc2VUZXJtaW5hbEJhY2tlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBUTlDLE1BQU0sT0FBZ0IsbUJBQW9CLFNBQVEsVUFBVTtJQUczRCxJQUFJLFlBQVksS0FBYyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQVdwRSxZQUNrQixrQkFBc0MsRUFDcEMsV0FBZ0MsRUFDbkQsY0FBK0IsRUFDL0IsNEJBQTJELEVBQzNELGdCQUFtQyxFQUNoQix3QkFBa0Q7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFQUyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUloQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBbkI5RCwyQkFBc0IsR0FBWSxLQUFLLENBQUM7UUFJN0Isd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDcEUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztRQUMxQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMs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