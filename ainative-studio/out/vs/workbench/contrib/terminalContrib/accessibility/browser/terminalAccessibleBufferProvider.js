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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
let TerminalAccessibleBufferProvider = class TerminalAccessibleBufferProvider extends Disposable {
    constructor(_instance, _bufferTracker, customHelp, configurationService, terminalService) {
        super();
        this._instance = _instance;
        this._bufferTracker = _bufferTracker;
        this.id = "terminal" /* AccessibleViewProviderId.Terminal */;
        this.options = { type: "view" /* AccessibleViewType.View */, language: 'terminal', id: "terminal" /* AccessibleViewProviderId.Terminal */ };
        this.verbositySettingKey = "accessibility.verbosity.terminal" /* AccessibilityVerbositySettingId.Terminal */;
        this._onDidRequestClearProvider = new Emitter();
        this.onDidRequestClearLastProvider = this._onDidRequestClearProvider.event;
        this.options.customHelp = customHelp;
        this.options.position = configurationService.getValue("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */) ? 'initial-bottom' : 'bottom';
        this._register(this._instance.onDisposed(() => this._onDidRequestClearProvider.fire("terminal" /* AccessibleViewProviderId.Terminal */)));
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */)) {
                this.options.position = configurationService.getValue("terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */) ? 'initial-bottom' : 'bottom';
            }
        }));
        this._focusedInstance = terminalService.activeInstance;
        this._register(terminalService.onDidChangeActiveInstance(() => {
            if (terminalService.activeInstance && this._focusedInstance?.instanceId !== terminalService.activeInstance?.instanceId) {
                this._onDidRequestClearProvider.fire("terminal" /* AccessibleViewProviderId.Terminal */);
                this._focusedInstance = terminalService.activeInstance;
            }
        }));
    }
    onClose() {
        this._instance.focus();
    }
    provideContent() {
        this._bufferTracker.update();
        return this._bufferTracker.lines.join('\n');
    }
    getSymbols() {
        const commands = this._getCommandsWithEditorLine() ?? [];
        const symbols = [];
        for (const command of commands) {
            const label = command.command.command;
            if (label) {
                symbols.push({
                    label,
                    lineNumber: command.lineNumber
                });
            }
        }
        return symbols;
    }
    _getCommandsWithEditorLine() {
        const capability = this._instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = capability?.commands;
        const currentCommand = capability?.currentCommand;
        if (!commands?.length) {
            return;
        }
        const result = [];
        for (const command of commands) {
            const lineNumber = this._getEditorLineForCommand(command);
            if (lineNumber === undefined) {
                continue;
            }
            result.push({ command, lineNumber, exitCode: command.exitCode });
        }
        if (currentCommand) {
            const lineNumber = this._getEditorLineForCommand(currentCommand);
            if (lineNumber !== undefined) {
                result.push({ command: currentCommand, lineNumber });
            }
        }
        return result;
    }
    _getEditorLineForCommand(command) {
        let line;
        if ('marker' in command) {
            line = command.marker?.line;
        }
        else if ('commandStartMarker' in command) {
            line = command.commandStartMarker?.line;
        }
        if (line === undefined || line < 0) {
            return;
        }
        line = this._bufferTracker.bufferToEditorLineMapping.get(line);
        if (line === undefined) {
            return;
        }
        return line + 1;
    }
};
TerminalAccessibleBufferProvider = __decorate([
    __param(3, IConfigurationService),
    __param(4, ITerminalService)
], TerminalAccessibleBufferProvider);
export { TerminalAccessibleBufferProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmxlQnVmZmVyUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci90ZXJtaW5hbEFjY2Vzc2libGVCdWZmZXJQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBSXRHLE9BQU8sRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUlyRixJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFVL0QsWUFDa0IsU0FBaUosRUFDMUosY0FBb0MsRUFDNUMsVUFBd0IsRUFDRCxvQkFBMkMsRUFDaEQsZUFBaUM7UUFFbkQsS0FBSyxFQUFFLENBQUM7UUFOUyxjQUFTLEdBQVQsU0FBUyxDQUF3STtRQUMxSixtQkFBYyxHQUFkLGNBQWMsQ0FBc0I7UUFYcEMsT0FBRSxzREFBcUM7UUFDdkMsWUFBTyxHQUEyQixFQUFFLElBQUksc0NBQXlCLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxFQUFFLG9EQUFtQyxFQUFFLENBQUM7UUFDakksd0JBQW1CLHFGQUE0QztRQUl2RCwrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBNEIsQ0FBQztRQUM3RSxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDO1FBVTlFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFH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