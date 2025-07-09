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
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { URI } from '../../../../base/common/uri.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ITerminalGroupService, ITerminalService as IIntegratedTerminalService } from '../../terminal/browser/terminal.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { getMultiSelectedResources, IExplorerService } from '../../files/browser/files.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { distinct } from '../../../../base/common/arrays.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../base/common/platform.js';
import { dirname, basename } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IExternalTerminalService } from '../../../../platform/externalTerminal/common/externalTerminal.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
const OPEN_IN_TERMINAL_COMMAND_ID = 'openInTerminal';
const OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID = 'openInIntegratedTerminal';
function registerOpenTerminalCommand(id, explorerKind) {
    CommandsRegistry.registerCommand({
        id: id,
        handler: async (accessor, resource) => {
            const configurationService = accessor.get(IConfigurationService);
            const fileService = accessor.get(IFileService);
            const integratedTerminalService = accessor.get(IIntegratedTerminalService);
            const remoteAgentService = accessor.get(IRemoteAgentService);
            const terminalGroupService = accessor.get(ITerminalGroupService);
            let externalTerminalService = undefined;
            try {
                externalTerminalService = accessor.get(IExternalTerminalService);
            }
            catch { }
            const resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
            return fileService.resolveAll(resources.map(r => ({ resource: r }))).then(async (stats) => {
                // Always use integrated terminal when using a remote
                const config = configurationService.getValue();
                const useIntegratedTerminal = remoteAgentService.getConnection() || explorerKind === 'integrated';
                const targets = distinct(stats.filter(data => data.success));
                if (useIntegratedTerminal) {
                    // TODO: Use uri for cwd in createterminal
                    const opened = {};
                    const cwds = targets.map(({ stat }) => {
                        const resource = stat.resource;
                        if (stat.isDirectory) {
                            return resource;
                        }
                        return URI.from({
                            scheme: resource.scheme,
                            authority: resource.authority,
                            fragment: resource.fragment,
                            query: resource.query,
                            path: dirname(resource.path)
                        });
                    });
                    for (const cwd of cwds) {
                        if (opened[cwd.path]) {
                            return;
                        }
                        opened[cwd.path] = true;
                        const instance = await integratedTerminalService.createTerminal({ config: { cwd } });
                        if (instance && instance.target !== TerminalLocation.Editor && (resources.length === 1 || !resource || cwd.path === resource.path || cwd.path === dirname(resource.path))) {
                            integratedTerminalService.setActiveInstance(instance);
                            terminalGroupService.showPanel(true);
                        }
                    }
                }
                else if (externalTerminalService) {
                    distinct(targets.map(({ stat }) => stat.isDirectory ? stat.resource.fsPath : dirname(stat.resource.fsPath))).forEach(cwd => {
                        externalTerminalService.openTerminal(config.terminal.external, cwd);
                    });
                }
            });
        }
    });
}
registerOpenTerminalCommand(OPEN_IN_TERMINAL_COMMAND_ID, 'external');
registerOpenTerminalCommand(OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID, 'integrated');
let ExternalTerminalContribution = class ExternalTerminalContribution extends Disposable {
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        const shouldShowIntegratedOnLocal = ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.explorerKind', 'integrated'), ContextKeyExpr.equals('config.terminal.explorerKind', 'both')));
        const shouldShowExternalKindOnLocal = ContextKeyExpr.and(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ContextKeyExpr.or(ContextKeyExpr.equals('config.terminal.explorerKind', 'external'), ContextKeyExpr.equals('config.terminal.explorerKind', 'both')));
        this._openInIntegratedTerminalMenuItem = {
            group: 'navigation',
            order: 30,
            command: {
                id: OPEN_IN_INTEGRATED_TERMINAL_COMMAND_ID,
                title: nls.localize('scopedConsoleAction.Integrated', "Open in Integrated Terminal")
            },
            when: ContextKeyExpr.or(shouldShowIntegratedOnLocal, ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote))
        };
        this._openInTerminalMenuItem = {
            group: 'navigation',
            order: 31,
            command: {
                id: OPEN_IN_TERMINAL_COMMAND_ID,
                title: nls.localize('scopedConsoleAction.external', "Open in External Terminal")
            },
            when: shouldShowExternalKindOnLocal
        };
        MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInTerminalMenuItem);
        MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInIntegratedTerminalMenuItem);
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('terminal.explorerKind') || e.affectsConfiguration('terminal.external')) {
                this._refreshOpenInTerminalMenuItemTitle();
            }
        }));
        this._refreshOpenInTerminalMenuItemTitle();
    }
    isWindows() {
        const config = this._configurationService.getValue().terminal;
        if (isWindows && config.external?.windowsExec) {
            const file = basename(config.external.windowsExec);
            if (file === 'wt' || file === 'wt.exe') {
                return true;
            }
        }
        return false;
    }
    _refreshOpenInTerminalMenuItemTitle() {
        if (this.isWindows()) {
            this._openInTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.wt', "Open in Windows Terminal");
        }
    }
};
ExternalTerminalContribution = __decorate([
    __param(0, IConfigurationService)
], ExternalTerminalContribution);
export { ExternalTerminalContribution };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExternalTerminalContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxUZXJtaW5hbC9icm93c2VyL2V4dGVybmFsVGVybWluYWwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFhLE1BQU0sZ0RBQWdELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixJQUFJLDBCQUEwQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0gsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFB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