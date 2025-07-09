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
import { IWorkbenchConfigurationService } from '../../../../services/configuration/common/configuration.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEnvironmentVariableService } from '../environmentVariable.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
export const REMOTE_TERMINAL_CHANNEL_NAME = 'remoteterminal';
let RemoteTerminalChannelClient = class RemoteTerminalChannelClient {
    get onPtyHostExit() {
        return this._channel.listen("$onPtyHostExitEvent" /* RemoteTerminalChannelEvent.OnPtyHostExitEvent */);
    }
    get onPtyHostStart() {
        return this._channel.listen("$onPtyHostStartEvent" /* RemoteTerminalChannelEvent.OnPtyHostStartEvent */);
    }
    get onPtyHostUnresponsive() {
        return this._channel.listen("$onPtyHostUnresponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostUnresponsiveEvent */);
    }
    get onPtyHostResponsive() {
        return this._channel.listen("$onPtyHostResponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostResponsiveEvent */);
    }
    get onPtyHostRequestResolveVariables() {
        return this._channel.listen("$onPtyHostRequestResolveVariablesEvent" /* RemoteTerminalChannelEvent.OnPtyHostRequestResolveVariablesEvent */);
    }
    get onProcessData() {
        return this._channel.listen("$onProcessDataEvent" /* RemoteTerminalChannelEvent.OnProcessDataEvent */);
    }
    get onProcessExit() {
        return this._channel.listen("$onProcessExitEvent" /* RemoteTerminalChannelEvent.OnProcessExitEvent */);
    }
    get onProcessReady() {
        return this._channel.listen("$onProcessReadyEvent" /* RemoteTerminalChannelEvent.OnProcessReadyEvent */);
    }
    get onProcessReplay() {
        return this._channel.listen("$onProcessReplayEvent" /* RemoteTerminalChannelEvent.OnProcessReplayEvent */);
    }
    get onProcessOrphanQuestion() {
        return this._channel.listen("$onProcessOrphanQuestion" /* RemoteTerminalChannelEvent.OnProcessOrphanQuestion */);
    }
    get onExecuteCommand() {
        return this._channel.listen("$onExecuteCommand" /* RemoteTerminalChannelEvent.OnExecuteCommand */);
    }
    get onDidRequestDetach() {
        return this._channel.listen("$onDidRequestDetach" /* RemoteTerminalChannelEvent.OnDidRequestDetach */);
    }
    get onDidChangeProperty() {
        return this._channel.listen("$onDidChangeProperty" /* RemoteTerminalChannelEvent.OnDidChangeProperty */);
    }
    constructor(_remoteAuthority, _channel, _configurationService, _workspaceContextService, _resolverService, _environmentVariableService, _remoteAuthorityResolverService, _logService, _editorService, _labelService) {
        this._remoteAuthority = _remoteAuthority;
        this._channel = _channel;
        this._configurationService = _configurationService;
        this._workspaceContextService = _workspaceContextService;
        this._resolverService = _resolverService;
        this._environmentVariableService = _environmentVariableService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._logService = _logService;
        this._editorService = _editorService;
        this._labelService = _labelService;
    }
    restartPtyHost() {
        return this._channel.call("$restartPtyHost" /* RemoteTerminalChannelRequest.RestartPtyHost */, []);
    }
    async createProcess(shellLaunchConfig, configuration, activeWorkspaceRootUri, options, shouldPersistTerminal, cols, rows, unicodeVersion) {
        // Be sure to first wait for the remote configuration
        await this._configurationService.whenRemoteConfigurationLoaded();
        // We will use the resolver service to resolve all the variables in the config / launch config
        // But then we will keep only some variables, since the rest need to be resolved on the remote side
        const resolvedVariables = Object.create(null);
        const lastActiveWorkspace = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
        const expr = ConfigurationResolverExpression.parse({ shellLaunchConfig, configuration });
        try {
            await this._resolverService.resolveAsync(lastActiveWorkspace, expr);
        }
        catch (err) {
            this._logService.error(err);
        }
        for (const [{ inner }, resolved] of expr.resolved()) {
            if (/^config:/.test(inner) || inner === 'selectedText' || inner === 'lineNumber') {
                resolvedVariables[inner] = resolved.value;
            }
        }
        const envVariableCollections = [];
        for (const [k, v] of this._environmentVariableService.collections.entries()) {
            envVariableCollections.push([k, serializeEnvironmentVariableCollection(v.map), serializeEnvironmentDescriptionMap(v.descriptionMap)]);
        }
        const resolverResult = await this._remoteAuthorityResolverService.resolveAuthority(this._remoteAuthority);
        const resolverEnv = resolverResult.options && resolverResult.options.extensionHostEnv;
        const workspace = this._workspaceContextService.getWorkspace();
        const workspaceFolders = workspace.folders;
        const activeWorkspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) : null;
        const activeFileResource = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
            filterByScheme: [Schemas.file, Schemas.vscodeUserData, Schemas.vscodeRemote]
        });
        const args = {
            configuration,
            resolvedVariables,
            envVariableCollections,
            shellLaunchConfig,
            workspaceId: workspace.id,
            workspaceName: this._labelService.getWorkspaceLabel(workspace),
            workspaceFolders,
            activeWorkspaceFolder,
            activeFileResource,
            shouldPersistTerminal,
            options,
            cols,
            rows,
            unicodeVersion,
            resolverEnv
        };
        return await this._channel.call("$createProcess" /* RemoteTerminalChannelRequest.CreateProcess */, args);
    }
    requestDetachInstance(workspaceId, instanceId) {
        return this._channel.call("$requestDetachInstance" /* RemoteTerminalChannelRequest.RequestDetachInstance */, [workspaceId, instanceId]);
    }
    acceptDetachInstanceReply(requestId, persistentProcessId) {
        return this._channel.call("$acceptDetachInstanceReply" /* RemoteTerminalChannelRequest.AcceptDetachInstanceReply */, [requestId, persistentProcessId]);
    }
    attachToProcess(id) {
        return this._channel.call("$attachToProcess" /* RemoteTerminalChannelRequest.AttachToProcess */, [id]);
    }
    detachFromProcess(id, forcePersist) {
        return this._channel.call("$detachFromProcess" /* RemoteTerminalChannelRequest.DetachFromProcess */, [id, forcePersist]);
    }
    listProcesses() {
        return this._channel.call("$listProcesses" /* RemoteTerminalChannelRequest.ListProcesses */);
    }
    getLatency() {
        return this._channel.call("$getLatency" /* RemoteTerminalChannelRequest.GetLatency */);
    }
    getPerformanceMarks() {
        return this._channel.call("$getPerformanceMarks" /* RemoteTerminalChannelRequest.GetPerformanceMarks */);
    }
    reduceConnectionGraceTime() {
        return this._channel.call("$reduceConnectionGraceTime" /* RemoteTerminalChannelRequest.ReduceConnectionGraceTime */);
    }
    processBinary(id, data) {
        return this._channel.call("$processBinary" /* RemoteTerminalChannelRequest.ProcessBinary */, [id, data]);
    }
    start(id) {
        return this._channel.call("$start" /* RemoteTerminalChannelRequest.Start */, [id]);
    }
    input(id, data) {
        return this._channel.call("$input" /* RemoteTerminalChannelRequest.Input */, [id, data]);
    }
    acknowledgeDataEvent(id, charCount) {
        return this._channel.call("$acknowledgeDataEvent" /* RemoteTerminalChannelRequest.AcknowledgeDataEvent */, [id, charCount]);
    }
    setUnicodeVersion(id, version) {
        return this._channel.call("$setUnicodeVersion" /* RemoteTerminalChannelRequest.SetUnicodeVersion */, [id, version]);
    }
    shutdown(id, immediate) {
        return this._channel.call("$shutdown" /* RemoteTerminalChannelRequest.Shutdown */, [id, immediate]);
    }
    resize(id, cols, rows) {
        return this._channel.call("$resize" /* RemoteTerminalChannelRequest.Resize */, [id, cols, rows]);
    }
    clearBuffer(id) {
        return this._channel.call("$clearBuffer" /* RemoteTerminalChannelRequest.ClearBuffer */, [id]);
    }
    getInitialCwd(id) {
        return this._channel.call("$getInitialCwd" /* RemoteTerminalChannelRequest.GetInitialCwd */, [id]);
    }
    getCwd(id) {
        return this._channel.call("$getCwd" /* RemoteTerminalChannelRequest.GetCwd */, [id]);
    }
    orphanQuestionReply(id) {
        return this._channel.call("$orphanQuestionReply" /* RemoteTerminalChannelRequest.OrphanQuestionReply */, [id]);
    }
    sendCommandResult(reqId, isError, payload) {
        return this._channel.call("$sendCommandResult" /* RemoteTerminalChannelRequest.SendCommandResult */, [reqId, isError, payload]);
    }
    freePortKillProcess(port) {
        return this._channel.call("$freePortKillProcess" /* RemoteTerminalChannelRequest.FreePortKillProcess */, [port]);
    }
    getDefaultSystemShell(osOverride) {
        return this._channel.call("$getDefaultSystemShell" /* RemoteTerminalChannelRequest.GetDefaultSystemShell */, [osOverride]);
    }
    getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return this._channel.call("$getProfiles" /* RemoteTerminalChannelRequest.GetProfiles */, [this._workspaceContextService.getWorkspace().id, profiles, defaultProfile, includeDetectedProfiles]);
    }
    acceptPtyHostResolvedVariables(requestId, resolved) {
        return this._channel.call("$acceptPtyHostResolvedVariables" /* RemoteTerminalChannelRequest.AcceptPtyHostResolvedVariables */, [requestId, resolved]);
    }
    getEnvironment() {
        return this._channel.call("$getEnvironment" /* RemoteTerminalChannelRequest.GetEnvironment */);
    }
    getWslPath(original, direction) {
        return this._channel.call("$getWslPath" /* RemoteTerminalChannelRequest.GetWslPath */, [original, direction]);
    }
    setTerminalLayoutInfo(layout) {
        const workspace = this._workspaceContextService.getWorkspace();
        const args = {
            workspaceId: workspace.id,
            tabs: layout ? layout.tabs : []
        };
        return this._channel.call("$setTerminalLayoutInfo" /* RemoteTerminalChannelRequest.SetTerminalLayoutInfo */, args);
    }
    updateTitle(id, title, titleSource) {
        return this._channel.call("$updateTitle" /* RemoteTerminalChannelRequest.UpdateTitle */, [id, title, titleSource]);
    }
    updateIcon(id, userInitiated, icon, color) {
        return this._channel.call("$updateIcon" /* RemoteTerminalChannelRequest.UpdateIcon */, [id, userInitiated, icon, color]);
    }
    refreshProperty(id, property) {
        return this._channel.call("$refreshProperty" /* RemoteTerminalChannelRequest.RefreshProperty */, [id, property]);
    }
    updateProperty(id, property, value) {
        return this._channel.call("$updateProperty" /* RemoteTerminalChannelRequest.UpdateProperty */, [id, property, value]);
    }
    getTerminalLayoutInfo() {
        const workspace = this._workspaceContextService.getWorkspace();
        const args = {
            workspaceId: workspace.id,
        };
        return this._channel.call("$getTerminalLayoutInfo" /* RemoteTerminalChannelRequest.GetTerminalLayoutInfo */, args);
    }
    reviveTerminalProcesses(workspaceId, state, dateTimeFormatLocate) {
        return this._channel.call("$reviveTerminalProcesses" /* RemoteTerminalChannelRequest.ReviveTerminalProcesses */, [workspaceId, state, dateTimeFormatLocate]);
    }
    getRevivedPtyNewId(id) {
        return this._channel.call("$getRevivedPtyNewId" /* RemoteTerminalChannelRequest.GetRevivedPtyNewId */, [id]);
    }
    serializeTerminalState(ids) {
        return this._channel.call("$serializeTerminalState" /* RemoteTerminalChannelRequest.SerializeTerminalState */, [ids]);
    }
    // #region Pty service contribution RPC calls
    installAutoReply(match, reply) {
        return this._channel.call("$installAutoReply" /* RemoteTerminalChannelRequest.InstallAutoReply */, [match, reply]);
    }
    uninstallAllAutoReplies() {
        return this._channel.call("$uninstallAllAutoReplies" /* RemoteTerminalChannelRequest.UninstallAllAutoReplies */, []);
    }
};
RemoteTerminalChannelClient = __decorate([
    __param(2, IWorkbenchConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IConfigurationResolverService),
    __param(5, IEnvironmentVariableService),
    __param(6, IRemoteAuthorityResolverService),
    __param(7, ITerminalLogService),
    __param(8, IEditorService),
    __param(9, ILabelService)
], RemoteTerminalChannelClient);
export { RemoteTerminalChannelClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi9yZW1vdGUvcmVtb3RlVGVybWluYWxDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ25ILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ2xLLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQzNILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hFLE9BQU8sRUFBMFYsbUJBQW1CLEVBQThCLE1BQU0scURBQXFELENBQUM7QUFROWMsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0ZBQXNGLENBQUM7QUFFdkksTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsZ0JBQWdCLENBQUM7QUFpQ3RELElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCO0lB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