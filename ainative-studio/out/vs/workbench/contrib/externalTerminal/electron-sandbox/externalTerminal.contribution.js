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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlcm5hbFRlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxvQkFBb0IsRUFBNkIsTUFBTSxrRUFBa0UsQ0FBQztBQUNuSSxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFDdEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBMEIsVUFBVSxFQUF5RCxNQUFNLG9FQUFvRSxDQUFDO0FBQy9LLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQTJELFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1GQUFtRixDQUFDO0FBQzdILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFN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