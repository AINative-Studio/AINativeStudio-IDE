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
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { isWindows, isLinux } from '../../../../base/common/platform.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { AccessibilityService } from '../../../../platform/accessibility/browser/accessibilityService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
let NativeAccessibilityService = class NativeAccessibilityService extends AccessibilityService {
    constructor(environmentService, contextKeyService, configurationService, _layoutService, _telemetryService, nativeHostService) {
        super(contextKeyService, _layoutService, configurationService);
        this._telemetryService = _telemetryService;
        this.nativeHostService = nativeHostService;
        this.didSendTelemetry = false;
        this.shouldAlwaysUnderlineAccessKeys = undefined;
        this.setAccessibilitySupport(environmentService.window.accessibilitySupport ? 2 /* AccessibilitySupport.Enabled */ : 1 /* AccessibilitySupport.Disabled */);
    }
    async alwaysUnderlineAccessKeys() {
        if (!isWindows) {
            return false;
        }
        if (typeof this.shouldAlwaysUnderlineAccessKeys !== 'boolean') {
            const windowsKeyboardAccessibility = await this.nativeHostService.windowsGetStringRegKey('HKEY_CURRENT_USER', 'Control Panel\\Accessibility\\Keyboard Preference', 'On');
            this.shouldAlwaysUnderlineAccessKeys = (windowsKeyboardAccessibility === '1');
        }
        return this.shouldAlwaysUnderlineAccessKeys;
    }
    setAccessibilitySupport(accessibilitySupport) {
        super.setAccessibilitySupport(accessibilitySupport);
        if (!this.didSendTelemetry && accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            this._telemetryService.publicLog2('accessibility', { enabled: true });
            this.didSendTelemetry = true;
        }
    }
};
NativeAccessibilityService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, ILayoutService),
    __param(4, ITelemetryService),
    __param(5, INativeHostService)
], NativeAccessibilityService);
export { NativeAccessibilityService };
registerSingleton(IAccessibilityService, NativeAccessibilityService, 1 /* InstantiationType.Delayed */);
// On linux we do not automatically detect that a screen reader is detected, thus we have to implicitly notify the renderer to enable accessibility when user configures it in settings
let LinuxAccessibilityContribution = class LinuxAccessibilityContribution {
    static { this.ID = 'workbench.contrib.linuxAccessibility'; }
    constructor(jsonEditingService, accessibilityService, environmentService) {
        const forceRendererAccessibility = () => {
            if (accessibilityService.isScreenReaderOptimized()) {
                jsonEditingService.write(environmentService.argvResource, [{ path: ['force-renderer-accessibility'], value: true }], true);
            }
        };
        forceRendererAccessibility();
        accessibilityService.onDidChangeScreenReaderOptimized(forceRendererAccessibility);
    }
};
LinuxAccessibilityContribution = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IAccessibilityService),
    __param(2, INativeWorkbenchEnvironmentService)
], LinuxAccessibilityContribution);
if (isLinux) {
    registerWorkbenchContribution2(LinuxAccessibilityContribution.ID, LinuxAccessibilityContribution, 2 /* WorkbenchPhase.BlockRestore */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2FjY2Vzc2liaWxpdHkvZWxlY3Ryb24tc2FuZGJveC9hY2Nlc3NpYmlsaXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQXdCLE1BQU0sNERBQTRELENBQUM7QUFDekgsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUMxRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDaEYsT0FBTyxFQUEwQyw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQVcvRSxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLG9CQUFvQjtJQUtuRSxZQUNxQyxrQkFBc0QsRUFDdEUsaUJBQXFDLEVBQ2xDLG9C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