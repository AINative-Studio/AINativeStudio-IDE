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
import { Dimension } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MultiEditorTabsControl } from './multiEditorTabsControl.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { StickyEditorGroupModel, UnstickyEditorGroupModel } from '../../../common/editor/filteredEditorGroupModel.js';
let MultiRowEditorControl = class MultiRowEditorControl extends Disposable {
    constructor(parent, editorPartsView, groupsView, groupView, model, instantiationService) {
        super();
        this.parent = parent;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.model = model;
        this.instantiationService = instantiationService;
        const stickyModel = this._register(new StickyEditorGroupModel(this.model));
        const unstickyModel = this._register(new UnstickyEditorGroupModel(this.model));
        this.stickyEditorTabsControl = this._register(this.instantiationService.createInstance(MultiEditorTabsControl, this.parent, editorPartsView, this.groupsView, this.groupView, stickyModel));
        this.unstickyEditorTabsControl = this._register(this.instantiationService.createInstance(MultiEditorTabsControl, this.parent, editorPartsView, this.groupsView, this.groupView, unstickyModel));
        this.handleTabBarsStateChange();
    }
    handleTabBarsStateChange() {
        this.activeControl = this.model.activeEditor ? this.getEditorTabsController(this.model.activeEditor) : undefined;
        this.handleTabBarsLayoutChange();
    }
    handleTabBarsLayoutChange() {
        if (this.groupView.count === 0) {
            // Do nothing as no tab bar is visible
            return;
        }
        const hadTwoTabBars = this.parent.classList.contains('two-tab-bars');
        const hasTwoTabBars = this.groupView.count !== this.groupView.stickyCount && this.groupView.stickyCount > 0;
        // Ensure action toolbar is only visible once
        this.parent.classList.toggle('two-tab-bars', hasTwoTabBars);
        if (hadTwoTabBars !== hasTwoTabBars) {
            this.groupView.relayout();
        }
    }
    didActiveControlChange() {
        return this.activeControl !== (this.model.activeEditor ? this.getEditorTabsController(this.model.activeEditor) : undefined);
    }
    getEditorTabsController(editor) {
        return this.model.isSticky(editor) ? this.stickyEditorTabsControl : this.unstickyEditorTabsControl;
    }
    openEditor(editor, options) {
        const didActiveControlChange = this.didActiveControlChange();
        const didOpenEditorChange = this.getEditorTabsController(editor).openEditor(editor, options);
        const didChange = didOpenEditorChange || didActiveControlChange;
        if (didChange) {
            this.handleOpenedEditors();
        }
        return didChange;
    }
    openEditors(editors) {
        const stickyEditors = editors.filter(e => this.model.isSticky(e));
        const unstickyEditors = editors.filter(e => !this.model.isSticky(e));
        const didActiveControlChange = this.didActiveControlChange();
        const didChangeOpenEditorsSticky = this.stickyEditorTabsControl.openEditors(stickyEditors);
        const didChangeOpenEditorsUnSticky = this.unstickyEditorTabsControl.openEditors(unstickyEditors);
        const didChange = didChangeOpenEditorsSticky || didChangeOpenEditorsUnSticky || didActiveControlChange;
        if (didChange) {
            this.handleOpenedEditors();
        }
        return didChange;
    }
    handleOpenedEditors() {
        this.handleTabBarsStateChange();
    }
    beforeCloseEditor(editor) {
        this.getEditorTabsController(editor).beforeCloseEditor(editor);
    }
    closeEditor(editor) {
        // Has to be called on both tab bars as the editor could be either sticky or not
        this.stickyEditorTabsControl.closeEditor(editor);
        this.unstickyEditorTabsControl.closeEditor(editor);
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        const stickyEditors = editors.filter(e => this.model.isSticky(e));
        const unstickyEditors = editors.filter(e => !this.model.isSticky(e));
        this.stickyEditorTabsControl.closeEditors(stickyEditors);
        this.unstickyEditorTabsControl.closeEditors(unstickyEditors);
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        this.handleTabBarsStateChange();
    }
    moveEditor(editor, fromIndex, targetIndex, stickyStateChange) {
        if (stickyStateChange) {
            // If sticky state changes, move editor between tab bars
            if (this.model.isSticky(editor)) {
                this.stickyEditorTabsControl.openEditor(editor);
                this.unstickyEditorTabsControl.closeEditor(editor);
            }
            else {
                this.stickyEditorTabsControl.closeEditor(editor);
                this.unstickyEditorTabsControl.openEditor(editor);
            }
            this.handleTabBarsStateChange();
        }
        else {
            if (this.model.isSticky(editor)) {
                this.stickyEditorTabsControl.moveEditor(editor, fromIndex, targetIndex, stickyStateChange);
            }
            else {
                this.unstickyEditorTabsControl.moveEditor(editor, fromIndex - this.model.stickyCount, targetIndex - this.model.stickyCount, stickyStateChange);
            }
        }
    }
    pinEditor(editor) {
        this.getEditorTabsController(editor).pinEditor(editor);
    }
    stickEditor(editor) {
        this.unstickyEditorTabsControl.closeEditor(editor);
        this.stickyEditorTabsControl.openEditor(editor);
        this.handleTabBarsStateChange();
    }
    unstickEditor(editor) {
        this.stickyEditorTabsControl.closeEditor(editor);
        this.unstickyEditorTabsControl.openEditor(editor);
        this.handleTabBarsStateChange();
    }
    setActive(isActive) {
        this.stickyEditorTabsControl.setActive(isActive);
        this.unstickyEditorTabsControl.setActive(isActive);
    }
    updateEditorSelections() {
        this.stickyEditorTabsControl.updateEditorSelections();
        this.unstickyEditorTabsControl.updateEditorSelections();
    }
    updateEditorLabel(editor) {
        this.getEditorTabsController(editor).updateEditorLabel(editor);
    }
    updateEditorDirty(editor) {
        this.getEditorTabsController(editor).updateEditorDirty(editor);
    }
    updateOptions(oldOptions, newOptions) {
        this.stickyEditorTabsControl.updateOptions(oldOptions, newOptions);
        this.unstickyEditorTabsControl.updateOptions(oldOptions, newOptions);
    }
    layout(dimensions) {
        const stickyDimensions = this.stickyEditorTabsControl.layout(dimensions);
        const unstickyAvailableDimensions = {
            container: dimensions.container,
            available: new Dimension(dimensions.available.width, dimensions.available.height - stickyDimensions.height)
        };
        const unstickyDimensions = this.unstickyEditorTabsControl.layout(unstickyAvailableDimensions);
        return new Dimension(dimensions.container.width, stickyDimensions.height + unstickyDimensions.height);
    }
    getHeight() {
        return this.stickyEditorTabsControl.getHeight() + this.unstickyEditorTabsControl.getHeight();
    }
    dispose() {
        this.parent.classList.toggle('two-tab-bars', false);
        super.dispose();
    }
};
MultiRowEditorControl = __decorate([
    __param(5, IInstantiationService)
], MultiRowEditorControl);
export { MultiRowEditorControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlSb3dFZGl0b3JUYWJzQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvbXVsdGlSb3dFZGl0b3JUYWJzQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBSS9HLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQU9wRCxZQUNrQixNQUFtQixFQUNwQyxlQUFpQyxFQUNoQixVQUE2QixFQUM3QixTQUEyQixFQUMzQixLQUFnQyxFQUNULG9CQUEyQztRQUVuRixLQUFLLEVBQUUsQ0FBQztRQVBTLFdBQU0sR0FBTixNQUFNLENBQWE7UUFFbkIsZUFBVSxHQUFWLFVBQVUsQ0FBbUI7UUFDN0IsY0FBUyxHQUFULFNBQVMsQ0FBa0I7UUFDM0IsVUFBSyxHQUFMLEtBQUssQ0FBMkI7UUFDVCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBSW5GLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElB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