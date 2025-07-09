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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService, terminalEditorId } from './terminal.js';
import { parseTerminalUri } from './terminalUri.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IEmbedderTerminalService } from '../../../services/terminal/common/embedderTerminalService.js';
/**
 * The main contribution for the terminal contrib. This contains calls to other components necessary
 * to set up the terminal but don't need to be tracked in the long term (where TerminalService would
 * be more relevant).
 */
let TerminalMainContribution = class TerminalMainContribution extends Disposable {
    static { this.ID = 'terminalMain'; }
    constructor(editorResolverService, embedderTerminalService, workbenchEnvironmentService, labelService, lifecycleService, terminalService, terminalEditorService, terminalGroupService, terminalInstanceService) {
        super();
        this._init(editorResolverService, embedderTerminalService, workbenchEnvironmentService, labelService, lifecycleService, terminalService, terminalEditorService, terminalGroupService, terminalInstanceService);
    }
    async _init(editorResolverService, embedderTerminalService, workbenchEnvironmentService, labelService, lifecycleService, terminalService, terminalEditorService, terminalGroupService, terminalInstanceService) {
        // IMPORTANT: This listener needs to be set up before the workbench is ready to support
        // embedder terminals.
        this._register(embedderTerminalService.onDidCreateTerminal(async (embedderTerminal) => {
            const terminal = await terminalService.createTerminal({
                config: embedderTerminal,
                location: TerminalLocation.Panel,
                skipContributedProfileCheck: true,
            });
            terminalService.setActiveInstance(terminal);
            await terminalService.revealActiveTerminal();
        }));
        await lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Register terminal editors
        this._register(editorResolverService.registerEditor(`${Schemas.vscodeTerminal}:/**`, {
            id: terminalEditorId,
            label: terminalStrings.terminal,
            priority: RegisteredEditorPriority.exclusive
        }, {
            canSupportResource: uri => uri.scheme === Schemas.vscodeTerminal,
            singlePerResource: true
        }, {
            createEditorInput: async ({ resource, options }) => {
                let instance = terminalService.getInstanceFromResource(resource);
                if (instance) {
                    const sourceGroup = terminalGroupService.getGroupForInstance(instance);
                    sourceGroup?.removeInstance(instance);
                }
                else { // Terminal from a different window
                    const terminalIdentifier = parseTerminalUri(resource);
                    if (!terminalIdentifier.instanceId) {
                        throw new Error('Terminal identifier without instanceId');
                    }
                    const primaryBackend = terminalService.getPrimaryBackend();
                    if (!primaryBackend) {
                        throw new Error('No terminal primary backend');
                    }
                    const attachPersistentProcess = await primaryBackend.requestDetachInstance(terminalIdentifier.workspaceId, terminalIdentifier.instanceId);
                    if (!attachPersistentProcess) {
                        throw new Error('No terminal persistent process to attach');
                    }
                    instance = terminalInstanceService.createInstance({ attachPersistentProcess }, TerminalLocation.Editor);
                }
                const resolvedResource = terminalEditorService.resolveResource(instance);
                const editor = terminalEditorService.getInputFromResource(resolvedResource);
                return {
                    editor,
                    options: {
                        ...options,
                        pinned: true,
                        forceReload: true,
                        override: terminalEditorId
                    }
                };
            }
        }));
        // Register a resource formatter for terminal URIs
        this._register(labelService.registerFormatter({
            scheme: Schemas.vscodeTerminal,
            formatting: {
                label: '${path}',
                separator: ''
            }
        }));
    }
};
TerminalMainContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IEmbedderTerminalService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ILabelService),
    __param(4, ILifecycleService),
    __param(5, ITerminalService),
    __param(6, ITerminalEditorService),
    __param(7, ITerminalGroupService),
    __param(8, ITerminalInstanceService)
], TerminalMainContribution);
export { TerminalMainContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNYWluQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxNYWluQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXBGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM1SSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDNUgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXhHOzs7O0dBSUc7QUFDSSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7YUFDaEQsT0FBRSxHQUFHLGNBQWMsQUFBakIsQ0FBa0I7SUFFM0Is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