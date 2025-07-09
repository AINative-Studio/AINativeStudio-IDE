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
import { localize } from '../../../../nls.js';
import { language } from '../../../../base/common/platform.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Severity, INotificationService } from '../../../../platform/notification/common/notification.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { platform } from '../../../../base/common/process.js';
import { RunOnceWorker } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
class LanguageSurvey extends Disposable {
    constructor(data, storageService, notificationService, telemetryService, languageService, textFileService, openerService, productService) {
        super();
        const SESSION_COUNT_KEY = `${data.surveyId}.sessionCount`;
        const LAST_SESSION_DATE_KEY = `${data.surveyId}.lastSessionDate`;
        const SKIP_VERSION_KEY = `${data.surveyId}.skipVersion`;
        const IS_CANDIDATE_KEY = `${data.surveyId}.isCandidate`;
        const EDITED_LANGUAGE_COUNT_KEY = `${data.surveyId}.editedCount`;
        const EDITED_LANGUAGE_DATE_KEY = `${data.surveyId}.editedDate`;
        const skipVersion = storageService.get(SKIP_VERSION_KEY, -1 /* StorageScope.APPLICATION */, '');
        if (skipVersion) {
            return;
        }
        const date = new Date().toDateString();
        if (storageService.getNumber(EDITED_LANGUAGE_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) < data.editCount) {
            // Process model-save event every 250ms to reduce load
            const onModelsSavedWorker = this._register(new RunOnceWorker(models => {
                models.forEach(m => {
                    if (m.getLanguageId() === data.languageId && date !== storageService.get(EDITED_LANGUAGE_DATE_KEY, -1 /* StorageScope.APPLICATION */)) {
                        const editedCount = storageService.getNumber(EDITED_LANGUAGE_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) + 1;
                        storageService.store(EDITED_LANGUAGE_COUNT_KEY, editedCount, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                        storageService.store(EDITED_LANGUAGE_DATE_KEY, date, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    }
                });
            }, 250));
            this._register(textFileService.files.onDidSave(e => onModelsSavedWorker.work(e.model)));
        }
        const lastSessionDate = storageService.get(LAST_SESSION_DATE_KEY, -1 /* StorageScope.APPLICATION */, new Date(0).toDateString());
        if (date === lastSessionDate) {
            return;
        }
        const sessionCount = storageService.getNumber(SESSION_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) + 1;
        storageService.store(LAST_SESSION_DATE_KEY, date, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        storageService.store(SESSION_COUNT_KEY, sessionCount, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (sessionCount < 9) {
            return;
        }
        if (storageService.getNumber(EDITED_LANGUAGE_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) < data.editCount) {
            return;
        }
        const isCandidate = storageService.getBoolean(IS_CANDIDATE_KEY, -1 /* StorageScope.APPLICATION */, false)
            || Math.random() < data.userProbability;
        storageService.store(IS_CANDIDATE_KEY, isCandidate, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (!isCandidate) {
            storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            return;
        }
        notificationService.prompt(Severity.Info, localize('helpUs', "Help us improve our support for {0}", languageService.getLanguageName(data.languageId) ?? data.languageId), [{
                label: localize('takeShortSurvey', "Take Short Survey"),
                run: () => {
                    telemetryService.publicLog(`${data.surveyId}.survey/takeShortSurvey`);
                    openerService.open(URI.parse(`${data.surveyUrl}?o=${encodeURIComponent(platform)}&v=${encodeURIComponent(productService.version)}&m=${encodeURIComponent(telemetryService.machineId)}`));
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
            }, {
                label: localize('remindLater', "Remind Me Later"),
                run: () => {
                    telemetryService.publicLog(`${data.surveyId}.survey/remindMeLater`);
                    storageService.store(SESSION_COUNT_KEY, sessionCount - 3, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
            }, {
                label: localize('neverAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    telemetryService.publicLog(`${data.surveyId}.survey/dontShowAgain`);
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                }
            }], { sticky: true });
    }
}
let LanguageSurveysContribution = class LanguageSurveysContribution {
    constructor(storageService, notificationService, telemetryService, textFileService, openerService, productService, languageService, extensionService) {
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.textFileService = textFileService;
        this.openerService = openerService;
        this.productService = productService;
        this.languageService = languageService;
        this.extensionService = extensionService;
        this.handleSurveys();
    }
    async handleSurveys() {
        if (!this.productService.surveys) {
            return;
        }
        // Make sure to wait for installed extensions
        // being registered to show notifications
        // properly (https://github.com/microsoft/vscode/issues/121216)
        await this.extensionService.whenInstalledExtensionsRegistered();
        // Handle surveys
        this.productService.surveys
            .filter(surveyData => surveyData.surveyId && surveyData.editCount && surveyData.languageId && surveyData.surveyUrl && surveyData.userProbability)
            .map(surveyData => new LanguageSurvey(surveyData, this.storageService, this.notificationService, this.telemetryService, this.languageService, this.textFileService, this.openerService, this.productService));
    }
};
LanguageSurveysContribution = __decorate([
    __param(0, IStorageService),
    __param(1, INotificationService),
    __param(2, ITelemetryService),
    __param(3, ITextFileService),
    __param(4, IOpenerService),
    __param(5, IProductService),
    __param(6, ILanguageService),
    __param(7, IExtensionService)
], LanguageSurveysContribution);
if (language === 'en') {
    const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
    workbenchRegistry.registerWorkbenchContribution(LanguageSurveysContribution, 3 /* LifecyclePhase.Restored */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdXJ2ZXlzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zdXJ2ZXlzL2Jyb3dzZXIvbGFuZ3VhZ2VTdXJ2ZXlzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBMkQsVUFBVSxJQUFJLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBR3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sZ0RBQWdELENBQUM7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FB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