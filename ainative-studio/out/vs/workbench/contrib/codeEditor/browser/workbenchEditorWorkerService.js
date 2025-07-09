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
import { WebWorkerDescriptor } from '../../../../base/browser/webWorkerFactory.js';
import { FileAccess } from '../../../../base/common/network.js';
import { EditorWorkerService } from '../../../../editor/browser/services/editorWorkerService.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let WorkbenchEditorWorkerService = class WorkbenchEditorWorkerService extends EditorWorkerService {
    constructor(modelService, configurationService, logService, languageConfigurationService, languageFeaturesService) {
        const workerDescriptor = new WebWorkerDescriptor(FileAccess.asBrowserUri('vs/editor/common/services/editorWebWorkerMain.js'), 'TextEditorWorker');
        super(workerDescriptor, modelService, configurationService, logService, languageConfigurationService, languageFeaturesService);
    }
};
WorkbenchEditorWorkerService = __decorate([
    __param(0, IModelService),
    __param(1, ITextResourceConfigurationService),
    __param(2, ILogService),
    __param(3, ILanguageConfigurationService),
    __param(4, ILanguageFeaturesService)
], WorkbenchEditorWorkerService);
export { WorkbenchEditorWorkerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoRWRpdG9yV29ya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2Jyb3dzZXIvd29ya2JlbmNoRWRpdG9yV29ya2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFDckgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUU5RCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLG1CQUFtQjtJQUNwRSxZQUNnQixZQUEyQixFQUNQLG9CQUF1RCxFQUM3RSxVQUF1QixFQUNMLDRCQUEyRCxFQUNoRSx1QkFBaUQ7UUFFM0UsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsa0RBQWtELENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2xKLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLDRCQUE0QixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDaEksQ0FBQztDQUNELENBQUE7QUFYWSw0QkFBNEI7SUFFdEMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGlDQUFpQyxDQUFBO0lBQ2pDLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSw2QkFBNkIsQ0FBQTtJQUM3QixXQUFBLHdCQUF3QixDQUFBO0dBTmQsNEJBQTRCLENBV3hDIn0=