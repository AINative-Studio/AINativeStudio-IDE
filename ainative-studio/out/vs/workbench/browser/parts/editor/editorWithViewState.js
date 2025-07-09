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
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { EditorPane } from './editorPane.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
/**
 * Base class of editors that want to store and restore view state.
 */
let AbstractEditorWithViewState = class AbstractEditorWithViewState extends EditorPane {
    constructor(id, group, viewStateStorageKey, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService) {
        super(id, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.groupListener = this._register(new MutableDisposable());
        this.viewState = this.getEditorMemento(editorGroupService, textResourceConfigurationService, viewStateStorageKey, 100);
    }
    setEditorVisible(visible) {
        // Listen to close events to trigger `onWillCloseEditorInGroup`
        this.groupListener.value = this.group.onWillCloseEditor(e => this.onWillCloseEditor(e));
        super.setEditorVisible(visible);
    }
    onWillCloseEditor(e) {
        const editor = e.editor;
        if (editor === this.input) {
            // React to editors closing to preserve or clear view state. This needs to happen
            // in the `onWillCloseEditor` because at that time the editor has not yet
            // been disposed and we can safely persist the view state.
            this.updateEditorViewState(editor);
        }
    }
    clearInput() {
        // Preserve current input view state before clearing
        this.updateEditorViewState(this.input);
        super.clearInput();
    }
    saveState() {
        // Preserve current input view state before shutting down
        this.updateEditorViewState(this.input);
        super.saveState();
    }
    updateEditorViewState(input) {
        if (!input || !this.tracksEditorViewState(input)) {
            return; // ensure we have an input to handle view state for
        }
        const resource = this.toEditorViewStateResource(input);
        if (!resource) {
            return; // we need a resource
        }
        // If we are not tracking disposed editor view state
        // make sure to clear the view state once the editor
        // is disposed.
        if (!this.tracksDisposedEditorViewState()) {
            if (!this.editorViewStateDisposables) {
                this.editorViewStateDisposables = new Map();
            }
            if (!this.editorViewStateDisposables.has(input)) {
                this.editorViewStateDisposables.set(input, Event.once(input.onWillDispose)(() => {
                    this.clearEditorViewState(resource, this.group);
                    this.editorViewStateDisposables?.delete(input);
                }));
            }
        }
        // Clear the editor view state if:
        // - the editor view state should not be tracked for disposed editors
        // - the user configured to not restore view state unless the editor is still opened in the group
        if ((input.isDisposed() && !this.tracksDisposedEditorViewState()) ||
            (!this.shouldRestoreEditorViewState(input) && !this.group.contains(input))) {
            this.clearEditorViewState(resource, this.group);
        }
        // Otherwise we save the view state
        else if (!input.isDisposed()) {
            this.saveEditorViewState(resource);
        }
    }
    shouldRestoreEditorViewState(input, context) {
        // new editor: check with workbench.editor.restoreViewState setting
        if (context?.newInGroup) {
            return this.textResourceConfigurationService.getValue(EditorResourceAccessor.getOriginalUri(input, { supportSideBySide: SideBySideEditor.PRIMARY }), 'workbench.editor.restoreViewState') === false ? false : true /* restore by default */;
        }
        // existing editor: always restore viewstate
        return true;
    }
    getViewState() {
        const input = this.input;
        if (!input || !this.tracksEditorViewState(input)) {
            return; // need valid input for view state
        }
        const resource = this.toEditorViewStateResource(input);
        if (!resource) {
            return; // need a resource for finding view state
        }
        return this.computeEditorViewState(resource);
    }
    saveEditorViewState(resource) {
        const editorViewState = this.computeEditorViewState(resource);
        if (!editorViewState) {
            return;
        }
        this.viewState.saveEditorState(this.group, resource, editorViewState);
    }
    loadEditorViewState(input, context) {
        if (!input) {
            return undefined; // we need valid input
        }
        if (!this.tracksEditorViewState(input)) {
            return undefined; // not tracking for input
        }
        if (!this.shouldRestoreEditorViewState(input, context)) {
            return undefined; // not enabled for input
        }
        const resource = this.toEditorViewStateResource(input);
        if (!resource) {
            return; // need a resource for finding view state
        }
        return this.viewState.loadEditorState(this.group, resource);
    }
    moveEditorViewState(source, target, comparer) {
        return this.viewState.moveEditorState(source, target, comparer);
    }
    clearEditorViewState(resource, group) {
        this.viewState.clearEditorState(resource, group);
    }
    dispose() {
        super.dispose();
        if (this.editorViewStateDisposables) {
            for (const [, disposables] of this.editorViewStateDisposables) {
                disposables.dispose();
            }
            this.editorViewStateDisposables = undefined;
        }
    }
    /**
     * Whether view state should be tracked even when the editor is
     * disposed.
     *
     * Subclasses should override this if the input can be restored
     * from the resource at a later point, e.g. if backed by files.
     */
    tracksDisposedEditorViewState() {
        return false;
    }
};
AbstractEditorWithViewState = __decorate([
    __param(3, ITelemetryService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, ITextResourceConfigurationService),
    __param(7, IThemeService),
    __param(8, IEditorService),
    __param(9, IEditorGroupsService)
], AbstractEditorWithViewState);
export { AbstractEditorWithViewState };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV2l0aFZpZXdTdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yV2l0aFZpZXdTdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUF5RCxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzVJLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxvQkFBb0IsRUFBZ0IsTUFBTSx3REFBd0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHdEY7O0dBRUc7QUFDSSxJQUFlLDJCQUEyQixHQUExQyxNQUFlLDJCQUE4QyxTQUFRLFVBQVU7SUFRckYsWUFDQyxFQUFVLEVBQ1YsS0FBbUIsRUFDbkIsbUJBQTJCLEVBQ1IsZ0JBQW1DLEVBQy9CLG9CQUE4RCxFQUNwRSxjQUErQixFQUNiLGdDQUFzRixFQUMxRyxZQUEyQixF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