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
import { AbstractTextFileService } from '../browser/textFileService.js';
import { ITextFileService } from '../common/textfiles.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IUntitledTextEditorService } from '../../untitled/common/untitledTextEditorService.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IPathService } from '../../path/common/pathService.js';
import { IWorkingCopyFileService } from '../../workingCopy/common/workingCopyFileService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IElevatedFileService } from '../../files/common/elevatedFileService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Promises } from '../../../../base/common/async.js';
import { IDecorationsService } from '../../decorations/common/decorations.js';
let NativeTextFileService = class NativeTextFileService extends AbstractTextFileService {
    constructor(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, elevatedFileService, logService, decorationsService) {
        super(fileService, untitledTextEditorService, lifecycleService, instantiationService, modelService, environmentService, dialogService, fileDialogService, textResourceConfigurationService, filesConfigurationService, codeEditorService, pathService, workingCopyFileService, uriIdentityService, languageService, logService, elevatedFileService, decorationsService);
        this.environmentService = environmentService;
        this.registerListeners();
    }
    registerListeners() {
        // Lifecycle
        this._register(this.lifecycleService.onWillShutdown(event => event.join(this.onWillShutdown(), { id: 'join.textFiles', label: localize('join.textFiles', "Saving text files") })));
    }
    async onWillShutdown() {
        let modelsPendingToSave;
        // As long as models are pending to be saved, we prolong the shutdown
        // until that has happened to ensure we are not shutting down in the
        // middle of writing to the file
        // (https://github.com/microsoft/vscode/issues/116600)
        while ((modelsPendingToSave = this.files.models.filter(model => model.hasState(2 /* TextFileEditorModelState.PENDING_SAVE */))).length > 0) {
            await Promises.settled(modelsPendingToSave.map(model => model.joinState(2 /* TextFileEditorModelState.PENDING_SAVE */)));
        }
    }
    async read(resource, options) {
        // ensure platform limits are applied
        options = this.ensureLimits(options);
        return super.read(resource, options);
    }
    async readStream(resource, options) {
        // ensure platform limits are applied
        options = this.ensureLimits(options);
        return super.readStream(resource, options);
    }
    ensureLimits(options) {
        let ensuredOptions;
        if (!options) {
            ensuredOptions = Object.create(null);
        }
        else {
            ensuredOptions = options;
        }
        let ensuredLimits;
        if (!ensuredOptions.limits) {
            ensuredLimits = Object.create(null);
            ensuredOptions = {
                ...ensuredOptions,
                limits: ensuredLimits
            };
        }
        else {
            ensuredLimits = ensuredOptions.limits;
        }
        return ensuredOptions;
    }
};
NativeTextFileService = __decorate([
    __param(0, IFileService),
    __param(1, IUntitledTextEditorService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, INativeWorkbenchEnvironmentService),
    __param(6, IDialogService),
    __param(7, IFileDialogService),
    __param(8, ITextResourceConfigurationService),
    __param(9, IFilesConfigurationService),
    __param(10, ICodeEditorService),
    __param(11, IPathService),
    __param(12, IWorkingCopyFileService),
    __param(13, IUriIdentityService),
    __param(14, ILanguageService),
    __param(15, IElevatedFileService),
    __param(16, ILogService),
    __param(17, IDecorationsService)
], NativeTextFileService);
export { NativeTextFileService };
registerSingleton(ITextFileService, NativeTextFileService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlVGV4dEZpbGVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZVRleHRGaWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFrSCxNQUFNLHdCQUF3QixDQUFDO0FBQzFLLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUUvRyxPQUFPLEVBQUUsWUFBWSxFQUFtQixNQUFNLDRDQUE0QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNqSSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FB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