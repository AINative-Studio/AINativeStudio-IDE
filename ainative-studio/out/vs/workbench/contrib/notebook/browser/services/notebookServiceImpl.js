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
var NotebookProviderInfoStore_1, NotebookService_1;
import { localize } from '../../../../../nls.js';
import { toAction } from '../../../../../base/common/actions.js';
import { createErrorWithActions } from '../../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { isDefined } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { Memento } from '../../../../common/memento.js';
import { notebookPreloadExtensionPoint, notebookRendererExtensionPoint, notebooksExtensionPoint } from '../notebookExtensionPoint.js';
import { NotebookDiffEditorInput } from '../../common/notebookDiffEditorInput.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER, CellUri, NotebookSetting, MimeTypeDisplayOrder, NotebookEditorPriority, NOTEBOOK_DISPLAY_ORDER, RENDERER_EQUIVALENT_EXTENSIONS, RENDERER_NOT_AVAILABLE } from '../../common/notebookCommon.js';
import { NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
import { NotebookOutputRendererInfo, NotebookStaticPreloadInfo as NotebookStaticPreloadInfo } from '../../common/notebookOutputRenderer.js';
import { NotebookProviderInfo } from '../../common/notebookProvider.js';
import { SimpleNotebookProviderInfo } from '../../common/notebookService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../../services/editor/common/editorResolverService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import { InstallRecommendedExtensionAction } from '../../../extensions/browser/extensionsActions.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { INotebookDocumentService } from '../../../../services/notebook/common/notebookDocumentService.js';
import { MergeEditorInput } from '../../../mergeEditor/browser/mergeEditorInput.js';
import { bufferToStream, streamToBuffer, VSBuffer } from '../../../../../base/common/buffer.js';
import { NotebookMultiDiffEditorInput } from '../diff/notebookMultiDiffEditorInput.js';
import { CancellationError } from '../../../../../base/common/errors.js';
let NotebookProviderInfoStore = class NotebookProviderInfoStore extends Disposable {
    static { NotebookProviderInfoStore_1 = this; }
    static { this.CUSTOM_EDITORS_STORAGE_ID = 'notebookEditors'; }
    static { this.CUSTOM_EDITORS_ENTRY_ID = 'editors'; }
    constructor(storageService, extensionService, _editorResolverService, _configurationService, _accessibilityService, _instantiationService, _fileService, _notebookEditorModelResolverService, uriIdentService) {
        super();
        this._editorResolverService = _editorResolverService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._instantiationService = _instantiationService;
        this._fileService = _fileService;
        this._notebookEditorModelResolverService = _notebookEditorModelResolverService;
        this.uriIdentService = uriIdentService;
        this._handled = false;
        this._contributedEditors = new Map();
        this._contributedEditorDisposables = this._register(new DisposableStore());
        this._memento = new Memento(NotebookProviderInfoStore_1.CUSTOM_EDITORS_STORAGE_ID, storageService);
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        // Process the notebook contributions but buffer changes from the resolver
        this._editorResolverService.bufferChangeEvents(() => {
            for (const info of (mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] || [])) {
                this.add(new NotebookProviderInfo(info), false);
            }
        });
        this._register(extensionService.onDidRegisterExtensions(() => {
            if (!this._handled) {
                // there is no extension point registered for notebook content provider
                // clear the memento and cache
                this._clear();
                mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = [];
                this._memento.saveMemento();
            }
        }));
        notebooksExtensionPoint.setHandler(extensions => this._setupHandler(extensions));
    }
    dispose() {
        this._clear();
        super.dispose();
    }
    _setupHandler(extensions) {
        this._handled = true;
        const builtins = [...this._contributedEditors.values()].filter(info => !info.extension);
        this._clear();
        const builtinProvidersFromCache = new Map();
        builtins.forEach(builtin => {
            builtinProvidersFromCache.set(builtin.id, this.add(builtin));
        });
        for (const extension of extensions) {
            for (const notebookContribution of extension.value) {
                if (!notebookContribution.type) {
                    extension.collector.error(`Notebook does not specify type-property`);
                    continue;
                }
                const existing = this.get(notebookContribution.type);
                if (existing) {
                    if (!existing.extension && extension.description.isBuiltin && builtins.find(builtin => builtin.id === notebookContribution.type)) {
                        // we are registering an extension which is using the same view type which is already cached
                        builtinProvidersFromCache.get(notebookContribution.type)?.dispose();
                    }
                    else {
                        extension.collector.error(`Notebook type '${notebookContribution.type}' already used`);
                        continue;
                    }
                }
                this.add(new NotebookProviderInfo({
                    extension: extension.description.identifier,
                    id: notebookContribution.type,
                    displayName: notebookContribution.displayName,
                    selectors: notebookContribution.selector || [],
                    priority: this._convertPriority(notebookContribution.priority),
                    providerDisplayName: extension.description.displayName ?? extension.description.identifier.value,
                }));
            }
        }
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contributedEditors.values());
        this._memento.saveMemento();
    }
    clearEditorCache() {
        const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = [];
        this._memento.saveMemento();
    }
    _convertPriority(priority) {
        if (!priority) {
            return RegisteredEditorPriority.default;
        }
        if (priority === NotebookEditorPriority.default) {
            return RegisteredEditorPriority.default;
        }
        return RegisteredEditorPriority.option;
    }
    _registerContributionPoint(notebookProviderInfo) {
        const disposables = new DisposableStore();
        for (const selector of notebookProviderInfo.selectors) {
            const globPattern = selector.include || selector;
            const notebookEditorInfo = {
                id: notebookProviderInfo.id,
                label: notebookProviderInfo.displayName,
                detail: notebookProviderInfo.providerDisplayName,
                priority: notebookProviderInfo.priority,
            };
            const notebookEditorOptions = {
                canHandleDiff: () => !!this._configurationService.getValue(NotebookSetting.textDiffEditorPreview) && !this._accessibilityService.isScreenReaderOptimized(),
                canSupportResource: (resource) => {
                    if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                        const params = new URLSearchParams(resource.query);
                        return params.get('openIn') === 'notebook';
                    }
                    return resource.scheme === Schemas.untitled || resource.scheme === Schemas.vscodeNotebookCell || this._fileService.hasProvider(resource);
                }
            };
            const notebookEditorInputFactory = async ({ resource, options }) => {
                let data;
                if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                    const outputUriData = CellUri.parseCellOutputUri(resource);
                    if (!outputUriData || !outputUriData.notebook || outputUriData.cellHandle === undefined) {
                        throw new Error('Invalid cell output uri');
                    }
                    data = {
                        notebook: outputUriData.notebook,
                        handle: outputUriData.cellHandle
                    };
                }
                else {
                    data = CellUri.parse(resource);
                }
                let notebookUri;
                let cellOptions;
                if (data) {
                    // resource is a notebook cell
                    notebookUri = this.uriIdentService.asCanonicalUri(data.notebook);
                    cellOptions = { resource, options };
                }
                else {
                    notebookUri = this.uriIdentService.asCanonicalUri(resource);
                }
                if (!cellOptions) {
                    cellOptions = options?.cellOptions;
                }
                let notebookOptions;
                if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                    if (data?.handle === undefined || !data?.notebook) {
                        throw new Error('Invalid cell handle');
                    }
                    const cellUri = CellUri.generate(data.notebook, data.handle);
                    cellOptions = { resource: cellUri, options };
                    const cellIndex = await this._notebookEditorModelResolverService.resolve(notebookUri)
                        .then(model => model.object.notebook.cells.findIndex(cell => cell.handle === data?.handle))
                        .then(index => index >= 0 ? index : 0);
                    const cellIndexesToRanges = [{ start: cellIndex, end: cellIndex + 1 }];
                    notebookOptions = {
                        ...options,
                        cellOptions,
                        viewState: undefined,
                        cellSelections: cellIndexesToRanges
                    };
                }
                else {
                    notebookOptions = {
                        ...options,
                        cellOptions,
                        viewState: undefined,
                    };
                }
                const preferredResourceParam = cellOptions?.resource;
                const editor = NotebookEditorInput.getOrCreate(this._instantiationService, notebookUri, preferredResourceParam, notebookProviderInfo.id);
                return { editor, options: notebookOptions };
            };
            const notebookUntitledEditorFactory = async ({ resource, options }) => {
                const ref = await this._notebookEditorModelResolverService.resolve({ untitledResource: resource }, notebookProviderInfo.id);
                // untitled notebooks are disposed when they get saved. we should not hold a reference
                // to such a disposed notebook and therefore dispose the reference as well
                Event.once(ref.object.notebook.onWillDispose)(() => {
                    ref.dispose();
                });
                return { editor: NotebookEditorInput.getOrCreate(this._instantiationService, ref.object.resource, undefined, notebookProviderInfo.id), options };
            };
            const notebookDiffEditorInputFactory = (diffEditorInput, group) => {
                const { modified, original, label, description } = diffEditorInput;
                if (this._configurationService.getValue('notebook.experimental.enableNewDiffEditor')) {
                    return { editor: NotebookMultiDiffEditorInput.create(this._instantiationService, modified.resource, label, description, original.resource, notebookProviderInfo.id) };
                }
                return { editor: NotebookDiffEditorInput.create(this._instantiationService, modified.resource, label, description, original.resource, notebookProviderInfo.id) };
            };
            const mergeEditorInputFactory = (mergeEditor) => {
                return {
                    editor: this._instantiationService.createInstance(MergeEditorInput, mergeEditor.base.resource, {
                        uri: mergeEditor.input1.resource,
                        title: mergeEditor.input1.label ?? basename(mergeEditor.input1.resource),
                        description: mergeEditor.input1.description ?? '',
                        detail: mergeEditor.input1.detail
                    }, {
                        uri: mergeEditor.input2.resource,
                        title: mergeEditor.input2.label ?? basename(mergeEditor.input2.resource),
                        description: mergeEditor.input2.description ?? '',
                        detail: mergeEditor.input2.detail
                    }, mergeEditor.result.resource)
                };
            };
            const notebookFactoryObject = {
                createEditorInput: notebookEditorInputFactory,
                createDiffEditorInput: notebookDiffEditorInputFactory,
                createUntitledEditorInput: notebookUntitledEditorFactory,
                createMergeEditorInput: mergeEditorInputFactory
            };
            const notebookCellFactoryObject = {
                createEditorInput: notebookEditorInputFactory,
                createDiffEditorInput: notebookDiffEditorInputFactory,
            };
            // TODO @lramos15 find a better way to toggle handling diff editors than needing these listeners for every registration
            // This is a lot of event listeners especially if there are many notebooks
            disposables.add(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(NotebookSetting.textDiffEditorPreview)) {
                    const canHandleDiff = !!this._configurationService.getValue(NotebookSetting.textDiffEditorPreview) && !this._accessibilityService.isScreenReaderOptimized();
                    if (canHandleDiff) {
                        notebookFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                        notebookCellFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                    }
                    else {
                        notebookFactoryObject.createDiffEditorInput = undefined;
                        notebookCellFactoryObject.createDiffEditorInput = undefined;
                    }
                }
            }));
            disposables.add(this._accessibilityService.onDidChangeScreenReaderOptimized(() => {
                const canHandleDiff = !!this._configurationService.getValue(NotebookSetting.textDiffEditorPreview) && !this._accessibilityService.isScreenReaderOptimized();
                if (canHandleDiff) {
                    notebookFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                    notebookCellFactoryObject.createDiffEditorInput = notebookDiffEditorInputFactory;
                }
                else {
                    notebookFactoryObject.createDiffEditorInput = undefined;
                    notebookCellFactoryObject.createDiffEditorInput = undefined;
                }
            }));
            // Register the notebook editor
            disposables.add(this._editorResolverService.registerEditor(globPattern, notebookEditorInfo, notebookEditorOptions, notebookFactoryObject));
            // Then register the schema handler as exclusive for that notebook
            disposables.add(this._editorResolverService.registerEditor(`${Schemas.vscodeNotebookCell}:/**/${globPattern}`, { ...notebookEditorInfo, priority: RegisteredEditorPriority.exclusive }, notebookEditorOptions, notebookCellFactoryObject));
        }
        return disposables;
    }
    _clear() {
        this._contributedEditors.clear();
        this._contributedEditorDisposables.clear();
    }
    get(viewType) {
        return this._contributedEditors.get(viewType);
    }
    add(info, saveMemento = true) {
        if (this._contributedEditors.has(info.id)) {
            throw new Error(`notebook type '${info.id}' ALREADY EXISTS`);
        }
        this._contributedEditors.set(info.id, info);
        let editorRegistration;
        // built-in notebook providers contribute their own editors
        if (info.extension) {
            editorRegistration = this._registerContributionPoint(info);
            this._contributedEditorDisposables.add(editorRegistration);
        }
        if (saveMemento) {
            const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contributedEditors.values());
            this._memento.saveMemento();
        }
        return this._register(toDisposable(() => {
            const mementoObject = this._memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
            mementoObject[NotebookProviderInfoStore_1.CUSTOM_EDITORS_ENTRY_ID] = Array.from(this._contributedEditors.values());
            this._memento.saveMemento();
            editorRegistration?.dispose();
            this._contributedEditors.delete(info.id);
        }));
    }
    getContributedNotebook(resource) {
        const result = [];
        for (const info of this._contributedEditors.values()) {
            if (info.matches(resource)) {
                result.push(info);
            }
        }
        if (result.length === 0 && resource.scheme === Schemas.untitled) {
            // untitled resource and no path-specific match => all providers apply
            return Array.from(this._contributedEditors.values());
        }
        return result;
    }
    [Symbol.iterator]() {
        return this._contributedEditors.values();
    }
};
NotebookProviderInfoStore = NotebookProviderInfoStore_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IExtensionService),
    __param(2, IEditorResolverService),
    __param(3, IConfigurationService),
    __param(4, IAccessibilityService),
    __param(5, IInstantiationService),
    __param(6, IFileService),
    __param(7, INotebookEditorModelResolverService),
    __param(8, IUriIdentityService)
], NotebookProviderInfoStore);
export { NotebookProviderInfoStore };
let NotebookOutputRendererInfoStore = class NotebookOutputRendererInfoStore {
    constructor(storageService) {
        this.contributedRenderers = new Map();
        this.preferredMimetype = new Lazy(() => this.preferredMimetypeMemento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */));
        this.preferredMimetypeMemento = new Memento('workbench.editor.notebook.preferredRenderer2', storageService);
    }
    clear() {
        this.contributedRenderers.clear();
    }
    get(rendererId) {
        return this.contributedRenderers.get(rendererId);
    }
    getAll() {
        return Array.from(this.contributedRenderers.values());
    }
    add(info) {
        if (this.contributedRenderers.has(info.id)) {
            return;
        }
        this.contributedRenderers.set(info.id, info);
    }
    /** Update and remember the preferred renderer for the given mimetype in this workspace */
    setPreferred(notebookProviderInfo, mimeType, rendererId) {
        const mementoObj = this.preferredMimetype.value;
        const forNotebook = mementoObj[notebookProviderInfo.id];
        if (forNotebook) {
            forNotebook[mimeType] = rendererId;
        }
        else {
            mementoObj[notebookProviderInfo.id] = { [mimeType]: rendererId };
        }
        this.preferredMimetypeMemento.saveMemento();
    }
    findBestRenderers(notebookProviderInfo, mimeType, kernelProvides) {
        let ReuseOrder;
        (function (ReuseOrder) {
            ReuseOrder[ReuseOrder["PreviouslySelected"] = 256] = "PreviouslySelected";
            ReuseOrder[ReuseOrder["SameExtensionAsNotebook"] = 512] = "SameExtensionAsNotebook";
            ReuseOrder[ReuseOrder["OtherRenderer"] = 768] = "OtherRenderer";
            ReuseOrder[ReuseOrder["BuiltIn"] = 1024] = "BuiltIn";
        })(ReuseOrder || (ReuseOrder = {}));
        const preferred = notebookProviderInfo && this.preferredMimetype.value[notebookProviderInfo.id]?.[mimeType];
        const notebookExtId = notebookProviderInfo?.extension?.value;
        const notebookId = notebookProviderInfo?.id;
        const renderers = Array.from(this.contributedRenderers.values())
            .map(renderer => {
            const ownScore = kernelProvides === undefined
                ? renderer.matchesWithoutKernel(mimeType)
                : renderer.matches(mimeType, kernelProvides);
            if (ownScore === 3 /* NotebookRendererMatch.Never */) {
                return undefined;
            }
            const rendererExtId = renderer.extensionId.value;
            const reuseScore = preferred === renderer.id
                ? 256 /* ReuseOrder.PreviouslySelected */
                : rendererExtId === notebookExtId || RENDERER_EQUIVALENT_EXTENSIONS.get(rendererExtId)?.has(notebookId)
                    ? 512 /* ReuseOrder.SameExtensionAsNotebook */
                    : renderer.isBuiltin ? 1024 /* ReuseOrder.BuiltIn */ : 768 /* ReuseOrder.OtherRenderer */;
            return {
                ordered: { mimeType, rendererId: renderer.id, isTrusted: true },
                score: reuseScore | ownScore,
            };
        }).filter(isDefined);
        if (renderers.length === 0) {
            return [{ mimeType, rendererId: RENDERER_NOT_AVAILABLE, isTrusted: true }];
        }
        return renderers.sort((a, b) => a.score - b.score).map(r => r.ordered);
    }
};
NotebookOutputRendererInfoStore = __decorate([
    __param(0, IStorageService)
], NotebookOutputRendererInfoStore);
export { NotebookOutputRendererInfoStore };
class ModelData {
    get uri() { return this.model.uri; }
    constructor(model, onWillDispose) {
        this.model = model;
        this._modelEventListeners = new DisposableStore();
        this._modelEventListeners.add(model.onWillDispose(() => onWillDispose(model)));
    }
    getCellIndex(cellUri) {
        return this.model.cells.findIndex(cell => isEqual(cell.uri, cellUri));
    }
    dispose() {
        this._modelEventListeners.dispose();
    }
}
let NotebookService = class NotebookService extends Disposable {
    static { NotebookService_1 = this; }
    static { this._storageNotebookViewTypeProvider = 'notebook.viewTypeProvider'; }
    get notebookProviderInfoStore() {
        if (!this._notebookProviderInfoStore) {
            this._notebookProviderInfoStore = this._register(this._instantiationService.createInstance(NotebookProviderInfoStore));
        }
        return this._notebookProviderInfoStore;
    }
    constructor(_extensionService, _configurationService, _accessibilityService, _instantiationService, _storageService, _notebookDocumentService) {
        super();
        this._extensionService = _extensionService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._notebookDocumentService = _notebookDocumentService;
        this._notebookProviders = new Map();
        this._notebookProviderInfoStore = undefined;
        this._notebookRenderersInfoStore = this._instantiationService.createInstance(NotebookOutputRendererInfoStore);
        this._onDidChangeOutputRenderers = this._register(new Emitter());
        this.onDidChangeOutputRenderers = this._onDidChangeOutputRenderers.event;
        this._notebookStaticPreloadInfoStore = new Set();
        this._models = new ResourceMap();
        this._onWillAddNotebookDocument = this._register(new Emitter());
        this._onDidAddNotebookDocument = this._register(new Emitter());
        this._onWillRemoveNotebookDocument = this._register(new Emitter());
        this._onDidRemoveNotebookDocument = this._register(new Emitter());
        this.onWillAddNotebookDocument = this._onWillAddNotebookDocument.event;
        this.onDidAddNotebookDocument = this._onDidAddNotebookDocument.event;
        this.onDidRemoveNotebookDocument = this._onDidRemoveNotebookDocument.event;
        this.onWillRemoveNotebookDocument = this._onWillRemoveNotebookDocument.event;
        this._onAddViewType = this._register(new Emitter());
        this.onAddViewType = this._onAddViewType.event;
        this._onWillRemoveViewType = this._register(new Emitter());
        this.onWillRemoveViewType = this._onWillRemoveViewType.event;
        this._onDidChangeEditorTypes = this._register(new Emitter());
        this.onDidChangeEditorTypes = this._onDidChangeEditorTypes.event;
        this._lastClipboardIsCopy = true;
        notebookRendererExtensionPoint.setHandler((renderers) => {
            this._notebookRenderersInfoStore.clear();
            for (const extension of renderers) {
                for (const notebookContribution of extension.value) {
                    if (!notebookContribution.entrypoint) { // avoid crashing
                        extension.collector.error(`Notebook renderer does not specify entry point`);
                        continue;
                    }
                    const id = notebookContribution.id;
                    if (!id) {
                        extension.collector.error(`Notebook renderer does not specify id-property`);
                        continue;
                    }
                    this._notebookRenderersInfoStore.add(new NotebookOutputRendererInfo({
                        id,
                        extension: extension.description,
                        entrypoint: notebookContribution.entrypoint,
                        displayName: notebookContribution.displayName,
                        mimeTypes: notebookContribution.mimeTypes || [],
                        dependencies: notebookContribution.dependencies,
                        optionalDependencies: notebookContribution.optionalDependencies,
                        requiresMessaging: notebookContribution.requiresMessaging,
                    }));
                }
            }
            this._onDidChangeOutputRenderers.fire();
        });
        notebookPreloadExtensionPoint.setHandler(extensions => {
            this._notebookStaticPreloadInfoStore.clear();
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'contribNotebookStaticPreloads')) {
                    continue;
                }
                for (const notebookContribution of extension.value) {
                    if (!notebookContribution.entrypoint) { // avoid crashing
                        extension.collector.error(`Notebook preload does not specify entry point`);
                        continue;
                    }
                    const type = notebookContribution.type;
                    if (!type) {
                        extension.collector.error(`Notebook preload does not specify type-property`);
                        continue;
                    }
                    this._notebookStaticPreloadInfoStore.add(new NotebookStaticPreloadInfo({
                        type,
                        extension: extension.description,
                        entrypoint: notebookContribution.entrypoint,
                        localResourceRoots: notebookContribution.localResourceRoots ?? [],
                    }));
                }
            }
        });
        const updateOrder = () => {
            this._displayOrder = new MimeTypeDisplayOrder(this._configurationService.getValue(NotebookSetting.displayOrder) || [], this._accessibilityService.isScreenReaderOptimized()
                ? ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER
                : NOTEBOOK_DISPLAY_ORDER);
        };
        updateOrder();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(NotebookSetting.displayOrder)) {
                updateOrder();
            }
        }));
        this._register(this._accessibilityService.onDidChangeScreenReaderOptimized(() => {
            updateOrder();
        }));
        this._memento = new Memento(NotebookService_1._storageNotebookViewTypeProvider, this._storageService);
        this._viewTypeCache = this._memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    getEditorTypes() {
        return [...this.notebookProviderInfoStore].map(info => ({
            id: info.id,
            displayName: info.displayName,
            providerDisplayName: info.providerDisplayName
        }));
    }
    clearEditorCache() {
        this.notebookProviderInfoStore.clearEditorCache();
    }
    _postDocumentOpenActivation(viewType) {
        // send out activations on notebook text model creation
        this._extensionService.activateByEvent(`onNotebook:${viewType}`);
        this._extensionService.activateByEvent(`onNotebook:*`);
    }
    async canResolve(viewType) {
        if (this._notebookProviders.has(viewType)) {
            return true;
        }
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._extensionService.activateByEvent(`onNotebookSerializer:${viewType}`);
        return this._notebookProviders.has(viewType);
    }
    registerContributedNotebookType(viewType, data) {
        const info = new NotebookProviderInfo({
            extension: data.extension,
            id: viewType,
            displayName: data.displayName,
            providerDisplayName: data.providerDisplayName,
            priority: data.priority || RegisteredEditorPriority.default,
            selectors: []
        });
        info.update({ selectors: data.filenamePattern });
        const reg = this.notebookProviderInfoStore.add(info);
        this._onDidChangeEditorTypes.fire();
        return toDisposable(() => {
            reg.dispose();
            this._onDidChangeEditorTypes.fire();
        });
    }
    _registerProviderData(viewType, data) {
        if (this._notebookProviders.has(viewType)) {
            throw new Error(`notebook provider for viewtype '${viewType}' already exists`);
        }
        this._notebookProviders.set(viewType, data);
        this._onAddViewType.fire(viewType);
        return toDisposable(() => {
            this._onWillRemoveViewType.fire(viewType);
            this._notebookProviders.delete(viewType);
        });
    }
    registerNotebookSerializer(viewType, extensionData, serializer) {
        this.notebookProviderInfoStore.get(viewType)?.update({ options: serializer.options });
        this._viewTypeCache[viewType] = extensionData.id.value;
        this._persistMementos();
        return this._registerProviderData(viewType, new SimpleNotebookProviderInfo(viewType, serializer, extensionData));
    }
    async withNotebookDataProvider(viewType) {
        const selected = this.notebookProviderInfoStore.get(viewType);
        if (!selected) {
            const knownProvider = this.getViewTypeProvider(viewType);
            const actions = knownProvider ? [
                toAction({
                    id: 'workbench.notebook.action.installMissingViewType', label: localize('notebookOpenInstallMissingViewType', "Install extension for '{0}'", viewType), run: async () => {
                        await this._instantiationService.createInstance(InstallRecommendedExtensionAction, knownProvider).run();
                    }
                })
            ] : [];
            throw createErrorWithActions(`UNKNOWN notebook type '${viewType}'`, actions);
        }
        await this.canResolve(selected.id);
        const result = this._notebookProviders.get(selected.id);
        if (!result) {
            throw new Error(`NO provider registered for view type: '${selected.id}'`);
        }
        return result;
    }
    tryGetDataProviderSync(viewType) {
        const selected = this.notebookProviderInfoStore.get(viewType);
        if (!selected) {
            return undefined;
        }
        return this._notebookProviders.get(selected.id);
    }
    _persistMementos() {
        this._memento.saveMemento();
    }
    getViewTypeProvider(viewType) {
        return this._viewTypeCache[viewType];
    }
    getRendererInfo(rendererId) {
        return this._notebookRenderersInfoStore.get(rendererId);
    }
    updateMimePreferredRenderer(viewType, mimeType, rendererId, otherMimetypes) {
        const info = this.notebookProviderInfoStore.get(viewType);
        if (info) {
            this._notebookRenderersInfoStore.setPreferred(info, mimeType, rendererId);
        }
        this._displayOrder.prioritize(mimeType, otherMimetypes);
    }
    saveMimeDisplayOrder(target) {
        this._configurationService.updateValue(NotebookSetting.displayOrder, this._displayOrder.toArray(), target);
    }
    getRenderers() {
        return this._notebookRenderersInfoStore.getAll();
    }
    *getStaticPreloads(viewType) {
        for (const preload of this._notebookStaticPreloadInfoStore) {
            if (preload.type === viewType) {
                yield preload;
            }
        }
    }
    // --- notebook documents: create, destory, retrieve, enumerate
    async createNotebookTextModel(viewType, uri, stream) {
        if (this._models.has(uri)) {
            throw new Error(`notebook for ${uri} already exists`);
        }
        const info = await this.withNotebookDataProvider(viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        const bytes = stream ? await streamToBuffer(stream) : VSBuffer.fromByteArray([]);
        const data = await info.serializer.dataToNotebook(bytes);
        const notebookModel = this._instantiationService.createInstance(NotebookTextModel, info.viewType, uri, data.cells, data.metadata, info.serializer.options);
        const modelData = new ModelData(notebookModel, this._onWillDisposeDocument.bind(this));
        this._models.set(uri, modelData);
        this._notebookDocumentService.addNotebookDocument(modelData);
        this._onWillAddNotebookDocument.fire(notebookModel);
        this._onDidAddNotebookDocument.fire(notebookModel);
        this._postDocumentOpenActivation(info.viewType);
        return notebookModel;
    }
    async createNotebookTextDocumentSnapshot(uri, context, token) {
        const model = this.getNotebookTextModel(uri);
        if (!model) {
            throw new Error(`notebook for ${uri} doesn't exist`);
        }
        const info = await this.withNotebookDataProvider(model.viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        const serializer = info.serializer;
        const outputSizeLimit = this._configurationService.getValue(NotebookSetting.outputBackupSizeLimit) * 1024;
        const data = model.createSnapshot({ context: context, outputSizeLimit: outputSizeLimit, transientOptions: serializer.options });
        const indentAmount = model.metadata.indentAmount;
        if (typeof indentAmount === 'string' && indentAmount) {
            // This is required for ipynb serializer to preserve the whitespace in the notebook.
            data.metadata.indentAmount = indentAmount;
        }
        const bytes = await serializer.notebookToData(data);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        return bufferToStream(bytes);
    }
    async restoreNotebookTextModelFromSnapshot(uri, viewType, snapshot) {
        const model = this.getNotebookTextModel(uri);
        if (!model) {
            throw new Error(`notebook for ${uri} doesn't exist`);
        }
        const info = await this.withNotebookDataProvider(model.viewType);
        if (!(info instanceof SimpleNotebookProviderInfo)) {
            throw new Error('CANNOT open file notebook with this provider');
        }
        const serializer = info.serializer;
        const bytes = await streamToBuffer(snapshot);
        const data = await info.serializer.dataToNotebook(bytes);
        model.restoreSnapshot(data, serializer.options);
        return model;
    }
    getNotebookTextModel(uri) {
        return this._models.get(uri)?.model;
    }
    getNotebookTextModels() {
        return Iterable.map(this._models.values(), data => data.model);
    }
    listNotebookDocuments() {
        return [...this._models].map(e => e[1].model);
    }
    _onWillDisposeDocument(model) {
        const modelData = this._models.get(model.uri);
        if (modelData) {
            this._onWillRemoveNotebookDocument.fire(modelData.model);
            this._models.delete(model.uri);
            this._notebookDocumentService.removeNotebookDocument(modelData);
            modelData.dispose();
            this._onDidRemoveNotebookDocument.fire(modelData.model);
        }
    }
    getOutputMimeTypeInfo(textModel, kernelProvides, output) {
        const sorted = this._displayOrder.sort(new Set(output.outputs.map(op => op.mime)));
        const notebookProviderInfo = this.notebookProviderInfoStore.get(textModel.viewType);
        return sorted
            .flatMap(mimeType => this._notebookRenderersInfoStore.findBestRenderers(notebookProviderInfo, mimeType, kernelProvides))
            .sort((a, b) => (a.rendererId === RENDERER_NOT_AVAILABLE ? 1 : 0) - (b.rendererId === RENDERER_NOT_AVAILABLE ? 1 : 0));
    }
    getContributedNotebookTypes(resource) {
        if (resource) {
            return this.notebookProviderInfoStore.getContributedNotebook(resource);
        }
        return [...this.notebookProviderInfoStore];
    }
    hasSupportedNotebooks(resource) {
        if (this._models.has(resource)) {
            // it might be untitled
            return true;
        }
        const contribution = this.notebookProviderInfoStore.getContributedNotebook(resource);
        if (!contribution.length) {
            return false;
        }
        return contribution.some(info => info.matches(resource) &&
            (info.priority === RegisteredEditorPriority.default || info.priority === RegisteredEditorPriority.exclusive));
    }
    getContributedNotebookType(viewType) {
        return this.notebookProviderInfoStore.get(viewType);
    }
    getNotebookProviderResourceRoots() {
        const ret = [];
        this._notebookProviders.forEach(val => {
            if (val.extensionData.location) {
                ret.push(URI.revive(val.extensionData.location));
            }
        });
        return ret;
    }
    // --- copy & paste
    setToCopy(items, isCopy) {
        this._cutItems = items;
        this._lastClipboardIsCopy = isCopy;
    }
    getToCopy() {
        if (this._cutItems) {
            return { items: this._cutItems, isCopy: this._lastClipboardIsCopy };
        }
        return undefined;
    }
};
NotebookService = NotebookService_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService),
    __param(2, IAccessibilityService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, INotebookDocumentService)
], NotebookService);
export { NotebookService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsTUFBTSwrREFBK0Qs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