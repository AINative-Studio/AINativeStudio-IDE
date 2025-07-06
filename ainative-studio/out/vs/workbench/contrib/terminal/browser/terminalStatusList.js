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
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { listErrorForeground, listWarningForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { mainWindow } from '../../../../base/browser/window.js';
/**
 * The set of _internal_ terminal statuses, other components building on the terminal should put
 * their statuses within their component.
 */
export var TerminalStatus;
(function (TerminalStatus) {
    TerminalStatus["Bell"] = "bell";
    TerminalStatus["Disconnected"] = "disconnected";
    TerminalStatus["RelaunchNeeded"] = "relaunch-needed";
    TerminalStatus["EnvironmentVariableInfoChangesActive"] = "env-var-info-changes-active";
    TerminalStatus["ShellIntegrationInfo"] = "shell-integration-info";
    TerminalStatus["ShellIntegrationAttentionNeeded"] = "shell-integration-attention-needed";
})(TerminalStatus || (TerminalStatus = {}));
let TerminalStatusList = class TerminalStatusList extends Disposable {
    get onDidAddStatus() { return this._onDidAddStatus.event; }
    get onDidRemoveStatus() { return this._onDidRemoveStatus.event; }
    get onDidChangePrimaryStatus() { return this._onDidChangePrimaryStatus.event; }
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._statuses = new Map();
        this._statusTimeouts = new Map();
        this._onDidAddStatus = this._register(new Emitter());
        this._onDidRemoveStatus = this._register(new Emitter());
        this._onDidChangePrimaryStatus = this._register(new Emitter());
    }
    get primary() {
        let result;
        for (const s of this._statuses.values()) {
            if (!result || s.severity >= result.severity) {
                if (s.icon || !result?.icon) {
                    result = s;
                }
            }
        }
        return result;
    }
    get statuses() { return Array.from(this._statuses.values()); }
    add(status, duration) {
        status = this._applyAnimationSetting(status);
        const outTimeout = this._statusTimeouts.get(status.id);
        if (outTimeout) {
            mainWindow.clearTimeout(outTimeout);
            this._statusTimeouts.delete(status.id);
        }
        if (duration && duration > 0) {
            const timeout = mainWindow.setTimeout(() => this.remove(status), duration);
            this._statusTimeouts.set(status.id, timeout);
        }
        const existingStatus = this._statuses.get(status.id);
        if (existingStatus && existingStatus !== status) {
            this._onDidRemoveStatus.fire(existingStatus);
            this._statuses.delete(existingStatus.id);
        }
        if (!this._statuses.has(status.id)) {
            const oldPrimary = this.primary;
            this._statuses.set(status.id, status);
            this._onDidAddStatus.fire(status);
            const newPrimary = this.primary;
            if (oldPrimary !== newPrimary) {
                this._onDidChangePrimaryStatus.fire(newPrimary);
            }
        }
    }
    remove(statusOrId) {
        const status = typeof statusOrId === 'string' ? this._statuses.get(statusOrId) : statusOrId;
        // Verify the status is the same as the one passed in
        if (status && this._statuses.get(status.id)) {
            const wasPrimary = this.primary?.id === status.id;
            this._statuses.delete(status.id);
            this._onDidRemoveStatus.fire(status);
            if (wasPrimary) {
                this._onDidChangePrimaryStatus.fire(this.primary);
            }
        }
    }
    toggle(status, value) {
        if (value) {
            this.add(status);
        }
        else {
            this.remove(status);
        }
    }
    _applyAnimationSetting(status) {
        if (!status.icon || ThemeIcon.getModifier(status.icon) !== 'spin' || this._configurationService.getValue("terminal.integrated.tabs.enableAnimation" /* TerminalSettingId.TabsEnableAnimation */)) {
            return status;
        }
        let icon;
        // Loading without animation is just a curved line that doesn't mean anything
        if (status.icon.id === spinningLoading.id) {
            icon = Codicon.play;
        }
        else {
            icon = ThemeIcon.modify(status.icon, undefined);
        }
        // Clone the status when changing the icon so that setting changes are applied without a
        // reload being needed
        return {
            ...status,
            icon
        };
    }
};
TerminalStatusList = __decorate([
    __param(0, IConfigurationService)
], TerminalStatusList);
export { TerminalStatusList };
export function getColorForSeverity(severity) {
    switch (severity) {
        case Severity.Error:
            return listErrorForeground;
        case Severity.Warning:
            return listWarningForeground;
        default:
            return '';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGF0dXNMaXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFN0YXR1c0xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDaEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFaEU7OztHQUdHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGNBT2pCO0FBUEQsV0FBa0IsY0FBYztJQUMvQiwrQkFBYSxDQUFBO0lBQ2IsK0NBQTZCLENBQUE7SUFDN0Isb0RBQWtDLENBQUE7SUFDbEMsc0ZBQW9FLENBQUE7SUFDcEUsaUVBQStDLENBQUE7SUFDL0Msd0ZBQXNFLENBQUE7QUFDdkUsQ0FBQyxFQVBpQixjQUFjLEtBQWQsY0FBYyxRQU8vQjtBQXlCTSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFLakQsSUFBSSxjQUFjLEtB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