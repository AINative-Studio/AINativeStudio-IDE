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
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { isLinux } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IEncryptionService, isGnome, isKwallet } from '../../../../platform/encryption/common/encryptionService.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { BaseSecretStorageService, ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
let NativeSecretStorageService = class NativeSecretStorageService extends BaseSecretStorageService {
    constructor(_notificationService, _dialogService, _openerService, _jsonEditingService, _environmentService, storageService, encryptionService, logService) {
        super(!!_environmentService.useInMemorySecretStorage, storageService, encryptionService, logService);
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._openerService = _openerService;
        this._jsonEditingService = _jsonEditingService;
        this._environmentService = _environmentService;
        this.notifyOfNoEncryptionOnce = createSingleCallFunction(() => this.notifyOfNoEncryption());
    }
    set(key, value) {
        this._sequencer.queue(key, async () => {
            await this.resolvedStorageService;
            if (this.type !== 'persisted' && !this._environmentService.useInMemorySecretStorage) {
                this._logService.trace('[NativeSecretStorageService] Notifying user that secrets are not being stored on disk.');
                await this.notifyOfNoEncryptionOnce();
            }
        });
        return super.set(key, value);
    }
    async notifyOfNoEncryption() {
        const buttons = [];
        const troubleshootingButton = {
            label: localize('troubleshootingButton', "Open troubleshooting guide"),
            run: () => this._openerService.open('https://go.microsoft.com/fwlink/?linkid=2239490'),
            // doesn't close dialogs
            keepOpen: true
        };
        buttons.push(troubleshootingButton);
        let errorMessage = localize('encryptionNotAvailableJustTroubleshootingGuide', "An OS keyring couldn't be identified for storing the encryption related data in your current desktop environment.");
        if (!isLinux) {
            this._notificationService.prompt(Severity.Error, errorMessage, buttons);
            return;
        }
        const provider = await this._encryptionService.getKeyStorageProvider();
        if (provider === "basic_text" /* KnownStorageProvider.basicText */) {
            const detail = localize('usePlainTextExtraSentence', "Open the troubleshooting guide to address this or you can use weaker encryption that doesn't use the OS keyring.");
            const usePlainTextButton = {
                label: localize('usePlainText', "Use weaker encryption"),
                run: async () => {
                    await this._encryptionService.setUsePlainTextEncryption();
                    await this._jsonEditingService.write(this._environmentService.argvResource, [{ path: ['password-store'], value: "basic" /* PasswordStoreCLIOption.basic */ }], true);
                    this.reinitialize();
                }
            };
            buttons.unshift(usePlainTextButton);
            await this._dialogService.prompt({
                type: 'error',
                buttons,
                message: errorMessage,
                detail
            });
            return;
        }
        if (isGnome(provider)) {
            errorMessage = localize('isGnome', "You're running in a GNOME environment but the OS keyring is not available for encryption. Ensure you have gnome-keyring or another libsecret compatible implementation installed and running.");
        }
        else if (isKwallet(provider)) {
            errorMessage = localize('isKwallet', "You're running in a KDE environment but the OS keyring is not available for encryption. Ensure you have kwallet running.");
        }
        this._notificationService.prompt(Severity.Error, errorMessage, buttons);
    }
};
NativeSecretStorageService = __decorate([
    __param(0, INotificationService),
    __param(1, IDialogService),
    __param(2, IOpenerService),
    __param(3, IJSONEditingService),
    __param(4, INativeEnvironmentService),
    __param(5, IStorageService),
    __param(6, IEncryptionService),
    __param(7, ILogService)
], NativeSecretStorageService);
export { NativeSecretStorageService };
registerSingleton(ISecretStorageService, NativeSecretStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0U3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlY3JldHMvZWxlY3Ryb24tc2FuZGJveC9zZWNyZXRTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQWdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuSyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNuRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBaUIsTUFBTSwwREFBMEQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FB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