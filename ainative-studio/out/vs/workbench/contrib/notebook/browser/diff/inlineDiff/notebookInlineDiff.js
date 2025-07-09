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
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookEditorWorkerService } from '../../../common/services/notebookWorkerService.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { NotebookCellDiffDecorator } from './notebookCellDiffDecorator.js';
import { NotebookDeletedCellDecorator } from './notebookDeletedCellDecorator.js';
import { NotebookInsertedCellDecorator } from './notebookInsertedCellDecorator.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
import { computeDiff } from '../../../common/notebookDiff.js';
import { registerSingleton } from '../../../../../../platform/instantiation/common/extensions.js';
import { INotebookOriginalModelReferenceFactory, NotebookOriginalModelReferenceFactory } from './notebookOriginalModelRefFactory.js';
import { INotebookOriginalCellModelFactory, OriginalNotebookCellModelFactory } from './notebookOriginalCellModelFactory.js';
let NotebookInlineDiffDecorationContribution = class NotebookInlineDiffDecorationContribution extends Disposable {
    static { this.ID = 'workbench.notebook.inlineDiffDecoration'; }
    constructor(notebookEditor, notebookEditorWorkerService, instantiationService, logService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.cellDecorators = new Map();
        this.listeners = [];
        this.logService.debug('inlineDiff', 'Watching for previous model');
        this._register(autorun((reader) => {
            this.previous = this.notebookEditor.notebookOptions.previousModelToCompare.read(reader);
            if (this.previous) {
                this.logService.debug('inlineDiff', 'Previous model set');
                if (this.notebookEditor.hasModel()) {
                    this.initialize();
                }
                else {
                    this.logService.debug('inlineDiff', 'Waiting for model to attach');
                    this.listeners.push(Event.once(this.notebookEditor.onDidAttachViewModel)(() => this.initialize()));
                }
            }
        }));
    }
    clear() {
        this.listeners.forEach(l => l.dispose());
        this.cellDecorators.forEach((v, cell) => {
            v.dispose();
            this.cellDecorators.delete(cell);
        });
        this.insertedCellDecorator?.dispose();
        this.deletedCellDecorator?.dispose();
        this.cachedNotebookDiff = undefined;
        this.listeners = [];
        this.logService.debug('inlineDiff', 'Cleared decorations and listeners');
    }
    dispose() {
        this.logService.debug('inlineDiff', 'Disposing');
        this.clear();
        super.dispose();
    }
    initialize() {
        this.clear();
        if (!this.previous) {
            return;
        }
        this.insertedCellDecorator = this.instantiationService.createInstance(NotebookInsertedCellDecorator, this.notebookEditor);
        this.deletedCellDecorator = this.instantiationService.createInstance(NotebookDeletedCellDecorator, this.notebookEditor, undefined);
        this._update();
        const onVisibleChange = Event.debounce(this.notebookEditor.onDidChangeVisibleRanges, (e) => e, 100, undefined, undefined, undefined, this._store);
        this.listeners.push(onVisibleChange(() => this._update()));
        this.listeners.push(this.notebookEditor.onDidChangeModel(() => this._update()));
        if (this.notebookEditor.textModel) {
            const onContentChange = Event.debounce(this.notebookEditor.textModel.onDidChangeContent, (_, event) => event, 100, undefined, undefined, undefined, this._store);
            const onOriginalContentChange = Event.debounce(this.previous.onDidChangeContent, (_, event) => event, 100, undefined, undefined, undefined, this._store);
            this.listeners.push(onContentChange(() => this._update()));
            this.listeners.push(onOriginalContentChange(() => this._update()));
        }
        this.logService.debug('inlineDiff', 'Initialized');
    }
    async _update() {
        const current = this.notebookEditor.getViewModel()?.notebookDocument;
        if (!this.previous || !current) {
            this.logService.debug('inlineDiff', 'Update skipped - no original or current document');
            return;
        }
        if (!this.cachedNotebookDiff ||
            this.cachedNotebookDiff.originalVersion !== this.previous.versionId ||
            this.cachedNotebookDiff.version !== current.versionId) {
            let diffInfo = { cellDiffInfo: [] };
            try {
                const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.previous.uri, current.uri);
                diffInfo = computeDiff(this.previous, current, notebookDiff);
            }
            catch (e) {
                this.logService.error('inlineDiff', 'Error computing diff:\n' + e);
                return;
            }
            this.cachedNotebookDiff = { cellDiffInfo: diffInfo.cellDiffInfo, originalVersion: this.previous.versionId, version: current.versionId };
            this.insertedCellDecorator?.apply(diffInfo.cellDiffInfo);
            this.deletedCellDecorator?.apply(diffInfo.cellDiffInfo, this.previous);
        }
        await this.updateCells(this.previous, current, this.cachedNotebookDiff.cellDiffInfo);
    }
    async updateCells(original, modified, cellDiffs) {
        const validDiffDecorators = new Set();
        cellDiffs.forEach((diff) => {
            if (diff.type === 'modified') {
                const modifiedCell = modified.cells[diff.modifiedCellIndex];
                const originalCell = original.cells[diff.originalCellIndex];
                const editor = this.notebookEditor.codeEditors.find(([vm,]) => vm.handle === modifiedCell.handle)?.[1];
                if (editor) {
                    const currentDecorator = this.cellDecorators.get(modifiedCell);
                    if ((currentDecorator?.modifiedCell !== modifiedCell || currentDecorator?.originalCell !== originalCell)) {
                        currentDecorator?.dispose();
                        const decorator = this.instantiationService.createInstance(NotebookCellDiffDecorator, this.notebookEditor, modifiedCell, originalCell, editor);
                        this.cellDecorators.set(modifiedCell, decorator);
                        validDiffDecorators.add(decorator);
                        this._register(editor.onDidDispose(() => {
                            decorator.dispose();
                            if (this.cellDecorators.get(modifiedCell) === decorator) {
                                this.cellDecorators.delete(modifiedCell);
                            }
                        }));
                    }
                    else if (currentDecorator) {
                        validDiffDecorators.add(currentDecorator);
                    }
                }
            }
        });
        // Dispose old decorators
        this.cellDecorators.forEach((v, cell) => {
            if (!validDiffDecorators.has(v)) {
                v.dispose();
                this.cellDecorators.delete(cell);
            }
        });
    }
};
NotebookInlineDiffDecorationContribution = __decorate([
    __param(1, INotebookEditorWorkerService),
    __param(2, IInstantiationService),
    __param(3, INotebookLoggingService)
], NotebookInlineDiffDecorationContribution);
export { NotebookInlineDiffDecorationContribution };
registerNotebookContribution(NotebookInlineDiffDecorationContribution.ID, NotebookInlineDiffDecorationContribution);
registerSingleton(INotebookOriginalModelReferenceFactory, NotebookOriginalModelReferenceFactory, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookOriginalCellModelFactory, OriginalNotebookCellModelFactory, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rSW5saW5lRGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUd6RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdqRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUQsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1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