/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DevModeContribution_1;
import { Delayer } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, combinedDisposable, dispose } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import './media/developer.css';
registerTerminalAction({
    id: "workbench.action.terminal.showTextureAtlas" /* TerminalDeveloperCommandId.ShowTextureAtlas */,
    title: localize2('workbench.action.terminal.showTextureAtlas', 'Show Terminal Texture Atlas'),
    category: Categories.Developer,
    precondition: ContextKeyExpr.or(TerminalContextKeys.isOpen),
    run: async (c, accessor) => {
        const fileService = accessor.get(IFileService);
        const openerService = accessor.get(IOpenerService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const bitmap = await c.service.activeInstance?.xterm?.textureAtlas;
        if (!bitmap) {
            return;
        }
        const cwdUri = workspaceContextService.getWorkspace().folders[0].uri;
        const fileUri = URI.joinPath(cwdUri, 'textureAtlas.png');
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('bitmaprenderer');
        if (!ctx) {
            return;
        }
        ctx.transferFromImageBitmap(bitmap);
        const blob = await new Promise((res) => canvas.toBlob(res));
        if (!blob) {
            return;
        }
        await fileService.writeFile(fileUri, VSBuffer.wrap(new Uint8Array(await blob.arrayBuffer())));
        openerService.open(fileUri);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.writeDataToTerminal" /* TerminalDeveloperCommandId.WriteDataToTerminal */,
    title: localize2('workbench.action.terminal.writeDataToTerminal', 'Write Data to Terminal'),
    category: Categories.Developer,
    run: async (c, accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        const instance = await c.service.getActiveOrCreateInstance();
        await c.service.revealActiveTerminal();
        await instance.processReady;
        if (!instance.xterm) {
            throw new Error('Cannot write data to terminal if xterm isn\'t initialized');
        }
        const data = await quickInputService.input({
            value: '',
            placeHolder: 'Enter data, use \\x to escape',
            prompt: localize('workbench.action.terminal.writeDataToTerminal.prompt', "Enter data to write directly to the terminal, bypassing the pty"),
        });
        if (!data) {
            return;
        }
        let escapedData = data
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r');
        while (true) {
            const match = escapedData.match(/\\x([0-9a-fA-F]{2})/);
            if (match === null || match.index === undefined || match.length < 2) {
                break;
            }
            escapedData = escapedData.slice(0, match.index) + String.fromCharCode(parseInt(match[1], 16)) + escapedData.slice(match.index + 4);
        }
        const xterm = instance.xterm;
        xterm._writeText(escapedData);
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.recordSession" /* TerminalDeveloperCommandId.RecordSession */,
    title: localize2('workbench.action.terminal.recordSession', 'Record Terminal Session'),
    category: Categories.Developer,
    run: async (c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commandService = accessor.get(ICommandService);
        const statusbarService = accessor.get(IStatusbarService);
        const store = new DisposableStore();
        // Set up status bar entry
        const text = localize('workbench.action.terminal.recordSession.recording', "Recording terminal session...");
        const statusbarEntry = {
            text,
            name: text,
            ariaLabel: text,
            showProgress: true
        };
        const statusbarHandle = statusbarService.addEntry(statusbarEntry, 'recordSession', 0 /* StatusbarAlignment.LEFT */);
        store.add(statusbarHandle);
        // Create, reveal and focus instance
        const instance = await c.service.createTerminal();
        c.service.setActiveInstance(instance);
        await c.service.revealActiveTerminal();
        await Promise.all([
            instance.processReady,
            instance.focusWhenReady(true)
        ]);
        // Record session
        return new Promise(resolve => {
            const events = [];
            const endRecording = () => {
                const session = JSON.stringify(events, null, 2);
                clipboardService.writeText(session);
                store.dispose();
                resolve();
            };
            const timer = store.add(new Delayer(5000));
            store.add(Event.runAndSubscribe(instance.onDimensionsChanged, () => {
                events.push({
                    type: 'resize',
                    cols: instance.cols,
                    rows: instance.rows
                });
                timer.trigger(endRecording);
            }));
            store.add(commandService.onWillExecuteCommand(e => {
                events.push({
                    type: 'command',
                    id: e.commandId,
                });
                timer.trigger(endRecording);
            }));
            store.add(instance.onWillData(data => {
                events.push({
                    type: 'output',
                    data,
                });
                timer.trigger(endRecording);
            }));
            store.add(instance.onDidSendText(data => {
                events.push({
                    type: 'sendText',
                    data,
                });
                timer.trigger(endRecording);
            }));
            store.add(instance.xterm.raw.onData(data => {
                events.push({
                    type: 'input',
                    data,
                });
                timer.trigger(endRecording);
            }));
            let commandDetectedRegistered = false;
            store.add(Event.runAndSubscribe(instance.capabilities.onDidAddCapability, e => {
                if (commandDetectedRegistered) {
                    return;
                }
                const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                if (!commandDetection) {
                    return;
                }
                store.add(commandDetection.promptInputModel.onDidChangeInput(e => {
                    events.push({
                        type: 'promptInputChange',
                        data: commandDetection.promptInputModel.getCombinedString(),
                    });
                    timer.trigger(endRecording);
                }));
                commandDetectedRegistered = true;
            }));
        });
    }
});
registerTerminalAction({
    id: "workbench.action.terminal.restartPtyHost" /* TerminalDeveloperCommandId.RestartPtyHost */,
    title: localize2('workbench.action.terminal.restartPtyHost', 'Restart Pty Host'),
    category: Categories.Developer,
    run: async (c, accessor) => {
        const logService = accessor.get(ITerminalLogService);
        const backends = Array.from(c.instanceService.getRegisteredBackends());
        const unresponsiveBackends = backends.filter(e => !e.isResponsive);
        // Restart only unresponsive backends if there are any
        const restartCandidates = unresponsiveBackends.length > 0 ? unresponsiveBackends : backends;
        for (const backend of restartCandidates) {
            logService.warn(`Restarting pty host for authority "${backend.remoteAuthority}"`);
            backend.restartPtyHost();
        }
    }
});
var DevModeContributionState;
(function (DevModeContributionState) {
    DevModeContributionState[DevModeContributionState["Off"] = 0] = "Off";
    DevModeContributionState[DevModeContributionState["WaitingForCapability"] = 1] = "WaitingForCapability";
    DevModeContributionState[DevModeContributionState["On"] = 2] = "On";
})(DevModeContributionState || (DevModeContributionState = {}));
let DevModeContribution = class DevModeContribution extends Disposable {
    static { DevModeContribution_1 = this; }
    static { this.ID = 'terminal.devMode'; }
    static get(instance) {
        return instance.getContribution(DevModeContribution_1.ID);
    }
    constructor(_ctx, _configurationService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._activeDevModeDisposables = this._register(new MutableDisposable());
        this._currentColor = 0;
        this._state = 0 /* DevModeContributionState.Off */;
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */)) {
                this._updateDevMode();
            }
        }));
    }
    xtermReady(xterm) {
        this._xterm = xterm;
        this._updateDevMode();
    }
    _updateDevMode() {
        const devMode = this._isEnabled();
        this._xterm?.raw.element?.classList.toggle('dev-mode', devMode);
        const commandDetection = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (devMode) {
            if (commandDetection) {
                if (this._state === 2 /* DevModeContributionState.On */) {
                    return;
                }
                this._state = 2 /* DevModeContributionState.On */;
                const commandDecorations = new DisposableMap();
                const otherDisposables = new DisposableStore();
                this._activeDevModeDisposables.value = combinedDisposable(commandDecorations, otherDisposables, 
                // Prompt input
                this._ctx.instance.onDidBlur(() => this._updateDevMode()), this._ctx.instance.onDidFocus(() => this._updateDevMode()), commandDetection.promptInputModel.onDidChangeInput(() => this._updateDevMode()), 
                // Sequence markers
                commandDetection.onCommandFinished(command => {
                    const colorClass = `color-${this._currentColor}`;
                    const decorations = [];
                    commandDecorations.set(command, combinedDisposable(...decorations));
                    if (command.promptStartMarker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.promptStartMarker
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender(e => {
                                e.textContent = 'A';
                                e.classList.add('xterm-sequence-decoration', 'top', 'left', colorClass);
                            }));
                        }
                    }
                    if (command.marker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.marker,
                            x: command.startX
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender(e => {
                                e.textContent = 'B';
                                e.classList.add('xterm-sequence-decoration', 'top', 'right', colorClass);
                            }));
                        }
                    }
                    if (command.executedMarker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.executedMarker,
                            x: command.executedX
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender(e => {
                                e.textContent = 'C';
                                e.classList.add('xterm-sequence-decoration', 'bottom', 'left', colorClass);
                            }));
                        }
                    }
                    if (command.endMarker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.endMarker
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender(e => {
                                e.textContent = 'D';
                                e.classList.add('xterm-sequence-decoration', 'bottom', 'right', colorClass);
                            }));
                        }
                    }
                    this._currentColor = (this._currentColor + 1) % 2;
                }), commandDetection.onCommandInvalidated(commands => {
                    for (const c of commands) {
                        const decorations = commandDecorations.get(c);
                        if (decorations) {
                            dispose(decorations);
                        }
                        commandDecorations.deleteAndDispose(c);
                    }
                }));
            }
            else {
                if (this._state === 1 /* DevModeContributionState.WaitingForCapability */) {
                    return;
                }
                this._state = 1 /* DevModeContributionState.WaitingForCapability */;
                this._activeDevModeDisposables.value = this._ctx.instance.capabilities.onDidAddCapabilityType(e => {
                    if (e === 2 /* TerminalCapability.CommandDetection */) {
                        this._updateDevMode();
                    }
                });
            }
        }
        else {
            if (this._state === 0 /* DevModeContributionState.Off */) {
                return;
            }
            this._state = 0 /* DevModeContributionState.Off */;
            this._activeDevModeDisposables.clear();
        }
    }
    _isEnabled() {
        return this._configurationService.getValue("terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */) || false;
    }
};
DevModeContribution = DevModeContribution_1 = __decorate([
    __param(1, IConfigurationService)
], DevModeContribution);
registerTerminalContribution(DevModeContribution.ID, DevModeContribution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZGV2ZWxvcGVyLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvZGV2ZWxvcGVyL2Jyb3dzZXIvdGVybWluYWwuZGV2ZWxvcGVyLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xLLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFxQixNQUFNLHFEQUFxRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBNEMsTUFBTSxxREFBcUQsQ0FBQztBQUVsSSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsNEJBQTRCLEVBQXFDLE1BQU0saURBQWlELENBQUM7QUFDbEksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFckYsT0FBTyx1QkFBdUIsQ0FBQztBQUUvQixzQkFBc0IsQ0FBQztJQUN0QixFQUFFLGdHQUE2QztJQUMvQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDRDQUE0QyxFQUFFLDZCQUE2QixDQUFDO0lBQzdGLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztJQUM5QixZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUM7SUFDM0QsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDMUIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQztRQUNuRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLHVCQUF1QixDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDckUsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUN6RCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUM1QixNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDOUIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU87UUFDUixDQUFDO1FBQ0QsR0FBRyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQWMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RixhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLHNHQUFnRDtJQUNsRCxLQUFLLEVBQUUsU0FBUyxDQUFDLCtDQUErQyxFQUFFLHdCQUF3QixDQUFDO0lBQzNGLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztJQUM5QixHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUMxQixNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsQ0FBQztRQUM3RCxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QyxNQUFNLFFBQVEsQ0FBQyxZQUFZLENBQUM7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7UUFDOUUsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0saUJBQWlCLENBQUMsS0FBSyxDQUFDO1lBQzFDLEtBQUssRUFBRSxFQUFFO1lBQ1QsV0FBVyxFQUFFLCtCQUErQjtZQUM1QyxNQUFNLEVBQUUsUUFBUSxDQUFDLHNEQUFzRCxFQUFFLGlFQUFpRSxDQUFDO1NBQzNJLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBQ0QsSUFBSSxXQUFXLEdBQUcsSUFBSTthQUNwQixPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQzthQUNyQixPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDYixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDdkQsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JFLE1BQU07WUFDUCxDQUFDO1lBQ0QsV0FBVyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDcEksQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFzQyxDQUFDO1FBQzlELEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0IsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILHNCQUFzQixDQUFDO0lBQ3RCLEVBQUUsMEZBQTBDO0lBQzVDLEtBQUssRUFBRSxTQUFTLENBQUMseUNBQXlDLEVBQUUseUJBQXlCLENBQUM7SUFDdEYsUUFBUSxFQUFFLFVBQVUsQ0FBQyxTQUFTO0lBQzlCLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDekQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQywwQkFBMEI7UUFDMUIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLG1EQUFtRCxFQUFFLCtCQUErQixDQUFDLENBQUM7UUFDNUcsTUFBTSxjQUFjLEdBQW9CO1lBQ3ZDLElBQUk7WUFDSixJQUFJLEVBQUUsSUFBSTtZQUNWLFNBQVMsRUFBRSxJQUFJO1lBQ2YsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQztRQUNGLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsZUFBZSxrQ0FBMEIsQ0FBQztRQUM1RyxLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTNCLG9DQUFvQztRQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDbEQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUN2QyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsUUFBUSxDQUFDLFlBQVk7WUFDckIsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7U0FDN0IsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCO1FBQ2pCLE9BQU8sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7WUFDbEMsTUFBTSxNQUFNLEdBQWMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sWUFBWSxHQUFHLEdBQUcsRUFBRTtnQkFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNoRCxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDLENBQUM7WUFHRixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDM0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7Z0JBQ2xFLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO29CQUNuQixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7aUJBQ25CLENBQUMsQ0FBQztnQkFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDakQsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDWCxJQUFJLEVBQUUsU0FBUztvQkFDZixFQUFFLEVBQUUsQ0FBQyxDQUFDLFNBQVM7aUJBQ2YsQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDcEMsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDWCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxJQUFJO2lCQUNKLENBQUMsQ0FBQztnQkFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLElBQUk7aUJBQ0osQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUMzQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxPQUFPO29CQUNiLElBQUk7aUJBQ0osQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLElBQUkseUJBQXlCLEdBQUcsS0FBSyxDQUFDO1lBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFFO2dCQUM3RSxJQUFJLHlCQUF5QixFQUFFLENBQUM7b0JBQy9CLE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsR0FBRyw2Q0FBcUMsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7b0JBQ3ZCLE9BQU87Z0JBQ1IsQ0FBQztnQkFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNYLElBQUksRUFBRSxtQkFBbUI7d0JBQ3pCLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRTtxQkFDM0QsQ0FBQyxDQUFDO29CQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0oseUJBQXlCLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUVKLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxzQkFBc0IsQ0FBQztJQUN0QixFQUFFLDRGQUEyQztJQUM3QyxLQUFLLEVBQUUsU0FBUyxDQUFDLDBDQUEwQyxFQUFFLGtCQUFrQixDQUFDO0lBQ2hGLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztJQUM5QixHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUMxQixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDckQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUN2RSxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRSxzREFBc0Q7UUFDdEQsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzVGLEtBQUssTUFBTSxPQUFPLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN6QyxVQUFVLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxPQUFPLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQztZQUNsRixPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxJQUFXLHdCQUlWO0FBSkQsV0FBVyx3QkFBd0I7SUFDbEMscUVBQUcsQ0FBQTtJQUNILHVHQUFvQixDQUFBO0lBQ3BCLG1FQUFFLENBQUE7QUFDSCxDQUFDLEVBSlUsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUlsQztBQUVELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTs7YUFDM0IsT0FBRSxHQUFHLGtCQUFrQixBQUFyQixDQUFzQjtJQUN4QyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQTJCO1FBQ3JDLE9BQU8sUUFBUSxDQUFDLGVBQWUsQ0FBc0IscUJBQW1CLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUUsQ0FBQztJQVFELFlBQ2tCLElBQWtDLEVBQzVCLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUhTLFNBQUksR0FBSixJQUFJLENBQThCO1FBQ1gsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVBwRSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQzdFLGtCQUFhLEdBQUcsQ0FBQyxDQUFDO1FBRWxCLFdBQU0sd0NBQTBEO1FBT3ZFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyxDQUFDLG9CQUFvQix5RUFBMkIsRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQXlDO1FBQ25ELElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLE9BQU8sR0FBWSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDM0MsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLENBQUM7UUFDbEcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxJQUFJLENBQUMsTUFBTSx3Q0FBZ0MsRUFBRSxDQUFDO29CQUNqRCxPQUFPO2dCQUNSLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sc0NBQThCLENBQUM7Z0JBQzFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxhQUFhLEVBQWlDLENBQUM7Z0JBQzlFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssR0FBRyxrQkFBa0IsQ0FDeEQsa0JBQWtCLEVBQ2xCLGdCQUFnQjtnQkFDaEIsZUFBZTtnQkFDZixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsRUFDMUQsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUMvRSxtQkFBbUI7Z0JBQ25CLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUM1QyxNQUFNLFVBQVUsR0FBRyxTQUFTLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDakQsTUFBTSxXQUFXLEdBQWtCLEVBQUUsQ0FBQztvQkFDdEMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3BFLElBQUksT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUM7d0JBQy9CLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQU0sQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUM7NEJBQzNELE1BQU0sRUFBRSxPQUFPLENBQUMsaUJBQWlCO3lCQUNqQyxDQUFDLENBQUM7d0JBQ0gsSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNwQixnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQ0FDbkMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7Z0NBQ3BCLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7NEJBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ0wsQ0FBQztvQkFDRixDQUFDO29CQUNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUNwQixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFNLENBQUMsR0FBRyxFQUFFLGtCQUFrQixDQUFDOzRCQUMzRCxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07NEJBQ3RCLENBQUMsRUFBRSxPQUFPLENBQUMsTUFBTTt5QkFDakIsQ0FBQyxDQUFDO3dCQUNILElBQUksQ0FBQyxFQUFFLENBQUM7NEJBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDcEIsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0NBQ25DLENBQUMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDO2dDQUNwQixDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDOzRCQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNMLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDNUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBTSxDQUFDLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQzs0QkFDM0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjOzRCQUM5QixDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVM7eUJBQ3BCLENBQUMsQ0FBQzt3QkFDSCxJQUFJLENBQUMsRUFBRSxDQUFDOzRCQUNQLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3BCLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dDQUNuQyxDQUFDLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztnQ0FDcEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQzs0QkFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDTCxDQUFDO29CQUNGLENBQUM7b0JBQ0QsSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3ZCLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQU0sQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLENBQUM7NEJBQzNELE1BQU0sRUFBRSxPQUFPLENBQUMsU0FBUzt5QkFDekIsQ0FBQyxDQUFDO3dCQUNILElBQUksQ0FBQyxFQUFFLENBQUM7NEJBQ1AsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDcEIsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0NBQ25DLENBQUMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDO2dDQUNwQixDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDOzRCQUM3RSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNMLENBQUM7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25ELENBQUMsQ0FBQyxFQUNGLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUNoRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUMxQixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzlDLElBQUksV0FBVyxFQUFFLENBQUM7NEJBQ2pCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDdEIsQ0FBQzt3QkFDRCxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEMsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FDRixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksSUFBSSxDQUFDLE1BQU0sMERBQWtELEVBQUUsQ0FBQztvQkFDbkUsT0FBTztnQkFDUixDQUFDO2dCQUNELElBQUksQ0FBQyxNQUFNLHdEQUFnRCxDQUFDO2dCQUM1RCxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDakcsSUFBSSxDQUFDLGdEQUF3QyxFQUFFLENBQUM7d0JBQy9DLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdkIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksSUFBSSxDQUFDLE1BQU0seUNBQWlDLEVBQUUsQ0FBQztnQkFDbEQsT0FBTztZQUNSLENBQUM7WUFDRCxJQUFJLENBQUMsTUFBTSx1Q0FBK0IsQ0FBQztZQUMzQyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDeEMsQ0FBQztJQUNGLENBQUM7SUFFTyxVQUFVO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEseUVBQTJCLElBQUksS0FBSyxDQUFDO0lBQ2hGLENBQUM7O0FBMUlJLG1CQUFtQjtJQWN0QixXQUFBLHFCQUFxQixDQUFBO0dBZGxCLG1CQUFtQixDQTJJeEI7QUFFRCw0QkFBNEIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyJ9