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
import { Action } from '../../../../base/common/actions.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
let DeprecatedExtensionMigratorContribution = class DeprecatedExtensionMigratorContribution {
    constructor(configurationService, extensionsWorkbenchService, storageService, notificationService, openerService) {
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.storageKey = 'deprecatedExtensionMigrator.state';
        this.init().catch(onUnexpectedError);
    }
    async init() {
        const bracketPairColorizerId = 'coenraads.bracket-pair-colorizer';
        await this.extensionsWorkbenchService.queryLocal();
        const extension = this.extensionsWorkbenchService.installed.find(e => e.identifier.id === bracketPairColorizerId);
        if (!extension ||
            ((extension.enablementState !== 11 /* EnablementState.EnabledGlobally */) &&
                (extension.enablementState !== 12 /* EnablementState.EnabledWorkspace */))) {
            return;
        }
        const state = await this.getState();
        const disablementLogEntry = state.disablementLog.some(d => d.extensionId === bracketPairColorizerId);
        if (disablementLogEntry) {
            return;
        }
        state.disablementLog.push({ extensionId: bracketPairColorizerId, disablementDateTime: new Date().getTime() });
        await this.setState(state);
        await this.extensionsWorkbenchService.setEnablement(extension, 9 /* EnablementState.DisabledGlobally */);
        const nativeBracketPairColorizationEnabledKey = 'editor.bracketPairColorization.enabled';
        const bracketPairColorizationEnabled = !!this.configurationService.inspect(nativeBracketPairColorizationEnabledKey).user;
        this.notificationService.notify({
            message: localize('bracketPairColorizer.notification', "The extension 'Bracket pair Colorizer' got disabled because it was deprecated."),
            severity: Severity.Info,
            actions: {
                primary: [
                    new Action('', localize('bracketPairColorizer.notification.action.uninstall', "Uninstall Extension"), undefined, undefined, () => {
                        this.extensionsWorkbenchService.uninstall(extension);
                    }),
                ],
                secondary: [
                    !bracketPairColorizationEnabled ? new Action('', localize('bracketPairColorizer.notification.action.enableNative', "Enable Native Bracket Pair Colorization"), undefined, undefined, () => {
                        this.configurationService.updateValue(nativeBracketPairColorizationEnabledKey, true, 2 /* ConfigurationTarget.USER */);
                    }) : undefined,
                    new Action('', localize('bracketPairColorizer.notification.action.showMoreInfo', "More Info"), undefined, undefined, () => {
                        this.openerService.open('https://github.com/microsoft/vscode/issues/155179');
                    }),
                ].filter(isDefined),
            }
        });
    }
    async getState() {
        const jsonStr = await this.storageService.get(this.storageKey, -1 /* StorageScope.APPLICATION */, '');
        if (jsonStr === '') {
            return { disablementLog: [] };
        }
        return JSON.parse(jsonStr);
    }
    async setState(state) {
        const json = JSON.stringify(state);
        await this.storageService.store(this.storageKey, json, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
};
DeprecatedExtensionMigratorContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, IStorageService),
    __param(3, INotificationService),
    __param(4, IOpenerService)
], DeprecatedExtensionMigratorContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DeprecatedExtensionMigratorContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwcmVjYXRlZEV4dGVuc2lvbk1pZ3JhdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlcHJlY2F0ZWRFeHRlbnNpb25NaWdyYXRvci9icm93c2VyL2RlcHJlY2F0ZWRFeHRlbnNpb25NaWdyYXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUlwRixJQUFNLHVDQUF1QyxHQUE3QyxNQUFNLHVDQUF1QztJQUM1QyxZQUN3QixvQkFBNEQsRUFDdEQsMEJBQXdFLEVBQ3BGLGNBQWdELEVBQzNDLG1C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