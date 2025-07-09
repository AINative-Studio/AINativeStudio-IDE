/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { mock } from '../../../base/test/common/mock.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { CodeEditorWidget } from '../../browser/widget/codeEditor/codeEditorWidget.js';
import { ILanguageService } from '../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService } from '../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../common/services/languageFeaturesService.js';
import { LanguageService } from '../../common/services/languageService.js';
import { IModelService } from '../../common/services/model.js';
import { ModelService } from '../../common/services/modelService.js';
import { ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { ITreeSitterParserService } from '../../common/services/treeSitterParserService.js';
import { TestConfiguration } from './config/testConfiguration.js';
import { TestCodeEditorService, TestCommandService } from './editorTestServices.js';
import { TestTreeSitterParserService } from '../common/services/testTreeSitterService.js';
import { TestLanguageConfigurationService } from '../common/modes/testLanguageConfigurationService.js';
import { TestEditorWorkerService } from '../common/services/testEditorWorkerService.js';
import { TestTextResourcePropertiesService } from '../common/services/testTextResourcePropertiesService.js';
import { instantiateTextModel } from '../common/testTextModel.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { TestAccessibilityService } from '../../../platform/accessibility/test/common/testAccessibilityService.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { TestClipboardService } from '../../../platform/clipboard/test/common/testClipboardService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { MockContextKeyService, MockKeybindingService } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { NullOpenerService } from '../../../platform/opener/test/common/nullOpenerService.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryServiceShape } from '../../../platform/telemetry/common/telemetryUtils.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
export class TestCodeEditor extends CodeEditorWidget {
    constructor() {
        super(...arguments);
        this._hasTextFocus = false;
    }
    //#region testing overrides
    _createConfiguration(isSimpleWidget, contextMenuId, options) {
        return new TestConfiguration(options);
    }
    _createView(viewModel) {
        // Never create a view
        return [null, false];
    }
    setHasTextFocus(hasTextFocus) {
        this._hasTextFocus = hasTextFocus;
    }
    hasTextFocus() {
        return this._hasTextFocus;
    }
    //#endregion
    //#region Testing utils
    getViewModel() {
        return this._modelData ? this._modelData.viewModel : undefined;
    }
    registerAndInstantiateContribution(id, ctor) {
        const r = this._instantiationService.createInstance(ctor, this);
        this._contributions.set(id, r);
        return r;
    }
    registerDisposable(disposable) {
        this._register(disposable);
    }
}
class TestEditorDomElement {
    constructor() {
        this.parentElement = null;
        this.ownerDocument = document;
        this.document = document;
    }
    setAttribute(attr, value) { }
    removeAttribute(attr) { }
    hasAttribute(attr) { return false; }
    getAttribute(attr) { return undefined; }
    addEventListener(event) { }
    removeEventListener(event) { }
}
export function withTestCodeEditor(text, options, callback) {
    return _withTestCodeEditor(text, options, callback);
}
export async function withAsyncTestCodeEditor(text, options, callback) {
    return _withTestCodeEditor(text, options, callback);
}
function isTextModel(arg) {
    return Boolean(arg && arg.uri);
}
function _withTestCodeEditor(arg, options, callback) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables, options.serviceCollection);
    delete options.serviceCollection;
    // create a model if necessary
    let model;
    if (isTextModel(arg)) {
        model = arg;
    }
    else {
        model = disposables.add(instantiateTextModel(instantiationService, Array.isArray(arg) ? arg.join('\n') : arg));
    }
    const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, options));
    const viewModel = editor.getViewModel();
    viewModel.setHasFocus(true);
    const result = callback(editor, editor.getViewModel(), instantiationService);
    if (result) {
        return result.then(() => disposables.dispose());
    }
    disposables.dispose();
}
export function createCodeEditorServices(disposables, services = new ServiceCollection()) {
    const serviceIdentifiers = [];
    const define = (id, ctor) => {
        if (!services.has(id)) {
            services.set(id, new SyncDescriptor(ctor));
        }
        serviceIdentifiers.push(id);
    };
    const defineInstance = (id, instance) => {
        if (!services.has(id)) {
            services.set(id, instance);
        }
        serviceIdentifiers.push(id);
    };
    define(IAccessibilityService, TestAccessibilityService);
    define(IKeybindingService, MockKeybindingService);
    define(IClipboardService, TestClipboardService);
    define(IEditorWorkerService, TestEditorWorkerService);
    defineInstance(IOpenerService, NullOpenerService);
    define(INotificationService, TestNotificationService);
    define(IDialogService, TestDialogService);
    define(IUndoRedoService, UndoRedoService);
    define(ILanguageService, LanguageService);
    define(ILanguageConfigurationService, TestLanguageConfigurationService);
    define(IConfigurationService, TestConfigurationService);
    define(ITextResourcePropertiesService, TestTextResourcePropertiesService);
    define(IThemeService, TestThemeService);
    define(ILogService, NullLogService);
    define(IModelService, ModelService);
    define(ICodeEditorService, TestCodeEditorService);
    define(IContextKeyService, MockContextKeyService);
    define(ICommandService, TestCommandService);
    define(ITelemetryService, NullTelemetryServiceShape);
    define(IEnvironmentService, class extends mock() {
        constructor() {
            super(...arguments);
            this.isBuilt = true;
            this.isExtensionDevelopment = false;
        }
    });
    define(ILanguageFeatureDebounceService, LanguageFeatureDebounceService);
    define(ILanguageFeaturesService, LanguageFeaturesService);
    define(ITreeSitterParserService, TestTreeSitterParserService);
    const instantiationService = disposables.add(new TestInstantiationService(services, true));
    disposables.add(toDisposable(() => {
        for (const id of serviceIdentifiers) {
            const instanceOrDescriptor = services.get(id);
            if (typeof instanceOrDescriptor.dispose === 'function') {
                instanceOrDescriptor.dispose();
            }
        }
    }));
    return instantiationService;
}
export function createTestCodeEditor(model, options = {}) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables, options.serviceCollection);
    delete options.serviceCollection;
    const editor = instantiateTestCodeEditor(instantiationService, model || null, options);
    editor.registerDisposable(disposables);
    return editor;
}
export function instantiateTestCodeEditor(instantiationService, model, options = {}) {
    const codeEditorWidgetOptions = {
        contributions: []
    };
    const editor = instantiationService.createInstance(TestCodeEditor, new TestEditorDomElement(), options, codeEditorWidgetOptions);
    if (typeof options.hasTextFocus === 'undefined') {
        options.hasTextFocus = true;
    }
    editor.setHasTextFocus(options.hasTextFocus);
    editor.setModel(model);
    const viewModel = editor.getViewModel();
    viewModel?.setHasFocus(options.hasTextFocus);
    return editor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci90ZXN0Q29kZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUd6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQTRCLE1BQU0scURBQXFELENBQUM7QUFHakgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFeEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN0UsT0FBTyxFQUFFLCtCQUErQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkksT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDcEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDNUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEUsT0FBTyxFQUF3QixxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3RILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRW5ILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQTRCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUV2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNqSSxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNwRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBUXZGLE1BQU0sT0FBTyxjQUFlLFNBQVEsZ0JBQWdCO0lBQXBEOztRQVVTLGtCQUFhLEdBQUcsS0FBSyxDQUFDO0lBcUIvQixDQUFDO0lBN0JBLDJCQUEyQjtJQUNSLG9CQUFvQixDQUFDLGNBQXVCLEVBQUUsYUFBcUIsRUFBRSxPQUFnRDtRQUN2SSxPQUFPLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUNrQixXQUFXLENBQUMsU0FBb0I7UUFDbEQsc0JBQXNCO1FBQ3RCLE9BQU8sQ0FBQyxJQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVNLGVBQWUsQ0FBQyxZQUFxQjtRQUMzQyxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQztJQUNuQyxDQUFDO0lBQ2UsWUFBWTtRQUMzQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDM0IsQ0FBQztJQUNELFlBQVk7SUFFWix1QkFBdUI7SUFDaEIsWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDaEUsQ0FBQztJQUNNLGtDQUFrQyxDQUFnQyxFQUFVLEVBQUUsSUFBbUU7UUFDdkosTUFBTSxDQUFDLEdBQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUNNLGtCQUFrQixDQUFDLFVBQXVCO1FBQ2hELElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBb0I7SUFBMUI7UUFDQyxrQkFBYSxHQUFvQyxJQUFJLENBQUM7UUFDdEQsa0JBQWEsR0FBRyxRQUFRLENBQUM7UUFDekIsYUFBUSxHQUFHLFFBQVEsQ0FBQztJQU9yQixDQUFDO0lBTkEsWUFBWSxDQUFDLElBQVksRUFBRSxLQUFhLElBQVUsQ0FBQztJQUNuRCxlQUFlLENBQUMsSUFBWSxJQUFVLENBQUM7SUFDdkMsWUFBWSxDQUFDLElBQVksSUFBYSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDckQsWUFBWSxDQUFDLElBQVksSUFBd0IsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLGdCQUFnQixDQUFDLEtBQWEsSUFBVSxDQUFDO0lBQ3pDLG1CQUFtQixDQUFDLEtBQWEsSUFBVSxDQUFDO0NBQzVDO0FBOEJELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxJQUF5RCxFQUFFLE9BQTJDLEVBQUUsUUFBaUg7SUFDM1AsT0FBTyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLHVCQUF1QixDQUFDLElBQXlELEVBQUUsT0FBMkMsRUFBRSxRQUEwSDtJQUMvUSxPQUFPLG1CQUFtQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDckQsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEdBQXdEO0lBQzVFLE9BQU8sT0FBTyxDQUFDLEdBQUcsSUFBSyxHQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hELENBQUM7QUFJRCxTQUFTLG1CQUFtQixDQUFDLEdBQXdELEVBQUUsT0FBMkMsRUFBRSxRQUFpSTtJQUNwUSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLE1BQU0sb0JBQW9CLEdBQUcsd0JBQXdCLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlGLE9BQU8sT0FBTyxDQUFDLGlCQUFpQixDQUFDO0lBRWpDLDhCQUE4QjtJQUM5QixJQUFJLEtBQWlCLENBQUM7SUFDdEIsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN0QixLQUFLLEdBQUcsR0FBRyxDQUFDO0lBQ2IsQ0FBQztTQUFNLENBQUM7UUFDUCxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2hILENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLG9CQUFvQixFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUcsQ0FBQztJQUN6QyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBa0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxZQUFZLEVBQUcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQy9GLElBQUksTUFBTSxFQUFFLENBQUM7UUFDWixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUFDLFdBQXlDLEVBQUUsV0FBOEIsSUFBSSxpQkFBaUIsRUFBRTtJQUN4SSxNQUFNLGtCQUFrQixHQUE2QixFQUFFLENBQUM7SUFDeEQsTUFBTSxNQUFNLEdBQUcsQ0FBSSxFQUF3QixFQUFFLElBQStCLEVBQUUsRUFBRTtRQUMvRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUMsQ0FBQztRQUNELGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QixDQUFDLENBQUM7SUFDRixNQUFNLGNBQWMsR0FBRyxDQUFJLEVBQXdCLEVBQUUsUUFBVyxFQUFFLEVBQUU7UUFDbkUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUN2QixRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0Qsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQztJQUVGLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2hELE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3RELGNBQWMsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNsRCxNQUFNLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUN0RCxNQUFNLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDMUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUMxQyxNQUFNLENBQUMsNkJBQTZCLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztJQUN4RSxNQUFNLENBQUMscUJBQXFCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztJQUN4RCxNQUFNLENBQUMsOEJBQThCLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztJQUMxRSxNQUFNLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDeEMsTUFBTSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNwQyxNQUFNLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUM1QyxNQUFNLENBQUMsaUJBQWlCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUNyRCxNQUFNLENBQUMsbUJBQW1CLEVBQUUsS0FBTSxTQUFRLElBQUksRUFBdUI7UUFBekM7O1lBRWxCLFlBQU8sR0FBWSxJQUFJLENBQUM7WUFDeEIsMkJBQXNCLEdBQVksS0FBSyxDQUFDO1FBQ2xELENBQUM7S0FBQSxDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsK0JBQStCLEVBQUUsOEJBQThCLENBQUMsQ0FBQztJQUN4RSxNQUFNLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUMxRCxNQUFNLENBQUMsd0JBQXdCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztJQUU5RCxNQUFNLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRixXQUFXLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUU7UUFDakMsS0FBSyxNQUFNLEVBQUUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM5QyxJQUFJLE9BQU8sb0JBQW9CLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUN4RCxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixPQUFPLG9CQUFvQixDQUFDO0FBQzdCLENBQUM7QUFFRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsS0FBNkIsRUFBRSxVQUE4QyxFQUFFO0lBQ25ILE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDOUYsT0FBTyxPQUFPLENBQUMsaUJBQWlCLENBQUM7SUFFakMsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN2RixNQUFNLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkMsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLG9CQUEyQyxFQUFFLEtBQXdCLEVBQUUsVUFBeUMsRUFBRTtJQUMzSixNQUFNLHVCQUF1QixHQUE2QjtRQUN6RCxhQUFhLEVBQUUsRUFBRTtLQUNqQixDQUFDO0lBQ0YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUNqRCxjQUFjLEVBQ0ksSUFBSSxvQkFBb0IsRUFBRSxFQUM1QyxPQUFPLEVBQ1AsdUJBQXVCLENBQ3ZCLENBQUM7SUFDRixJQUFJLE9BQU8sT0FBTyxDQUFDLFlBQVksS0FBSyxXQUFXLEVBQUUsQ0FBQztRQUNqRCxPQUFPLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDeEMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0MsT0FBd0IsTUFBTSxDQUFDO0FBQ2hDLENBQUMifQ==