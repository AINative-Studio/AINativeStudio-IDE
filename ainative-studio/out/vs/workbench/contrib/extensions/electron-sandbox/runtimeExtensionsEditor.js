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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Utils } from '../../../../platform/profiling/common/profiling.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { AbstractRuntimeExtensionsEditor } from '../browser/abstractRuntimeExtensionsEditor.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { ReportExtensionIssueAction } from '../common/reportExtensionIssueAction.js';
import { SlowExtensionAction } from './extensionsSlowActions.js';
export const IExtensionHostProfileService = createDecorator('extensionHostProfileService');
export const CONTEXT_PROFILE_SESSION_STATE = new RawContextKey('profileSessionState', 'none');
export const CONTEXT_EXTENSION_HOST_PROFILE_RECORDED = new RawContextKey('extensionHostProfileRecorded', false);
export var ProfileSessionState;
(function (ProfileSessionState) {
    ProfileSessionState[ProfileSessionState["None"] = 0] = "None";
    ProfileSessionState[ProfileSessionState["Starting"] = 1] = "Starting";
    ProfileSessionState[ProfileSessionState["Running"] = 2] = "Running";
    ProfileSessionState[ProfileSessionState["Stopping"] = 3] = "Stopping";
})(ProfileSessionState || (ProfileSessionState = {}));
let RuntimeExtensionsEditor = class RuntimeExtensionsEditor extends AbstractRuntimeExtensionsEditor {
    constructor(group, telemetryService, themeService, contextKeyService, extensionsWorkbenchService, extensionService, notificationService, contextMenuService, instantiationService, storageService, labelService, environmentService, clipboardService, _extensionHostProfileService, extensionFeaturesManagementService, hoverService, menuService) {
        super(group, telemetryService, themeService, contextKeyService, extensionsWorkbenchService, extensionService, notificationService, contextMenuService, instantiationService, storageService, labelService, environmentService, clipboardService, extensionFeaturesManagementService, hoverService, menuService);
        this._extensionHostProfileService = _extensionHostProfileService;
        this._profileInfo = this._extensionHostProfileService.lastProfile;
        this._extensionsHostRecorded = CONTEXT_EXTENSION_HOST_PROFILE_RECORDED.bindTo(contextKeyService);
        this._profileSessionState = CONTEXT_PROFILE_SESSION_STATE.bindTo(contextKeyService);
        this._register(this._extensionHostProfileService.onDidChangeLastProfile(() => {
            this._profileInfo = this._extensionHostProfileService.lastProfile;
            this._extensionsHostRecorded.set(!!this._profileInfo);
            this._updateExtensions();
        }));
        this._register(this._extensionHostProfileService.onDidChangeState(() => {
            const state = this._extensionHostProfileService.state;
            this._profileSessionState.set(ProfileSessionState[state].toLowerCase());
        }));
    }
    _getProfileInfo() {
        return this._profileInfo;
    }
    _getUnresponsiveProfile(extensionId) {
        return this._extensionHostProfileService.getUnresponsiveProfile(extensionId);
    }
    _createSlowExtensionAction(element) {
        if (element.unresponsiveProfile) {
            return this._instantiationService.createInstance(SlowExtensionAction, element.description, element.unresponsiveProfile);
        }
        return null;
    }
    _createReportExtensionIssueAction(element) {
        if (element.marketplaceInfo) {
            return this._instantiationService.createInstance(ReportExtensionIssueAction, element.description);
        }
        return null;
    }
};
RuntimeExtensionsEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IExtensionService),
    __param(6, INotificationService),
    __param(7, IContextMenuService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, ILabelService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IClipboardService),
    __param(13, IExtensionHostProfileService),
    __param(14, IExtensionFeaturesManagementService),
    __param(15, IHoverService),
    __param(16, IMenuService)
], RuntimeExtensionsEditor);
export { RuntimeExtensionsEditor };
export class StartExtensionHostProfileAction extends Action2 {
    static { this.ID = 'workbench.extensions.action.extensionHostProfile'; }
    static { this.LABEL = nls.localize('extensionHostProfileStart', "Start Extension Host Profile"); }
    constructor() {
        super({
            id: StartExtensionHostProfileAction.ID,
            title: { value: StartExtensionHostProfileAction.LABEL, original: 'Start Extension Host Profile' },
            precondition: CONTEXT_PROFILE_SESSION_STATE.isEqualTo('none'),
            icon: Codicon.circleFilled,
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.notEqualsTo('running')),
                    group: 'navigation',
                }, {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_PROFILE_SESSION_STATE.notEqualsTo('running'),
                    group: 'profiling',
                }]
        });
    }
    run(accessor) {
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        extensionHostProfileService.startProfiling();
        return Promise.resolve();
    }
}
export class StopExtensionHostProfileAction extends Action2 {
    static { this.ID = 'workbench.extensions.action.stopExtensionHostProfile'; }
    static { this.LABEL = nls.localize('stopExtensionHostProfileStart', "Stop Extension Host Profile"); }
    constructor() {
        super({
            id: StopExtensionHostProfileAction.ID,
            title: { value: StopExtensionHostProfileAction.LABEL, original: 'Stop Extension Host Profile' },
            icon: Codicon.debugStop,
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.isEqualTo('running')),
                    group: 'navigation',
                }, {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_PROFILE_SESSION_STATE.isEqualTo('running'),
                    group: 'profiling',
                }]
        });
    }
    run(accessor) {
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        extensionHostProfileService.stopProfiling();
        return Promise.resolve();
    }
}
export class OpenExtensionHostProfileACtion extends Action2 {
    static { this.LABEL = nls.localize('openExtensionHostProfile', "Open Extension Host Profile"); }
    static { this.ID = 'workbench.extensions.action.openExtensionHostProfile'; }
    constructor() {
        super({
            id: OpenExtensionHostProfileACtion.ID,
            title: { value: OpenExtensionHostProfileACtion.LABEL, original: 'Open Extension Host Profile' },
            precondition: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
            icon: Codicon.graph,
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID)),
                    group: 'navigation',
                }, {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
                    group: 'profiling',
                }]
        });
    }
    async run(accessor) {
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        if (!extensionHostProfileService.lastProfileSavedTo) {
            await commandService.executeCommand(SaveExtensionHostProfileAction.ID);
        }
        if (!extensionHostProfileService.lastProfileSavedTo) {
            return;
        }
        await editorService.openEditor({
            resource: extensionHostProfileService.lastProfileSavedTo,
            options: {
                revealIfOpened: true,
                override: 'jsProfileVisualizer.cpuprofile.table',
            },
        }, SIDE_GROUP);
    }
}
export class SaveExtensionHostProfileAction extends Action2 {
    static { this.LABEL = nls.localize('saveExtensionHostProfile', "Save Extension Host Profile"); }
    static { this.ID = 'workbench.extensions.action.saveExtensionHostProfile'; }
    constructor() {
        super({
            id: SaveExtensionHostProfileAction.ID,
            title: { value: SaveExtensionHostProfileAction.LABEL, original: 'Save Extension Host Profile' },
            precondition: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
            icon: Codicon.saveAll,
            menu: [{
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID)),
                    group: 'navigation',
                }, {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
                    group: 'profiling',
                }]
        });
    }
    run(accessor) {
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        const fileService = accessor.get(IFileService);
        const fileDialogService = accessor.get(IFileDialogService);
        return this._asyncRun(environmentService, extensionHostProfileService, fileService, fileDialogService);
    }
    async _asyncRun(environmentService, extensionHostProfileService, fileService, fileDialogService) {
        const picked = await fileDialogService.showSaveDialog({
            title: nls.localize('saveprofile.dialogTitle', "Save Extension Host Profile"),
            availableFileSystems: [Schemas.file],
            defaultUri: joinPath(await fileDialogService.defaultFilePath(), `CPU-${new Date().toISOString().replace(/[\-:]/g, '')}.cpuprofile`),
            filters: [{
                    name: 'CPU Profiles',
                    extensions: ['cpuprofile', 'txt']
                }]
        });
        if (!picked) {
            return;
        }
        const profileInfo = extensionHostProfileService.lastProfile;
        let dataToWrite = profileInfo ? profileInfo.data : {};
        let savePath = picked.fsPath;
        if (environmentService.isBuilt) {
            // when running from a not-development-build we remove
            // absolute filenames because we don't want to reveal anything
            // about users. We also append the `.txt` suffix to make it
            // easier to attach these files to GH issues
            dataToWrite = Utils.rewriteAbsolutePaths(dataToWrite, 'piiRemoved');
            savePath = savePath + '.txt';
        }
        const saveURI = URI.file(savePath);
        extensionHostProfileService.lastProfileSavedTo = saveURI;
        return fileService.writeFile(saveURI, VSBuffer.fromString(JSON.stringify(profileInfo ? profileInfo.data : {}, null, '\t')));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZUV4dGVuc2lvbnNFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L3J1bnRpbWVFeHRlbnNpb25zRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0SSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZD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