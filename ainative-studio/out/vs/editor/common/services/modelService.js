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
var ModelService_1;
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
import { TextModel, createTextBuffer } from '../model/textModel.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { ITextResourcePropertiesService } from './textResourceConfiguration.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { StringSHA1 } from '../../../base/common/hash.js';
import { isEditStackElement } from '../model/editStack.js';
import { Schemas } from '../../../base/common/network.js';
import { equals } from '../../../base/common/objects.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
function MODEL_ID(resource) {
    return resource.toString();
}
class ModelData {
    constructor(model, onWillDispose, onDidChangeLanguage) {
        this.model = model;
        this._modelEventListeners = new DisposableStore();
        this.model = model;
        this._modelEventListeners.add(model.onWillDispose(() => onWillDispose(model)));
        this._modelEventListeners.add(model.onDidChangeLanguage((e) => onDidChangeLanguage(model, e)));
    }
    dispose() {
        this._modelEventListeners.dispose();
    }
}
const DEFAULT_EOL = (platform.isLinux || platform.isMacintosh) ? 1 /* DefaultEndOfLine.LF */ : 2 /* DefaultEndOfLine.CRLF */;
class DisposedModelInfo {
    constructor(uri, initialUndoRedoSnapshot, time, sharesUndoRedoStack, heapSize, sha1, versionId, alternativeVersionId) {
        this.uri = uri;
        this.initialUndoRedoSnapshot = initialUndoRedoSnapshot;
        this.time = time;
        this.sharesUndoRedoStack = sharesUndoRedoStack;
        this.heapSize = heapSize;
        this.sha1 = sha1;
        this.versionId = versionId;
        this.alternativeVersionId = alternativeVersionId;
    }
}
let ModelService = class ModelService extends Disposable {
    static { ModelService_1 = this; }
    static { this.MAX_MEMORY_FOR_CLOSED_FILES_UNDO_STACK = 20 * 1024 * 1024; }
    constructor(_configurationService, _resourcePropertiesService, _undoRedoService, _instantiationService) {
        super();
        this._configurationService = _configurationService;
        this._resourcePropertiesService = _resourcePropertiesService;
        this._undoRedoService = _undoRedoService;
        this._instantiationService = _instantiationService;
        this._onModelAdded = this._register(new Emitter());
        this.onModelAdded = this._onModelAdded.event;
        this._onModelRemoved = this._register(new Emitter());
        this.onModelRemoved = this._onModelRemoved.event;
        this._onModelModeChanged = this._register(new Emitter());
        this.onModelLanguageChanged = this._onModelModeChanged.event;
        this._modelCreationOptionsByLanguageAndResource = Object.create(null);
        this._models = {};
        this._disposedModels = new Map();
        this._disposedModelsHeapSize = 0;
        this._register(this._configurationService.onDidChangeConfiguration(e => this._updateModelOptions(e)));
        this._updateModelOptions(undefined);
    }
    static _readModelOptions(config, isForSimpleWidget) {
        let tabSize = EDITOR_MODEL_DEFAULTS.tabSize;
        if (config.editor && typeof config.editor.tabSize !== 'undefined') {
            const parsedTabSize = parseInt(config.editor.tabSize, 10);
            if (!isNaN(parsedTabSize)) {
                tabSize = parsedTabSize;
            }
            if (tabSize < 1) {
                tabSize = 1;
            }
        }
        let indentSize = 'tabSize';
        if (config.editor && typeof config.editor.indentSize !== 'undefined' && config.editor.indentSize !== 'tabSize') {
            const parsedIndentSize = parseInt(config.editor.indentSize, 10);
            if (!isNaN(parsedIndentSize)) {
                indentSize = Math.max(parsedIndentSize, 1);
            }
        }
        let insertSpaces = EDITOR_MODEL_DEFAULTS.insertSpaces;
        if (config.editor && typeof config.editor.insertSpaces !== 'undefined') {
            insertSpaces = (config.editor.insertSpaces === 'false' ? false : Boolean(config.editor.insertSpaces));
        }
        let newDefaultEOL = DEFAULT_EOL;
        const eol = config.eol;
        if (eol === '\r\n') {
            newDefaultEOL = 2 /* DefaultEndOfLine.CRLF */;
        }
        else if (eol === '\n') {
            newDefaultEOL = 1 /* DefaultEndOfLine.LF */;
        }
        let trimAutoWhitespace = EDITOR_MODEL_DEFAULTS.trimAutoWhitespace;
        if (config.editor && typeof config.editor.trimAutoWhitespace !== 'undefined') {
            trimAutoWhitespace = (config.editor.trimAutoWhitespace === 'false' ? false : Boolean(config.editor.trimAutoWhitespace));
        }
        let detectIndentation = EDITOR_MODEL_DEFAULTS.detectIndentation;
        if (config.editor && typeof config.editor.detectIndentation !== 'undefined') {
            detectIndentation = (config.editor.detectIndentation === 'false' ? false : Boolean(config.editor.detectIndentation));
        }
        let largeFileOptimizations = EDITOR_MODEL_DEFAULTS.largeFileOptimizations;
        if (config.editor && typeof config.editor.largeFileOptimizations !== 'undefined') {
            largeFileOptimizations = (config.editor.largeFileOptimizations === 'false' ? false : Boolean(config.editor.largeFileOptimizations));
        }
        let bracketPairColorizationOptions = EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions;
        if (config.editor?.bracketPairColorization && typeof config.editor.bracketPairColorization === 'object') {
            bracketPairColorizationOptions = {
                enabled: !!config.editor.bracketPairColorization.enabled,
                independentColorPoolPerBracketType: !!config.editor.bracketPairColorization.independentColorPoolPerBracketType
            };
        }
        return {
            isForSimpleWidget: isForSimpleWidget,
            tabSize: tabSize,
            indentSize: indentSize,
            insertSpaces: insertSpaces,
            detectIndentation: detectIndentation,
            defaultEOL: newDefaultEOL,
            trimAutoWhitespace: trimAutoWhitespace,
            largeFileOptimizations: largeFileOptimizations,
            bracketPairColorizationOptions
        };
    }
    _getEOL(resource, language) {
        if (resource) {
            return this._resourcePropertiesService.getEOL(resource, language);
        }
        const eol = this._configurationService.getValue('files.eol', { overrideIdentifier: language });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return platform.OS === 3 /* platform.OperatingSystem.Linux */ || platform.OS === 2 /* platform.OperatingSystem.Macintosh */ ? '\n' : '\r\n';
    }
    _shouldRestoreUndoStack() {
        const result = this._configurationService.getValue('files.restoreUndoStack');
        if (typeof result === 'boolean') {
            return result;
        }
        return true;
    }
    getCreationOptions(languageIdOrSelection, resource, isForSimpleWidget) {
        const language = (typeof languageIdOrSelection === 'string' ? languageIdOrSelection : languageIdOrSelection.languageId);
        let creationOptions = this._modelCreationOptionsByLanguageAndResource[language + resource];
        if (!creationOptions) {
            const editor = this._configurationService.getValue('editor', { overrideIdentifier: language, resource });
            const eol = this._getEOL(resource, language);
            creationOptions = ModelService_1._readModelOptions({ editor, eol }, isForSimpleWidget);
            this._modelCreationOptionsByLanguageAndResource[language + resource] = creationOptions;
        }
        return creationOptions;
    }
    _updateModelOptions(e) {
        const oldOptionsByLanguageAndResource = this._modelCreationOptionsByLanguageAndResource;
        this._modelCreationOptionsByLanguageAndResource = Object.create(null);
        // Update options on all models
        const keys = Object.keys(this._models);
        for (let i = 0, len = keys.length; i < len; i++) {
            const modelId = keys[i];
            const modelData = this._models[modelId];
            const language = modelData.model.getLanguageId();
            const uri = modelData.model.uri;
            if (e && !e.affectsConfiguration('editor', { overrideIdentifier: language, resource: uri }) && !e.affectsConfiguration('files.eol', { overrideIdentifier: language, resource: uri })) {
                continue; // perf: skip if this model is not affected by configuration change
            }
            const oldOptions = oldOptionsByLanguageAndResource[language + uri];
            const newOptions = this.getCreationOptions(language, uri, modelData.model.isForSimpleWidget);
            ModelService_1._setModelOptionsForModel(modelData.model, newOptions, oldOptions);
        }
    }
    static _setModelOptionsForModel(model, newOptions, currentOptions) {
        if (currentOptions && currentOptions.defaultEOL !== newOptions.defaultEOL && model.getLineCount() === 1) {
            model.setEOL(newOptions.defaultEOL === 1 /* DefaultEndOfLine.LF */ ? 0 /* EndOfLineSequence.LF */ : 1 /* EndOfLineSequence.CRLF */);
        }
        if (currentOptions
            && (currentOptions.detectIndentation === newOptions.detectIndentation)
            && (currentOptions.insertSpaces === newOptions.insertSpaces)
            && (currentOptions.tabSize === newOptions.tabSize)
            && (currentOptions.indentSize === newOptions.indentSize)
            && (currentOptions.trimAutoWhitespace === newOptions.trimAutoWhitespace)
            && equals(currentOptions.bracketPairColorizationOptions, newOptions.bracketPairColorizationOptions)) {
            // Same indent opts, no need to touch the model
            return;
        }
        if (newOptions.detectIndentation) {
            model.detectIndentation(newOptions.insertSpaces, newOptions.tabSize);
            model.updateOptions({
                trimAutoWhitespace: newOptions.trimAutoWhitespace,
                bracketColorizationOptions: newOptions.bracketPairColorizationOptions
            });
        }
        else {
            model.updateOptions({
                insertSpaces: newOptions.insertSpaces,
                tabSize: newOptions.tabSize,
                indentSize: newOptions.indentSize,
                trimAutoWhitespace: newOptions.trimAutoWhitespace,
                bracketColorizationOptions: newOptions.bracketPairColorizationOptions
            });
        }
    }
    // --- begin IModelService
    _insertDisposedModel(disposedModelData) {
        this._disposedModels.set(MODEL_ID(disposedModelData.uri), disposedModelData);
        this._disposedModelsHeapSize += disposedModelData.heapSize;
    }
    _removeDisposedModel(resource) {
        const disposedModelData = this._disposedModels.get(MODEL_ID(resource));
        if (disposedModelData) {
            this._disposedModelsHeapSize -= disposedModelData.heapSize;
        }
        this._disposedModels.delete(MODEL_ID(resource));
        return disposedModelData;
    }
    _ensureDisposedModelsHeapSize(maxModelsHeapSize) {
        if (this._disposedModelsHeapSize > maxModelsHeapSize) {
            // we must remove some old undo stack elements to free up some memory
            const disposedModels = [];
            this._disposedModels.forEach(entry => {
                if (!entry.sharesUndoRedoStack) {
                    disposedModels.push(entry);
                }
            });
            disposedModels.sort((a, b) => a.time - b.time);
            while (disposedModels.length > 0 && this._disposedModelsHeapSize > maxModelsHeapSize) {
                const disposedModel = disposedModels.shift();
                this._removeDisposedModel(disposedModel.uri);
                if (disposedModel.initialUndoRedoSnapshot !== null) {
                    this._undoRedoService.restoreSnapshot(disposedModel.initialUndoRedoSnapshot);
                }
            }
        }
    }
    _createModelData(value, languageIdOrSelection, resource, isForSimpleWidget) {
        // create & save the model
        const options = this.getCreationOptions(languageIdOrSelection, resource, isForSimpleWidget);
        const model = this._instantiationService.createInstance(TextModel, value, languageIdOrSelection, options, resource);
        if (resource && this._disposedModels.has(MODEL_ID(resource))) {
            const disposedModelData = this._removeDisposedModel(resource);
            const elements = this._undoRedoService.getElements(resource);
            const sha1Computer = this._getSHA1Computer();
            const sha1IsEqual = (sha1Computer.canComputeSHA1(model)
                ? sha1Computer.computeSHA1(model) === disposedModelData.sha1
                : false);
            if (sha1IsEqual || disposedModelData.sharesUndoRedoStack) {
                for (const element of elements.past) {
                    if (isEditStackElement(element) && element.matchesResource(resource)) {
                        element.setModel(model);
                    }
                }
                for (const element of elements.future) {
                    if (isEditStackElement(element) && element.matchesResource(resource)) {
                        element.setModel(model);
                    }
                }
                this._undoRedoService.setElementsValidFlag(resource, true, (element) => (isEditStackElement(element) && element.matchesResource(resource)));
                if (sha1IsEqual) {
                    model._overwriteVersionId(disposedModelData.versionId);
                    model._overwriteAlternativeVersionId(disposedModelData.alternativeVersionId);
                    model._overwriteInitialUndoRedoSnapshot(disposedModelData.initialUndoRedoSnapshot);
                }
            }
            else {
                if (disposedModelData.initialUndoRedoSnapshot !== null) {
                    this._undoRedoService.restoreSnapshot(disposedModelData.initialUndoRedoSnapshot);
                }
            }
        }
        const modelId = MODEL_ID(model.uri);
        if (this._models[modelId]) {
            // There already exists a model with this id => this is a programmer error
            throw new Error('ModelService: Cannot add model because it already exists!');
        }
        const modelData = new ModelData(model, (model) => this._onWillDispose(model), (model, e) => this._onDidChangeLanguage(model, e));
        this._models[modelId] = modelData;
        return modelData;
    }
    updateModel(model, value) {
        const options = this.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        const { textBuffer, disposable } = createTextBuffer(value, options.defaultEOL);
        // Return early if the text is already set in that form
        if (model.equalsTextBuffer(textBuffer)) {
            disposable.dispose();
            return;
        }
        // Otherwise find a diff between the values and update model
        model.pushStackElement();
        model.pushEOL(textBuffer.getEOL() === '\r\n' ? 1 /* EndOfLineSequence.CRLF */ : 0 /* EndOfLineSequence.LF */);
        model.pushEditOperations([], ModelService_1._computeEdits(model, textBuffer), () => []);
        model.pushStackElement();
        disposable.dispose();
    }
    static _commonPrefix(a, aLen, aDelta, b, bLen, bDelta) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a.getLineContent(aDelta + i) === b.getLineContent(bDelta + i); i++) {
            result++;
        }
        return result;
    }
    static _commonSuffix(a, aLen, aDelta, b, bLen, bDelta) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a.getLineContent(aDelta + aLen - i) === b.getLineContent(bDelta + bLen - i); i++) {
            result++;
        }
        return result;
    }
    /**
     * Compute edits to bring `model` to the state of `textSource`.
     */
    static _computeEdits(model, textBuffer) {
        const modelLineCount = model.getLineCount();
        const textBufferLineCount = textBuffer.getLineCount();
        const commonPrefix = this._commonPrefix(model, modelLineCount, 1, textBuffer, textBufferLineCount, 1);
        if (modelLineCount === textBufferLineCount && commonPrefix === modelLineCount) {
            // equality case
            return [];
        }
        const commonSuffix = this._commonSuffix(model, modelLineCount - commonPrefix, commonPrefix, textBuffer, textBufferLineCount - commonPrefix, commonPrefix);
        let oldRange;
        let newRange;
        if (commonSuffix > 0) {
            oldRange = new Range(commonPrefix + 1, 1, modelLineCount - commonSuffix + 1, 1);
            newRange = new Range(commonPrefix + 1, 1, textBufferLineCount - commonSuffix + 1, 1);
        }
        else if (commonPrefix > 0) {
            oldRange = new Range(commonPrefix, model.getLineMaxColumn(commonPrefix), modelLineCount, model.getLineMaxColumn(modelLineCount));
            newRange = new Range(commonPrefix, 1 + textBuffer.getLineLength(commonPrefix), textBufferLineCount, 1 + textBuffer.getLineLength(textBufferLineCount));
        }
        else {
            oldRange = new Range(1, 1, modelLineCount, model.getLineMaxColumn(modelLineCount));
            newRange = new Range(1, 1, textBufferLineCount, 1 + textBuffer.getLineLength(textBufferLineCount));
        }
        return [EditOperation.replaceMove(oldRange, textBuffer.getValueInRange(newRange, 0 /* EndOfLinePreference.TextDefined */))];
    }
    createModel(value, languageSelection, resource, isForSimpleWidget = false) {
        let modelData;
        if (languageSelection) {
            modelData = this._createModelData(value, languageSelection, resource, isForSimpleWidget);
        }
        else {
            modelData = this._createModelData(value, PLAINTEXT_LANGUAGE_ID, resource, isForSimpleWidget);
        }
        this._onModelAdded.fire(modelData.model);
        return modelData.model;
    }
    destroyModel(resource) {
        // We need to support that not all models get disposed through this service (i.e. model.dispose() should work!)
        const modelData = this._models[MODEL_ID(resource)];
        if (!modelData) {
            return;
        }
        modelData.model.dispose();
    }
    getModels() {
        const ret = [];
        const keys = Object.keys(this._models);
        for (let i = 0, len = keys.length; i < len; i++) {
            const modelId = keys[i];
            ret.push(this._models[modelId].model);
        }
        return ret;
    }
    getModel(resource) {
        const modelId = MODEL_ID(resource);
        const modelData = this._models[modelId];
        if (!modelData) {
            return null;
        }
        return modelData.model;
    }
    // --- end IModelService
    _schemaShouldMaintainUndoRedoElements(resource) {
        return (resource.scheme === Schemas.file
            || resource.scheme === Schemas.vscodeRemote
            || resource.scheme === Schemas.vscodeUserData
            || resource.scheme === Schemas.vscodeNotebookCell
            || resource.scheme === 'fake-fs' // for tests
        );
    }
    _onWillDispose(model) {
        const modelId = MODEL_ID(model.uri);
        const modelData = this._models[modelId];
        const sharesUndoRedoStack = (this._undoRedoService.getUriComparisonKey(model.uri) !== model.uri.toString());
        let maintainUndoRedoStack = false;
        let heapSize = 0;
        if (sharesUndoRedoStack || (this._shouldRestoreUndoStack() && this._schemaShouldMaintainUndoRedoElements(model.uri))) {
            const elements = this._undoRedoService.getElements(model.uri);
            if (elements.past.length > 0 || elements.future.length > 0) {
                for (const element of elements.past) {
                    if (isEditStackElement(element) && element.matchesResource(model.uri)) {
                        maintainUndoRedoStack = true;
                        heapSize += element.heapSize(model.uri);
                        element.setModel(model.uri); // remove reference from text buffer instance
                    }
                }
                for (const element of elements.future) {
                    if (isEditStackElement(element) && element.matchesResource(model.uri)) {
                        maintainUndoRedoStack = true;
                        heapSize += element.heapSize(model.uri);
                        element.setModel(model.uri); // remove reference from text buffer instance
                    }
                }
            }
        }
        const maxMemory = ModelService_1.MAX_MEMORY_FOR_CLOSED_FILES_UNDO_STACK;
        const sha1Computer = this._getSHA1Computer();
        if (!maintainUndoRedoStack) {
            if (!sharesUndoRedoStack) {
                const initialUndoRedoSnapshot = modelData.model.getInitialUndoRedoSnapshot();
                if (initialUndoRedoSnapshot !== null) {
                    this._undoRedoService.restoreSnapshot(initialUndoRedoSnapshot);
                }
            }
        }
        else if (!sharesUndoRedoStack && (heapSize > maxMemory || !sha1Computer.canComputeSHA1(model))) {
            // the undo stack for this file would never fit in the configured memory or the file is very large, so don't bother with it.
            const initialUndoRedoSnapshot = modelData.model.getInitialUndoRedoSnapshot();
            if (initialUndoRedoSnapshot !== null) {
                this._undoRedoService.restoreSnapshot(initialUndoRedoSnapshot);
            }
        }
        else {
            this._ensureDisposedModelsHeapSize(maxMemory - heapSize);
            // We only invalidate the elements, but they remain in the undo-redo service.
            this._undoRedoService.setElementsValidFlag(model.uri, false, (element) => (isEditStackElement(element) && element.matchesResource(model.uri)));
            this._insertDisposedModel(new DisposedModelInfo(model.uri, modelData.model.getInitialUndoRedoSnapshot(), Date.now(), sharesUndoRedoStack, heapSize, sha1Computer.computeSHA1(model), model.getVersionId(), model.getAlternativeVersionId()));
        }
        delete this._models[modelId];
        modelData.dispose();
        // clean up cache
        delete this._modelCreationOptionsByLanguageAndResource[model.getLanguageId() + model.uri];
        this._onModelRemoved.fire(model);
    }
    _onDidChangeLanguage(model, e) {
        const oldLanguageId = e.oldLanguage;
        const newLanguageId = model.getLanguageId();
        const oldOptions = this.getCreationOptions(oldLanguageId, model.uri, model.isForSimpleWidget);
        const newOptions = this.getCreationOptions(newLanguageId, model.uri, model.isForSimpleWidget);
        ModelService_1._setModelOptionsForModel(model, newOptions, oldOptions);
        this._onModelModeChanged.fire({ model, oldLanguageId: oldLanguageId });
    }
    _getSHA1Computer() {
        return new DefaultModelSHA1Computer();
    }
};
ModelService = ModelService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITextResourcePropertiesService),
    __param(2, IUndoRedoService),
    __param(3, IInstantiationService)
], ModelService);
export { ModelService };
export class DefaultModelSHA1Computer {
    static { this.MAX_MODEL_SIZE = 10 * 1024 * 1024; } // takes 200ms to compute a sha1 on a 10MB model on a new machine
    canComputeSHA1(model) {
        return (model.getValueLength() <= DefaultModelSHA1Computer.MAX_MODEL_SIZE);
    }
    computeSHA1(model) {
        // compute the sha1
        const shaComputer = new StringSHA1();
        const snapshot = model.createSnapshot();
        let text;
        while ((text = snapshot.read())) {
            shaComputer.update(text);
        }
        return shaComputer.digest();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbW9kZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RixPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0sMEJBQTBCLENBQUM7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXpDLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNoRixPQUFPLEVBQTZCLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDM0gsT0FBTyxFQUFFLGdCQUFnQixFQUE2QixNQUFNLCtDQUErQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FB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