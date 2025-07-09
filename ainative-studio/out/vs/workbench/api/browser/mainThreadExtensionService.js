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
import { Action } from '../../../base/common/actions.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { transformErrorFromSerialization } from '../../../base/common/errors.js';
import { FileAccess } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { areSameExtensions } from '../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { ManagedRemoteConnection, WebSocketRemoteConnection } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IExtensionsWorkbenchService } from '../../contrib/extensions/common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService } from '../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IHostService } from '../../services/host/browser/host.js';
import { ITimerService } from '../../services/timer/browser/timerService.js';
let MainThreadExtensionService = class MainThreadExtensionService {
    constructor(extHostContext, _extensionService, _notificationService, _extensionsWorkbenchService, _hostService, _extensionEnablementService, _timerService, _commandService, _environmentService) {
        this._extensionService = _extensionService;
        this._notificationService = _notificationService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._hostService = _hostService;
        this._extensionEnablementService = _extensionEnablementService;
        this._timerService = _timerService;
        this._commandService = _commandService;
        this._environmentService = _environmentService;
        this._extensionHostKind = extHostContext.extensionHostKind;
        const internalExtHostContext = extHostContext;
        this._internalExtensionService = internalExtHostContext.internalExtensionService;
        internalExtHostContext._setExtensionHostProxy(new ExtensionHostProxy(extHostContext.getProxy(ExtHostContext.ExtHostExtensionService)));
        internalExtHostContext._setAllMainProxyIdentifiers(Object.keys(MainContext).map((key) => MainContext[key]));
    }
    dispose() {
    }
    $getExtension(extensionId) {
        return this._extensionService.getExtension(extensionId);
    }
    $activateExtension(extensionId, reason) {
        return this._internalExtensionService._activateById(extensionId, reason);
    }
    async $onWillActivateExtension(extensionId) {
        this._internalExtensionService._onWillActivateExtension(extensionId);
    }
    $onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        this._internalExtensionService._onDidActivateExtension(extensionId, codeLoadingTime, activateCallTime, activateResolvedTime, activationReason);
    }
    $onExtensionRuntimeError(extensionId, data) {
        const error = transformErrorFromSerialization(data);
        this._internalExtensionService._onExtensionRuntimeError(extensionId, error);
        console.error(`[${extensionId.value}]${error.message}`);
        console.error(error.stack);
    }
    async $onExtensionActivationError(extensionId, data, missingExtensionDependency) {
        const error = transformErrorFromSerialization(data);
        this._internalExtensionService._onDidActivateExtensionError(extensionId, error);
        if (missingExtensionDependency) {
            const extension = await this._extensionService.getExtension(extensionId.value);
            if (extension) {
                const local = await this._extensionsWorkbenchService.queryLocal();
                const installedDependency = local.find(i => areSameExtensions(i.identifier, { id: missingExtensionDependency.dependency }));
                if (installedDependency?.local) {
                    await this._handleMissingInstalledDependency(extension, installedDependency.local);
                    return;
                }
                else {
                    await this._handleMissingNotInstalledDependency(extension, missingExtensionDependency.dependency);
                    return;
                }
            }
        }
        const isDev = !this._environmentService.isBuilt || this._environmentService.isExtensionDevelopment;
        if (isDev) {
            this._notificationService.error(error);
            return;
        }
        console.error(error.message);
    }
    async _handleMissingInstalledDependency(extension, missingInstalledDependency) {
        const extName = extension.displayName || extension.name;
        if (this._extensionEnablementService.isEnabled(missingInstalledDependency)) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('reload window', "Cannot activate the '{0}' extension because it depends on the '{1}' extension, which is not loaded. Would you like to reload the window to load the extension?", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
                actions: {
                    primary: [new Action('reload', localize('reload', "Reload Window"), '', true, () => this._hostService.reload())]
                }
            });
        }
        else {
            const enablementState = this._extensionEnablementService.getEnablementState(missingInstalledDependency);
            if (enablementState === 5 /* EnablementState.DisabledByVirtualWorkspace */) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('notSupportedInWorkspace', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is not supported in the current workspace", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
                });
            }
            else if (enablementState === 0 /* EnablementState.DisabledByTrustRequirement */) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('restrictedMode', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is not supported in Restricted Mode", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
                    actions: {
                        primary: [new Action('manageWorkspaceTrust', localize('manageWorkspaceTrust', "Manage Workspace Trust"), '', true, () => this._commandService.executeCommand('workbench.trust.manage'))]
                    }
                });
            }
            else if (this._extensionEnablementService.canChangeEnablement(missingInstalledDependency)) {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('disabledDep', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is disabled. Would you like to enable the extension and reload the window?", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
                    actions: {
                        primary: [new Action('enable', localize('enable dep', "Enable and Reload"), '', true, () => this._extensionEnablementService.setEnablement([missingInstalledDependency], enablementState === 9 /* EnablementState.DisabledGlobally */ ? 11 /* EnablementState.EnabledGlobally */ : 12 /* EnablementState.EnabledWorkspace */)
                                .then(() => this._hostService.reload(), e => this._notificationService.error(e)))]
                    }
                });
            }
            else {
                this._notificationService.notify({
                    severity: Severity.Error,
                    message: localize('disabledDepNoAction', "Cannot activate the '{0}' extension because it depends on the '{1}' extension which is disabled.", extName, missingInstalledDependency.manifest.displayName || missingInstalledDependency.manifest.name),
                });
            }
        }
    }
    async _handleMissingNotInstalledDependency(extension, missingDependency) {
        const extName = extension.displayName || extension.name;
        let dependencyExtension = null;
        try {
            dependencyExtension = (await this._extensionsWorkbenchService.getExtensions([{ id: missingDependency }], CancellationToken.None))[0];
        }
        catch (err) {
        }
        if (dependencyExtension) {
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('uninstalledDep', "Cannot activate the '{0}' extension because it depends on the '{1}' extension from '{2}', which is not installed. Would you like to install the extension and reload the window?", extName, dependencyExtension.displayName, dependencyExtension.publisherDisplayName),
                actions: {
                    primary: [new Action('install', localize('install missing dep', "Install and Reload"), '', true, () => this._extensionsWorkbenchService.install(dependencyExtension)
                            .then(() => this._hostService.reload(), e => this._notificationService.error(e)))]
                }
            });
        }
        else {
            this._notificationService.error(localize('unknownDep', "Cannot activate the '{0}' extension because it depends on an unknown '{1}' extension.", extName, missingDependency));
        }
    }
    async $setPerformanceMarks(marks) {
        if (this._extensionHostKind === 1 /* ExtensionHostKind.LocalProcess */) {
            this._timerService.setPerformanceMarks('localExtHost', marks);
        }
        else if (this._extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
            this._timerService.setPerformanceMarks('workerExtHost', marks);
        }
        else {
            this._timerService.setPerformanceMarks('remoteExtHost', marks);
        }
    }
    async $asBrowserUri(uri) {
        return FileAccess.uriToBrowserUri(URI.revive(uri));
    }
};
MainThreadExtensionService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadExtensionService),
    __param(1, IExtensionService),
    __param(2, INotificationService),
    __param(3, IExtensionsWorkbenchService),
    __param(4, IHostService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, ITimerService),
    __param(7, ICommandService),
    __param(8, IWorkbenchEnvironmentService)
], MainThreadExtensionService);
export { MainThreadExtensionService };
class ExtensionHostProxy {
    constructor(_actual) {
        this._actual = _actual;
    }
    async resolveAuthority(remoteAuthority, resolveAttempt) {
        const resolved = reviveResolveAuthorityResult(await this._actual.$resolveAuthority(remoteAuthority, resolveAttempt));
        return resolved;
    }
    async getCanonicalURI(remoteAuthority, uri) {
        const uriComponents = await this._actual.$getCanonicalURI(remoteAuthority, uri);
        return (uriComponents ? URI.revive(uriComponents) : uriComponents);
    }
    startExtensionHost(extensionsDelta) {
        return this._actual.$startExtensionHost(extensionsDelta);
    }
    extensionTestsExecute() {
        return this._actual.$extensionTestsExecute();
    }
    activateByEvent(activationEvent, activationKind) {
        return this._actual.$activateByEvent(activationEvent, activationKind);
    }
    activate(extensionId, reason) {
        return this._actual.$activate(extensionId, reason);
    }
    setRemoteEnvironment(env) {
        return this._actual.$setRemoteEnvironment(env);
    }
    updateRemoteConnectionData(connectionData) {
        return this._actual.$updateRemoteConnectionData(connectionData);
    }
    deltaExtensions(extensionsDelta) {
        return this._actual.$deltaExtensions(extensionsDelta);
    }
    test_latency(n) {
        return this._actual.$test_latency(n);
    }
    test_up(b) {
        return this._actual.$test_up(b);
    }
    test_down(size) {
        return this._actual.$test_down(size);
    }
}
function reviveResolveAuthorityResult(result) {
    if (result.type === 'ok') {
        return {
            type: 'ok',
            value: {
                ...result.value,
                authority: reviveResolvedAuthority(result.value.authority),
            }
        };
    }
    else {
        return result;
    }
}
function reviveResolvedAuthority(resolvedAuthority) {
    return {
        ...resolvedAuthority,
        connectTo: reviveConnection(resolvedAuthority.connectTo),
    };
}
function reviveConnection(connection) {
    if (connection.type === 0 /* RemoteConnectionType.WebSocket */) {
        return new WebSocketRemoteConnection(connection.host, connection.port);
    }
    return new ManagedRemoteConnection(connection.id);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEV4dGVuc2lvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRFeHRlbnNpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUV6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQW1CLCtCQUErQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdELE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUU1RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQXlCLHVCQUF1QixFQUE2RCx5QkFBeUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xOLE9BQU8sRUFBRSxjQUFjLEVBQWdDLFdBQVcsRUFBbUMsTUFBTSwrQkFBK0IsQ0FBQztBQUMzSSxPQUFPLEVBQWMsMkJBQTJCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN2RyxPQUFPLEVBQW1CLG9D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