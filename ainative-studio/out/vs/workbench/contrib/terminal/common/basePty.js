/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { mark } from '../../../../base/common/performance.js';
import { URI } from '../../../../base/common/uri.js';
/**
 * Responsible for establishing and maintaining a connection with an existing terminal process
 * created on the local pty host.
 */
export class BasePty extends Disposable {
    constructor(id, shouldPersist) {
        super();
        this.id = id;
        this.shouldPersist = shouldPersist;
        this._properties = {
            cwd: '',
            initialCwd: '',
            fixedDimensions: { cols: undefined, rows: undefined },
            title: '',
            shellType: undefined,
            hasChildProcesses: true,
            resolvedShellLaunchConfig: {},
            overrideDimensions: undefined,
            failedShellIntegrationActivation: false,
            usedShellIntegrationInjection: undefined
        };
        this._lastDimensions = { cols: -1, rows: -1 };
        this._inReplay = false;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReplayComplete = this._register(new Emitter());
        this.onProcessReplayComplete = this._onProcessReplayComplete.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._onRestoreCommands = this._register(new Emitter());
        this.onRestoreCommands = this._onRestoreCommands.event;
    }
    async getInitialCwd() {
        return this._properties.initialCwd;
    }
    async getCwd() {
        return this._properties.cwd || this._properties.initialCwd;
    }
    handleData(e) {
        this._onProcessData.fire(e);
    }
    handleExit(e) {
        this._onProcessExit.fire(e);
    }
    handleReady(e) {
        this._onProcessReady.fire(e);
    }
    handleDidChangeProperty({ type, value }) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */:
                this._properties.cwd = value;
                break;
            case "initialCwd" /* ProcessPropertyType.InitialCwd */:
                this._properties.initialCwd = value;
                break;
            case "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */:
                if (value.cwd && typeof value.cwd !== 'string') {
                    value.cwd = URI.revive(value.cwd);
                }
        }
        this._onDidChangeProperty.fire({ type, value });
    }
    async handleReplay(e) {
        mark(`code/terminal/willHandleReplay/${this.id}`);
        try {
            this._inReplay = true;
            for (const innerEvent of e.events) {
                if (innerEvent.cols !== 0 || innerEvent.rows !== 0) {
                    // never override with 0x0 as that is a marker for an unknown initial size
                    this._onDidChangeProperty.fire({ type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */, value: { cols: innerEvent.cols, rows: innerEvent.rows, forceExactSize: true } });
                }
                const e = { data: innerEvent.data, trackCommit: true };
                this._onProcessData.fire(e);
                await e.writePromise;
            }
        }
        finally {
            this._inReplay = false;
        }
        if (e.commands) {
            this._onRestoreCommands.fire(e.commands);
        }
        // remove size override
        this._onDidChangeProperty.fire({ type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */, value: undefined });
        mark(`code/terminal/didHandleReplay/${this.id}`);
        this._onProcessReplayComplete.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVB0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9jb21tb24vYmFzZVB0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJckQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixPQUFRLFNBQVEsVUFBVTtJQTZCL0MsWUFDVSxFQUFVLEVBQ1YsYUFBc0I7UUFFL0IsS0FBSyxFQUFFLENBQUM7UUFIQyxPQUFFLEdBQUYsRUFBRSxDQUFRO1FBQ1Ysa0JBQWEsR0FBYixhQUFhLENBQVM7UUE5QmIsZ0JBQVcsR0FBd0I7WUFDckQsR0FBRyxFQUFFLEVBQUU7WUFDUCxVQUFVLEVBQUUsRUFBRTtZQUNkLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUNyRCxLQUFLLEVBQUUsRUFBRTtZQUNULFNBQVMsRUFBRSxTQUFTO1lBQ3BCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIseUJBQXlCLEVBQUUsRUFBRTtZQUM3QixrQkFBa0IsRUFBRSxTQUFTO1lBQzdCLGdDQUFnQyxFQUFFLEtBQUs7WUFDdkMsNkJBQTZCLEVBQUUsU0FBUztTQUN4QyxDQUFDO1FBQ2lCLG9CQUFlLEdBQW1DLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2xGLGNB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