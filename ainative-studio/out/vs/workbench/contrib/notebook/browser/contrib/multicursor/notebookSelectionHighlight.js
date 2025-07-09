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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWxlY3Rpb25IaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL211bHRpY3Vyc29yL25vdGVib29rU2VsZWN0aW9uSGlnaGxpZ2h0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXpGLE9BQU8sRUFBRSxTQUFTLEVBQXNCLE1BQU0sbURBQW1ELENBQUM7QUFHbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFFekcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFakYsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO2FBRXBDLE9BQUUsR0FBVywrQkFBK0IsQUFBMUMsQ0FBMkM7SUFPN0QsMEhBQTBIO0lBQzFILG9GQUFvRjtJQUNwRixxRkFBcUY7SUFFckYsWUFDa0IsY0FBK0IsRUFDekIsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBSFMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ1IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQVo1RSxjQUFTLEdBQVksS0FBSyxDQUFDO1FBRTNCLHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUE0QixDQUFDO1FBRS9DLHNCQUFpQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFZMUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFV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