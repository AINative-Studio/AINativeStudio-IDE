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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { constObservable, derived, derivedObservableWithWritableCache, mapObservableArrayCached, observableFromValueWithChangeEvent, observableValue, transaction } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IModelService } from '../../../common/services/model.js';
import { DiffEditorOptions } from '../diffEditor/diffEditorOptions.js';
import { DiffEditorViewModel } from '../diffEditor/diffEditorViewModel.js';
import { RefCounted } from '../diffEditor/utils.js';
export class MultiDiffEditorViewModel extends Disposable {
    async waitForDiffs() {
        for (const d of this.items.get()) {
            await d.diffEditorViewModel.waitForDiff();
        }
    }
    collapseAll() {
        transaction(tx => {
            for (const d of this.items.get()) {
                d.collapsed.set(true, tx);
            }
        });
    }
    expandAll() {
        transaction(tx => {
            for (const d of this.items.get()) {
                d.collapsed.set(false, tx);
            }
        });
    }
    get contextKeys() {
        return this.model.contextKeys;
    }
    constructor(model, _instantiationService) {
        super();
        this.model = model;
        this._instantiationService = _instantiationService;
        this._documents = observableFromValueWithChangeEvent(this.model, this.model.documents);
        this._documentsArr = derived(this, reader => {
            const result = this._documents.read(reader);
            if (result === 'loading') {
                return [];
            }
            return result;
        });
        this.isLoading = derived(this, reader => this._documents.read(reader) === 'loading');
        this.items = mapObservableArrayCached(this, this._documentsArr, (d, store) => store.add(this._instantiationService.createInstance(DocumentDiffItemViewModel, d, this))).recomputeInitiallyAndOnChange(this._store);
        this.focusedDiffItem = derived(this, reader => this.items.read(reader).find(i => i.isFocused.read(reader)));
        this.activeDiffItem = derivedObservableWithWritableCache(this, (reader, lastValue) => this.focusedDiffItem.read(reader) ?? (lastValue && this.items.read(reader).indexOf(lastValue) !== -1) ? lastValue : undefined);
    }
}
let DocumentDiffItemViewModel = class DocumentDiffItemViewModel extends Disposable {
    get diffEditorViewModel() {
        return this.diffEditorViewModelRef.object;
    }
    get originalUri() { return this.documentDiffItem.original?.uri; }
    get modifiedUri() { return this.documentDiffItem.modified?.uri; }
    setIsFocused(source, tx) {
        this._isFocusedSource.set(source, tx);
    }
    get documentDiffItem() {
        return this.documentDiffItemRef.object;
    }
    constructor(documentDiffItem, _editorViewModel, _instantiationService, _modelService) {
        super();
        this._editorViewModel = _editorViewModel;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this.collapsed = observableValue(this, false);
        this.lastTemplateData = observableValue(this, { contentHeight: 500, selections: undefined, });
        this.isActive = derived(this, reader => this._editorViewModel.activeDiffItem.read(reader) === this);
        this._isFocusedSource = observableValue(this, constObservable(false));
        this.isFocused = derived(this, reader => this._isFocusedSource.read(reader).read(reader));
        this.isAlive = observableValue(this, true);
        this._register(toDisposable(() => {
            this.isAlive.set(false, undefined);
        }));
        this.documentDiffItemRef = this._register(documentDiffItem.createNewRef(this));
        function updateOptions(options) {
            return {
                ...options,
                hideUnchangedRegions: {
                    enabled: true,
                },
            };
        }
        const options = this._instantiationService.createInstance(DiffEditorOptions, updateOptions(this.documentDiffItem.options || {}));
        if (this.documentDiffItem.onOptionsDidChange) {
            this._register(this.documentDiffItem.onOptionsDidChange(() => {
                options.updateOptions(updateOptions(this.documentDiffItem.options || {}));
            }));
        }
        const diffEditorViewModelStore = new DisposableStore();
        const originalTextModel = this.documentDiffItem.original ?? diffEditorViewModelStore.add(this._modelService.createModel('', null));
        const modifiedTextModel = this.documentDiffItem.modified ?? diffEditorViewModelStore.add(this._modelService.createModel('', null));
        diffEditorViewModelStore.add(this.documentDiffItemRef.createNewRef(this));
        this.diffEditorViewModelRef = this._register(RefCounted.createWithDisposable(this._instantiationService.createInstance(DiffEditorViewModel, {
            original: originalTextModel,
            modified: modifiedTextModel,
        }, options), diffEditorViewModelStore, this));
    }
    getKey() {
        return JSON.stringify([
            this.originalUri?.toString(),
            this.modifiedUri?.toString()
        ]);
    }
};
DocumentDiffItemViewModel = __decorate([
    __param(2, IInstantiationService),
    __param(3, IModelService)
], DocumentDiffItemViewModel);
export { DocumentDiffItemViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9tdWx0aURpZmZFZGl0b3IvbXVsdGlEaWZmRWRpdG9yVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pHLE9BQU8sRUFBNkIsZUFBZSxFQUFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSx3QkFBd0IsRUFBRSxrQ0FBa0MsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHNU8sT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUdwRCxNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQXNCaEQsS0FBSyxDQUFDLFlBQVk7UUFDeEIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDbEMsTUFBTSxDQUFDLENBQUMsbUJBQW1CLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFTSxXQUFXO1FBQ2pCLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNoQixLQUFLLE1BQU0s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