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
import { BrowserWindow } from 'electron';
import { isLinux, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { hasNativeTitlebar } from '../../window/common/window.js';
import { BaseWindow } from '../../windows/electron-main/windowImpl.js';
let AuxiliaryWindow = class AuxiliaryWindow extends BaseWindow {
    get win() {
        if (!super.win) {
            this.tryClaimWindow();
        }
        return super.win;
    }
    constructor(webContents, environmentMainService, logService, configurationService, stateService, lifecycleMainService) {
        super(configurationService, stateService, environmentMainService, logService);
        this.webContents = webContents;
        this.lifecycleMainService = lifecycleMainService;
        this.parentId = -1;
        this.stateApplied = false;
        this.id = this.webContents.id;
        // Try to claim window
        this.tryClaimWindow();
    }
    tryClaimWindow(options) {
        if (this._store.isDisposed || this.webContents.isDestroyed()) {
            return; // already disposed
        }
        this.doTryClaimWindow(options);
        if (options && !this.stateApplied) {
            this.stateApplied = true;
            this.applyState({
                x: options.x,
                y: options.y,
                width: options.width,
                height: options.height,
                // We currently do not support restoring fullscreen state for auxiliary
                // windows because we do not get hold of the original `features` string
                // that contains that info in `window-fullscreen`. However, we can
                // probe the `options.show` value for whether the window should be maximized
                // or not because we never show maximized windows initially to reduce flicker.
                mode: options.show === false ? 0 /* WindowMode.Maximized */ : 1 /* WindowMode.Normal */
            });
        }
    }
    doTryClaimWindow(options) {
        if (this._win) {
            return; // already claimed
        }
        const window = BrowserWindow.fromWebContents(this.webContents);
        if (window) {
            this.logService.trace('[aux window] Claimed browser window instance');
            // Remember
            this.setWin(window, options);
            // Disable Menu
            window.setMenu(null);
            if ((isWindows || isLinux) && hasNativeTitlebar(this.configurationService, options?.titleBarStyle === 'hidden' ? "custom" /* TitlebarStyle.CUSTOM */ : undefined /* unknown */)) {
                window.setAutoHideMenuBar(true); // Fix for https://github.com/microsoft/vscode/issues/200615
            }
            // Lifecycle
            this.lifecycleMainService.registerAuxWindow(this);
        }
    }
    matches(webContents) {
        return this.webContents.id === webContents.id;
    }
};
AuxiliaryWindow = __decorate([
    __param(1, IEnvironmentMainService),
    __param(2, ILogService),
    __param(3, IConfigurationService),
    __param(4, IStateService),
    __param(5, ILifecycleMainService)
], AuxiliaryWindow);
export { AuxiliaryWindow };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2F1eGlsaWFyeVdpbmRvdy9lbGVjdHJvbi1tYWluL2F1eGlsaWFyeVdpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFnRCxNQUFNLFVBQVUsQ0FBQztBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFpQixNQUFNLCtCQUErQixDQUFDO0FBRWpGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQU1oRSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7SUFLOUMsSUFBYSxHQUFHO1FBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0lBSUQsWUFDa0IsV0FBd0IsRUFDaEIsc0JBQStDLEVBQzNELFVBQXVCLEVBQ2Isb0JBQTJDLEVBQ25ELFlBQTJCLEVBQ25C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