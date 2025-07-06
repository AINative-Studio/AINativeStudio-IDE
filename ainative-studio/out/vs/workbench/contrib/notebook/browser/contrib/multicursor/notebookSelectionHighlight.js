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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
let NotebookSelectionHighlighter = class NotebookSelectionHighlighter extends Disposable {
    static { this.id = 'notebook.selectionHighlighter'; }
    // right now this lets us mimic the more performant cache implementation of the text editor (doesn't need to be a delayer)
    // todo: in the future, implement caching and change to a 250ms delay upon recompute
    // private readonly runDelayer: Delayer<void> = this._register(new Delayer<void>(0));
    constructor(notebookEditor, configurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.configurationService = configurationService;
        this.isEnabled = false;
        this.cellDecorationIds = new Map();
        this.anchorDisposables = new DisposableStore();
        this.isEnabled = this.configurationService.getValue('editor.selectionHighlight');
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.selectionHighlight')) {
                this.isEnabled = this.configurationService.getValue('editor.selectionHighlight');
            }
        }));
        this._register(this.notebookEditor.onDidChangeActiveCell(async () => {
            if (!this.isEnabled) {
                return;
            }
            this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
            if (!this.anchorCell) {
                return;
            }
            const activeCell = this.notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (!activeCell.editorAttached) {
                await Event.toPromise(activeCell.onDidChangeEditorAttachState);
            }
            this.clearNotebookSelectionDecorations();
            this.anchorDisposables.clear();
            this.anchorDisposables.add(this.anchorCell[1].onDidChangeCursorPosition((e) => {
                if (e.reason !== 3 /* CursorChangeReason.Explicit */) {
                    this.clearNotebookSelectionDecorations();
                    return;
                }
                if (!this.anchorCell) {
                    return;
                }
                if (this.notebookEditor.hasModel()) {
                    this.clearNotebookSelectionDecorations();
                    this._update(this.notebookEditor);
                }
            }));
            if (this.notebookEditor.getEditorViewState().editorFocused && this.notebookEditor.hasModel()) {
                this._update(this.notebookEditor);
            }
        }));
    }
    _update(editor) {
        if (!this.anchorCell || !this.isEnabled) {
            return;
        }
        // TODO: isTooLargeForTokenization check, notebook equivalent?
        // unlikely that any one cell's textmodel would be too large
        // get the word
        const textModel = this.anchorCell[0].textModel;
        if (!textModel || textModel.isTooLargeForTokenization()) {
            return;
        }
        const s = this.anchorCell[0].getSelections()[0];
        if (s.startLineNumber !== s.endLineNumber || s.isEmpty()) {
            // empty selections do nothing
            // multiline forbidden for perf reasons
            return;
        }
        const searchText = this.getSearchText(s, textModel);
        if (!searchText) {
            return;
        }
        const results = editor.textModel.findMatches(searchText, false, true, null);
        for (const res of results) {
            const cell = editor.getCellByHandle(res.cell.handle);
            if (!cell) {
                continue;
            }
            this.updateCellDecorations(cell, res.matches);
        }
    }
    updateCellDecorations(cell, matches) {
        const selections = matches.map(m => {
            return Selection.fromRange(m.range, 0 /* SelectionDirection.LTR */);
        });
        const newDecorations = [];
        selections?.map(selection => {
            const isEmpty = selection.isEmpty();
            if (!isEmpty) {
                newDecorations.push({
                    range: selection,
                    options: {
                        description: '',
                        className: '.nb-selection-highlight',
                    }
                });
            }
        });
        const oldDecorations = this.cellDecorationIds.get(cell) ?? [];
        this.cellDecorationIds.set(cell, cell.deltaModelDecorations(oldDecorations, newDecorations));
    }
    clearNotebookSelectionDecorations() {
        this.cellDecorationIds.forEach((_, cell) => {
            const cellDecorations = this.cellDecorationIds.get(cell) ?? [];
            if (cellDecorations) {
                cell.deltaModelDecorations(cellDecorations, []);
                this.cellDecorationIds.delete(cell);
            }
        });
    }
    getSearchText(selection, model) {
        return model.getValueInRange(selection).replace(/\r\n/g, '\n');
    }
    dispose() {
        super.dispose();
        this.anchorDisposables.dispose();
    }
};
NotebookSelectionHighlighter = __decorate([
    __param(1, IConfigurationService)
], NotebookSelectionHighlighter);
registerNotebookContribution(NotebookSelectionHighlighter.id, NotebookSelectionHighlighter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWxlY3Rpb25IaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9tdWx0aWN1cnNvci9ub3RlYm9va1NlbGVjdGlvbkhpZ2hsaWdodC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV6RixPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLG1EQUFtRCxDQUFDO0FBR2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWpGLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTthQUVwQyxPQUFFLEdBQVcsK0JBQStCLEFBQTFDLENBQTJDO0lBTzdELDBIQUEwSDtJQUMxSCxvRkFBb0Y7SUFDcEYscUZBQXFGO0lBRXJGLFlBQ2tCLGNBQStCLEVBQ3pCLG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUhTLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNSLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFaNUUsY0FBUyxHQUFZLEtBQUssQ0FBQztRQUUzQixzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQztRQUUvQyxzQkFBaUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBWTFELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEs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