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
var MultiDiffEditorInput_1;
import { LazyStatefulPromise, raceTimeout } from '../../../../base/common/async.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Event, ValueWithChangeEvent } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { deepClone } from '../../../../base/common/objects.js';
import { ObservableLazyPromise, ValueWithChangeEventFromObservable, autorun, constObservable, derived, mapObservableArrayCached, observableFromEvent, observableFromValueWithChangeEvent, observableValue, recomputeInitiallyAndOnChange } from '../../../../base/common/observable.js';
import { isDefined, isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { RefCounted } from '../../../../editor/browser/widget/diffEditor/utils.js';
import { MultiDiffEditorViewModel } from '../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorViewModel.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { MultiDiffEditorIcon } from './icons.contribution.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem } from './multiDiffSourceResolverService.js';
let MultiDiffEditorInput = class MultiDiffEditorInput extends EditorInput {
    static { MultiDiffEditorInput_1 = this; }
    static fromResourceMultiDiffEditorInput(input, instantiationService) {
        if (!input.multiDiffSource && !input.resources) {
            throw new BugIndicatingError('MultiDiffEditorInput requires either multiDiffSource or resources');
        }
        const multiDiffSource = input.multiDiffSource ?? URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
        return instantiationService.createInstance(MultiDiffEditorInput_1, multiDiffSource, input.label, input.resources?.map(resource => {
            return new MultiDiffEditorItem(resource.original.resource, resource.modified.resource, resource.goToFileResource);
        }), input.isTransient ?? false);
    }
    static fromSerialized(data, instantiationService) {
        return instantiationService.createInstance(MultiDiffEditorInput_1, URI.parse(data.multiDiffSourceUri), data.label, data.resources?.map(resource => new MultiDiffEditorItem(resource.originalUri ? URI.parse(resource.originalUri) : undefined, resource.modifiedUri ? URI.parse(resource.modifiedUri) : undefined, resource.goToFileUri ? URI.parse(resource.goToFileUri) : undefined)), false);
    }
    static { this.ID = 'workbench.input.multiDiffEditor'; }
    get resource() { return this.multiDiffSource; }
    get capabilities() { return 2 /* EditorInputCapabilities.Readonly */; }
    get typeId() { return MultiDiffEditorInput_1.ID; }
    getName() { return this._name; }
    get editorId() { return DEFAULT_EDITOR_ASSOCIATION.id; }
    getIcon() { return MultiDiffEditorIcon; }
    constructor(multiDiffSource, label, initialResources, isTransient = false, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService) {
        super();
        this.multiDiffSource = multiDiffSource;
        this.label = label;
        this.initialResources = initialResources;
        this.isTransient = isTransient;
        this._textModelService = _textModelService;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._instantiationService = _instantiationService;
        this._multiDiffSourceResolverService = _multiDiffSourceResolverService;
        this._textFileService = _textFileService;
        this._name = '';
        this._viewModel = new LazyStatefulPromise(async () => {
            const model = await this._createModel();
            this._register(model);
            const vm = new MultiDiffEditorViewModel(model, this._instantiationService);
            this._register(vm);
            await raceTimeout(vm.waitForDiffs(), 1000);
            return vm;
        });
        this._resolvedSource = new ObservableLazyPromise(async () => {
            const source = this.initialResources
                ? { resources: ValueWithChangeEvent.const(this.initialResources) }
                : await this._multiDiffSourceResolverService.resolve(this.multiDiffSource);
            return {
                source,
                resources: source ? observableFromValueWithChangeEvent(this, source.resources) : constObservable([]),
            };
        });
        this.resources = derived(this, reader => this._resolvedSource.cachedPromiseResult.read(reader)?.data?.resources.read(reader));
        this.textFileServiceOnDidChange = new FastEventDispatcher(this._textFileService.files.onDidChangeDirty, item => item.resource.toString(), uri => uri.toString());
        this._isDirtyObservables = mapObservableArrayCached(this, this.resources.map(r => r ?? []), res => {
            const isModifiedDirty = res.modifiedUri ? isUriDirty(this.textFileServiceOnDidChange, this._textFileService, res.modifiedUri) : constObservable(false);
            const isOriginalDirty = res.originalUri ? isUriDirty(this.textFileServiceOnDidChange, this._textFileService, res.originalUri) : constObservable(false);
            return derived(reader => /** @description modifiedDirty||originalDirty */ isModifiedDirty.read(reader) || isOriginalDirty.read(reader));
        }, i => i.getKey());
        this._isDirtyObservable = derived(this, reader => this._isDirtyObservables.read(reader).some(isDirty => isDirty.read(reader)))
            .keepObserved(this._store);
        this.onDidChangeDirty = Event.fromObservableLight(this._isDirtyObservable);
        this.closeHandler = {
            // This is a workaround for not having a better way
            // to figure out if the editors this input wraps
            // around are opened or not
            async confirm() {
                return 1 /* ConfirmResult.DONT_SAVE */;
            },
            showConfirm() {
                return false;
            }
        };
        this._register(autorun((reader) => {
            /** @description Updates name */
            const resources = this.resources.read(reader);
            const label = this.label ?? localize('name', "Multi Diff Editor");
            if (resources && resources.length === 1) {
                this._name = localize({ key: 'nameWithOneFile', comment: ['{0} is the name of the editor'] }, "{0} (1 file)", label);
            }
            else if (resources) {
                this._name = localize({ key: 'nameWithFiles', comment: ['{0} is the name of the editor', '{1} is the number of files being shown'] }, "{0} ({1} files)", label, resources.length);
            }
            else {
                this._name = label;
            }
            this._onDidChangeLabel.fire();
        }));
    }
    serialize() {
        return {
            label: this.label,
            multiDiffSourceUri: this.multiDiffSource.toString(),
            resources: this.initialResources?.map(resource => ({
                originalUri: resource.originalUri?.toString(),
                modifiedUri: resource.modifiedUri?.toString(),
                goToFileUri: resource.goToFileUri?.toString(),
            })),
        };
    }
    setLanguageId(languageId, source) {
        const activeDiffItem = this._viewModel.requireValue().activeDiffItem.get();
        const value = activeDiffItem?.documentDiffItem;
        if (!value) {
            return;
        }
        const target = value.modified ?? value.original;
        if (!target) {
            return;
        }
        target.setLanguage(languageId, source);
    }
    async getViewModel() {
        return this._viewModel.getPromise();
    }
    async _createModel() {
        const source = await this._resolvedSource.getPromise();
        const textResourceConfigurationService = this._textResourceConfigurationService;
        const documentsWithPromises = mapObservableArrayCached(this, source.resources, async (r, store) => {
            /** @description documentsWithPromises */
            let original;
            let modified;
            const multiDiffItemStore = new DisposableStore();
            try {
                [original, modified] = await Promise.all([
                    r.originalUri ? this._textModelService.createModelReference(r.originalUri) : undefined,
                    r.modifiedUri ? this._textModelService.createModelReference(r.modifiedUri) : undefined,
                ]);
                if (original) {
                    multiDiffItemStore.add(original);
                }
                if (modified) {
                    multiDiffItemStore.add(modified);
                }
            }
            catch (e) {
                // e.g. "File seems to be binary and cannot be opened as text"
                console.error(e);
                onUnexpectedError(e);
                return undefined;
            }
            const uri = (r.modifiedUri ?? r.originalUri);
            const result = {
                multiDiffEditorItem: r,
                original: original?.object.textEditorModel,
                modified: modified?.object.textEditorModel,
                contextKeys: r.contextKeys,
                get options() {
                    return {
                        ...getReadonlyConfiguration(modified?.object.isReadonly() ?? true),
                        ...computeOptions(textResourceConfigurationService.getValue(uri)),
                    };
                },
                onOptionsDidChange: h => this._textResourceConfigurationService.onDidChangeConfiguration(e => {
                    if (e.affectsConfiguration(uri, 'editor') || e.affectsConfiguration(uri, 'diffEditor')) {
                        h();
                    }
                }),
            };
            return store.add(RefCounted.createOfNonDisposable(result, multiDiffItemStore, this));
        }, i => JSON.stringify([i.modifiedUri?.toString(), i.originalUri?.toString()]));
        const documents = observableValue('documents', 'loading');
        const updateDocuments = derived(async (reader) => {
            /** @description Update documents */
            const docsPromises = documentsWithPromises.read(reader);
            const docs = await Promise.all(docsPromises);
            const newDocuments = docs.filter(isDefined);
            documents.set(newDocuments, undefined);
        });
        const a = recomputeInitiallyAndOnChange(updateDocuments);
        await updateDocuments.get();
        const result = {
            dispose: () => a.dispose(),
            documents: new ValueWithChangeEventFromObservable(documents),
            contextKeys: source.source?.contextKeys,
        };
        return result;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof MultiDiffEditorInput_1) {
            return this.multiDiffSource.toString() === otherInput.multiDiffSource.toString();
        }
        return false;
    }
    isDirty() { return this._isDirtyObservable.get(); }
    async save(group, options) {
        await this.doSaveOrRevert('save', group, options);
        return this;
    }
    revert(group, options) {
        return this.doSaveOrRevert('revert', group, options);
    }
    async doSaveOrRevert(mode, group, options) {
        const items = this._viewModel.currentValue?.items.get();
        if (items) {
            await Promise.all(items.map(async (item) => {
                const model = item.diffEditorViewModel.model;
                const handleOriginal = model.original.uri.scheme !== Schemas.untitled && this._textFileService.isDirty(model.original.uri); // match diff editor behaviour
                await Promise.all([
                    handleOriginal ? mode === 'save' ? this._textFileService.save(model.original.uri, options) : this._textFileService.revert(model.original.uri, options) : Promise.resolve(),
                    mode === 'save' ? this._textFileService.save(model.modified.uri, options) : this._textFileService.revert(model.modified.uri, options),
                ]);
            }));
        }
        return undefined;
    }
};
MultiDiffEditorInput = MultiDiffEditorInput_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IMultiDiffSourceResolverService),
    __param(8, ITextFileService)
], MultiDiffEditorInput);
export { MultiDiffEditorInput };
/**
 * Uses a map to efficiently dispatch events to listeners that are interested in a specific key.
*/
class FastEventDispatcher {
    constructor(_event, _getEventArgsKey, _keyToString) {
        this._event = _event;
        this._getEventArgsKey = _getEventArgsKey;
        this._keyToString = _keyToString;
        this._count = 0;
        this._buckets = new Map();
        this._handleEventChange = (e) => {
            const key = this._getEventArgsKey(e);
            const bucket = this._buckets.get(key);
            if (bucket) {
                for (const listener of bucket) {
                    listener(e);
                }
            }
        };
    }
    filteredEvent(filter) {
        return listener => {
            const key = this._keyToString(filter);
            let bucket = this._buckets.get(key);
            if (!bucket) {
                bucket = new Set();
                this._buckets.set(key, bucket);
            }
            bucket.add(listener);
            this._count++;
            if (this._count === 1) {
                this._eventSubscription = this._event(this._handleEventChange);
            }
            return {
                dispose: () => {
                    bucket.delete(listener);
                    if (bucket.size === 0) {
                        this._buckets.delete(key);
                    }
                    this._count--;
                    if (this._count === 0) {
                        this._eventSubscription?.dispose();
                        this._eventSubscription = undefined;
                    }
                }
            };
        };
    }
}
function isUriDirty(onDidChangeDirty, textFileService, uri) {
    return observableFromEvent(onDidChangeDirty.filteredEvent(uri), () => textFileService.isDirty(uri));
}
function getReadonlyConfiguration(isReadonly) {
    return {
        readOnly: !!isReadonly,
        readOnlyMessage: typeof isReadonly !== 'boolean' ? isReadonly : undefined
    };
}
function computeOptions(configuration) {
    const editorConfiguration = deepClone(configuration.editor);
    // Handle diff editor specially by merging in diffEditor configuration
    if (isObject(configuration.diffEditor)) {
        const diffEditorConfiguration = deepClone(configuration.diffEditor);
        // User settings defines `diffEditor.codeLens`, but here we rename that to `diffEditor.diffCodeLens` to avoid collisions with `editor.codeLens`.
        diffEditorConfiguration.diffCodeLens = diffEditorConfiguration.codeLens;
        delete diffEditorConfiguration.codeLens;
        // User settings defines `diffEditor.wordWrap`, but here we rename that to `diffEditor.diffWordWrap` to avoid collisions with `editor.wordWrap`.
        diffEditorConfiguration.diffWordWrap = diffEditorConfiguration.wordWrap;
        delete diffEditorConfiguration.wordWrap;
        Object.assign(editorConfiguration, diffEditorConfiguration);
    }
    return editorConfiguration;
}
let MultiDiffEditorResolverContribution = class MultiDiffEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.multiDiffEditorResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        this._register(editorResolverService.registerEditor(`*`, {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createMultiDiffEditorInput: (multiDiffEditor) => {
                return {
                    editor: MultiDiffEditorInput.fromResourceMultiDiffEditorInput(multiDiffEditor, instantiationService),
                };
            },
        }));
    }
};
MultiDiffEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], MultiDiffEditorResolverContribution);
export { MultiDiffEditorResolverContribution };
export class MultiDiffEditorSerializer {
    canSerialize(editor) {
        return editor instanceof MultiDiffEditorInput && !editor.isTransient;
    }
    serialize(editor) {
        if (!this.canSerialize(editor)) {
            return undefined;
        }
        return JSON.stringify(editor.serialize());
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            const data = parse(serializedEditor);
            return MultiDiffEditorInput.fromSerialized(data, instantiationService);
        }
        catch (err) {
            onUnexpectedError(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbXVsdGlEaWZmRWRpdG9yL2Jyb3dzZXIvbXVsdGlEaWZmRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQTJCLE1BQU0sc0NBQXNDLENBQUM7QUFDNUcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGtDQUFrQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUFFLGtDQUFrQyxFQUFFLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRXhSLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVuRixPQUFP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