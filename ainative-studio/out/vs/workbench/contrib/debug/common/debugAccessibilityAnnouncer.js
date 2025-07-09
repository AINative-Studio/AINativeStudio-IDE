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
import { IDebugService } from './debug.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Expression } from './debugModel.js';
let DebugWatchAccessibilityAnnouncer = class DebugWatchAccessibilityAnnouncer extends Disposable {
    static { this.ID = 'workbench.contrib.debugWatchAccessibilityAnnouncer'; }
    constructor(_debugService, _logService, _accessibilityService, _configurationService) {
        super();
        this._debugService = _debugService;
        this._logService = _logService;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._listener = this._register(new MutableDisposable());
        this._setListener();
        this._register(_configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('accessibility.debugWatchVariableAnnouncements')) {
                this._setListener();
            }
        }));
    }
    _setListener() {
        const value = this._configurationService.getValue('accessibility.debugWatchVariableAnnouncements');
        if (value && !this._listener.value) {
            this._listener.value = this._debugService.getModel().onDidChangeWatchExpressionValue((e) => {
                if (!e || e.value === Expression.DEFAULT_VALUE) {
                    return;
                }
                // TODO: get user feedback, perhaps setting to configure verbosity + whether value, name, neither, or both are announced
                this._accessibilityService.alert(`${e.name} = ${e.value}`);
                this._logService.trace(`debugAccessibilityAnnouncerValueChanged ${e.name} ${e.value}`);
            });
        }
        else {
            this._listener.clear();
        }
    }
};
DebugWatchAccessibilityAnnouncer = __decorate([
    __param(0, IDebugService),
    __param(1, ILogService),
    __param(2, IAccessibilityService),
    __param(3, IConfigurationService)
], DebugWatchAccessibilityAnnouncer);
export { DebugWatchAccessibilityAnnouncer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBY2Nlc3NpYmlsaXR5QW5ub3VuY2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z0FjY2Vzc2liaWxpdHlBbm5vdW5jZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUV0QyxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7YUFDeEQsT0FBRSxHQUFHLG9EQUFvRCxBQUF2RCxDQUF3RDtJQUVqRSxZQUNnQixhQUE2QyxFQUMvQyxXQUF5QyxFQUMvQixxQkFBNkQsRUFDN0QscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBTHdCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQzlCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ2QsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBTHBFLGNBQVMsR0FBbUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQVFwRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNqRSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQywrQ0FBK0MsQ0FBQyxFQUFFLENBQUM7Z0JBQzdFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxZQUFZO1FBQ25CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsK0NBQStDLENBQUMsQ0FBQztRQUNuRyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMxRixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNoRCxPQUFPO2dCQUNSLENBQUM7Z0JBRUQsd0hBQXdIO2dCQUN4SCxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDM0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDeEYsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDeEIsQ0FBQztJQUNGLENBQUM7O0FBakNXLGdDQUFnQztJQUkxQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBUFgsZ0NBQWdDLENBa0M1QyJ9