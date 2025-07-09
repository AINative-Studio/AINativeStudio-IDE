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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9tdWx0aURpZmZFZGl0b3IvbXVsdGlEaWZmRWRpdG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVsSSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUtuRyxPQUFPLGFBQWEsQ0FBQztBQUNyQixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUVyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQW1ELHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckgsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBZXBELFlBQ2tCLFFBQXFCLEVBQ3JCLDBCQUFzRCxFQUNoRCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFKUyxhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNEI7UUFDL0IsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWpCcEUsZUFBVSxHQUFHLGVBQWUsQ0FBd0IsSUFBSSxFQUFF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