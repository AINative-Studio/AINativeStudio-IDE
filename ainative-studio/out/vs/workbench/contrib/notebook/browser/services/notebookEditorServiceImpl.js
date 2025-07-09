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
import { ResourceMap } from '../../../../../base/common/map.js';
import { getDefaultNotebookCreationOptions, NotebookEditorWidget } from '../notebookEditorWidget.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isCompositeNotebookEditorInput, isNotebookEditorInput, NotebookEditorInput } from '../../common/notebookEditorInput.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { InteractiveWindowOpen, MOST_RECENT_REPL_EDITOR } from '../../common/notebookContextKeys.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { NotebookDiffEditorInput } from '../../common/notebookDiffEditorInput.js';
let NotebookEditorWidgetService = class NotebookEditorWidgetService {
    constructor(editorGroupService, editorService, contextKeyService, instantiationService) {
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this._tokenPool = 1;
        this._disposables = new DisposableStore();
        this._notebookEditors = new Map();
        this.groupListener = new Map();
        this._onNotebookEditorAdd = new Emitter();
        this._onNotebookEditorsRemove = new Emitter();
        this.onDidAddNotebookEditor = this._onNotebookEditorAdd.event;
        this.onDidRemoveNotebookEditor = this._onNotebookEditorsRemove.event;
        this._borrowableEditors = new Map();
        const onNewGroup = (group) => {
            const { id } = group;
            const listeners = [];
            listeners.push(group.onDidCloseEditor(e => {
                const widgetMap = this._borrowableEditors.get(group.id);
                if (!widgetMap) {
                    return;
                }
                const inputs = e.editor instanceof NotebookEditorInput || e.editor instanceof NotebookDiffEditorInput
                    ? [e.editor]
                    : (isCompositeNotebookEditorInput(e.editor) ? e.editor.editorInputs : []);
                inputs.forEach(input => {
                    const widgets = widgetMap.get(input.resource);
                    const index = widgets?.findIndex(widget => widget.editorType === input.typeId);
                    if (!widgets || index === undefined || index === -1) {
                        return;
                    }
                    const value = widgets.splice(index, 1)[0];
                    value.token = undefined;
                    this._disposeWidget(value.widget);
                    value.disposableStore.dispose();
                    value.widget = undefined; // unset the widget so that others that still hold a reference don't harm us
                });
            }));
            listeners.push(group.onWillMoveEditor(e => {
                if (isNotebookEditorInput(e.editor)) {
                    this._allowWidgetMove(e.editor, e.groupId, e.target);
                }
                if (isCompositeNotebookEditorInput(e.editor)) {
                    e.editor.editorInputs.forEach(input => {
                        this._allowWidgetMove(input, e.groupId, e.target);
                    });
                }
            }));
            this.groupListener.set(id, listeners);
        };
        this._disposables.add(editorGroupService.onDidAddGroup(onNewGroup));
        editorGroupService.whenReady.then(() => editorGroupService.groups.forEach(onNewGroup));
        // group removed -> clean up listeners, clean up widgets
        this._disposables.add(editorGroupService.onDidRemoveGroup(group => {
            const listeners = this.groupListener.get(group.id);
            if (listeners) {
                listeners.forEach(listener => listener.dispose());
                this.groupListener.delete(group.id);
            }
            const widgets = this._borrowableEditors.get(group.id);
            this._borrowableEditors.delete(group.id);
            if (widgets) {
                for (const values of widgets.values()) {
                    for (const value of values) {
                        value.token = undefined;
                        this._disposeWidget(value.widget);
                        value.disposableStore.dispose();
                    }
                }
            }
        }));
        this._mostRecentRepl = MOST_RECENT_REPL_EDITOR.bindTo(contextKeyService);
        const interactiveWindowOpen = InteractiveWindowOpen.bindTo(contextKeyService);
        this._disposables.add(editorService.onDidEditorsChange(e => {
            if (e.event.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */ && !interactiveWindowOpen.get()) {
                if (editorService.editors.find(editor => isCompositeNotebookEditorInput(editor))) {
                    interactiveWindowOpen.set(true);
                }
            }
            else if (e.event.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ && interactiveWindowOpen.get()) {
                if (!editorService.editors.find(editor => isCompositeNotebookEditorInput(editor))) {
                    interactiveWindowOpen.set(false);
                }
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._onNotebookEditorAdd.dispose();
        this._onNotebookEditorsRemove.dispose();
        this.groupListener.forEach((listeners) => {
            listeners.forEach(listener => listener.dispose());
        });
        this.groupListener.clear();
        this._borrowableEditors.forEach(widgetMap => {
            widgetMap.forEach(widgets => {
                widgets.forEach(widget => widget.disposableStore.dispose());
            });
        });
    }
    // --- group-based editor borrowing...
    _disposeWidget(widget) {
        widget.onWillHide();
        const domNode = widget.getDomNode();
        widget.dispose();
        domNode.remove();
    }
    _allowWidgetMove(input, sourceID, targetID) {
        const sourcePart = this.editorGroupService.getPart(sourceID);
        const targetPart = this.editorGroupService.getPart(targetID);
        if (sourcePart.windowId !== targetPart.windowId) {
            return;
        }
        const target = this._borrowableEditors.get(targetID)?.get(input.resource)?.findIndex(widget => widget.editorType === input.typeId);
        if (target !== undefined && target !== -1) {
            // not needed, a separate widget is already there
            return;
        }
        const widget = this._borrowableEditors.get(sourceID)?.get(input.resource)?.find(widget => widget.editorType === input.typeId);
        if (!widget) {
            throw new Error('no widget at source group');
        }
        // don't allow the widget to be retrieved at its previous location any more
        const sourceWidgets = this._borrowableEditors.get(sourceID)?.get(input.resource);
        if (sourceWidgets) {
            const indexToRemove = sourceWidgets.findIndex(widget => widget.editorType === input.typeId);
            if (indexToRemove !== -1) {
                sourceWidgets.splice(indexToRemove, 1);
            }
        }
        // allow the widget to be retrieved at its new location
        let targetMap = this._borrowableEditors.get(targetID);
        if (!targetMap) {
            targetMap = new ResourceMap();
            this._borrowableEditors.set(targetID, targetMap);
        }
        const widgetsAtTarget = targetMap.get(input.resource) ?? [];
        widgetsAtTarget?.push(widget);
        targetMap.set(input.resource, widgetsAtTarget);
    }
    retrieveExistingWidgetFromURI(resource) {
        for (const widgetInfo of this._borrowableEditors.values()) {
            const widgets = widgetInfo.get(resource);
            if (widgets && widgets.length > 0) {
                return this._createBorrowValue(widgets[0].token, widgets[0]);
            }
        }
        return undefined;
    }
    retrieveAllExistingWidgets() {
        const ret = [];
        for (const widgetInfo of this._borrowableEditors.values()) {
            for (const widgets of widgetInfo.values()) {
                for (const widget of widgets) {
                    ret.push(this._createBorrowValue(widget.token, widget));
                }
            }
        }
        return ret;
    }
    retrieveWidget(accessor, groupId, input, creationOptions, initialDimension, codeWindow) {
        let value = this._borrowableEditors.get(groupId)?.get(input.resource)?.find(widget => widget.editorType === input.typeId);
        if (!value) {
            // NEW widget
            const editorGroupContextKeyService = accessor.get(IContextKeyService);
            const editorGroupEditorProgressService = accessor.get(IEditorProgressService);
            const widgetDisposeStore = new DisposableStore();
            const widget = this.createWidget(editorGroupContextKeyService, widgetDisposeStore, editorGroupEditorProgressService, creationOptions, codeWindow, initialDimension);
            const token = this._tokenPool++;
            value = { widget, editorType: input.typeId, token, disposableStore: widgetDisposeStore };
            let map = this._borrowableEditors.get(groupId);
            if (!map) {
                map = new ResourceMap();
                this._borrowableEditors.set(groupId, map);
            }
            const values = map.get(input.resource) ?? [];
            values.push(value);
            map.set(input.resource, values);
        }
        else {
            // reuse a widget which was either free'ed before or which
            // is simply being reused...
            value.token = this._tokenPool++;
        }
        return this._createBorrowValue(value.token, value);
    }
    // protected for unit testing overrides
    createWidget(editorGroupContextKeyService, widgetDisposeStore, editorGroupEditorProgressService, creationOptions, codeWindow, initialDimension) {
        const notebookInstantiationService = widgetDisposeStore.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, editorGroupContextKeyService], [IEditorProgressService, editorGroupEditorProgressService])));
        const ctorOptions = creationOptions ?? getDefaultNotebookCreationOptions();
        const widget = notebookInstantiationService.createInstance(NotebookEditorWidget, {
            ...ctorOptions,
            codeWindow: codeWindow ?? ctorOptions.codeWindow,
        }, initialDimension);
        return widget;
    }
    _createBorrowValue(myToken, widget) {
        return {
            get value() {
                return widget.token === myToken ? widget.widget : undefined;
            }
        };
    }
    // --- editor management
    addNotebookEditor(editor) {
        this._notebookEditors.set(editor.getId(), editor);
        this._onNotebookEditorAdd.fire(editor);
    }
    removeNotebookEditor(editor) {
        const notebookUri = editor.getViewModel()?.notebookDocument.uri;
        if (this._notebookEditors.has(editor.getId())) {
            this._notebookEditors.delete(editor.getId());
            this._onNotebookEditorsRemove.fire(editor);
        }
        if (this._mostRecentRepl.get() === notebookUri?.toString()) {
            this._mostRecentRepl.reset();
        }
    }
    getNotebookEditor(editorId) {
        return this._notebookEditors.get(editorId);
    }
    listNotebookEditors() {
        return [...this._notebookEditors].map(e => e[1]);
    }
    updateReplContextKey(uri) {
        this._mostRecentRepl.set(uri);
    }
};
NotebookEditorWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService)
], NotebookEditorWidgetService);
export { NotebookEditorWidgetService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rRWRpdG9yU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQWdCLE1BQU0sMkRBQTJELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBR2pJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUk5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFM0Us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