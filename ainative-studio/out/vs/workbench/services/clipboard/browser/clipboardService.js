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
import { localize } from '../../../../nls.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { BrowserClipboardService as BaseBrowserClipboardService } from '../../../../platform/clipboard/browser/clipboardService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let BrowserClipboardService = class BrowserClipboardService extends BaseBrowserClipboardService {
    constructor(notificationService, openerService, environmentService, logService, layoutService) {
        super(layoutService, logService);
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.environmentService = environmentService;
    }
    async writeText(text, type) {
        if (!!this.environmentService.extensionTestsLocationURI && typeof type !== 'string') {
            type = 'vscode-tests'; // force in-memory clipboard for tests to avoid permission issues
        }
        return super.writeText(text, type);
    }
    async readText(type) {
        if (!!this.environmentService.extensionTestsLocationURI && typeof type !== 'string') {
            type = 'vscode-tests'; // force in-memory clipboard for tests to avoid permission issues
        }
        if (type) {
            return super.readText(type);
        }
        try {
            return await getActiveWindow().navigator.clipboard.readText();
        }
        catch (error) {
            return new Promise(resolve => {
                // Inform user about permissions problem (https://github.com/microsoft/vscode/issues/112089)
                const listener = new DisposableStore();
                const handle = this.notificationService.prompt(Severity.Error, localize('clipboardError', "Unable to read from the browser's clipboard. Please make sure you have granted access for this website to read from the clipboard."), [{
                        label: localize('retry', "Retry"),
                        run: async () => {
                            listener.dispose();
                            resolve(await this.readText(type));
                        }
                    }, {
                        label: localize('learnMore', "Learn More"),
                        run: () => this.openerService.open('https://go.microsoft.com/fwlink/?linkid=2151362')
                    }], {
                    sticky: true
                });
                // Always resolve the promise once the notification closes
                listener.add(Event.once(handle.onDidClose)(() => resolve('')));
            });
        }
    }
};
BrowserClipboardService = __decorate([
    __param(0, INotificationService),
    __param(1, IOpenerService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ILogService),
    __param(4, ILayoutService)
], BrowserClipboardService);
export { BrowserClipboardService };
registerSingleton(IClipboardService, BrowserClipboardService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jbGlwYm9hcmQvYnJvd3Nlci9jbGlwYm9hcmRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixJQUFJLDJCQUEyQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTNELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsMkJBQTJCO0lBRXZFLFlBQ3dDLG1CQUF5QyxFQUMvQyxhQUE2QixFQUNmLGtCQUFnRCxFQUNsRixVQUF1QixFQUNwQixh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