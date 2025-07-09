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
var BaseTextEditorModel_1;
import { EditorModel } from './editorModel.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../editor/common/languages/modesRegistry.js';
import { ILanguageDetectionService, LanguageDetectionLanguageEventSource } from '../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { localize } from '../../../nls.js';
/**
 * The base text editor model leverages the code editor model. This class is only intended to be subclassed and not instantiated.
 */
let BaseTextEditorModel = class BaseTextEditorModel extends EditorModel {
    static { BaseTextEditorModel_1 = this; }
    static { this.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY = 600; }
    constructor(modelService, languageService, languageDetectionService, accessibilityService, textEditorModelHandle) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this.languageDetectionService = languageDetectionService;
        this.accessibilityService = accessibilityService;
        this.textEditorModelHandle = undefined;
        this.modelDisposeListener = this._register(new MutableDisposable());
        this.autoDetectLanguageThrottler = this._register(new ThrottledDelayer(BaseTextEditorModel_1.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY));
        this._blockLanguageChangeListener = false;
        this._languageChangeSource = undefined;
        if (textEditorModelHandle) {
            this.handleExistingModel(textEditorModelHandle);
        }
    }
    handleExistingModel(textEditorModelHandle) {
        // We need the resource to point to an existing model
        const model = this.modelService.getModel(textEditorModelHandle);
        if (!model) {
            throw new Error(`Document with resource ${textEditorModelHandle.toString(true)} does not exist`);
        }
        this.textEditorModelHandle = textEditorModelHandle;
        // Make sure we clean up when this model gets disposed
        this.registerModelDisposeListener(model);
    }
    registerModelDisposeListener(model) {
        this.modelDisposeListener.value = model.onWillDispose(() => {
            this.textEditorModelHandle = undefined; // make sure we do not dispose code editor model again
            this.dispose();
        });
    }
    get textEditorModel() {
        return this.textEditorModelHandle ? this.modelService.getModel(this.textEditorModelHandle) : null;
    }
    isReadonly() {
        return true;
    }
    get languageChangeSource() { return this._languageChangeSource; }
    get hasLanguageSetExplicitly() {
        // This is technically not 100% correct, because 'api' can also be
        // set as source if a model is resolved as text first and then
        // transitions into the resolved language. But to preserve the current
        // behaviour, we do not change this property. Rather, `languageChangeSource`
        // can be used to get more fine grained information.
        return typeof this._languageChangeSource === 'string';
    }
    setLanguageId(languageId, source) {
        // Remember that an explicit language was set
        this._languageChangeSource = 'user';
        this.setLanguageIdInternal(languageId, source);
    }
    setLanguageIdInternal(languageId, source) {
        if (!this.isResolved()) {
            return;
        }
        if (!languageId || languageId === this.textEditorModel.getLanguageId()) {
            return;
        }
        this._blockLanguageChangeListener = true;
        try {
            this.textEditorModel.setLanguage(this.languageService.createById(languageId), source);
        }
        finally {
            this._blockLanguageChangeListener = false;
        }
    }
    installModelListeners(model) {
        // Setup listener for lower level language changes
        const disposable = this._register(model.onDidChangeLanguage(e => {
            if (e.source === LanguageDetectionLanguageEventSource ||
                this._blockLanguageChangeListener) {
                return;
            }
            this._languageChangeSource = 'api';
            disposable.dispose();
        }));
    }
    getLanguageId() {
        return this.textEditorModel?.getLanguageId();
    }
    autoDetectLanguage() {
        return this.autoDetectLanguageThrottler.trigger(() => this.doAutoDetectLanguage());
    }
    async doAutoDetectLanguage() {
        if (this.hasLanguageSetExplicitly || // skip detection when the user has made an explicit choice on the language
            !this.textEditorModelHandle || // require a URI to run the detection for
            !this.languageDetectionService.isEnabledForLanguage(this.getLanguageId() ?? PLAINTEXT_LANGUAGE_ID) // require a valid language that is enlisted for detection
        ) {
            return;
        }
        const lang = await this.languageDetectionService.detectLanguage(this.textEditorModelHandle);
        const prevLang = this.getLanguageId();
        if (lang && lang !== prevLang && !this.isDisposed()) {
            this.setLanguageIdInternal(lang, LanguageDetectionLanguageEventSource);
            const languageName = this.languageService.getLanguageName(lang);
            this.accessibilityService.alert(localize('languageAutoDetected', "Language {0} was automatically detected and set as the language mode.", languageName ?? lang));
        }
    }
    /**
     * Creates the text editor model with the provided value, optional preferred language
     * (can be comma separated for multiple values) and optional resource URL.
     */
    createTextEditorModel(value, resource, preferredLanguageId) {
        const firstLineText = this.getFirstLineText(value);
        const languageSelection = this.getOrCreateLanguage(resource, this.languageService, preferredLanguageId, firstLineText);
        return this.doCreateTextEditorModel(value, languageSelection, resource);
    }
    doCreateTextEditorModel(value, languageSelection, resource) {
        let model = resource && this.modelService.getModel(resource);
        if (!model) {
            model = this.modelService.createModel(value, languageSelection, resource);
            this.createdEditorModel = true;
            // Make sure we clean up when this model gets disposed
            this.registerModelDisposeListener(model);
        }
        else {
            this.updateTextEditorModel(value, languageSelection.languageId);
        }
        this.textEditorModelHandle = model.uri;
        return model;
    }
    getFirstLineText(value) {
        // text buffer factory
        const textBufferFactory = value;
        if (typeof textBufferFactory.getFirstLineText === 'function') {
            return textBufferFactory.getFirstLineText(1000 /* ModelConstants.FIRST_LINE_DETECTION_LENGTH_LIMIT */);
        }
        // text model
        const textSnapshot = value;
        return textSnapshot.getLineContent(1).substr(0, 1000 /* ModelConstants.FIRST_LINE_DETECTION_LENGTH_LIMIT */);
    }
    /**
     * Gets the language for the given identifier. Subclasses can override to provide their own implementation of this lookup.
     *
     * @param firstLineText optional first line of the text buffer to set the language on. This can be used to guess a language from content.
     */
    getOrCreateLanguage(resource, languageService, preferredLanguage, firstLineText) {
        // lookup language via resource path if the provided language is unspecific
        if (!preferredLanguage || preferredLanguage === PLAINTEXT_LANGUAGE_ID) {
            return languageService.createByFilepathOrFirstLine(resource ?? null, firstLineText);
        }
        // otherwise take the preferred language for granted
        return languageService.createById(preferredLanguage);
    }
    /**
     * Updates the text editor model with the provided value. If the value is the same as the model has, this is a no-op.
     */
    updateTextEditorModel(newValue, preferredLanguageId) {
        if (!this.isResolved()) {
            return;
        }
        // contents
        if (newValue) {
            this.modelService.updateModel(this.textEditorModel, newValue);
        }
        // language (only if specific and changed)
        if (preferredLanguageId && preferredLanguageId !== PLAINTEXT_LANGUAGE_ID && this.textEditorModel.getLanguageId() !== preferredLanguageId) {
            this.textEditorModel.setLanguage(this.languageService.createById(preferredLanguageId));
        }
    }
    createSnapshot() {
        if (!this.textEditorModel) {
            return null;
        }
        return this.textEditorModel.createSnapshot(true /* preserve BOM */);
    }
    isResolved() {
        return !!this.textEditorModelHandle;
    }
    dispose() {
        this.modelDisposeListener.dispose(); // dispose this first because it will trigger another dispose() otherwise
        if (this.textEditorModelHandle && this.createdEditorModel) {
            this.modelService.destroyModel(this.textEditorModelHandle);
        }
        this.textEditorModelHandle = undefined;
        this.createdEditorModel = false;
        super.dispose();
    }
};
BaseTextEditorModel = BaseTextEditorModel_1 = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService),
    __param(2, ILanguageDetectionService),
    __param(3, IAccessibilityService)
], BaseTextEditorModel);
export { BaseTextEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL3RleHRFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBSS9DLE9BQU8sRUFBRSxnQkFBZ0IsRUFBc0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLG9DQUFvQyxFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDNUosT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzNDOztHQUVHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxXQUFXOzthQUUzQix3Q0FBbUMsR0FBRyxHQUFHLEFBQU4sQ0FBTztJQVNsRSxZQUNnQixZQUFxQyxFQUNsQyxlQUEyQyxFQUNsQyx3QkFBb0UsRUFDeEUsb0JBQTRELEVBQ25GLHFCQUEyQjtRQUUzQixLQUFLLEVBQUUsQ0FBQztRQU5pQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN4QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDakIsNkJBQXdCLEdBQXhCLHdCQUF3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