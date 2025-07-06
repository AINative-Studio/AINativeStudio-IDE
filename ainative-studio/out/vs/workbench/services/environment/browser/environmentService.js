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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Vudmlyb25tZW50L2Jyb3dzZXIvZW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBaUIsbUJBQW1CLEVBQTZCLE1BQU0sd0RBQXdELENBQUM7QUFLdkksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUVwSCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxzQkFBc0IsQ0FBMkQsbUJBQW1CLENBQUMsQ0FBQztBQW1CekosTUFBTSxPQUFPLGtDQUFrQztJQUs5QyxJQUFJLGVBQWUsS0FBeUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFHbEYsSUFBSSx3QkFB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