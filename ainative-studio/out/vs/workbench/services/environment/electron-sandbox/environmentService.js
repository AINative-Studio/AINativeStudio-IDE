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
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AbstractNativeEnvironmentService } from '../../../../platform/environment/common/environmentService.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
export const INativeWorkbenchEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class NativeWorkbenchEnvironmentService extends AbstractNativeEnvironmentService {
    get mainPid() { return this.configuration.mainPid; }
    get machineId() { return this.configuration.machineId; }
    get sqmId() { return this.configuration.sqmId; }
    get devDeviceId() { return this.configuration.devDeviceId; }
    get remoteAuthority() { return this.configuration.remoteAuthority; }
    get expectsResolverExtension() { return !!this.configuration.remoteAuthority?.includes('+'); }
    get execPath() { return this.configuration.execPath; }
    get backupPath() { return this.configuration.backupPath; }
    get window() {
        return {
            id: this.configuration.windowId,
            handle: this.configuration.handle,
            colorScheme: this.configuration.colorScheme,
            maximized: this.configuration.maximized,
            accessibilitySupport: this.configuration.accessibilitySupport,
            perfMarks: this.configuration.perfMarks,
            isInitialStartup: this.configuration.isInitialStartup,
            isCodeCaching: typeof this.configuration.codeCachePath === 'string'
        };
    }
    get windowLogsPath() { return joinPath(this.logsHome, `window${this.configuration.windowId}`); }
    get logFile() { return joinPath(this.windowLogsPath, `renderer.log`); }
    get extHostLogsPath() { return joinPath(this.windowLogsPath, 'exthost'); }
    get webviewExternalEndpoint() { return `${Schemas.vscodeWebview}://{{uuid}}`; }
    get skipReleaseNotes() { return !!this.args['skip-release-notes']; }
    get skipWelcome() { return !!this.args['skip-welcome']; }
    get logExtensionHostCommunication() { return !!this.args.logExtensionHostCommunication; }
    get enableSmokeTestDriver() { return !!this.args['enable-smoke-test-driver']; }
    get extensionEnabledProposedApi() {
        if (Array.isArray(this.args['enable-proposed-api'])) {
            return this.args['enable-proposed-api'];
        }
        if ('enable-proposed-api' in this.args) {
            return [];
        }
        return undefined;
    }
    get os() { return this.configuration.os; }
    get filesToOpenOrCreate() { return this.configuration.filesToOpenOrCreate; }
    get filesToDiff() { return this.configuration.filesToDiff; }
    get filesToMerge() { return this.configuration.filesToMerge; }
    get filesToWait() { return this.configuration.filesToWait; }
    constructor(configuration, productService) {
        super(configuration, { homeDir: configuration.homeDir, tmpDir: configuration.tmpDir, userDataDir: configuration.userDataDir }, productService);
        this.configuration = configuration;
    }
}
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "mainPid", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "machineId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "sqmId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "devDeviceId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "remoteAuthority", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "expectsResolverExtension", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "execPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "backupPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "window", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "windowLogsPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "logFile", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "extHostLogsPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "webviewExternalEndpoint", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "skipReleaseNotes", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "skipWelcome", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "logExtensionHostCommunication", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "enableSmokeTestDriver", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "extensionEnabledProposedApi", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "os", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToOpenOrCreate", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToDiff", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToMerge", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToWait", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lbnZpcm9ubWVudC9lbGVjdHJvbi1zYW5kYm94L2Vudmlyb25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQTZCLE1BQU0sd0RBQXdELENBQUM7QUFDeEgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDakgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHaEUsTUFBTSxDQUFDLE1BQU0sa0NBQWtDLEdBQUcsc0JBQXNCLENBQTBELG1CQUFtQixDQUFDLENBQUM7QUF1Q3ZKLE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxnQ0FBZ0M7SUFHdEYsSUFBSSxPQUFPLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFHcEQsSUFBSSxTQUFTLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFHeEQsSUFBSSxLQUFLLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHaEQsSUFBSSxXQUFXLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFHNUQsSUFBSSxlQUFlLEtB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