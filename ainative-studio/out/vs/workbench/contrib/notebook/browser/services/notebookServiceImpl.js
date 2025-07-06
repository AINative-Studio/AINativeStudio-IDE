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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvc2VydmljZXMvbm90ZWJvb2tTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUF1QixxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxD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