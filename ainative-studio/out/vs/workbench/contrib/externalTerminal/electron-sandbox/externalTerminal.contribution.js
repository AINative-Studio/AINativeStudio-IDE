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
import * as nls from '../../../../nls.js';
import * as paths from '../../../../base/common/path.js';
import { DEFAULT_TERMINAL_OSX } from '../../../../platform/externalTerminal/common/externalTerminal.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Schemas } from '../../../../base/common/network.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IExternalTerminalService } from '../../../../platform/externalTerminal/electron-sandbox/externalTerminalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TerminalContextKeys } from '../../terminal/common/terminalContextKey.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
const OPEN_NATIVE_CONSOLE_COMMAND_ID = 'workbench.action.terminal.openNativeConsole';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: OPEN_NATIVE_CONSOLE_COMMAND_ID,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */,
    when: TerminalContextKeys.notFocus,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: async (accessor) => {
        const historyService = accessor.get(IHistoryService);
        // Open external terminal in local workspaces
        const terminalService = accessor.get(IExternalTerminalService);
        const configurationService = accessor.get(IConfigurationService);
        const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
        const root = historyService.getLastActiveWorkspaceRoot();
        const config = configurationService.getValue('terminal.external');
        // It's a local workspace, open the root
        if (root?.scheme === Schemas.file) {
            terminalService.openTerminal(config, root.fsPath);
            return;
        }
        // If it's a remote workspace, open the canonical URI if it is a local folder
        try {
            if (root?.scheme === Schemas.vscodeRemote) {
                const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(root);
                if (canonicalUri.scheme === Schemas.file) {
                    terminalService.openTerminal(config, canonicalUri.fsPath);
                    return;
                }
            }
        }
        catch { }
        // Open the current file's folder if it's local or its canonical URI is local
        // Opens current file's folder, if no folder is open in editor
        const activeFile = historyService.getLastActiveFile(Schemas.file);
        if (activeFile?.scheme === Schemas.file) {
            terminalService.openTerminal(config, paths.dirname(activeFile.fsPath));
            return;
        }
        try {
            if (activeFile?.scheme === Schemas.vscodeRemote) {
                const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(activeFile);
                if (canonicalUri.scheme === Schemas.file) {
                    terminalService.openTerminal(config, canonicalUri.fsPath);
                    return;
                }
            }
        }
        catch { }
        // Fallback to opening without a cwd which will end up using the local home path
        terminalService.openTerminal(config, undefined);
    }
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: OPEN_NATIVE_CONSOLE_COMMAND_ID,
        title: nls.localize2('globalConsoleAction', "Open New External Terminal")
    }
});
let ExternalTerminalContribution = class ExternalTerminalContribution {
    constructor(_externalTerminalService) {
        this._externalTerminalService = _externalTerminalService;
        this._updateConfiguration();
    }
    async _updateConfiguration() {
        const terminals = await this._externalTerminalService.getDefaultTerminalForPlatforms();
        const configurationRegistry = Registry.as(Extensions.Configuration);
        const terminalKindProperties = {
            type: 'string',
            enum: [
                'integrated',
                'external',
                'both'
            ],
            enumDescriptions: [
                nls.localize('terminal.kind.integrated', "Show the integrated terminal action."),
                nls.localize('terminal.kind.external', "Show the external terminal action."),
                nls.localize('terminal.kind.both', "Show both integrated and external terminal actions.")
            ],
            default: 'integrated'
        };
        configurationRegistry.registerConfiguration({
            id: 'externalTerminal',
            order: 100,
            title: nls.localize('terminalConfigurationTitle', "External Terminal"),
            type: 'object',
            properties: {
                'terminal.explorerKind': {
                    ...terminalKindProperties,
                    description: nls.localize('explorer.openInTerminalKind', "When opening a file from the Explorer in a terminal, determines what kind of terminal will be launched"),
                },
                'terminal.sourceControlRepositoriesKind': {
                    ...terminalKindProperties,
                    description: nls.localize('sourceControlRepositories.openInTerminalKind', "When opening a repository from the Source Control Repositories view in a terminal, determines what kind of terminal will be launched"),
                },
                'terminal.external.windowsExec': {
                    type: 'string',
                    description: nls.localize('terminal.external.windowsExec', "Customizes which terminal to run on Windows."),
                    default: terminals.windows,
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'terminal.external.osxExec': {
                    type: 'string',
                    description: nls.localize('terminal.external.osxExec', "Customizes which terminal application to run on macOS."),
                    default: DEFAULT_TERMINAL_OSX,
                    scope: 1 /* ConfigurationScope.APPLICATION */
                },
                'terminal.external.linuxExec': {
                    type: 'string',
                    description: nls.localize('terminal.external.linuxExec', "Customizes which terminal to run on Linux."),
                    default: terminals.linux,
                    scope: 1 /* ConfigurationScope.APPLICATION */
                }
            }
        });
    }
};
ExternalTerminalContribution = __decorate([
    __param(0, IExternalTerminalService)
], ExternalTerminalContribution);
export { ExternalTerminalContribution };
// Register workbench contributions
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExternalTerminalContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxUZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L2V4dGVybmFsVGVybWluYWwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxLQUFLLEtBQUssTUFBTSxpQ0FBaUMsQ0FBQztBQUN6RCxPQUFPLEVBQUUsb0JBQW9CLEVBQTZCLE1BQU0sa0VBQWtFLENBQUM7QUFDbkksT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQTBCLFVBQVUsRUFBeUQsTUFBTSxvRUFBb0UsQ0FBQztBQUMvSyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUEyRCxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUM3SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFB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