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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwcmVjYXRlZEV4dGVuc2lvbk1pZ3JhdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZXByZWNhdGVkRXh0ZW5zaW9uTWlncmF0b3IvYnJvd3Nlci9kZXByZWNhdGVkRXh0ZW5zaW9uTWlncmF0b3IuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxVQUFVLElBQUksbUJBQW1CLEVBQW1DLE1BQU0sa0NBQWtDLENBQUM7QUFDdEgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFJcEYsSUFBTSx1Q0FBdUMsR0FBN0MsTUFBTSx1Q0FBdUM7SUFDNUMsWUFDd0Isb0JBQTRELEVBQ3RELDBCQUF3RSxFQUNwRixjQUFnRCxFQUMzQyxt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