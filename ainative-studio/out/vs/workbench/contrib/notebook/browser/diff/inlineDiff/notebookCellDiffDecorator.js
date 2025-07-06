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
import { DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorunWithStore, derived, observableFromEvent } from '../../../../../../base/common/observable.js';
import { ThrottledDelayer } from '../../../../../../base/common/async.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { themeColorFromId } from '../../../../../../base/common/themables.js';
import { RenderOptions, LineSource, renderLines } from '../../../../../../editor/browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { diffAddDecoration, diffWholeLineAddDecoration, diffDeleteDecoration } from '../../../../../../editor/browser/widget/diffEditor/registrations.contribution.js';
import { OverviewRulerLane } from '../../../../../../editor/common/model.js';
import { ModelDecorationOptions } from '../../../../../../editor/common/model/textModel.js';
import { InlineDecoration } from '../../../../../../editor/common/viewModel.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { minimapGutterAddedBackground, minimapGutterDeletedBackground, minimapGutterModifiedBackground, overviewRulerAddedForeground, overviewRulerDeletedForeground, overviewRulerModifiedForeground } from '../../../../scm/common/quickDiff.js';
import { INotebookOriginalCellModelFactory } from './notebookOriginalCellModelFactory.js';
//TODO: allow client to set read-only - chateditsession should set read-only while making changes
let NotebookCellDiffDecorator = class NotebookCellDiffDecorator extends DisposableStore {
    constructor(notebookEditor, modifiedCell, originalCell, editor, _editorWorkerService, originalCellModelFactory) {
        super();
        this.modifiedCell = modifiedCell;
        this.originalCell = originalCell;
        this.editor = editor;
        this._editorWorkerService = _editorWorkerService;
        this.originalCellModelFactory = originalCellModelFactory;
        this._viewZones = [];
        this.throttledDecorator = new ThrottledDelayer(50);
        this.perEditorDisposables = this.add(new DisposableStore());
        const onDidChangeVisibleRanges = observableFromEvent(notebookEditor.onDidChangeVisibleRanges, () => notebookEditor.visibleRanges);
        const editorObs = derived((r) => {
            const visibleRanges = onDidChangeVisibleRanges.read(r);
            const visibleCellHandles = visibleRanges.map(range => notebookEditor.getCellsInRange(range)).flat().map(c => c.handle);
            if (!visibleCellHandles.includes(modifiedCell.handle)) {
                return;
            }
            const editor = notebookEditor.codeEditors.find(item => item[0].handle === modifiedCell.handle)?.[1];
            if (editor?.getModel() !== this.modifiedCell.textModel) {
                return;
            }
            return editor;
        });
        this.add(autorunWithStore((r, store) => {
            const editor = editorObs.read(r);
            this.perEditorDisposables.clear();
            if (editor) {
                store.add(editor.onDidChangeModel(() => {
                    this.perEditorDisposables.clear();
                }));
                store.add(editor.onDidChangeModelContent(() => {
                    this.update(editor);
                }));
                store.add(editor.onDidChangeConfiguration((e) => {
                    if (e.hasChanged(52 /* EditorOption.fontInfo */) || e.hasChanged(68 /* EditorOption.lineHeight */)) {
                        this.update(editor);
                    }
                }));
                this.update(editor);
            }
        }));
    }
    update(editor) {
        this.throttledDecorator.trigger(() => this._updateImpl(editor));
    }
    async _updateImpl(editor) {
        if (this.isDisposed) {
            return;
        }
        if (editor.getOption(63 /* EditorOption.inDiffEditor */)) {
            this.perEditorDisposables.clear();
            return;
        }
        const model = editor.getModel();
        if (!model || model !== this.modifiedCell.textModel) {
            this.perEditorDisposables.clear();
            return;
        }
        const originalModel = this.getOrCreateOriginalModel(editor);
        if (!originalModel) {
            this.perEditorDisposables.clear();
            return;
        }
        const version = model.getVersionId();
        const diff = await this._editorWorkerService.computeDiff(originalModel.uri, model.uri, { computeMoves: true, ignoreTrimWhitespace: false, maxComputationTimeMs: Number.MAX_SAFE_INTEGER }, 'advanced');
        if (this.isDisposed) {
            return;
        }
        if (diff && !diff.identical && this.modifiedCell.textModel && originalModel && model === editor.getModel() && editor.getModel()?.getVersionId() === version) {
            this._updateWithDiff(editor, originalModel, diff, this.modifiedCell.textModel);
        }
        else {
            this.perEditorDisposables.clear();
        }
    }
    getOrCreateOriginalModel(editor) {
        if (!this._originalModel) {
            const model = editor.getModel();
            if (!model) {
                return;
            }
            this._originalModel = this.add(this.originalCellModelFactory.getOrCreate(model.uri, this.originalCell.getValue(), model.getLanguageId(), this.modifiedCell.cellKind)).object;
        }
        return this._originalModel;
    }
    _updateWithDiff(editor, originalModel, diff, currentModel) {
        if (areDiffsEqual(diff, this.diffForPreviouslyAppliedDecorators)) {
            return;
        }
        this.perEditorDisposables.clear();
        const decorations = editor.createDecorationsCollection();
        this.perEditorDisposables.add(toDisposable(() => {
            editor.changeViewZones((viewZoneChangeAccessor) => {
                for (const id of this._viewZones) {
                    viewZoneChangeAccessor.removeZone(id);
                }
            });
            this._viewZones = [];
            decorations.clear();
            this.diffForPreviouslyAppliedDecorators = undefined;
        }));
        this.diffForPreviouslyAppliedDecorators = diff;
        const chatDiffAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
        });
        const chatDiffWholeLineAddDecoration = ModelDecorationOptions.createDynamic({
            ...diffWholeLineAddDecoration,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        });
        const createOverviewDecoration = (overviewRulerColor, minimapColor) => {
            return ModelDecorationOptions.createDynamic({
                description: 'chat-editing-decoration',
                overviewRuler: { color: themeColorFromId(overviewRulerColor), position: OverviewRulerLane.Left },
                minimap: { color: themeColorFromId(minimapColor), position: 2 /* MinimapPosition.Gutter */ },
            });
        };
        const modifiedDecoration = createOverviewDecoration(overviewRulerModifiedForeground, minimapGutterModifiedBackground);
        const addedDecoration = createOverviewDecoration(overviewRulerAddedForeground, minimapGutterAddedBackground);
        const deletedDecoration = createOverviewDecoration(overviewRulerDeletedForeground, minimapGutterDeletedBackground);
        editor.changeViewZones((viewZoneChangeAccessor) => {
            for (const id of this._viewZones) {
                viewZoneChangeAccessor.removeZone(id);
            }
            this._viewZones = [];
            const modifiedVisualDecorations = [];
            const mightContainNonBasicASCII = originalModel.mightContainNonBasicASCII();
            const mightContainRTL = originalModel.mightContainRTL();
            const renderOptions = RenderOptions.fromEditor(this.editor);
            const editorLineCount = currentModel.getLineCount();
            for (const diffEntry of diff.changes) {
                const originalRange = diffEntry.original;
                originalModel.tokenization.forceTokenization(Math.max(1, originalRange.endLineNumberExclusive - 1));
                const source = new LineSource(originalRange.mapToLineArray(l => originalModel.tokenization.getLineTokens(l)), [], mightContainNonBasicASCII, mightContainRTL);
                const decorations = [];
                for (const i of diffEntry.innerChanges || []) {
                    decorations.push(new InlineDecoration(i.originalRange.delta(-(diffEntry.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                    // If the original range is empty, the start line number is 1 and the new range spans the entire file, don't draw an Added decoration
                    if (!(i.originalRange.isEmpty() && i.originalRange.startLineNumber === 1 && i.modifiedRange.endLineNumber === editorLineCount) && !i.modifiedRange.isEmpty()) {
                        modifiedVisualDecorations.push({
                            range: i.modifiedRange, options: chatDiffAddDecoration
                        });
                    }
                }
                // Render an added decoration but don't also render a deleted decoration for newly inserted content at the start of the file
                // Note, this is a workaround for the `LineRange.isEmpty()` in diffEntry.original being `false` for newly inserted content
                const isCreatedContent = decorations.length === 1 && decorations[0].range.isEmpty() && diffEntry.original.startLineNumber === 1;
                if (!diffEntry.modified.isEmpty && !(isCreatedContent && (diffEntry.modified.endLineNumberExclusive - 1) === editorLineCount)) {
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: chatDiffWholeLineAddDecoration
                    });
                }
                if (diffEntry.original.isEmpty) {
                    // insertion
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: addedDecoration
                    });
                }
                else if (diffEntry.modified.isEmpty) {
                    // deletion
                    modifiedVisualDecorations.push({
                        range: new Range(diffEntry.modified.startLineNumber - 1, 1, diffEntry.modified.startLineNumber, 1),
                        options: deletedDecoration
                    });
                }
                else {
                    // modification
                    modifiedVisualDecorations.push({
                        range: diffEntry.modified.toInclusiveRange(),
                        options: modifiedDecoration
                    });
                }
                const domNode = document.createElement('div');
                domNode.className = 'chat-editing-original-zone view-lines line-delete monaco-mouse-cursor-text';
                const result = renderLines(source, renderOptions, decorations, domNode);
                if (!isCreatedContent) {
                    const viewZoneData = {
                        afterLineNumber: diffEntry.modified.startLineNumber - 1,
                        heightInLines: result.heightInLines,
                        domNode,
                        ordinal: 50000 + 2 // more than https://github.com/microsoft/vscode/blob/bf52a5cfb2c75a7327c9adeaefbddc06d529dcad/src/vs/workbench/contrib/inlineChat/browser/inlineChatZoneWidget.ts#L42
                    };
                    this._viewZones.push(viewZoneChangeAccessor.addZone(viewZoneData));
                }
            }
            decorations.set(modifiedVisualDecorations);
        });
    }
};
NotebookCellDiffDecorator = __decorate([
    __param(4, IEditorWorkerService),
    __param(5, INotebookOriginalCellModelFactory)
], NotebookCellDiffDecorator);
export { NotebookCellDiffDecorator };
function areDiffsEqual(a, b) {
    if (a && b) {
        if (a.changes.length !== b.changes.length) {
            return false;
        }
        if (a.moves.length !== b.moves.length) {
            return false;
        }
        if (!areLineRangeMappinsEqual(a.changes, b.changes)) {
            return false;
        }
        if (!a.moves.some((move, i) => {
            const bMove = b.moves[i];
            if (!areLineRangeMappinsEqual(move.changes, bMove.changes)) {
                return true;
            }
            if (move.lineRangeMapping.changedLineCount !== bMove.lineRangeMapping.changedLineCount) {
                return true;
            }
            if (!move.lineRangeMapping.modified.equals(bMove.lineRangeMapping.modified)) {
                return true;
            }
            if (!move.lineRangeMapping.original.equals(bMove.lineRangeMapping.original)) {
                return true;
            }
            return false;
        })) {
            return false;
        }
        return true;
    }
    else if (!a && !b) {
        return true;
    }
    else {
        return false;
    }
}
function areLineRangeMappinsEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    if (a.some((c, i) => {
        const bChange = b[i];
        if (c.changedLineCount !== bChange.changedLineCount) {
            return true;
        }
        if ((c.innerChanges || []).length !== (bChange.innerChanges || []).length) {
            return true;
        }
        if ((c.innerChanges || []).some((innerC, innerIdx) => {
            const bInnerC = bChange.innerChanges[innerIdx];
            if (!innerC.modifiedRange.equalsRange(bInnerC.modifiedRange)) {
                return true;
            }
            if (!innerC.originalRange.equalsRange(bInnerC.originalRange)) {
                return true;
            }
            return false;
        })) {
            return true;
        }
        return false;
    })) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsRGlmZkRlY29yYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rQ2VsbERpZmZEZWNvcmF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFN0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0dBQWtHLENBQUM7QUFDMUosT0FBTyxFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFFdkssT0FBTyxFQUE4RSxpQkFBaUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pKLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBd0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHdEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLDhCQUE4QixFQUFFLCtCQUErQixFQUFFLDRCQUE0QixF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