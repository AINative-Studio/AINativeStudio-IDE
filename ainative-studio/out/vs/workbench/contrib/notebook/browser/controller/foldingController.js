/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR } from '../../common/notebookContextKeys.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { FoldingModel } from '../viewModel/foldingModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { registerNotebookContribution } from '../notebookEditorExtensions.js';
import { registerAction2, Action2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContextKey } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { localize, localize2 } from '../../../../../nls.js';
export class FoldingController extends Disposable {
    static { this.id = 'workbench.notebook.foldingController'; }
    constructor(_notebookEditor) {
        super();
        this._notebookEditor = _notebookEditor;
        this._foldingModel = null;
        this._localStore = this._register(new DisposableStore());
        this._register(this._notebookEditor.onMouseUp(e => { this.onMouseUp(e); }));
        this._register(this._notebookEditor.onDidChangeModel(() => {
            this._localStore.clear();
            if (!this._notebookEditor.hasModel()) {
                return;
            }
            this._localStore.add(this._notebookEditor.onDidChangeCellState(e => {
                if (e.source.editStateChanged && e.cell.cellKind === CellKind.Markup) {
                    this._foldingModel?.recompute();
                }
            }));
            this._foldingModel = new FoldingModel();
            this._localStore.add(this._foldingModel);
            this._foldingModel.attachViewModel(this._notebookEditor.getViewModel());
            this._localStore.add(this._foldingModel.onDidFoldingRegionChanged(() => {
                this._updateEditorFoldingRanges();
            }));
        }));
    }
    saveViewState() {
        return this._foldingModel?.getMemento() || [];
    }
    restoreViewState(state) {
        this._foldingModel?.applyMemento(state || []);
        this._updateEditorFoldingRanges();
    }
    setFoldingStateDown(index, state, levels) {
        const doCollapse = state === 2 /* CellFoldingState.Collapsed */;
        const region = this._foldingModel.getRegionAtLine(index + 1);
        const regions = [];
        if (region) {
            if (region.isCollapsed !== doCollapse) {
                regions.push(region);
            }
            if (levels > 1) {
                const regionsInside = this._foldingModel.getRegionsInside(region, (r, level) => r.isCollapsed !== doCollapse && level < levels);
                regions.push(...regionsInside);
            }
        }
        regions.forEach(r => this._foldingModel.setCollapsed(r.regionIndex, state === 2 /* CellFoldingState.Collapsed */));
        this._updateEditorFoldingRanges();
    }
    setFoldingStateUp(index, state, levels) {
        if (!this._foldingModel) {
            return;
        }
        const regions = this._foldingModel.getAllRegionsAtLine(index + 1, (region, level) => region.isCollapsed !== (state === 2 /* CellFoldingState.Collapsed */) && level <= levels);
        regions.forEach(r => this._foldingModel.setCollapsed(r.regionIndex, state === 2 /* CellFoldingState.Collapsed */));
        this._updateEditorFoldingRanges();
    }
    _updateEditorFoldingRanges() {
        if (!this._foldingModel) {
            return;
        }
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const vm = this._notebookEditor.getViewModel();
        vm.updateFoldingRanges(this._foldingModel.regions);
        const hiddenRanges = vm.getHiddenRanges();
        this._notebookEditor.setHiddenAreas(hiddenRanges);
    }
    onMouseUp(e) {
        if (!e.event.target) {
            return;
        }
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const viewModel = this._notebookEditor.getViewModel();
        const target = e.event.target;
        if (target.classList.contains('codicon-notebook-collapsed') || target.classList.contains('codicon-notebook-expanded')) {
            const parent = target.parentElement;
            if (!parent.classList.contains('notebook-folding-indicator')) {
                return;
            }
            // folding icon
            const cellViewModel = e.target;
            const modelIndex = viewModel.getCellIndex(cellViewModel);
            const state = viewModel.getFoldingState(modelIndex);
            if (state === 0 /* CellFoldingState.None */) {
                return;
            }
            this.setFoldingStateUp(modelIndex, state === 2 /* CellFoldingState.Collapsed */ ? 1 /* CellFoldingState.Expanded */ : 2 /* CellFoldingState.Collapsed */, 1);
            this._notebookEditor.focusElement(cellViewModel);
        }
        return;
    }
    recompute() {
        this._foldingModel?.recompute();
    }
}
registerNotebookContribution(FoldingController.id, FoldingController);
const NOTEBOOK_FOLD_COMMAND_LABEL = localize('fold.cell', "Fold Cell");
const NOTEBOOK_UNFOLD_COMMAND_LABEL = localize2('unfold.cell', "Unfold Cell");
const FOLDING_COMMAND_ARGS = {
    args: [{
            isOptional: true,
            name: 'index',
            description: 'The cell index',
            schema: {
                'type': 'object',
                'required': ['index', 'direction'],
                'properties': {
                    'index': {
                        'type': 'number'
                    },
                    'direction': {
                        'type': 'string',
                        'enum': ['up', 'down'],
                        'default': 'down'
                    },
                    'levels': {
                        'type': 'number',
                        'default': 1
                    },
                }
            }
        }]
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.fold',
            title: localize2('fold.cell', "Fold Cell"),
            category: NOTEBOOK_ACTIONS_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
                    secondary: [15 /* KeyCode.LeftArrow */],
                },
                secondary: [15 /* KeyCode.LeftArrow */],
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            metadata: {
                description: NOTEBOOK_FOLD_COMMAND_LABEL,
                args: FOLDING_COMMAND_ARGS.args
            },
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
            f1: true
        });
    }
    async run(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        if (!editor.hasModel()) {
            return;
        }
        const levels = args && args.levels || 1;
        const direction = args && args.direction === 'up' ? 'up' : 'down';
        let index = undefined;
        if (args) {
            index = args.index;
        }
        else {
            const activeCell = editor.getActiveCell();
            if (!activeCell) {
                return;
            }
            index = editor.getCellIndex(activeCell);
        }
        const controller = editor.getContribution(FoldingController.id);
        if (index !== undefined) {
            const targetCell = (index < 0 || index >= editor.getLength()) ? undefined : editor.cellAt(index);
            if (targetCell?.cellKind === CellKind.Code && direction === 'down') {
                return;
            }
            if (direction === 'up') {
                controller.setFoldingStateUp(index, 2 /* CellFoldingState.Collapsed */, levels);
            }
            else {
                controller.setFoldingStateDown(index, 2 /* CellFoldingState.Collapsed */, levels);
            }
            const viewIndex = editor.getViewModel().getNearestVisibleCellIndexUpwards(index);
            editor.focusElement(editor.cellAt(viewIndex));
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.unfold',
            title: NOTEBOOK_UNFOLD_COMMAND_LABEL,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, ContextKeyExpr.not(InputFocusedContextKey)),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
                    secondary: [17 /* KeyCode.RightArrow */],
                },
                secondary: [17 /* KeyCode.RightArrow */],
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            metadata: {
                description: NOTEBOOK_UNFOLD_COMMAND_LABEL,
                args: FOLDING_COMMAND_ARGS.args
            },
            precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
            f1: true
        });
    }
    async run(accessor, args) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        const levels = args && args.levels || 1;
        const direction = args && args.direction === 'up' ? 'up' : 'down';
        let index = undefined;
        if (args) {
            index = args.index;
        }
        else {
            const activeCell = editor.getActiveCell();
            if (!activeCell) {
                return;
            }
            index = editor.getCellIndex(activeCell);
        }
        const controller = editor.getContribution(FoldingController.id);
        if (index !== undefined) {
            if (direction === 'up') {
                controller.setFoldingStateUp(index, 1 /* CellFoldingState.Expanded */, levels);
            }
            else {
                controller.setFoldingStateDown(index, 1 /* CellFoldingState.Expanded */, levels);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2ZvbGRpbmdDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekcsT0FBTyxFQUEyRSwrQkFBK0IsRUFBb0IsTUFBTSx1QkFBdUIsQ0FBQztBQUNuSyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFdkgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFJbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFLNUQsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFVBQVU7YUFDekMsT0FBRSxHQUFXLHNDQUFzQyxBQUFqRCxDQUFrRDtJQUszRCxZQUE2QixlQUFnQztR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