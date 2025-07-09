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
import { asCssVariable, asCssVariableName, registerColor, transparent } from '../../../../platform/theme/common/colorRegistry.js';
import { IDebugService } from '../common/debug.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { STATUS_BAR_FOREGROUND, STATUS_BAR_BORDER, COMMAND_CENTER_BACKGROUND } from '../../../common/theme.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
// colors for theming
export const STATUS_BAR_DEBUGGING_BACKGROUND = registerColor('statusBar.debuggingBackground', {
    dark: '#CC6633',
    light: '#CC6633',
    hcDark: '#BA592C',
    hcLight: '#B5200D'
}, localize('statusBarDebuggingBackground', "Status bar background color when a program is being debugged. The status bar is shown in the bottom of the window"));
export const STATUS_BAR_DEBUGGING_FOREGROUND = registerColor('statusBar.debuggingForeground', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: STATUS_BAR_FOREGROUND,
    hcLight: '#FFFFFF'
}, localize('statusBarDebuggingForeground', "Status bar foreground color when a program is being debugged. The status bar is shown in the bottom of the window"));
export const STATUS_BAR_DEBUGGING_BORDER = registerColor('statusBar.debuggingBorder', STATUS_BAR_BORDER, localize('statusBarDebuggingBorder', "Status bar border color separating to the sidebar and editor when a program is being debugged. The status bar is shown in the bottom of the window"));
export const COMMAND_CENTER_DEBUGGING_BACKGROUND = registerColor('commandCenter.debuggingBackground', transparent(STATUS_BAR_DEBUGGING_BACKGROUND, 0.258), localize('commandCenter-activeBackground', "Command center background color when a program is being debugged"), true);
let StatusBarColorProvider = class StatusBarColorProvider {
    set enabled(enabled) {
        if (enabled === !!this.disposable) {
            return;
        }
        if (enabled) {
            this.disposable = this.statusbarService.overrideStyle({
                priority: 10,
                foreground: STATUS_BAR_DEBUGGING_FOREGROUND,
                background: STATUS_BAR_DEBUGGING_BACKGROUND,
                border: STATUS_BAR_DEBUGGING_BORDER,
            });
        }
        else {
            this.disposable.dispose();
            this.disposable = undefined;
        }
    }
    constructor(debugService, contextService, statusbarService, layoutService, configurationService) {
        this.debugService = debugService;
        this.contextService = contextService;
        this.statusbarService = statusbarService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.disposables = new DisposableStore();
        this.debugService.onDidChangeState(this.update, this, this.disposables);
        this.contextService.onDidChangeWorkbenchState(this.update, this, this.disposables);
        this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.enableStatusBarColor') || e.affectsConfiguration('debug.toolBarLocation')) {
                this.update();
            }
        }, undefined, this.disposables);
        this.update();
    }
    update() {
        const debugConfig = this.configurationService.getValue('debug');
        const isInDebugMode = isStatusbarInDebugMode(this.debugService.state, this.debugService.getModel().getSessions());
        if (!debugConfig.enableStatusBarColor) {
            this.enabled = false;
        }
        else {
            this.enabled = isInDebugMode;
        }
        const isInCommandCenter = debugConfig.toolBarLocation === 'commandCenter';
        this.layoutService.mainContainer.style.setProperty(asCssVariableName(COMMAND_CENTER_BACKGROUND), isInCommandCenter && isInDebugMode
            ? asCssVariable(COMMAND_CENTER_DEBUGGING_BACKGROUND)
            : '');
    }
    dispose() {
        this.disposable?.dispose();
        this.disposables.dispose();
    }
};
StatusBarColorProvider = __decorate([
    __param(0, IDebugService),
    __param(1, IWorkspaceContextService),
    __param(2, IStatusbarService),
    __param(3, ILayoutService),
    __param(4, IConfigurationService)
], StatusBarColorProvider);
export { StatusBarColorProvider };
export function isStatusbarInDebugMode(state, sessions) {
    if (state === 0 /* State.Inactive */ || state === 1 /* State.Initializing */ || sessions.every(s => s.suppressDebugStatusbar || s.configuration?.noDebug)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyQ29sb3JQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3N0YXR1c2JhckNvbG9yUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRWxJLE9BQU8sRUFBRSxhQUFhLEVBQTZDLE1BQU0sb0JBQW9CLENBQUM7QUFDOUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RixxQkFBcUI7QUFFckIsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUFDLCtCQUErQixFQUFFO0lBQzdGLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLFNBQVM7SUFDaEIsTUFBTSxFQUFFLFNBQVM7SUFDakIsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUsbUhBQW1ILENBQUMsQ0FB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