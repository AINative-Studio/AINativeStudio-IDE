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
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { memoize } from '../../../../base/common/decorators.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { parseLineAndColumnAware } from '../../../../base/common/extpath.js';
import { LogLevelToString } from '../../../../platform/log/common/log.js';
import { isUndefined } from '../../../../base/common/types.js';
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { EXTENSION_IDENTIFIER_WITH_LOG_REGEX } from '../../../../platform/environment/common/environmentService.js';
export const IBrowserWorkbenchEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class BrowserWorkbenchEnvironmentService {
    get remoteAuthority() { return this.options.remoteAuthority; }
    get expectsResolverExtension() {
        return !!this.options.remoteAuthority?.includes('+') && !this.options.webSocketFactory;
    }
    get isBuilt() { return !!this.productService.commit; }
    get logLevel() {
        const logLevelFromPayload = this.payload?.get('logLevel');
        if (logLevelFromPayload) {
            return logLevelFromPayload.split(',').find(entry => !EXTENSION_IDENTIFIER_WITH_LOG_REGEX.test(entry));
        }
        return this.options.developmentOptions?.logLevel !== undefined ? LogLevelToString(this.options.developmentOptions?.logLevel) : undefined;
    }
    get extensionLogLevel() {
        const logLevelFromPayload = this.payload?.get('logLevel');
        if (logLevelFromPayload) {
            const result = [];
            for (const entry of logLevelFromPayload.split(',')) {
                const matches = EXTENSION_IDENTIFIER_WITH_LOG_REGEX.exec(entry);
                if (matches && matches[1] && matches[2]) {
                    result.push([matches[1], matches[2]]);
                }
            }
            return result.length ? result : undefined;
        }
        return this.options.developmentOptions?.extensionLogLevel !== undefined ? this.options.developmentOptions?.extensionLogLevel.map(([extension, logLevel]) => ([extension, LogLevelToString(logLevel)])) : undefined;
    }
    get profDurationMarkers() {
        const profDurationMarkersFromPayload = this.payload?.get('profDurationMarkers');
        if (profDurationMarkersFromPayload) {
            const result = [];
            for (const entry of profDurationMarkersFromPayload.split(',')) {
                result.push(entry);
            }
            return result.length === 2 ? result : undefined;
        }
        return undefined;
    }
    get windowLogsPath() { return this.logsHome; }
    get logFile() { return joinPath(this.windowLogsPath, 'window.log'); }
    get userRoamingDataHome() { return URI.file('/User').with({ scheme: Schemas.vscodeUserData }); }
    get argvResource() { return joinPath(this.userRoamingDataHome, 'argv.json'); }
    get cacheHome() { return joinPath(this.userRoamingDataHome, 'caches'); }
    get workspaceStorageHome() { return joinPath(this.userRoamingDataHome, 'workspaceStorage'); }
    get localHistoryHome() { return joinPath(this.userRoamingDataHome, 'History'); }
    get stateResource() { return joinPath(this.userRoamingDataHome, 'State', 'storage.json'); }
    /**
     * In Web every workspace can potentially have scoped user-data
     * and/or extensions and if Sync state is shared then it can make
     * Sync error prone - say removing extensions from another workspace.
     * Hence scope Sync state per workspace. Sync scoped to a workspace
     * is capable of handling opening same workspace in multiple windows.
     */
    get userDataSyncHome() { return joinPath(this.userRoamingDataHome, 'sync', this.workspaceId); }
    get sync() { return undefined; }
    get keyboardLayoutResource() { return joinPath(this.userRoamingDataHome, 'keyboardLayout.json'); }
    get untitledWorkspacesHome() { return joinPath(this.userRoamingDataHome, 'Workspaces'); }
    get serviceMachineIdResource() { return joinPath(this.userRoamingDataHome, 'machineid'); }
    get extHostLogsPath() { return joinPath(this.logsHome, 'exthost'); }
    get debugExtensionHost() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.params;
    }
    get isExtensionDevelopment() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.isExtensionDevelopment;
    }
    get extensionDevelopmentLocationURI() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionDevelopmentLocationURI;
    }
    get extensionDevelopmentLocationKind() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionDevelopmentKind;
    }
    get extensionTestsLocationURI() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionTestsLocationURI;
    }
    get extensionEnabledProposedApi() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.extensionEnabledProposedApi;
    }
    get debugRenderer() {
        if (!this.extensionHostDebugEnvironment) {
            this.extensionHostDebugEnvironment = this.resolveExtensionHostDebugEnvironment();
        }
        return this.extensionHostDebugEnvironment.debugRenderer;
    }
    get enableSmokeTestDriver() { return this.options.developmentOptions?.enableSmokeTestDriver; }
    get disableExtensions() { return this.payload?.get('disableExtensions') === 'true'; }
    get enableExtensions() { return this.options.enabledExtensions; }
    get webviewExternalEndpoint() {
        const endpoint = this.options.webviewEndpoint
            || this.productService.webviewContentExternalBaseUrlTemplate
            || 'https://{{uuid}}.vscode-cdn.net/{{quality}}/{{commit}}/out/vs/workbench/contrib/webview/browser/pre/';
        const webviewExternalEndpointCommit = this.payload?.get('webviewExternalEndpointCommit');
        return endpoint
            .replace('{{commit}}', webviewExternalEndpointCommit ?? this.productService.commit ?? 'ef65ac1ba57f57f2a3961bfe94aa20481caca4c6')
            .replace('{{quality}}', (webviewExternalEndpointCommit ? 'insider' : this.productService.quality) ?? 'insider');
    }
    get extensionTelemetryLogResource() { return joinPath(this.logsHome, 'extensionTelemetry.log'); }
    get disableTelemetry() { return false; }
    get verbose() { return this.payload?.get('verbose') === 'true'; }
    get logExtensionHostCommunication() { return this.payload?.get('logExtensionHostCommunication') === 'true'; }
    get skipReleaseNotes() { return this.payload?.get('skipReleaseNotes') === 'true'; }
    get skipWelcome() { return this.payload?.get('skipWelcome') === 'true'; }
    get disableWorkspaceTrust() { return !this.options.enableWorkspaceTrust; }
    get profile() { return this.payload?.get('profile'); }
    get editSessionId() { return this.options.editSessionId; }
    constructor(workspaceId, logsHome, options, productService) {
        this.workspaceId = workspaceId;
        this.logsHome = logsHome;
        this.options = options;
        this.productService = productService;
        this.extensionHostDebugEnvironment = undefined;
        if (options.workspaceProvider && Array.isArray(options.workspaceProvider.payload)) {
            try {
                this.payload = new Map(options.workspaceProvider.payload);
            }
            catch (error) {
                onUnexpectedError(error); // possible invalid payload for map
            }
        }
    }
    resolveExtensionHostDebugEnvironment() {
        const extensionHostDebugEnvironment = {
            params: {
                port: null,
                break: false
            },
            debugRenderer: false,
            isExtensionDevelopment: false,
            extensionDevelopmentLocationURI: undefined,
            extensionDevelopmentKind: undefined
        };
        // Fill in selected extra environmental properties
        if (this.payload) {
            for (const [key, value] of this.payload) {
                switch (key) {
                    case 'extensionDevelopmentPath':
                        if (!extensionHostDebugEnvironment.extensionDevelopmentLocationURI) {
                            extensionHostDebugEnvironment.extensionDevelopmentLocationURI = [];
                        }
                        extensionHostDebugEnvironment.extensionDevelopmentLocationURI.push(URI.parse(value));
                        extensionHostDebugEnvironment.isExtensionDevelopment = true;
                        break;
                    case 'extensionDevelopmentKind':
                        extensionHostDebugEnvironment.extensionDevelopmentKind = [value];
                        break;
                    case 'extensionTestsPath':
                        extensionHostDebugEnvironment.extensionTestsLocationURI = URI.parse(value);
                        break;
                    case 'debugRenderer':
                        extensionHostDebugEnvironment.debugRenderer = value === 'true';
                        break;
                    case 'debugId':
                        extensionHostDebugEnvironment.params.debugId = value;
                        break;
                    case 'inspect-brk-extensions':
                        extensionHostDebugEnvironment.params.port = parseInt(value);
                        extensionHostDebugEnvironment.params.break = true;
                        break;
                    case 'inspect-extensions':
                        extensionHostDebugEnvironment.params.port = parseInt(value);
                        break;
                    case 'enableProposedApi':
                        extensionHostDebugEnvironment.extensionEnabledProposedApi = [];
                        break;
                }
            }
        }
        const developmentOptions = this.options.developmentOptions;
        if (developmentOptions && !extensionHostDebugEnvironment.isExtensionDevelopment) {
            if (developmentOptions.extensions?.length) {
                extensionHostDebugEnvironment.extensionDevelopmentLocationURI = developmentOptions.extensions.map(e => URI.revive(e));
                extensionHostDebugEnvironment.isExtensionDevelopment = true;
            }
            if (developmentOptions.extensionTestsPath) {
                extensionHostDebugEnvironment.extensionTestsLocationURI = URI.revive(developmentOptions.extensionTestsPath);
            }
        }
        return extensionHostDebugEnvironment;
    }
    get filesToOpenOrCreate() {
        if (this.payload) {
            const fileToOpen = this.payload.get('openFile');
            if (fileToOpen) {
                const fileUri = URI.parse(fileToOpen);
                // Support: --goto parameter to open on line/col
                if (this.payload.has('gotoLineMode')) {
                    const pathColumnAware = parseLineAndColumnAware(fileUri.path);
                    return [{
                            fileUri: fileUri.with({ path: pathColumnAware.path }),
                            options: {
                                selection: !isUndefined(pathColumnAware.line) ? { startLineNumber: pathColumnAware.line, startColumn: pathColumnAware.column || 1 } : undefined
                            }
                        }];
                }
                return [{ fileUri }];
            }
        }
        return undefined;
    }
    get filesToDiff() {
        if (this.payload) {
            const fileToDiffPrimary = this.payload.get('diffFilePrimary');
            const fileToDiffSecondary = this.payload.get('diffFileSecondary');
            if (fileToDiffPrimary && fileToDiffSecondary) {
                return [
                    { fileUri: URI.parse(fileToDiffSecondary) },
                    { fileUri: URI.parse(fileToDiffPrimary) }
                ];
            }
        }
        return undefined;
    }
    get filesToMerge() {
        if (this.payload) {
            const fileToMerge1 = this.payload.get('mergeFile1');
            const fileToMerge2 = this.payload.get('mergeFile2');
            const fileToMergeBase = this.payload.get('mergeFileBase');
            const fileToMergeResult = this.payload.get('mergeFileResult');
            if (fileToMerge1 && fileToMerge2 && fileToMergeBase && fileToMergeResult) {
                return [
                    { fileUri: URI.parse(fileToMerge1) },
                    { fileUri: URI.parse(fileToMerge2) },
                    { fileUri: URI.parse(fileToMergeBase) },
                    { fileUri: URI.parse(fileToMergeResult) }
                ];
            }
        }
        return undefined;
    }
}
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "remoteAuthority", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "expectsResolverExtension", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "isBuilt", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "logLevel", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "windowLogsPath", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "logFile", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "userRoamingDataHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "argvResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "cacheHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "workspaceStorageHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "localHistoryHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "stateResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "userDataSyncHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "sync", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "keyboardLayoutResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "untitledWorkspacesHome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "serviceMachineIdResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extHostLogsPath", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "debugExtensionHost", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "isExtensionDevelopment", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionDevelopmentLocationURI", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionDevelopmentLocationKind", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionTestsLocationURI", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionEnabledProposedApi", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "debugRenderer", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "enableSmokeTestDriver", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "disableExtensions", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "enableExtensions", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "webviewExternalEndpoint", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "extensionTelemetryLogResource", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "disableTelemetry", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "verbose", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "logExtensionHostCommunication", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "skipReleaseNotes", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "skipWelcome", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "disableWorkspaceTrust", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "profile", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "editSessionId", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "filesToOpenOrCreate", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "filesToDiff", null);
__decorate([
    memoize
], BrowserWorkbenchEnvironmentService.prototype, "filesToMerge", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lbnZpcm9ubWVudC9icm93c2VyL2Vudmlyb25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQWlCLG1CQUFtQixFQUE2QixNQUFNLHdEQUF3RCxDQUFDO0FBS3ZJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFcEcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFcEgsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsc0JBQXNCLENBQTJELG1CQUFtQixDQUFDLENBQUM7QUFtQnpKLE1BQU0sT0FBTyxrQ0FBa0M7SUFLOUMsSUFBSSxlQUFlLEtBQXlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBR2xGLElBQUksd0JB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