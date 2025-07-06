/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { parseSavedSearchEditor, parseSerializedSearchEditor } from './searchEditorSerialization.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { SearchEditorWorkingCopyTypeId } from './constants.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { createTextBufferFactoryFromStream } from '../../../../editor/common/model/textModel.js';
import { Emitter } from '../../../../base/common/event.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { SEARCH_RESULT_LANGUAGE_ID } from '../../../services/search/common/search.js';
export class SearchConfigurationModel {
    constructor(config) {
        this.config = config;
        this._onConfigDidUpdate = new Emitter();
        this.onConfigDidUpdate = this._onConfigDidUpdate.event;
    }
    updateConfig(config) { this.config = config; this._onConfigDidUpdate.fire(config); }
}
export class SearchEditorModel {
    constructor(resource) {
        this.resource = resource;
    }
    async resolve() {
        return assertIsDefined(searchEditorModelFactory.models.get(this.resource)).resolve();
    }
}
class SearchEditorModelFactory {
    constructor() {
        this.models = new ResourceMap();
    }
    initializeModelFromExistingModel(accessor, resource, config) {
        if (this.models.has(resource)) {
            throw Error('Unable to contruct model for resource that already exists');
        }
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        let ongoingResolve;
        this.models.set(resource, {
            resolve: () => {
                if (!ongoingResolve) {
                    ongoingResolve = (async () => {
                        const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
                        if (backup) {
                            return backup;
                        }
                        return Promise.resolve({
                            resultsModel: modelService.getModel(resource) ?? modelService.createModel('', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                            configurationModel: new SearchConfigurationModel(config)
                        });
                    })();
                }
                return ongoingResolve;
            }
        });
    }
    initializeModelFromRawData(accessor, resource, config, contents) {
        if (this.models.has(resource)) {
            throw Error('Unable to contruct model for resource that already exists');
        }
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        let ongoingResolve;
        this.models.set(resource, {
            resolve: () => {
                if (!ongoingResolve) {
                    ongoingResolve = (async () => {
                        const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
                        if (backup) {
                            return backup;
                        }
                        return Promise.resolve({
                            resultsModel: modelService.createModel(contents ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                            configurationModel: new SearchConfigurationModel(config)
                        });
                    })();
                }
                return ongoingResolve;
            }
        });
    }
    initializeModelFromExistingFile(accessor, resource, existingFile) {
        if (this.models.has(resource)) {
            throw Error('Unable to contruct model for resource that already exists');
        }
        const languageService = accessor.get(ILanguageService);
        const modelService = accessor.get(IModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const workingCopyBackupService = accessor.get(IWorkingCopyBackupService);
        let ongoingResolve;
        this.models.set(resource, {
            resolve: async () => {
                if (!ongoingResolve) {
                    ongoingResolve = (async () => {
                        const backup = await this.tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService);
                        if (backup) {
                            return backup;
                        }
                        const { text, config } = await instantiationService.invokeFunction(parseSavedSearchEditor, existingFile);
                        return ({
                            resultsModel: modelService.createModel(text ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                            configurationModel: new SearchConfigurationModel(config)
                        });
                    })();
                }
                return ongoingResolve;
            }
        });
    }
    async tryFetchModelFromBackupService(resource, languageService, modelService, workingCopyBackupService, instantiationService) {
        const backup = await workingCopyBackupService.resolve({ resource, typeId: SearchEditorWorkingCopyTypeId });
        let model = modelService.getModel(resource);
        if (!model && backup) {
            const factory = await createTextBufferFactoryFromStream(backup.value);
            model = modelService.createModel(factory, languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource);
        }
        if (model) {
            const existingFile = model.getValue();
            const { text, config } = parseSerializedSearchEditor(existingFile);
            modelService.destroyModel(resource);
            return ({
                resultsModel: modelService.createModel(text ?? '', languageService.createById(SEARCH_RESULT_LANGUAGE_ID), resource),
                configurationModel: new SearchConfigurationModel(config)
            });
        }
        else {
            return undefined;
        }
    }
}
export const searchEditorModelFactory = new SearchEditorModelFactory();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2hFZGl0b3IvYnJvd3Nlci9zZWFyY2hFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLDREQUE0RCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3RHLE9BQU8sRUFBdUIsNkJBQTZCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUl0RixNQUFNLE9BQU8sd0JBQXdCO0lBSXBDLFlBQW1CLE1BQXFDO1FBQXJDLFdBQU0sR0FBTixNQUFNLENBQStCO1FBSGhELHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFDO1FBQ2hELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7SUFFTixD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