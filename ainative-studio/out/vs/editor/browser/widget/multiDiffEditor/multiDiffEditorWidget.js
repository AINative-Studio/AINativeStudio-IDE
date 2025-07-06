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
import { Event } from '../../../../base/common/event.js';
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, derivedWithStore, observableValue, recomputeInitiallyAndOnChange } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import './colors.js';
import { DiffEditorItemTemplate } from './diffEditorItemTemplate.js';
import { MultiDiffEditorViewModel } from './multiDiffEditorViewModel.js';
import { MultiDiffEditorWidgetImpl } from './multiDiffEditorWidgetImpl.js';
let MultiDiffEditorWidget = class MultiDiffEditorWidget extends Disposable {
    constructor(_element, _workbenchUIElementFactory, _instantiationService) {
        super();
        this._element = _element;
        this._workbenchUIElementFactory = _workbenchUIElementFactory;
        this._instantiationService = _instantiationService;
        this._dimension = observableValue(this, undefined);
        this._viewModel = observableValue(this, undefined);
        this._widgetImpl = derivedWithStore(this, (reader, store) => {
            readHotReloadableExport(DiffEditorItemTemplate, reader);
            return store.add(this._instantiationService.createInstance((readHotReloadableExport(MultiDiffEditorWidgetImpl, reader)), this._element, this._dimension, this._viewModel, this._workbenchUIElementFactory));
        });
        this._activeControl = derived(this, (reader) => this._widgetImpl.read(reader).activeControl.read(reader));
        this.onDidChangeActiveControl = Event.fromObservableLight(this._activeControl);
        this._register(recomputeInitiallyAndOnChange(this._widgetImpl));
    }
    reveal(resource, options) {
        this._widgetImpl.get().reveal(resource, options);
    }
    createViewModel(model) {
        return new MultiDiffEditorViewModel(model, this._instantiationService);
    }
    setViewModel(viewModel) {
        this._viewModel.set(viewModel, undefined);
    }
    layout(dimension) {
        this._dimension.set(dimension, undefined);
    }
    getActiveControl() {
        return this._activeControl.get();
    }
    getViewState() {
        return this._widgetImpl.get().getViewState();
    }
    setViewState(viewState) {
        this._widgetImpl.get().setViewState(viewState);
    }
    tryGetCodeEditor(resource) {
        return this._widgetImpl.get().tryGetCodeEditor(resource);
    }
    findDocumentDiffItem(resource) {
        return this._widgetImpl.get().findDocumentDiffItem(resource);
    }
};
MultiDiffEditorWidget = __decorate([
    __param(2, IInstantiationService)
], MultiDiffEditorWidget);
export { MultiDiffEditorWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L211bHRpRGlmZkVkaXRvci9tdWx0aURpZmZFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWxJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBS25HLE9BQU8sYUFBYSxDQUFDO0FBQ3JCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXJFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBbUQseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdySCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFlcEQsWUFDa0IsUUFBcUIsRUFDckIsMEJBQXNELEVBQ2hELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQUpTLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE0QjtRQUMvQiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBakJwRSxlQUFVLEdBQUcsZUFBZSxDQUF3QixJQUFJLEVBQUUs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