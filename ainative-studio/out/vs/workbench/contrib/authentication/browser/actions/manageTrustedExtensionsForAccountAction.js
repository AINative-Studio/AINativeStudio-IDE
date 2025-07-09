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
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow } from '../../../../../base/common/date.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationAccessService } from '../../../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../../../services/authentication/browser/authenticationUsageService.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export class ManageTrustedExtensionsForAccountAction extends Action2 {
    constructor() {
        super({
            id: '_manageTrustedExtensionsForAccount',
            title: localize2('manageTrustedExtensionsForAccount', "Manage Trusted Extensions For Account"),
            category: localize2('accounts', "Accounts"),
            f1: true
        });
    }
    run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService.createInstance(ManageTrustedExtensionsForAccountActionImpl).run(options);
    }
}
let ManageTrustedExtensionsForAccountActionImpl = class ManageTrustedExtensionsForAccountActionImpl {
    constructor(_productService, _extensionService, _dialogService, _quickInputService, _authenticationService, _authenticationUsageService, _authenticationAccessService, _commandService) {
        this._productService = _productService;
        this._extensionService = _extensionService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._authenticationService = _authenticationService;
        this._authenticationUsageService = _authenticationUsageService;
        this._authenticationAccessService = _authenticationAccessService;
        this._commandService = _commandService;
    }
    async run(options) {
        const { providerId, accountLabel } = await this._resolveProviderAndAccountLabel(options?.providerId, options?.accountLabel);
        if (!providerId || !accountLabel) {
            return;
        }
        const items = await this._getItems(providerId, accountLabel);
        if (!items.length) {
            return;
        }
        const disposables = new DisposableStore();
        const picker = this._createQuickPick(disposables, providerId, accountLabel);
        picker.items = items;
        picker.selectedItems = items.filter((i) => i.type !== 'separator' && !!i.picked);
        picker.show();
    }
    async _resolveProviderAndAccountLabel(providerId, accountLabel) {
        if (!providerId || !accountLabel) {
            const accounts = new Array();
            for (const id of this._authenticationService.getProviderIds()) {
                const providerLabel = this._authenticationService.getProvider(id).label;
                const sessions = await this._authenticationService.getSessions(id);
                const uniqueAccountLabels = new Set();
                for (const session of sessions) {
                    if (!uniqueAccountLabels.has(session.account.label)) {
                        uniqueAccountLabels.add(session.account.label);
                        accounts.push({ providerId: id, providerLabel, accountLabel: session.account.label });
                    }
                }
            }
            const pick = await this._quickInputService.pick(accounts.map(account => ({
                providerId: account.providerId,
                label: account.accountLabel,
                description: account.providerLabel
            })), {
                placeHolder: localize('pickAccount', "Pick an account to manage trusted extensions for"),
                matchOnDescription: true,
            });
            if (pick) {
                providerId = pick.providerId;
                accountLabel = pick.label;
            }
            else {
                return { providerId: undefined, accountLabel: undefined };
            }
        }
        return { providerId, accountLabel };
    }
    async _getItems(providerId, accountLabel) {
        let allowedExtensions = this._authenticationAccessService.readAllowedExtensions(providerId, accountLabel);
        // only include extensions that are installed
        const resolvedExtensions = await Promise.all(allowedExtensions.map(ext => this._extensionService.getExtension(ext.id)));
        allowedExtensions = resolvedExtensions
            .map((ext, i) => ext ? allowedExtensions[i] : undefined)
            .filter(ext => !!ext);
        const trustedExtensionAuthAccess = this._productService.trustedExtensionAuthAccess;
        const trustedExtensionIds = 
        // Case 1: trustedExtensionAuthAccess is an array
        Array.isArray(trustedExtensionAuthAccess)
            ? trustedExtensionAuthAccess
            // Case 2: trustedExtensionAuthAccess is an object
            : typeof trustedExtensionAuthAccess === 'object'
                ? trustedExtensionAuthAccess[providerId] ?? []
                : [];
        for (const extensionId of trustedExtensionIds) {
            const allowedExtension = allowedExtensions.find(ext => ext.id === extensionId);
            if (!allowedExtension) {
                // Add the extension to the allowedExtensions list
                const extension = await this._extensionService.getExtension(extensionId);
                if (extension) {
                    allowedExtensions.push({
                        id: extensionId,
                        name: extension.displayName || extension.name,
                        allowed: true,
                        trusted: true
                    });
                }
            }
            else {
                // Update the extension to be allowed
                allowedExtension.allowed = true;
                allowedExtension.trusted = true;
            }
        }
        if (!allowedExtensions.length) {
            this._dialogService.info(localize('noTrustedExtensions', "This account has not been used by any extensions."));
            return [];
        }
        const usages = this._authenticationUsageService.readAccountUsages(providerId, accountLabel);
        const trustedExtensions = [];
        const otherExtensions = [];
        for (const extension of allowedExtensions) {
            const usage = usages.find(usage => extension.id === usage.extensionId);
            extension.lastUsed = usage?.lastUsed;
            if (extension.trusted) {
                trustedExtensions.push(extension);
            }
            else {
                otherExtensions.push(extension);
            }
        }
        const sortByLastUsed = (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0);
        const items = [
            ...otherExtensions.sort(sortByLastUsed).map(this._toQuickPickItem),
            { type: 'separator', label: localize('trustedExtensions', "Trusted by Microsoft") },
            ...trustedExtensions.sort(sortByLastUsed).map(this._toQuickPickItem)
        ];
        return items;
    }
    _toQuickPickItem(extension) {
        const lastUsed = extension.lastUsed;
        const description = lastUsed
            ? localize({ key: 'accountLastUsedDate', comment: ['The placeholder {0} is a string with time information, such as "3 days ago"'] }, "Last used this account {0}", fromNow(lastUsed, true))
            : localize('notUsed', "Has not used this account");
        let tooltip;
        let disabled;
        if (extension.trusted) {
            tooltip = localize('trustedExtensionTooltip', "This extension is trusted by Microsoft and\nalways has access to this account");
            disabled = true;
        }
        return {
            label: extension.name,
            extension,
            description,
            tooltip,
            disabled,
            buttons: [{
                    tooltip: localize('accountPreferences', "Manage account preferences for this extension"),
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                }],
            picked: extension.allowed === undefined || extension.allowed
        };
    }
    _createQuickPick(disposableStore, providerId, accountLabel) {
        const quickPick = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        quickPick.canSelectMany = true;
        quickPick.customButton = true;
        quickPick.customLabel = localize('manageTrustedExtensions.cancel', 'Cancel');
        quickPick.title = localize('manageTrustedExtensions', "Manage Trusted Extensions");
        quickPick.placeholder = localize('manageExtensions', "Choose which extensions can access this account");
        disposableStore.add(quickPick.onDidAccept(() => {
            const updatedAllowedList = quickPick.items
                .filter((item) => item.type !== 'separator')
                .map(i => i.extension);
            const allowedExtensionsSet = new Set(quickPick.selectedItems.map(i => i.extension));
            updatedAllowedList.forEach(extension => {
                extension.allowed = allowedExtensionsSet.has(extension);
            });
            this._authenticationAccessService.updateAllowedExtensions(providerId, accountLabel, updatedAllowedList);
            quickPick.hide();
        }));
        disposableStore.add(quickPick.onDidHide(() => {
            disposableStore.dispose();
        }));
        disposableStore.add(quickPick.onDidCustom(() => {
            quickPick.hide();
        }));
        disposableStore.add(quickPick.onDidTriggerItemButton(e => this._commandService.executeCommand('_manageAccountPreferencesForExtension', e.item.extension.id, providerId)));
        return quickPick;
    }
};
ManageTrustedExtensionsForAccountActionImpl = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionService),
    __param(2, IDialogService),
    __param(3, IQuickInputService),
    __param(4, IAuthenticationService),
    __param(5, IAuthenticationUsageService),
    __param(6, IAuthenticationAccessService),
    __param(7, ICommandService)
], ManageTrustedExtensionsForAccountActionImpl);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVHJ1c3RlZEV4dGVuc2lvbnNGb3JBY2NvdW50QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2F1dGhlbnRpY2F0aW9uL2Jyb3dzZXIvYWN0aW9ucy9tYW5hZ2VUcnVzdGVkRXh0ZW5zaW9uc0ZvckFjY291bnRBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQXVDLE1BQU0seURBQXlELENBQUM7QUFDbEksT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDMUgsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDeEgsT0FBTyxFQUFvQixzQkFB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