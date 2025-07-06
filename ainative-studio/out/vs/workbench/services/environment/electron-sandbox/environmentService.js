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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Vudmlyb25tZW50L2VsZWN0cm9uLXNhbmRib3gvZW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBNkIsTUFBTSx3REFBd0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNqSCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdoRSxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxzQkFBc0IsQ0FBMEQsbUJBQW1CLENBQUMsQ0FBQztBQXVDdkosTUFBTSxPQUFPLGlDQUFrQyxTQUFRLGdDQUFnQztJQUd0RixJQUFJLE9BQU8sS0FBSyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUdwRCxJQUFJLFNBQVMsS0FBSyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUd4RCxJQUFJLEtBQUssS0FBSyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUdoRCxJQUFJLFdBQVcsS0FBSyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUc1RCxJQUFJLGVBQWUsS0FBSyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUdwRSxJQUFJLHdCQUF3QixLQUFLLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHOUYsSUFBSSxRQUFRLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFHdEQsSUFBSSxVQUFVLEtBQUssT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFHMUQsSUFBSSxNQUFNO1FBQ1QsT0FBTztZQUNOLEVBQUUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDL0IsTUFBTSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTTtZQUNqQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXO1lBQzNDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVM7WUFDdkMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0I7WUFDN0QsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUztZQUN2QyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQjtZQUNyRCxhQUFhLEVBQUUsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsS0FBSyxRQUFRO1NBQ25FLENBQUM7SUFDSCxDQUFDO0lBR0QsSUFBSSxjQUFjLEtBQVUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxTQUFTLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHckcsSUFBSSxPQUFPLEtBQVUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHNUUsSUFBSSxlQUFlLEtBQVUsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHL0UsSUFBSSx1QkFBdUIsS0FBYSxPQUFPLEdBQUcsT0FBTyxDQUFDLGFBQWEsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUd2RixJQUFJLGdCQUFnQixLQUFjLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHN0UsSUFBSSxXQUFXLEtBQWMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHbEUsSUFBSSw2QkFBNkIsS0FBYyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztJQUdsRyxJQUFJLHFCQUFxQixLQUFjLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHeEYsSUFBSSwyQkFBMkI7UUFDOUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELElBQUkscUJBQXFCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFHRCxJQUFJLEVBQUUsS0FBdUIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFHNUQsSUFBSSxtQkFBbUIsS0FBMEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUdqRyxJQUFJLFdBQVcsS0FBMEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFHakYsSUFBSSxZQUFZLEtBQTBCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBR25GLElBQUksV0FBVyxLQUFrQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUV6RixZQUNrQixhQUF5QyxFQUMxRCxjQUErQjtRQUUvQixLQUFLLENBQUMsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUg5SCxrQkFBYSxHQUFiLGFBQWEsQ0FBNEI7SUFJM0QsQ0FBQztDQUNEO0FBL0ZBO0lBREMsT0FBTztnRUFDNEM7QUFHcEQ7SUFEQyxPQUFPO2tFQUNnRDtBQUd4RDtJQURDLE9BQU87OERBQ3dDO0FBR2hEO0lBREMsT0FBTztvRUFDb0Q7QUFHNUQ7SUFEQyxPQUFPO3dFQUM0RDtBQUdwRTtJQURDLE9BQU87aUZBQ3NGO0FBRzlGO0lBREMsT0FBTztpRUFDOEM7QUFHdEQ7SUFEQyxPQUFPO21FQUNrRDtBQUcxRDtJQURDLE9BQU87K0RBWVA7QUFHRDtJQURDLE9BQU87dUVBQzZGO0FBR3JHO0lBREMsT0FBTztnRUFDb0U7QUFHNUU7SUFEQyxPQUFPO3dFQUN1RTtBQUcvRTtJQURDLE9BQU87Z0ZBQytFO0FBR3ZGO0lBREMsT0FBTzt5RUFDcUU7QUFHN0U7SUFEQyxPQUFPO29FQUMwRDtBQUdsRTtJQURDLE9BQU87c0ZBQzBGO0FBR2xHO0lBREMsT0FBTzs4RUFDZ0Y7QUFHeEY7SUFEQyxPQUFPO29GQVdQO0FBR0Q7SUFEQyxPQUFPOzJEQUNvRDtBQUc1RDtJQURDLE9BQU87NEVBQ3lGO0FBR2pHO0lBREMsT0FBTztvRUFDeUU7QUFHakY7SUFEQyxPQUFPO3FFQUMyRTtBQUduRjtJQURDLE9BQU87b0VBQ2lGIn0=