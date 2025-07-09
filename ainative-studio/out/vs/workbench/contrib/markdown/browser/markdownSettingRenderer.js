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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25TZXR0aW5nUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Rvd24vYnJvd3Nlci9tYXJrZG93blNldHRpbmdSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFHMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBWSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXJGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBUWpDLFlBQ3dCLHFCQUE2RCxFQUMvRCxtQkFBeUQsRUFDekQsbUJBQXlELEVBQzNELGlCQUFxRCxFQUNyRCxpQkFBcUQ7UUFKaEMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM5Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDMUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNwQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBVGpFLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFlLENBQUMsQ0FBQyw4Q0FBOEM7UUFDekYseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUMsQ0FBQyx3QkFBd0I7UUFDNUUsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQyxDQUFDLDhCQUE4QjtRQVNqRixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsNEVBQTRFLENBQUMsQ0FBQztRQUN2SCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUNyRixDQUFDO0lBRUQsSUFBSSxxQkFBcUI7UUFDeEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUM7UUFDMUMsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFXO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEQsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzNELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFXO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEQsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzNELENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQTRCLEVBQVUsRUFBRTtZQUNwRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9DLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLEdBQUcsR0FBRyxjQUFjLENBQUM7WUFDdEIsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixPQUFPLENBQUMsRUFBRSxJQUFJLEVBQW1CLEVBQVUsRUFBRTtZQUM1QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sY0FBYyxDQUFDO1lBQ3ZCLENBQUM7WUFDRCxPQUFPLFNBQVMsSUFBSSxTQUFTLENBQUM7UUFDL0IsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELGtCQUFrQixDQUFDLFNBQWlCLEVBQUUsS0FBVztRQUNoRCxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUMzRSxDQUFDO0lBRU8sVUFBVSxDQUFDLFNBQWlCO1FBQ25DLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRCxVQUFVLENBQUMsU0FBaUIsRUFBRSxLQUFhO1FBQzFDLElBQUksS0FBSyxLQUFLLFdBQVcsSUFBSSxLQUFLLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDM0MsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsUUFBUSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdEIsS0FBSyxTQUFTO2dCQUNiLE9BQU8sS0FBSyxLQUFLLE1BQU0sQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzVCLEtBQUssUUFBUSxDQUFDO1lBQ2Q7Z0JBQ0MsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxTQUFpQixFQUFFLFFBQWdCO1FBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTyxTQUFTLFNBQVMsU0FBUyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxTQUFpQixFQUFFLGdCQUF5QjtRQUN6RSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN6RCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsK0JBQStCLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekgsQ0FBQztJQUNGLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxTQUFpQjtRQUN0RCxNQUFNLFdBQVcsR0FBRyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6RCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsK0JBQStCLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkgsQ0FBQztJQUVPLFlBQVksQ0FBQyxPQUFpQixFQUFFLEtBQWdDO1FBQ3ZFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQVUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9FLE9BQU8sQ0FBQyxZQUFZLEtBQUssS0FBSyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQWlCLEVBQUUsWUFBcUI7UUFDckUsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUM5QyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsaUNBQWlDLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkgsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxrQ0FBa0MsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6SCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwRyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsc0JBQXNCLEVBQUUsV0FBVyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEcsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxPQUFpQixFQUFFLFdBQW1CO1FBQ2xFLE1BQU0sV0FBVyxHQUFHLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHdDQUF3QyxFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6SSxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSw2QkFBNkIsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDekgsQ0FBQztJQUVPLG9CQUFvQixDQUFDLE9BQWlCLEVBQUUsV0FBbUI7UUFDbEUsTUFBTSxXQUFXLEdBQUcseUJBQXlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzNELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLG9DQUFvQyxFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsSSxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSx5QkFBeUIsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFckgsQ0FBQztJQUVPLGFBQWEsQ0FBQyxPQUFpQixFQUFFLFFBQTRCO1FBQ3BFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVELE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUMzRSxPQUFPLCtCQUErQixJQUFJLGdDQUFnQyxLQUFLOztnQ0FFakQsT0FBTyxDQUFDLEdBQUc7Y0FDN0IsQ0FBQztJQUNkLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxPQUFpQixFQUFFLFFBQW1DO1FBQy9FLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsUUFBbUIsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxFQUFFLFFBQWtCLENBQUMsQ0FBQztRQUMvRCxDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxRQUFrQixDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLFNBQWlCO1FBQ3JDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLG1DQUEyQixDQUFDO0lBQzlHLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQWlCLEVBQUUsbUJBQXdCLEVBQUUsZUFBb0I7UUFDakYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUMxRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGVBQWUsbUNBQTJCLENBQUM7SUFDckcsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFRO1FBQ2xCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDeEMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUM7UUFFOUIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztRQUNoQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RSxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRXBGLElBQUksQ0FBQyxlQUFlLEtBQUssU0FBUyxDQUFDLElBQUksZUFBZSxLQUFLLG1CQUFtQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN4SCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckUsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWixLQUFLLEVBQUUsU0FBUztnQkFDaEIsRUFBRSxFQUFFLGdCQUFnQjtnQkFDcEIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLEtBQUssRUFBRSxjQUFjO2dCQUNyQixHQUFHLEVBQUUsR0FBRyxFQUFFO29CQUNULE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDdkMsQ0FBQzthQUNELENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzNDLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFFakcsSUFBSSxPQUFPLElBQUksaUJBQWlCLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWixLQUFLLEVBQUUsU0FBUztvQkFDaEIsRUFBRSxFQUFFLFlBQVk7b0JBQ2hCLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQztvQkFDckQsT0FBTyxFQUFFLGlCQUFpQjtvQkFDMUIsS0FBSyxFQUFFLGlCQUFpQjtvQkFDeEIsR0FBRyxFQUFFLEdBQUcsRUFBRTt3QkFDVCxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQztvQkFDbEUsQ0FBQztpQkFDRCxDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hGLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDWixLQUFLLEVBQUUsU0FBUztZQUNoQixPQUFPLEVBQUUsSUFBSTtZQUNiLEVBQUUsRUFBRSxnQkFBZ0I7WUFDcEIsT0FBTyxFQUFFLHFCQUFxQjtZQUM5QixLQUFLLEVBQUUscUJBQXFCO1lBQzVCLEdBQUcsRUFBRSxHQUFHLEVBQUU7Z0JBQ1QsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsdUJBQXVCLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDeEYsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDWixLQUFLLEVBQUUsU0FBUztZQUNoQixPQUFPLEVBQUUsSUFBSTtZQUNiLEVBQUUsRUFBRSxlQUFlO1lBQ25CLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQztZQUN6RCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUM7WUFDdkQsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzdDLENBQUM7U0FDRCxDQUFDLENBQUM7UUFFSCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRU8sZUFBZSxDQUFDLEdBQVEsRUFBRSxDQUFTLEVBQUUsQ0FBUztRQUNyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQztZQUN4QyxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMzQixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztZQUN6QixpQkFBaUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUM3QixPQUFPLElBQUksY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM1RCxDQUFDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBUSxFQUFFLENBQVMsRUFBRSxDQUFTO1FBQ2pELElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFTeEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBaUUsMkJBQTJCLEVBQUU7Z0JBQzlILFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUzthQUN4QixDQUFDLENBQUM7WUFDSCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF2U1kscUJBQXFCO0lBUy9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxpQkFBaUIsQ0FBQTtHQWJQLHFCQUFxQixDQXVTakMifQ==