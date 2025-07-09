/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { TextModel } from '../../common/model/textModel.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ILanguageService } from '../../common/languages/language.js';
import { LanguageService } from '../../common/services/languageService.js';
import { ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { TestLanguageConfigurationService } from './modes/testLanguageConfigurationService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { TestTextResourcePropertiesService } from './services/testTextResourcePropertiesService.js';
import { IModelService } from '../../common/services/model.js';
import { ModelService } from '../../common/services/modelService.js';
import { createServices } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../common/languages/modesRegistry.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../common/services/languageFeaturesService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { mock } from '../../../base/test/common/mock.js';
import { ITreeSitterParserService } from '../../common/services/treeSitterParserService.js';
import { TestTreeSitterParserService } from './services/testTreeSitterService.js';
class TestTextModel extends TextModel {
    registerDisposable(disposable) {
        this._register(disposable);
    }
}
export function withEditorModel(text, callback) {
    const model = createTextModel(text.join('\n'));
    callback(model);
    model.dispose();
}
function resolveOptions(_options) {
    const defaultOptions = TextModel.DEFAULT_CREATION_OPTIONS;
    return {
        tabSize: (typeof _options.tabSize === 'undefined' ? defaultOptions.tabSize : _options.tabSize),
        indentSize: (typeof _options.indentSize === 'undefined' ? defaultOptions.indentSize : _options.indentSize),
        insertSpaces: (typeof _options.insertSpaces === 'undefined' ? defaultOptions.insertSpaces : _options.insertSpaces),
        detectIndentation: (typeof _options.detectIndentation === 'undefined' ? defaultOptions.detectIndentation : _options.detectIndentation),
        trimAutoWhitespace: (typeof _options.trimAutoWhitespace === 'undefined' ? defaultOptions.trimAutoWhitespace : _options.trimAutoWhitespace),
        defaultEOL: (typeof _options.defaultEOL === 'undefined' ? defaultOptions.defaultEOL : _options.defaultEOL),
        isForSimpleWidget: (typeof _options.isForSimpleWidget === 'undefined' ? defaultOptions.isForSimpleWidget : _options.isForSimpleWidget),
        largeFileOptimizations: (typeof _options.largeFileOptimizations === 'undefined' ? defaultOptions.largeFileOptimizations : _options.largeFileOptimizations),
        bracketPairColorizationOptions: (typeof _options.bracketColorizationOptions === 'undefined' ? defaultOptions.bracketPairColorizationOptions : _options.bracketColorizationOptions),
    };
}
export function createTextModel(text, languageId = null, options = TextModel.DEFAULT_CREATION_OPTIONS, uri = null) {
    const disposables = new DisposableStore();
    const instantiationService = createModelServices(disposables);
    const model = instantiateTextModel(instantiationService, text, languageId, options, uri);
    model.registerDisposable(disposables);
    return model;
}
export function instantiateTextModel(instantiationService, text, languageId = null, _options = TextModel.DEFAULT_CREATION_OPTIONS, uri = null) {
    const options = resolveOptions(_options);
    return instantiationService.createInstance(TestTextModel, text, languageId || PLAINTEXT_LANGUAGE_ID, options, uri);
}
export function createModelServices(disposables, services = []) {
    return createServices(disposables, services.concat([
        [INotificationService, TestNotificationService],
        [IDialogService, TestDialogService],
        [IUndoRedoService, UndoRedoService],
        [ILanguageService, LanguageService],
        [ILanguageConfigurationService, TestLanguageConfigurationService],
        [IConfigurationService, TestConfigurationService],
        [ITextResourcePropertiesService, TestTextResourcePropertiesService],
        [IThemeService, TestThemeService],
        [ILogService, NullLogService],
        [IEnvironmentService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.isBuilt = true;
                    this.isExtensionDevelopment = false;
                }
            }],
        [ILanguageFeatureDebounceService, LanguageFeatureDebounceService],
        [ILanguageFeaturesService, LanguageFeaturesService],
        [IModelService, ModelService],
        [ITreeSitterParserService, TestTreeSitterParserService]
    ]));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vdGVzdFRleHRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFHakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzVELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdC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