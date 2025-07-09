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
var IntegrityService_1;
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { URI } from '../../../../base/common/uri.js';
import { IIntegrityService } from '../common/integrity.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INotificationService, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IChecksumService } from '../../../../platform/checksum/common/checksumService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
class IntegrityStorage {
    static { this.KEY = 'integrityService'; }
    constructor(storageService) {
        this.storageService = storageService;
        this.value = this._read();
    }
    _read() {
        const jsonValue = this.storageService.get(IntegrityStorage.KEY, -1 /* StorageScope.APPLICATION */);
        if (!jsonValue) {
            return null;
        }
        try {
            return JSON.parse(jsonValue);
        }
        catch (err) {
            return null;
        }
    }
    get() {
        return this.value;
    }
    set(data) {
        this.value = data;
        this.storageService.store(IntegrityStorage.KEY, JSON.stringify(this.value), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
}
let IntegrityService = IntegrityService_1 = class IntegrityService {
    isPure() { return this.isPurePromise; }
    constructor(notificationService, storageService, lifecycleService, openerService, productService, checksumService, logService) {
        this.notificationService = notificationService;
        this.lifecycleService = lifecycleService;
        this.openerService = openerService;
        this.productService = productService;
        this.checksumService = checksumService;
        this.logService = logService;
        this.storage = new IntegrityStorage(storageService);
        this.isPurePromise = this._isPure();
        this._compute();
    }
    async _compute() {
        const { isPure } = await this.isPure();
        if (isPure) {
            return; // all is good
        }
        this.logService.warn(`

----------------------------------------------
***	Installation has been modified on disk ***
----------------------------------------------

`);
        const storedData = this.storage.get();
        if (storedData?.dontShowPrompt && storedData.commit === this.productService.commit) {
            return; // Do not prompt
        }
        this._showNotification();
    }
    async _isPure() {
        const expectedChecksums = this.productService.checksums || {};
        await this.lifecycleService.when(4 /* LifecyclePhase.Eventually */);
        const allResults = await Promise.all(Object.keys(expectedChecksums).map(filename => this._resolve(filename, expectedChecksums[filename])));
        let isPure = true;
        for (let i = 0, len = allResults.length; i < len; i++) {
            if (!allResults[i].isPure) {
                isPure = false;
                break;
            }
        }
        return {
            isPure,
            proof: allResults
        };
    }
    async _resolve(filename, expected) {
        const fileUri = FileAccess.asFileUri(filename);
        try {
            const checksum = await this.checksumService.checksum(fileUri);
            return IntegrityService_1._createChecksumPair(fileUri, checksum, expected);
        }
        catch (error) {
            return IntegrityService_1._createChecksumPair(fileUri, '', expected);
        }
    }
    static _createChecksumPair(uri, actual, expected) {
        return {
            uri: uri,
            actual: actual,
            expected: expected,
            isPure: (actual === expected)
        };
    }
    _showNotification() {
        const checksumFailMoreInfoUrl = this.productService.checksumFailMoreInfoUrl;
        const message = localize('integrity.prompt', "Your {0} installation appears to be corrupt. Please reinstall.", this.productService.nameShort);
        if (checksumFailMoreInfoUrl) {
            this.notificationService.prompt(Severity.Warning, message, [
                {
                    label: localize('integrity.moreInformation', "More Information"),
                    run: () => this.openerService.open(URI.parse(checksumFailMoreInfoUrl))
                },
                {
                    label: localize('integrity.dontShowAgain', "Don't Show Again"),
                    isSecondary: true,
                    run: () => this.storage.set({ dontShowPrompt: true, commit: this.productService.commit })
                }
            ], {
                sticky: true,
                priority: NotificationPriority.URGENT
            });
        }
        else {
            this.notificationService.notify({
                severity: Severity.Warning,
                message,
                sticky: true,
                priority: NotificationPriority.URGENT
            });
        }
    }
};
IntegrityService = IntegrityService_1 = __decorate([
    __param(0, INotificationService),
    __param(1, IStorageService),
    __param(2, ILifecycleService),
    __param(3, IOpenerService),
    __param(4, IProductService),
    __param(5, IChecksumService),
    __param(6, ILogService)
], IntegrityService);
export { IntegrityService };
registerSingleton(IIntegrityService, IntegrityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyaXR5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvaW50ZWdyaXR5L2VsZWN0cm9uLXNhbmRib3gvaW50ZWdyaXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQWdCLGlCQUFpQixFQUF1QixNQUFNLHdCQUF3QixDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDdEgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQW1CLE1BQU0sb0NBQW9DLENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBT3JFLE1BQU0sZ0JBQWdCO2FBRUcsUUFBRyxHQUFHLGtCQUFrQixDQUFDO0lBSWpELFlBQTZCLGNBQStCO1FBQS9CLG1C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