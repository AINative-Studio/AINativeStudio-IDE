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
import './media/editortitlecontrol.css';
import { $, Dimension, clearNode } from '../../../../base/browser/dom.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { BreadcrumbsControl, BreadcrumbsControlFactory } from './breadcrumbsControl.js';
import { MultiEditorTabsControl } from './multiEditorTabsControl.js';
import { SingleEditorTabsControl } from './singleEditorTabsControl.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { MultiRowEditorControl } from './multiRowEditorTabsControl.js';
import { NoEditorTabsControl } from './noEditorTabsControl.js';
let EditorTitleControl = class EditorTitleControl extends Themable {
    get breadcrumbsControl() { return this.breadcrumbsControlFactory?.control; }
    constructor(parent, editorPartsView, groupsView, groupView, model, instantiationService, themeService) {
        super(themeService);
        this.parent = parent;
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupView = groupView;
        this.model = model;
        this.instantiationService = instantiationService;
        this.editorTabsControlDisposable = this._register(new DisposableStore());
        this.breadcrumbsControlDisposables = this._register(new DisposableStore());
        this.editorTabsControl = this.createEditorTabsControl();
        this.breadcrumbsControlFactory = this.createBreadcrumbsControl();
    }
    createEditorTabsControl() {
        let tabsControlType;
        switch (this.groupsView.partOptions.showTabs) {
            case 'none':
                tabsControlType = NoEditorTabsControl;
                break;
            case 'single':
                tabsControlType = SingleEditorTabsControl;
                break;
            case 'multiple':
            default:
                tabsControlType = this.groupsView.partOptions.pinnedTabsOnSeparateRow ? MultiRowEditorControl : MultiEditorTabsControl;
                break;
        }
        const control = this.instantiationService.createInstance(tabsControlType, this.parent, this.editorPartsView, this.groupsView, this.groupView, this.model);
        return this.editorTabsControlDisposable.add(control);
    }
    createBreadcrumbsControl() {
        if (this.groupsView.partOptions.showTabs === 'single') {
            return undefined; // Single tabs have breadcrumbs inlined. No tabs have no breadcrumbs.
        }
        // Breadcrumbs container
        const breadcrumbsContainer = $('.breadcrumbs-below-tabs');
        this.parent.appendChild(breadcrumbsContainer);
        const breadcrumbsControlFactory = this.breadcrumbsControlDisposables.add(this.instantiationService.createInstance(BreadcrumbsControlFactory, breadcrumbsContainer, this.groupView, {
            showFileIcons: true,
            showSymbolIcons: true,
            showDecorationColors: false,
            showPlaceholder: true,
            dragEditor: false,
        }));
        // Breadcrumbs enablement & visibility change have an impact on layout
        // so we need to relayout the editor group when that happens.
        this.breadcrumbsControlDisposables.add(breadcrumbsControlFactory.onDidEnablementChange(() => this.groupView.relayout()));
        this.breadcrumbsControlDisposables.add(breadcrumbsControlFactory.onDidVisibilityChange(() => this.groupView.relayout()));
        return breadcrumbsControlFactory;
    }
    openEditor(editor, options) {
        const didChange = this.editorTabsControl.openEditor(editor, options);
        this.handleOpenedEditors(didChange);
    }
    openEditors(editors) {
        const didChange = this.editorTabsControl.openEditors(editors);
        this.handleOpenedEditors(didChange);
    }
    handleOpenedEditors(didChange) {
        if (didChange) {
            this.breadcrumbsControl?.update();
        }
        else {
            this.breadcrumbsControl?.revealLast();
        }
    }
    beforeCloseEditor(editor) {
        return this.editorTabsControl.beforeCloseEditor(editor);
    }
    closeEditor(editor) {
        this.editorTabsControl.closeEditor(editor);
        this.handleClosedEditors();
    }
    closeEditors(editors) {
        this.editorTabsControl.closeEditors(editors);
        this.handleClosedEditors();
    }
    handleClosedEditors() {
        if (!this.groupView.activeEditor) {
            this.breadcrumbsControl?.update();
        }
    }
    moveEditor(editor, fromIndex, targetIndex, stickyStateChange) {
        return this.editorTabsControl.moveEditor(editor, fromIndex, targetIndex, stickyStateChange);
    }
    pinEditor(editor) {
        return this.editorTabsControl.pinEditor(editor);
    }
    stickEditor(editor) {
        return this.editorTabsControl.stickEditor(editor);
    }
    unstickEditor(editor) {
        return this.editorTabsControl.unstickEditor(editor);
    }
    setActive(isActive) {
        return this.editorTabsControl.setActive(isActive);
    }
    updateEditorSelections() {
        this.editorTabsControl.updateEditorSelections();
    }
    updateEditorLabel(editor) {
        return this.editorTabsControl.updateEditorLabel(editor);
    }
    updateEditorDirty(editor) {
        return this.editorTabsControl.updateEditorDirty(editor);
    }
    updateOptions(oldOptions, newOptions) {
        // Update editor tabs control if options changed
        if (oldOptions.showTabs !== newOptions.showTabs ||
            (newOptions.showTabs !== 'single' && oldOptions.pinnedTabsOnSeparateRow !== newOptions.pinnedTabsOnSeparateRow)) {
            // Clear old
            this.editorTabsControlDisposable.clear();
            this.breadcrumbsControlDisposables.clear();
            clearNode(this.parent);
            // Create new
            this.editorTabsControl = this.createEditorTabsControl();
            this.breadcrumbsControlFactory = this.createBreadcrumbsControl();
        }
        // Forward into editor tabs control
        else {
            this.editorTabsControl.updateOptions(oldOptions, newOptions);
        }
    }
    layout(dimensions) {
        // Layout tabs control
        const tabsControlDimension = this.editorTabsControl.layout(dimensions);
        // Layout breadcrumbs if visible
        let breadcrumbsControlDimension = undefined;
        if (this.breadcrumbsControl?.isHidden() === false) {
            breadcrumbsControlDimension = new Dimension(dimensions.container.width, BreadcrumbsControl.HEIGHT);
            this.breadcrumbsControl.layout(breadcrumbsControlDimension);
        }
        return new Dimension(dimensions.container.width, tabsControlDimension.height + (breadcrumbsControlDimension ? breadcrumbsControlDimension.height : 0));
    }
    getHeight() {
        const tabsControlHeight = this.editorTabsControl.getHeight();
        const breadcrumbsControlHeight = this.breadcrumbsControl?.isHidden() === false ? BreadcrumbsControl.HEIGHT : 0;
        return {
            total: tabsControlHeight + breadcrumbsControlHeight,
            offset: tabsControlHeight
        };
    }
};
EditorTitleControl = __decorate([
    __param(5, IInstantiationService),
    __param(6, IThemeService)
], EditorTitleControl);
export { EditorTitleControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yVGl0bGVDb250cm9sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JUaXRsZUNvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBR3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQWdCeEQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxRQUFRO0lBTy9DLElBQVksa0JBQWtCLEtBQUssT0FBTyxJQUFJLENBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUVwRixZQUNrQixNQUFtQixFQUNuQixlQUFpQyxFQUNqQyxVQUE2QixFQUM3QixTQUEyQixFQUMzQixLQUFnQyxFQUMxQixvQkFBbUQs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