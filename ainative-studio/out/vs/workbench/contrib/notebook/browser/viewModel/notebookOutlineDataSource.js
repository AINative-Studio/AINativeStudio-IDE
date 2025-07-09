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
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookOutlineEntryFactory } from './notebookOutlineEntryFactory.js';
let NotebookCellOutlineDataSource = class NotebookCellOutlineDataSource {
    constructor(_editor, _markerService, _configurationService, _outlineEntryFactory) {
        this._editor = _editor;
        this._markerService = _markerService;
        this._configurationService = _configurationService;
        this._outlineEntryFactory = _outlineEntryFactory;
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._entries = [];
        this.recomputeState();
    }
    get activeElement() {
        return this._activeEntry;
    }
    get entries() {
        return this._entries;
    }
    get isEmpty() {
        return this._entries.length === 0;
    }
    get uri() {
        return this._uri;
    }
    async computeFullSymbols(cancelToken) {
        try {
            const notebookEditorWidget = this._editor;
            const notebookCells = notebookEditorWidget?.getViewModel()?.viewCells.filter((cell) => cell.cellKind === CellKind.Code);
            if (notebookCells) {
                const promises = [];
                // limit the number of cells so that we don't resolve an excessive amount of text models
                for (const cell of notebookCells.slice(0, 50)) {
                    // gather all symbols asynchronously
                    promises.push(this._outlineEntryFactory.cacheSymbols(cell, cancelToken));
                }
                await Promise.allSettled(promises);
            }
            this.recomputeState();
        }
        catch (err) {
            console.error('Failed to compute notebook outline symbols:', err);
            // Still recompute state with whatever symbols we have
            this.recomputeState();
        }
    }
    recomputeState() {
        this._disposables.clear();
        this._activeEntry = undefined;
        this._uri = undefined;
        if (!this._editor.hasModel()) {
            return;
        }
        this._uri = this._editor.textModel.uri;
        const notebookEditorWidget = this._editor;
        if (notebookEditorWidget.getLength() === 0) {
            return;
        }
        const notebookCells = notebookEditorWidget.getViewModel().viewCells;
        const entries = [];
        for (const cell of notebookCells) {
            entries.push(...this._outlineEntryFactory.getOutlineEntries(cell, entries.length));
        }
        // build a tree from the list of entries
        if (entries.length > 0) {
            const result = [entries[0]];
            const parentStack = [entries[0]];
            for (let i = 1; i < entries.length; i++) {
                const entry = entries[i];
                while (true) {
                    const len = parentStack.length;
                    if (len === 0) {
                        // root node
                        result.push(entry);
                        parentStack.push(entry);
                        break;
                    }
                    else {
                        const parentCandidate = parentStack[len - 1];
                        if (parentCandidate.level < entry.level) {
                            parentCandidate.addChild(entry);
                            parentStack.push(entry);
                            break;
                        }
                        else {
                            parentStack.pop();
                        }
                    }
                }
            }
            this._entries = result;
        }
        // feature: show markers with each cell
        const markerServiceListener = new MutableDisposable();
        this._disposables.add(markerServiceListener);
        const updateMarkerUpdater = () => {
            if (notebookEditorWidget.isDisposed) {
                return;
            }
            const doUpdateMarker = (clear) => {
                for (const entry of this._entries) {
                    if (clear) {
                        entry.clearMarkers();
                    }
                    else {
                        entry.updateMarkers(this._markerService);
                    }
                }
            };
            const problem = this._configurationService.getValue('problems.visibility');
            if (problem === undefined) {
                return;
            }
            const config = this._configurationService.getValue("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */);
            if (problem && config) {
                markerServiceListener.value = this._markerService.onMarkerChanged(e => {
                    if (notebookEditorWidget.isDisposed) {
                        console.error('notebook editor is disposed');
                        return;
                    }
                    if (e.some(uri => notebookEditorWidget.getCellsInRange().some(cell => isEqual(cell.uri, uri)))) {
                        doUpdateMarker(false);
                        this._onDidChange.fire({});
                    }
                });
                doUpdateMarker(false);
            }
            else {
                markerServiceListener.clear();
                doUpdateMarker(true);
            }
        };
        updateMarkerUpdater();
        this._disposables.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('problems.visibility') || e.affectsConfiguration("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */)) {
                updateMarkerUpdater();
                this._onDidChange.fire({});
            }
        }));
        const { changeEventTriggered } = this.recomputeActive();
        if (!changeEventTriggered) {
            this._onDidChange.fire({});
        }
    }
    recomputeActive() {
        let newActive;
        const notebookEditorWidget = this._editor;
        if (notebookEditorWidget) { //TODO don't check for widget, only here if we do have
            if (notebookEditorWidget.hasModel() && notebookEditorWidget.getLength() > 0) {
                const cell = notebookEditorWidget.cellAt(notebookEditorWidget.getFocus().start);
                if (cell) {
                    for (const entry of this._entries) {
                        newActive = entry.find(cell, []);
                        if (newActive) {
                            break;
                        }
                    }
                }
            }
        }
        if (newActive !== this._activeEntry) {
            this._activeEntry = newActive;
            this._onDidChange.fire({ affectOnlyActiveElement: true });
            return { changeEventTriggered: true };
        }
        return { changeEventTriggered: false };
    }
    dispose() {
        this._entries.length = 0;
        this._activeEntry = undefined;
        this._disposables.dispose();
    }
};
NotebookCellOutlineDataSource = __decorate([
    __param(1, IMarkerService),
    __param(2, IConfigurationService),
    __param(3, INotebookOutlineEntryFactory)
], NotebookCellOutlineDataSource);
export { NotebookCellOutlineDataSource };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9ub3RlYm9va091dGxpbmVEYXRhU291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVuRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFJMUQsT0FBTyxFQUFFLDRCQUE0QixFQUErQixNQUFNLGtDQUFrQyxDQUFDO0FBT3RHLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQTZCO0lBV3pDLFlBQ2tCLE9BQXdCLEVBQ3pCLGNBQStDLEVBQ3hDLHFCQUE2RCxFQUN0RCxvQkFBa0U7UUFIL0UsWUFBTyxHQUFQLE9BQU8sQ0FBaUI7UUFDUixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDdkIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTZCO1FBYmhGLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVyQyxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFzQixDQUFDO1FBQ3pELGdCQUFXLEdBQThCLElBQUksQ0FBQyxZ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