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
import { distinct } from '../../../base/common/arrays.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IIgnoredExtensionsManagementService = createDecorator('IIgnoredExtensionsManagementService');
let IgnoredExtensionsManagementService = class IgnoredExtensionsManagementService {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    hasToNeverSyncExtension(extensionId) {
        const configuredIgnoredExtensions = this.getConfiguredIgnoredExtensions();
        return configuredIgnoredExtensions.includes(extensionId.toLowerCase());
    }
    hasToAlwaysSyncExtension(extensionId) {
        const configuredIgnoredExtensions = this.getConfiguredIgnoredExtensions();
        return configuredIgnoredExtensions.includes(`-${extensionId.toLowerCase()}`);
    }
    updateIgnoredExtensions(ignoredExtensionId, ignore) {
        // first remove the extension completely from ignored extensions
        let currentValue = [...this.configurationService.getValue('settingsSync.ignoredExtensions')].map(id => id.toLowerCase());
        currentValue = currentValue.filter(v => v !== ignoredExtensionId && v !== `-${ignoredExtensionId}`);
        // Add only if ignored
        if (ignore) {
            currentValue.push(ignoredExtensionId.toLowerCase());
        }
        return this.configurationService.updateValue('settingsSync.ignoredExtensions', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
    }
    updateSynchronizedExtensions(extensionId, sync) {
        // first remove the extension completely from ignored extensions
        let currentValue = [...this.configurationService.getValue('settingsSync.ignoredExtensions')].map(id => id.toLowerCase());
        currentValue = currentValue.filter(v => v !== extensionId && v !== `-${extensionId}`);
        // Add only if synced
        if (sync) {
            currentValue.push(`-${extensionId.toLowerCase()}`);
        }
        return this.configurationService.updateValue('settingsSync.ignoredExtensions', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
    }
    getIgnoredExtensions(installed) {
        const defaultIgnoredExtensions = installed.filter(i => i.isMachineScoped).map(i => i.identifier.id.toLowerCase());
        const value = this.getConfiguredIgnoredExtensions().map(id => id.toLowerCase());
        const added = [], removed = [];
        if (Array.isArray(value)) {
            for (const key of value) {
                if (key.startsWith('-')) {
                    removed.push(key.substring(1));
                }
                else {
                    added.push(key);
                }
            }
        }
        return distinct([...defaultIgnoredExtensions, ...added,].filter(setting => !removed.includes(setting)));
    }
    getConfiguredIgnoredExtensions() {
        return (this.configurationService.getValue('settingsSync.ignoredExtensions') || []).map(id => id.toLowerCase());
    }
};
IgnoredExtensionsManagementService = __decorate([
    __param(0, IConfigurationService)
], IgnoredExtensionsManagementService);
export { IgnoredExtensionsManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlZEV4dGVuc2lvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9pZ25vcmVkRXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXpHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxlQUFlLENBQXNDLHFDQUFxQyxDQUFDLENBQUM7QUFZeEksSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBa0M7SUFJOUMsWUFDeUMsb0JBQTJDO1FBQTNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFFcEYsQ0FBQztJQUVELHVCQUF1QixDQUFDLFdBQW1CO1FBQzFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFDMUUsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVELHdCQUF3QixDQUFDLFdBQW1CO1FBQzNDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFDMUUsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlFLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxrQkFBMEIsRUFBRSxNQUFlO1FBQ2xFLGdFQUFnRTtRQUNoRSxJQUFJLFlBQVksR0FBRyxD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