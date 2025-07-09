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
import * as cssValue from '../../../../base/browser/cssValue.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let WebviewIconManager = class WebviewIconManager extends Disposable {
    constructor(_lifecycleService, _configService) {
        super();
        this._lifecycleService = _lifecycleService;
        this._configService = _configService;
        this._icons = new Map();
        this._register(this._configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.iconTheme')) {
                this.updateStyleSheet();
            }
        }));
    }
    dispose() {
        super.dispose();
        this._styleElement = undefined;
    }
    get styleElement() {
        if (!this._styleElement) {
            this._styleElement = domStylesheets.createStyleSheet(undefined, undefined, this._store);
            this._styleElement.className = 'webview-icons';
        }
        return this._styleElement;
    }
    setIcons(webviewId, iconPath) {
        if (iconPath) {
            this._icons.set(webviewId, iconPath);
        }
        else {
            this._icons.delete(webviewId);
        }
        this.updateStyleSheet();
    }
    async updateStyleSheet() {
        await this._lifecycleService.when(1 /* LifecyclePhase.Starting */);
        const cssRules = [];
        if (this._configService.getValue('workbench.iconTheme') !== null) {
            for (const [key, value] of this._icons) {
                const webviewSelector = `.show-file-icons .webview-${key}-name-file-icon::before`;
                try {
                    cssRules.push(`.monaco-workbench.vs ${webviewSelector}, .monaco-workbench.hc-light ${webviewSelector} { content: ""; background-image: ${cssValue.asCSSUrl(value.light)}; }`, `.monaco-workbench.vs-dark ${webviewSelector}, .monaco-workbench.hc-black ${webviewSelector} { content: ""; background-image: ${cssValue.asCSSUrl(value.dark)}; }`);
                }
                catch {
                    // noop
                }
            }
        }
        this.styleElement.textContent = cssRules.join('\n');
    }
};
WebviewIconManager = __decorate([
    __param(0, ILifecycleService),
    __param(1, IConfigurationService)
], WebviewIconManager);
export { WebviewIconManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ljb25NYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXdQYW5lbC9icm93c2VyL3dlYnZpZXdJY29uTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssUUFBUSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxpREFBaUQsQ0FBQztBQU83RixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFNakQsWUFDb0IsaUJBQXFELEVBQ2pELGNBQXNEO1FBRTdFLEtBQUssRUFBRSxDQUFDO1FBSDRCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDaEMsbUJBQWMsR0FBZCxjQUFjLENBQXVCO1FBTjdELFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBd0IsQ0FBQztRQVN6RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0QsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN6QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFDUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4RixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUM7UUFDaEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRU0sUUFBUSxDQUNkLFNBQWlCLEVBQ2pCLFFBQWtDO1FBRWxDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0I7UUFDN0IsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxpQ0FBeUIsQ0FBQztRQUUzRCxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7UUFDOUIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2xFLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sZUFBZSxHQUFHLDZCQUE2QixHQUFHLHlCQUF5QixDQUFDO2dCQUNsRixJQUFJLENBQUM7b0JBQ0osUUFBUSxDQUFDLElBQUksQ0FDWix3QkFBd0IsZUFBZSxnQ0FBZ0MsZUFBZSxxQ0FBcUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssRUFDOUosNkJBQTZCLGVBQWUsZ0NBQWdDLGVBQWUscUNBQXFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQ2xLLENBQUM7Z0JBQ0gsQ0FBQztnQkFBQyxNQUFNLENBQUM7b0JBQ1IsT0FBTztnQkFDUixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JELENBQUM7Q0FDRCxDQUFBO0FBOURZLGtCQUFrQjtJQU81QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEscUJBQXFCLENBQUE7R0FSWCxrQkFBa0IsQ0E4RDlCIn0=