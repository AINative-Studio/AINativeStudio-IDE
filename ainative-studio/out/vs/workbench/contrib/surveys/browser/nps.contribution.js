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
import * as nls from '../../../../nls.js';
import { language } from '../../../../base/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Severity, INotificationService, NotificationPriority } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { platform } from '../../../../base/common/process.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const PROBABILITY = 0.15;
const SESSION_COUNT_KEY = 'nps/sessionCount';
const LAST_SESSION_DATE_KEY = 'nps/lastSessionDate';
const SKIP_VERSION_KEY = 'nps/skipVersion';
const IS_CANDIDATE_KEY = 'nps/isCandidate';
let NPSContribution = class NPSContribution {
    constructor(storageService, notificationService, telemetryService, openerService, productService, configurationService) {
        if (!productService.npsSurveyUrl || !configurationService.getValue('telemetry.feedback.enabled')) {
            return;
        }
        const skipVersion = storageService.get(SKIP_VERSION_KEY, -1 /* StorageScope.APPLICATION */, '');
        if (skipVersion) {
            return;
        }
        const date = new Date().toDateString();
        const lastSessionDate = storageService.get(LAST_SESSION_DATE_KEY, -1 /* StorageScope.APPLICATION */, new Date(0).toDateString());
        if (date === lastSessionDate) {
            return;
        }
        const sessionCount = (storageService.getNumber(SESSION_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) || 0) + 1;
        storageService.store(LAST_SESSION_DATE_KEY, date, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        storageService.store(SESSION_COUNT_KEY, sessionCount, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (sessionCount < 9) {
            return;
        }
        const isCandidate = storageService.getBoolean(IS_CANDIDATE_KEY, -1 /* StorageScope.APPLICATION */, false)
            || Math.random() < PROBABILITY;
        storageService.store(IS_CANDIDATE_KEY, isCandidate, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (!isCandidate) {
            storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            return;
        }
        notificationService.prompt(Severity.Info, nls.localize('surveyQuestion', "Do you mind taking a quick feedback survey?"), [{
                label: nls.localize('takeSurvey', "Take Survey"),
                run: () => {
                    openerService.open(URI.parse(`${productService.npsSurveyUrl}?o=${encodeURIComponent(platform)}&v=${encodeURIComponent(productService.version)}&m=${encodeURIComponent(telemetryService.machineId)}`));
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
            }, {
                label: nls.localize('remindLater', "Remind Me Later"),
                run: () => storageService.store(SESSION_COUNT_KEY, sessionCount - 3, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */)
            }, {
                label: nls.localize('neverAgain', "Don't Show Again"),
                run: () => {
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
            }], { sticky: true, priority: NotificationPriority.URGENT });
    }
};
NPSContribution = __decorate([
    __param(0, IStorageService),
    __param(1, INotificationService),
    __param(2, ITelemetryService),
    __param(3, IOpenerService),
    __param(4, IProductService),
    __param(5, IConfigurationService)
], NPSContribution);
if (language === 'en') {
    const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
    workbenchRegistry.registerWorkbenchContribution(NPSContribution, 3 /* LifecyclePhase.Restored */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zdXJ2ZXlzL2Jyb3dzZXIvbnBzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQTJELFVBQVUsSUFBSSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlJLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV4RixPQUFPLEVBQUUsUUFBUSxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFbkcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDO0FBQ3pCLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUM7QUFDN0MsTUFBTSxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQztBQUNwRCxN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