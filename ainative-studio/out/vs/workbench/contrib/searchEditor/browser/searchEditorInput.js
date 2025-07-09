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
var SearchEditorInput_1;
import './media/searchEditor.css';
import { Emitter } from '../../../../base/common/event.js';
import { basename } from '../../../../base/common/path.js';
import { extname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { Memento } from '../../../common/memento.js';
import { SearchEditorFindMatchClass, SearchEditorInputTypeId, SearchEditorScheme, SearchEditorWorkingCopyTypeId } from './constants.js';
import { SearchEditorModel, searchEditorModelFactory } from './searchEditorModel.js';
import { defaultSearchConfig, parseSavedSearchEditor, serializeSearchConfiguration } from './searchEditorSerialization.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { bufferToReadable, VSBuffer } from '../../../../base/common/buffer.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const SEARCH_EDITOR_EXT = '.code-search';
const SearchEditorIcon = registerIcon('search-editor-label-icon', Codicon.search, localize('searchEditorLabelIcon', 'Icon of the search editor label.'));
let SearchEditorInput = class SearchEditorInput extends EditorInput {
    static { SearchEditorInput_1 = this; }
    static { this.ID = SearchEditorInputTypeId; }
    get typeId() {
        return SearchEditorInput_1.ID;
    }
    get editorId() {
        return this.typeId;
    }
    getIcon() {
        return SearchEditorIcon;
    }
    get capabilities() {
        let capabilities = 8 /* EditorInputCapabilities.Singleton */;
        if (!this.backingUri) {
            capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        }
        return capabilities;
    }
    get resource() {
        return this.backingUri || this.modelUri;
    }
    constructor(modelUri, backingUri, modelService, textFileService, fileDialogService, instantiationService, workingCopyService, telemetryService, pathService, storageService) {
        super();
        this.modelUri = modelUri;
        this.backingUri = backingUri;
        this.modelService = modelService;
        this.textFileService = textFileService;
        this.fileDialogService = fileDialogService;
        this.instantiationService = instantiationService;
        this.workingCopyService = workingCopyService;
        this.telemetryService = telemetryService;
        this.pathService = pathService;
        this.dirty = false;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this.oldDecorationsIDs = [];
        this.model = instantiationService.createInstance(SearchEditorModel, modelUri);
        if (this.modelUri.scheme !== SearchEditorScheme) {
            throw Error('SearchEditorInput must be invoked with a SearchEditorScheme uri');
        }
        this.memento = new Memento(SearchEditorInput_1.ID, storageService);
        this._register(storageService.onWillSaveState(() => this.memento.saveMemento()));
        const input = this;
        const workingCopyAdapter = new class {
            constructor() {
                this.typeId = SearchEditorWorkingCopyTypeId;
                this.resource = input.modelUri;
                this.capabilities = input.hasCapability(4 /* EditorInputCapabilities.Untitled */) ? 2 /* WorkingCopyCapabilities.Untitled */ : 0 /* WorkingCopyCapabilities.None */;
                this.onDidChangeDirty = input.onDidChangeDirty;
                this.onDidChangeContent = input.onDidChangeContent;
                this.onDidSave = input.onDidSave;
            }
            get name() { return input.getName(); }
            isDirty() { return input.isDirty(); }
            isModified() { return input.isDirty(); }
            backup(token) { return input.backup(token); }
            save(options) { return input.save(0, options).then(editor => !!editor); }
            revert(options) { return input.revert(0, options); }
        };
        this._register(this.workingCopyService.registerWorkingCopy(workingCopyAdapter));
    }
    async save(group, options) {
        if (((await this.resolveModels()).resultsModel).isDisposed()) {
            return;
        }
        if (this.backingUri) {
            await this.textFileService.write(this.backingUri, await this.serializeForDisk(), options);
            this.setDirty(false);
            this._onDidSave.fire({ reason: options?.reason, source: options?.source });
            return this;
        }
        else {
            return this.saveAs(group, options);
        }
    }
    tryReadConfigSync() {
        return this._cachedConfigurationModel?.config;
    }
    async serializeForDisk() {
        const { configurationModel, resultsModel } = await this.resolveModels();
        return serializeSearchConfiguration(configurationModel.config) + '\n' + resultsModel.getValue();
    }
    registerConfigChangeListeners(model) {
        this.configChangeListenerDisposable?.dispose();
        if (!this.isDisposed()) {
            this.configChangeListenerDisposable = model.onConfigDidUpdate(() => {
                if (this.lastLabel !== this.getName()) {
                    this._onDidChangeLabel.fire();
                    this.lastLabel = this.getName();
                }
                this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */).searchConfig = model.config;
            });
            this._register(this.configChangeListenerDisposable);
        }
    }
    async resolveModels() {
        return this.model.resolve().then(data => {
            this._cachedResultsModel = data.resultsModel;
            this._cachedConfigurationModel = data.configurationModel;
            if (this.lastLabel !== this.getName()) {
                this._onDidChangeLabel.fire();
                this.lastLabel = this.getName();
            }
            this.registerConfigChangeListeners(data.configurationModel);
            return data;
        });
    }
    async saveAs(group, options) {
        const path = await this.fileDialogService.pickFileToSave(await this.suggestFileName(), options?.availableFileSystems);
        if (path) {
            this.telemetryService.publicLog2('searchEditor/saveSearchResults');
            const toWrite = await this.serializeForDisk();
            if (await this.textFileService.create([{ resource: path, value: toWrite, options: { overwrite: true } }])) {
                this.setDirty(false);
                if (!isEqual(path, this.modelUri)) {
                    const input = this.instantiationService.invokeFunction(getOrMakeSearchEditorInput, { fileUri: path, from: 'existingFile' });
                    input.setMatchRanges(this.getMatchRanges());
                    return input;
                }
                return this;
            }
        }
        return undefined;
    }
    getName(maxLength = 12) {
        const trimToMax = (label) => (label.length < maxLength ? label : `${label.slice(0, maxLength - 3)}...`);
        if (this.backingUri) {
            const originalURI = EditorResourceAccessor.getOriginalUri(this);
            return localize('searchTitle.withQuery', "Search: {0}", basename((originalURI ?? this.backingUri).path, SEARCH_EDITOR_EXT));
        }
        const query = this._cachedConfigurationModel?.config?.query?.trim();
        if (query) {
            return localize('searchTitle.withQuery', "Search: {0}", trimToMax(query));
        }
        return localize('searchTitle', "Search");
    }
    setDirty(dirty) {
        const wasDirty = this.dirty;
        this.dirty = dirty;
        if (wasDirty !== dirty) {
            this._onDidChangeDirty.fire();
        }
    }
    isDirty() {
        return this.dirty;
    }
    async rename(group, target) {
        if (extname(target) === SEARCH_EDITOR_EXT) {
            return {
                editor: this.instantiationService.invokeFunction(getOrMakeSearchEditorInput, { from: 'existingFile', fileUri: target })
            };
        }
        // Ignore move if editor was renamed to a different file extension
        return undefined;
    }
    dispose() {
        this.modelService.destroyModel(this.modelUri);
        super.dispose();
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        if (other instanceof SearchEditorInput_1) {
            return !!(other.modelUri.fragment && other.modelUri.fragment === this.modelUri.fragment) || !!(other.backingUri && isEqual(other.backingUri, this.backingUri));
        }
        return false;
    }
    getMatchRanges() {
        return (this._cachedResultsModel?.getAllDecorations() ?? [])
            .filter(decoration => decoration.options.className === SearchEditorFindMatchClass)
            .filter(({ range }) => !(range.startColumn === 1 && range.endColumn === 1))
            .map(({ range }) => range);
    }
    async setMatchRanges(ranges) {
        this.oldDecorationsIDs = (await this.resolveModels()).resultsModel.deltaDecorations(this.oldDecorationsIDs, ranges.map(range => ({ range, options: { description: 'search-editor-find-match', className: SearchEditorFindMatchClass, stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */ } })));
    }
    async revert(group, options) {
        if (options?.soft) {
            this.setDirty(false);
            return;
        }
        if (this.backingUri) {
            const { config, text } = await this.instantiationService.invokeFunction(parseSavedSearchEditor, this.backingUri);
            const { resultsModel, configurationModel } = await this.resolveModels();
            resultsModel.setValue(text);
            configurationModel.updateConfig(config);
        }
        else {
            (await this.resolveModels()).resultsModel.setValue('');
        }
        super.revert(group, options);
        this.setDirty(false);
    }
    async backup(token) {
        const contents = await this.serializeForDisk();
        if (token.isCancellationRequested) {
            return {};
        }
        return {
            content: bufferToReadable(VSBuffer.fromString(contents))
        };
    }
    async suggestFileName() {
        const query = (await this.resolveModels()).configurationModel.config.query;
        const searchFileName = (query.replace(/[^\w \-_]+/g, '_') || 'Search') + SEARCH_EDITOR_EXT;
        return joinPath(await this.fileDialogService.defaultFilePath(this.pathService.defaultUriScheme), searchFileName);
    }
    toUntyped() {
        if (this.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
            return undefined;
        }
        return {
            resource: this.resource,
            options: {
                override: SearchEditorInput_1.ID
            }
        };
    }
};
SearchEditorInput = SearchEditorInput_1 = __decorate([
    __param(2, IModelService),
    __param(3, ITextFileService),
    __param(4, IFileDialogService),
    __param(5, IInstantiationService),
    __param(6, IWorkingCopyService),
    __param(7, ITelemetryService),
    __param(8, IPathService),
    __param(9, IStorageService)
], SearchEditorInput);
export { SearchEditorInput };
export const getOrMakeSearchEditorInput = (accessor, existingData) => {
    const storageService = accessor.get(IStorageService);
    const configurationService = accessor.get(IConfigurationService);
    const instantiationService = accessor.get(IInstantiationService);
    const modelUri = existingData.from === 'model' ? existingData.modelUri : URI.from({ scheme: SearchEditorScheme, fragment: `${Math.random()}` });
    if (!searchEditorModelFactory.models.has(modelUri)) {
        if (existingData.from === 'existingFile') {
            instantiationService.invokeFunction(accessor => searchEditorModelFactory.initializeModelFromExistingFile(accessor, modelUri, existingData.fileUri));
        }
        else {
            const searchEditorSettings = configurationService.getValue('search').searchEditor;
            const reuseOldSettings = searchEditorSettings.reusePriorSearchConfiguration;
            const defaultNumberOfContextLines = searchEditorSettings.defaultNumberOfContextLines;
            const priorConfig = reuseOldSettings ? new Memento(SearchEditorInput.ID, storageService).getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */).searchConfig : {};
            const defaultConfig = defaultSearchConfig();
            const config = { ...defaultConfig, ...priorConfig, ...existingData.config };
            if (defaultNumberOfContextLines !== null && defaultNumberOfContextLines !== undefined) {
                config.contextLines = existingData?.config?.contextLines ?? defaultNumberOfContextLines;
            }
            if (existingData.from === 'rawData') {
                if (existingData.resultsContents) {
                    config.contextLines = 0;
                }
                instantiationService.invokeFunction(accessor => searchEditorModelFactory.initializeModelFromRawData(accessor, modelUri, config, existingData.resultsContents));
            }
            else {
                instantiationService.invokeFunction(accessor => searchEditorModelFactory.initializeModelFromExistingModel(accessor, modelUri, config));
            }
        }
    }
    return instantiationService.createInstance(SearchEditorInput, modelUri, existingData.from === 'existingFile'
        ? existingData.fileUri
        : existingData.from === 'model'
            ? existingData.backupOf
            : undefined);
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoRWRpdG9yL2Jyb3dzZXIvc2VhcmNoRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMEJBQTBCLENBQUM7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQWlELHNCQUFzQixFQUE2RCxNQUFNLDJCQUEyQixDQUFDO0FBQzdLLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQXVCLE1BQU0sZ0JBQWdCLENBQUM7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