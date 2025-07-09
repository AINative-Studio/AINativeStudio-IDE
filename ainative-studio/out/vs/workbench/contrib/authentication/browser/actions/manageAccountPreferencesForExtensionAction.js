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
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationUsageService } from '../../../../services/authentication/browser/authenticationUsageService.js';
import { IAuthenticationExtensionsService, IAuthenticationService, INTERNAL_AUTH_PROVIDER_PREFIX } from '../../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export class ManageAccountPreferencesForExtensionAction extends Action2 {
    constructor() {
        super({
            id: '_manageAccountPreferencesForExtension',
            title: localize2('manageAccountPreferenceForExtension', "Manage Extension Account Preferences"),
            category: localize2('accounts', "Accounts"),
            f1: false
        });
    }
    run(accessor, extensionId, providerId) {
        return accessor.get(IInstantiationService).createInstance(ManageAccountPreferenceForExtensionActionImpl).run(extensionId, providerId);
    }
}
let ManageAccountPreferenceForExtensionActionImpl = class ManageAccountPreferenceForExtensionActionImpl {
    constructor(_authenticationService, _quickInputService, _dialogService, _authenticationUsageService, _authenticationExtensionsService, _extensionService, _logService) {
        this._authenticationService = _authenticationService;
        this._quickInputService = _quickInputService;
        this._dialogService = _dialogService;
        this._authenticationUsageService = _authenticationUsageService;
        this._authenticationExtensionsService = _authenticationExtensionsService;
        this._extensionService = _extensionService;
        this._logService = _logService;
    }
    async run(extensionId, providerId) {
        if (!extensionId) {
            return;
        }
        const extension = await this._extensionService.getExtension(extensionId);
        if (!extension) {
            throw new Error(`No extension with id ${extensionId}`);
        }
        const providerIds = new Array();
        const providerIdToAccounts = new Map();
        if (providerId) {
            providerIds.push(providerId);
            providerIdToAccounts.set(providerId, await this._authenticationService.getAccounts(providerId));
        }
        else {
            for (const providerId of this._authenticationService.getProviderIds()) {
                if (providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
                    // Don't show internal providers
                    continue;
                }
                const accounts = await this._authenticationService.getAccounts(providerId);
                for (const account of accounts) {
                    const usage = this._authenticationUsageService.readAccountUsages(providerId, account.label).find(u => ExtensionIdentifier.equals(u.extensionId, extensionId));
                    if (usage) {
                        providerIds.push(providerId);
                        providerIdToAccounts.set(providerId, accounts);
                        break;
                    }
                }
            }
        }
        let chosenProviderId = providerIds[0];
        if (providerIds.length > 1) {
            const result = await this._quickInputService.pick(providerIds.map(providerId => ({
                label: this._authenticationService.getProvider(providerId).label,
                id: providerId,
            })), {
                placeHolder: localize('selectProvider', "Select an authentication provider to manage account preferences for"),
                title: localize('pickAProviderTitle', "Manage Extension Account Preferences")
            });
            chosenProviderId = result?.id;
        }
        if (!chosenProviderId) {
            await this._dialogService.info(localize('noAccountUsage', "This extension has not used any accounts yet."));
            return;
        }
        const currentAccountNamePreference = this._authenticationExtensionsService.getAccountPreference(extensionId, chosenProviderId);
        const accounts = providerIdToAccounts.get(chosenProviderId);
        const items = this._getItems(accounts, chosenProviderId, currentAccountNamePreference);
        // If the provider supports multiple accounts, add an option to use a new account
        const provider = this._authenticationService.getProvider(chosenProviderId);
        if (provider.supportsMultipleAccounts) {
            // Get the last used scopes for the last used account. This will be used to pre-fill the scopes when adding a new account.
            // If there's no scopes, then don't add this option.
            const lastUsedScopes = accounts
                .flatMap(account => this._authenticationUsageService.readAccountUsages(chosenProviderId, account.label).find(u => ExtensionIdentifier.equals(u.extensionId, extensionId)))
                .filter((usage) => !!usage)
                .sort((a, b) => b.lastUsed - a.lastUsed)?.[0]?.scopes;
            if (lastUsedScopes) {
                items.push({ type: 'separator' });
                items.push({
                    providerId: chosenProviderId,
                    scopes: lastUsedScopes,
                    label: localize('use new account', "Use a new account..."),
                });
            }
        }
        const disposables = new DisposableStore();
        const picker = this._createQuickPick(disposables, extensionId, extension.displayName ?? extension.name, provider.label);
        if (items.length === 0) {
            // We would only get here if we went through the Command Palette
            disposables.add(this._handleNoAccounts(picker));
            return;
        }
        picker.items = items;
        picker.show();
    }
    _createQuickPick(disposableStore, extensionId, extensionLabel, providerLabel) {
        const picker = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        disposableStore.add(picker.onDidHide(() => {
            disposableStore.dispose();
        }));
        picker.placeholder = localize('placeholder v2', "Manage '{0}' account preferences for {1}...", extensionLabel, providerLabel);
        picker.title = localize('title', "'{0}' Account Preferences For This Workspace", extensionLabel);
        picker.sortByLabel = false;
        disposableStore.add(picker.onDidAccept(async () => {
            picker.hide();
            await this._accept(extensionId, picker.selectedItems);
        }));
        return picker;
    }
    _getItems(accounts, providerId, currentAccountNamePreference) {
        return accounts.map(a => currentAccountNamePreference === a.label
            ? {
                label: a.label,
                account: a,
                providerId,
                description: localize('currentAccount', "Current account"),
                picked: true
            }
            : {
                label: a.label,
                account: a,
                providerId,
            });
    }
    _handleNoAccounts(picker) {
        picker.validationMessage = localize('noAccounts', "No accounts are currently used by this extension.");
        picker.buttons = [this._quickInputService.backButton];
        picker.show();
        return Event.filter(picker.onDidTriggerButton, (e) => e === this._quickInputService.backButton)(() => this.run());
    }
    async _accept(extensionId, selectedItems) {
        for (const item of selectedItems) {
            let account;
            if (!item.account) {
                try {
                    const session = await this._authenticationService.createSession(item.providerId, item.scopes);
                    account = session.account;
                }
                catch (e) {
                    this._logService.error(e);
                    continue;
                }
            }
            else {
                account = item.account;
            }
            const providerId = item.providerId;
            const currentAccountName = this._authenticationExtensionsService.getAccountPreference(extensionId, providerId);
            if (currentAccountName === account.label) {
                // This account is already the preferred account
                continue;
            }
            this._authenticationExtensionsService.updateAccountPreference(extensionId, providerId, account);
        }
    }
};
ManageAccountPreferenceForExtensionActionImpl = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IQuickInputService),
    __param(2, IDialogService),
    __param(3, IAuthenticationUsageService),
    __param(4, IAuthenticationExtensionsService),
    __param(5, IExtensionService),
    __param(6, ILogService)
], ManageAccountPreferenceForExtensionActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlQWNjb3VudFByZWZlcmVuY2VzRm9yRXh0ZW5zaW9uQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2F1dGhlbnRpY2F0aW9uL2Jyb3dzZXIvYWN0aW9ucy9tYW5hZ2VBY2NvdW50UHJlZmVyZW5jZXNGb3JFeHRlbnNpb25BY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQThDLE1BQU0seURBQXlELENBQUM7QUFDekksT0FBTyxFQUFpQiwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3ZJLE9BQU8sRUFBZ0MsZ0NBQWdDLEVBQUUsc0JBQXNCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNyTSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV6RixNQUFNLE9BQU8sMENBQTJDLFNBQVEs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