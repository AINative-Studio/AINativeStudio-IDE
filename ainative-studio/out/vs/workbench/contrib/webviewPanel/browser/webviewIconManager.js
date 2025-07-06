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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ljb25NYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1BhbmVsL2Jyb3dzZXIvd2Vidmlld0ljb25NYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBTzdGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQU1qRCxZQUNvQixpQkFBcUQsRUFDakQsY0FBc0Q7UUFFN0UsS0FBSyxFQUFFLENBQUM7UUFINEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQyxtQkFBYyxHQUFkLGNBQWMsQ0FBdUI7UUFON0QsV0FBTSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBU3pELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUNRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUM7SUFDaEMsQ0FBQztJQUVELElBQVksWUFBWTtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxhQUFhLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQztRQUNoRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFTSxRQUFRLENBQ2QsU0FBaUIsRUFDakIsUUFBa0M7UUFFbEMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9CLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQjtRQUM3QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGlDQUF5QixDQUFDO1FBRTNELE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztRQUM5QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbEUsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxlQUFlLEdBQUcsNkJBQTZCLEdBQUcseUJBQXlCLENBQUM7Z0JBQ2xGLElBQUksQ0FBQztvQkFDSixRQUFRLENBQUMsSUFBSSxDQUNaLHdCQUF3QixlQUFlLGdDQUFnQyxlQUFlLHFDQUFxQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUM5Siw2QkFBNkIsZUFBZSxnQ0FBZ0MsZUFBZSxxQ0FBcUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FDbEssQ0FBQztnQkFDSCxDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDUixPQUFPO2dCQUNSLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckQsQ0FBQztDQUNELENBQUE7QUE5RFksa0JBQWtCO0lBTzVCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQVJYLGtCQUFrQixDQThEOUIifQ==