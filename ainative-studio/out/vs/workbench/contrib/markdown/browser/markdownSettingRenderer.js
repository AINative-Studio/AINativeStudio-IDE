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
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Schemas } from '../../../../base/common/network.js';
import * as nls from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { settingKeyToDisplayFormat } from '../../preferences/browser/settingsTreeModels.js';
let SimpleSettingRenderer = class SimpleSettingRenderer {
    constructor(_configurationService, _contextMenuService, _preferencesService, _telemetryService, _clipboardService) {
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._preferencesService = _preferencesService;
        this._telemetryService = _telemetryService;
        this._clipboardService = _clipboardService;
        this._updatedSettings = new Map(); // setting ID to user's original setting value
        this._encounteredSettings = new Map(); // setting ID to setting
        this._featuredSettings = new Map(); // setting ID to feature value
        this.codeSettingAnchorRegex = new RegExp(`^<a (href)=".*code.*://settings/([^\\s"]+)"(?:\\s*codesetting="([^"]+)")?>`);
        this.codeSettingSimpleRegex = new RegExp(`^setting\\(([^\\s:)]+)(?::([^)]+))?\\)$`);
    }
    get featuredSettingStates() {
        const result = new Map();
        for (const [settingId, value] of this._featuredSettings) {
            result.set(settingId, this._configurationService.getValue(settingId) === value);
        }
        return result;
    }
    replaceAnchor(raw) {
        const match = this.codeSettingAnchorRegex.exec(raw);
        if (match && match.length === 4) {
            const settingId = match[2];
            const rendered = this.render(settingId, match[3]);
            if (rendered) {
                return raw.replace(this.codeSettingAnchorRegex, rendered);
            }
        }
        return undefined;
    }
    replaceSimple(raw) {
        const match = this.codeSettingSimpleRegex.exec(raw);
        if (match && match.length === 3) {
            const settingId = match[1];
            const rendered = this.render(settingId, match[2]);
            if (rendered) {
                return raw.replace(this.codeSettingSimpleRegex, rendered);
            }
        }
        return undefined;
    }
    getHtmlRenderer() {
        return ({ raw }) => {
            const replacedAnchor = this.replaceAnchor(raw);
            if (replacedAnchor) {
                raw = replacedAnchor;
            }
            return raw;
        };
    }
    getCodeSpanRenderer() {
        return ({ text }) => {
            const replacedSimple = this.replaceSimple(text);
            if (replacedSimple) {
                return replacedSimple;
            }
            return `<code>${text}</code>`;
        };
    }
    settingToUriString(settingId, value) {
        return `${Schemas.codeSetting}://${settingId}${value ? `/${value}` : ''}`;
    }
    getSetting(settingId) {
        if (this._encounteredSettings.has(settingId)) {
            return this._encounteredSettings.get(settingId);
        }
        return this._preferencesService.getSetting(settingId);
    }
    parseValue(settingId, value) {
        if (value === 'undefined' || value === '') {
            return undefined;
        }
        const setting = this.getSetting(settingId);
        if (!setting) {
            return value;
        }
        switch (setting.type) {
            case 'boolean':
                return value === 'true';
            case 'number':
                return parseInt(value, 10);
            case 'string':
            default:
                return value;
        }
    }
    render(settingId, newValue) {
        const setting = this.getSetting(settingId);
        if (!setting) {
            return `<code>${settingId}</code>`;
        }
        return this.renderSetting(setting, newValue);
    }
    viewInSettingsMessage(settingId, alreadyDisplayed) {
        if (alreadyDisplayed) {
            return nls.localize('viewInSettings', "View in Settings");
        }
        else {
            const displayName = settingKeyToDisplayFormat(settingId);
            return nls.localize('viewInSettingsDetailed', "View \"{0}: {1}\" in Settings", displayName.category, displayName.label);
        }
    }
    restorePreviousSettingMessage(settingId) {
        const displayName = settingKeyToDisplayFormat(settingId);
        return nls.localize('restorePreviousValue', "Restore value of \"{0}: {1}\"", displayName.category, displayName.label);
    }
    isAlreadySet(setting, value) {
        const currentValue = this._configurationService.getValue(setting.key);
        return (currentValue === value || (currentValue === undefined && setting.value === value));
    }
    booleanSettingMessage(setting, booleanValue) {
        const displayName = settingKeyToDisplayFormat(setting.key);
        if (this.isAlreadySet(setting, booleanValue)) {
            if (booleanValue) {
                return nls.localize('alreadysetBoolTrue', "\"{0}: {1}\" is already enabled", displayName.category, displayName.label);
            }
            else {
                return nls.localize('alreadysetBoolFalse', "\"{0}: {1}\" is already disabled", displayName.category, displayName.label);
            }
        }
        if (booleanValue) {
            return nls.localize('trueMessage', "Enable \"{0}: {1}\"", displayName.category, displayName.label);
        }
        else {
            return nls.localize('falseMessage', "Disable \"{0}: {1}\"", displayName.category, displayName.label);
        }
    }
    stringSettingMessage(setting, stringValue) {
        const displayName = settingKeyToDisplayFormat(setting.key);
        if (this.isAlreadySet(setting, stringValue)) {
            return nls.localize('alreadysetString', "\"{0}: {1}\" is already set to \"{2}\"", displayName.category, displayName.label, stringValue);
        }
        return nls.localize('stringValue', "Set \"{0}: {1}\" to \"{2}\"", displayName.category, displayName.label, stringValue);
    }
    numberSettingMessage(setting, numberValue) {
        const displayName = settingKeyToDisplayFormat(setting.key);
        if (this.isAlreadySet(setting, numberValue)) {
            return nls.localize('alreadysetNum', "\"{0}: {1}\" is already set to {2}", displayName.category, displayName.label, numberValue);
        }
        return nls.localize('numberValue', "Set \"{0}: {1}\" to {2}", displayName.category, displayName.label, numberValue);
    }
    renderSetting(setting, newValue) {
        const href = this.settingToUriString(setting.key, newValue);
        const title = nls.localize('changeSettingTitle', "View or change setting");
        return `<code tabindex="0"><a href="${href}" class="codesetting" title="${title}" aria-role="button"><svg width="14" height="14" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.2.7-2.4.5v1.2l2.4.5.3.8-1.3 2 .8.8 2-1.3.8.3.4 2.3h1.2l.5-2.4.8-.3 2 1.3.8-.8-1.3-2 .3-.8 2.3-.4V7.4l-2.4-.5-.3-.8 1.3-2-.8-.8-2 1.3-.7-.2zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 13.9l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2.1 4l2-2 2.1 1.4.4-2.4h2.8zm.6 7c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM8 9c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
			<span class="separator"></span>
			<span class="setting-name">${setting.key}</span>
		</a></code>`;
    }
    getSettingMessage(setting, newValue) {
        if (setting.type === 'boolean') {
            return this.booleanSettingMessage(setting, newValue);
        }
        else if (setting.type === 'string') {
            return this.stringSettingMessage(setting, newValue);
        }
        else if (setting.type === 'number') {
            return this.numberSettingMessage(setting, newValue);
        }
        return undefined;
    }
    async restoreSetting(settingId) {
        const userOriginalSettingValue = this._updatedSettings.get(settingId);
        this._updatedSettings.delete(settingId);
        return this._configurationService.updateValue(settingId, userOriginalSettingValue, 2 /* ConfigurationTarget.USER */);
    }
    async setSetting(settingId, currentSettingValue, newSettingValue) {
        this._updatedSettings.set(settingId, currentSettingValue);
        return this._configurationService.updateValue(settingId, newSettingValue, 2 /* ConfigurationTarget.USER */);
    }
    getActions(uri) {
        if (uri.scheme !== Schemas.codeSetting) {
            return;
        }
        const actions = [];
        const settingId = uri.authority;
        const newSettingValue = this.parseValue(uri.authority, uri.path.substring(1));
        const currentSettingValue = this._configurationService.inspect(settingId).userValue;
        if ((newSettingValue !== undefined) && newSettingValue === currentSettingValue && this._updatedSettings.has(settingId)) {
            const restoreMessage = this.restorePreviousSettingMessage(settingId);
            actions.push({
                class: undefined,
                id: 'restoreSetting',
                enabled: true,
                tooltip: restoreMessage,
                label: restoreMessage,
                run: () => {
                    return this.restoreSetting(settingId);
                }
            });
        }
        else if (newSettingValue !== undefined) {
            const setting = this.getSetting(settingId);
            const trySettingMessage = setting ? this.getSettingMessage(setting, newSettingValue) : undefined;
            if (setting && trySettingMessage) {
                actions.push({
                    class: undefined,
                    id: 'trySetting',
                    enabled: !this.isAlreadySet(setting, newSettingValue),
                    tooltip: trySettingMessage,
                    label: trySettingMessage,
                    run: () => {
                        this.setSetting(settingId, currentSettingValue, newSettingValue);
                    }
                });
            }
        }
        const viewInSettingsMessage = this.viewInSettingsMessage(settingId, actions.length > 0);
        actions.push({
            class: undefined,
            enabled: true,
            id: 'viewInSettings',
            tooltip: viewInSettingsMessage,
            label: viewInSettingsMessage,
            run: () => {
                return this._preferencesService.openApplicationSettings({ query: `@id:${settingId}` });
            }
        });
        actions.push({
            class: undefined,
            enabled: true,
            id: 'copySettingId',
            tooltip: nls.localize('copySettingId', "Copy Setting ID"),
            label: nls.localize('copySettingId', "Copy Setting ID"),
            run: () => {
                this._clipboardService.writeText(settingId);
            }
        });
        return actions;
    }
    showContextMenu(uri, x, y) {
        const actions = this.getActions(uri);
        if (!actions) {
            return;
        }
        this._contextMenuService.showContextMenu({
            getAnchor: () => ({ x, y }),
            getActions: () => actions,
            getActionViewItem: (action) => {
                return new ActionViewItem(action, action, { label: true });
            },
        });
    }
    async updateSetting(uri, x, y) {
        if (uri.scheme === Schemas.codeSetting) {
            this._telemetryService.publicLog2('releaseNotesSettingAction', {
                settingId: uri.authority
            });
            return this.showContextMenu(uri, x, y);
        }
    }
};
SimpleSettingRenderer = __decorate([
    __param(0, IConfigurationService),
    __param(1, IContextMenuService),
    __param(2, IPreferencesService),
    __param(3, ITelemetryService),
    __param(4, IClipboardService)
], SimpleSettingRenderer);
export { SimpleSettingRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TZXR0aW5nUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZG93bi9icm93c2VyL21hcmtkb3duU2V0dGluZ1JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUcxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFZLE1BQU0scURBQXFELENBQUM7QUFDcEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFFckYsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBcUI7SUFRakMsWUFDd0IscUJBQTZELEVBQy9ELG1CQUF5RCxFQUN6RCxtQkFBeUQsRUFDM0QsaUJBQXFELEVBQ3JELGlCQUFxRDtRQUpoQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDeEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUMxQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3BDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFUakUscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQyxDQUFDLDhDQUE4QztRQUN6Rix5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQyxDQUFDLHdCQUF3QjtRQUM1RSxzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDLENBQUMsOEJBQThCO1FBU2pGLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyw0RUFBNEUsQ0FBQyxDQUFDO1FBQ3ZILElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQ3JGLENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztRQUMxQyxLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUNqRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sYUFBYSxDQUFDLEdBQVc7UUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0QsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU8sYUFBYSxDQUFDLEdBQVc7UUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0QsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBNEIsRUFBVSxFQUFFO1lBQ3BELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0MsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsR0FBRyxHQUFHLGNBQWMsQ0FBQztZQUN0QixDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUM7UUFDWixDQUFDLENBQUM7SUFDSCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBbUIsRUFBVSxFQUFFO1lBQzVDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxjQUFjLENBQUM7WUFDdkIsQ0FBQztZQUNELE9BQU8sU0FBUyxJQUFJLFNBQVMsQ0FBQztRQUMvQixDQUFDLENBQUM7SUFDSCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsU0FBaUIsRUFBRSxLQUFXO1FBQ2hELE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0lBQzNFLENBQUM7SUFFTyxVQUFVLENBQUMsU0FBaUI7UUFDbkMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDOUMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUFpQixFQUFFLEtBQWE7UUFDMUMsSUFBSSxLQUFLLEtBQUssV0FBVyxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxRQUFRLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN0QixLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxLQUFLLEtBQUssTUFBTSxDQUFDO1lBQ3pCLEtBQUssUUFBUTtnQkFDWixPQUFPLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDNUIsS0FBSyxRQUFRLENBQUM7WUFDZDtnQkFDQyxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLFNBQWlCLEVBQUUsUUFBZ0I7UUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLFNBQVMsU0FBUyxTQUFTLENBQUM7UUFDcEMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVPLHFCQUFxQixDQUFDLFNBQWlCLEVBQUUsZ0JBQXlCO1FBQ3pFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwrQkFBK0IsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6SCxDQUFDO0lBQ0YsQ0FBQztJQUVPLDZCQUE2QixDQUFDLFNBQWlCO1FBQ3RELE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSwrQkFBK0IsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2SCxDQUFDO0lBRU8sWUFBWSxDQUFDLE9BQWlCLEVBQUUsS0FBZ0M7UUFDdkUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBVSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0UsT0FBTyxDQUFDLFlBQVksS0FBSyxLQUFLLElBQUksQ0FBQyxZQUFZLEtBQUssU0FBUyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBaUIsRUFBRSxZQUFxQjtRQUNyRSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQzlDLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxpQ0FBaUMsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2SCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLGtDQUFrQyxFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pILENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BHLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxzQkFBc0IsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RyxDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLE9BQWlCLEVBQUUsV0FBbUI7UUFDbEUsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsd0NBQXdDLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3pJLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLDZCQUE2QixFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztJQUN6SCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsT0FBaUIsRUFBRSxXQUFtQjtRQUNsRSxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0QsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsb0NBQW9DLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2xJLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLHlCQUF5QixFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztJQUVySCxDQUFDO0lBRU8sYUFBYSxDQUFDLE9BQWlCLEVBQUUsUUFBNEI7UUFDcEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDNUQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQzNFLE9BQU8sK0JBQStCLElBQUksZ0NBQWdDLEtBQUs7O2dDQUVqRCxPQUFPLENBQUMsR0FBRztjQUM3QixDQUFDO0lBQ2QsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE9BQWlCLEVBQUUsUUFBbUM7UUFDL0UsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxRQUFtQixDQUFDLENBQUM7UUFDakUsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN0QyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsUUFBa0IsQ0FBQyxDQUFDO1FBQy9ELENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLFFBQWtCLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBaUI7UUFDckMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSx3QkFBd0IsbUNBQTJCLENBQUM7SUFDOUcsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBaUIsRUFBRSxtQkFBd0IsRUFBRSxlQUFvQjtRQUNqRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzFELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsZUFBZSxtQ0FBMkIsQ0FBQztJQUNyRyxDQUFDO0lBRUQsVUFBVSxDQUFDLEdBQVE7UUFDbEIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN4QyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQztRQUU5QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO1FBQ2hDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFFcEYsSUFBSSxDQUFDLGVBQWUsS0FBSyxTQUFTLENBQUMsSUFBSSxlQUFlLEtBQUssbUJBQW1CLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3hILE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyRSxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNaLEtBQUssRUFBRSxTQUFTO2dCQUNoQixFQUFFLEVBQUUsZ0JBQWdCO2dCQUNwQixPQUFPLEVBQUUsSUFBSTtnQkFDYixPQUFPLEVBQUUsY0FBYztnQkFDdkIsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLEdBQUcsRUFBRSxHQUFHLEVBQUU7b0JBQ1QsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN2QyxDQUFDO2FBQ0QsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0MsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUVqRyxJQUFJLE9BQU8sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNaLEtBQUssRUFBRSxTQUFTO29CQUNoQixFQUFFLEVBQUUsWUFBWTtvQkFDaEIsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDO29CQUNyRCxPQUFPLEVBQUUsaUJBQWlCO29CQUMxQixLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixHQUFHLEVBQUUsR0FBRyxFQUFFO3dCQUNULElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxDQUFDO29CQUNsRSxDQUFDO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDeEYsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNaLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsRUFBRSxFQUFFLGdCQUFnQjtZQUNwQixPQUFPLEVBQUUscUJBQXFCO1lBQzlCLEtBQUssRUFBRSxxQkFBcUI7WUFDNUIsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN4RixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLElBQUksQ0FBQztZQUNaLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsRUFBRSxFQUFFLGVBQWU7WUFDbkIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDO1lBQ3pELEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQztZQUN2RCxHQUFHLEVBQUUsR0FBRyxFQUFFO2dCQUNULElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0MsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxlQUFlLENBQUMsR0FBUSxFQUFFLENBQVMsRUFBRSxDQUFTO1FBQ3JELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDO1lBQ3hDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzNCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO1lBQ3pCLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzdCLE9BQU8sSUFBSSxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFRLEVBQUUsQ0FBUyxFQUFFLENBQVM7UUFDakQsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQVN4QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFpRSwyQkFBMkIsRUFBRTtnQkFDOUgsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTO2FBQ3hCLENBQUMsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXZTWSxxQkFBcUI7SUFTL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGlCQUFpQixDQUFBO0dBYlAscUJBQXFCLENBdVNqQyJ9