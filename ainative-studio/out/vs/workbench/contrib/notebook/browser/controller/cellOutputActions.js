/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS, NOTEBOOK_CELL_HAS_OUTPUTS } from '../../common/notebookContextKeys.js';
import * as icons from '../notebookIcons.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { copyCellOutput } from '../viewModel/cellOutputTextHelper.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane } from '../notebookBrowser.js';
import { CellKind, CellUri } from '../../common/notebookCommon.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
export const COPY_OUTPUT_COMMAND_ID = 'notebook.cellOutput.copy';
registerAction2(class ShowAllOutputsAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.cellOuput.showEmptyOutputs',
            title: localize('notebookActions.showAllOutput', "Show empty outputs"),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS)
            },
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY
        });
    }
    run(accessor, context) {
        const cell = context.cell;
        if (cell && cell.cellKind === CellKind.Code) {
            for (let i = 1; i < cell.outputsViewModels.length; i++) {
                if (!cell.outputsViewModels[i].visible.get()) {
                    cell.outputsViewModels[i].setVisible(true, true);
                    cell.updateOutputHeight(i, 1, 'command');
                }
            }
        }
    }
});
registerAction2(class CopyCellOutputAction extends Action2 {
    constructor() {
        super({
            id: COPY_OUTPUT_COMMAND_ID,
            title: localize('notebookActions.copyOutput', "Copy Cell Output"),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: NOTEBOOK_CELL_HAS_OUTPUTS
            },
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
        });
    }
    getNoteboookEditor(editorService, outputContext) {
        if (outputContext && 'notebookEditor' in outputContext) {
            return outputContext.notebookEditor;
        }
        return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    async run(accessor, outputContext) {
        const notebookEditor = this.getNoteboookEditor(accessor.get(IEditorService), outputContext);
        if (!notebookEditor) {
            return;
        }
        let outputViewModel;
        if (outputContext && 'outputId' in outputContext && typeof outputContext.outputId === 'string') {
            outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
        }
        else if (outputContext && 'outputViewModel' in outputContext) {
            outputViewModel = outputContext.outputViewModel;
        }
        if (!outputViewModel) {
            // not able to find the output from the provided context, use the active cell
            const activeCell = notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (activeCell.focusedOutputId !== undefined) {
                outputViewModel = activeCell.outputsViewModels.find(output => {
                    return output.model.outputId === activeCell.focusedOutputId;
                });
            }
            else {
                outputViewModel = activeCell.outputsViewModels.find(output => output.pickedMimeType?.isTrusted);
            }
        }
        if (!outputViewModel) {
            return;
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        if (mimeType?.startsWith('image/')) {
            const focusOptions = { skipReveal: true, outputId: outputViewModel.model.outputId, altOutputId: outputViewModel.model.alternativeOutputId };
            await notebookEditor.focusNotebookCell(outputViewModel.cellViewModel, 'output', focusOptions);
            notebookEditor.copyOutputImage(outputViewModel);
        }
        else {
            const clipboardService = accessor.get(IClipboardService);
            const logService = accessor.get(ILogService);
            copyCellOutput(mimeType, outputViewModel, clipboardService, logService);
        }
    }
});
export function getOutputViewModelFromId(outputId, notebookEditor) {
    const notebookViewModel = notebookEditor.getViewModel();
    if (notebookViewModel) {
        const codeCells = notebookViewModel.viewCells.filter(cell => cell.cellKind === CellKind.Code);
        for (const cell of codeCells) {
            const output = cell.outputsViewModels.find(output => output.model.outputId === outputId || output.model.alternativeOutputId === outputId);
            if (output) {
                return output;
            }
        }
    }
    return undefined;
}
export const OPEN_OUTPUT_COMMAND_ID = 'notebook.cellOutput.openInTextEditor';
registerAction2(class OpenCellOutputInEditorAction extends Action2 {
    constructor() {
        super({
            id: OPEN_OUTPUT_COMMAND_ID,
            title: localize('notebookActions.openOutputInEditor', "Open Cell Output in Text Editor"),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
        });
    }
    getNoteboookEditor(editorService, outputContext) {
        if (outputContext && 'notebookEditor' in outputContext) {
            return outputContext.notebookEditor;
        }
        return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    async run(accessor, outputContext) {
        const notebookEditor = this.getNoteboookEditor(accessor.get(IEditorService), outputContext);
        const notebookModelService = accessor.get(INotebookEditorModelResolverService);
        if (!notebookEditor) {
            return;
        }
        let outputViewModel;
        if (outputContext && 'outputId' in outputContext && typeof outputContext.outputId === 'string') {
            outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
        }
        else if (outputContext && 'outputViewModel' in outputContext) {
            outputViewModel = outputContext.outputViewModel;
        }
        const openerService = accessor.get(IOpenerService);
        if (outputViewModel?.model.outputId && notebookEditor.textModel?.uri) {
            // reserve notebook document reference since the active notebook editor might not be pinned so it can be replaced by the output editor
            const ref = await notebookModelService.resolve(notebookEditor.textModel.uri);
            await openerService.open(CellUri.generateCellOutputUriWithId(notebookEditor.textModel.uri, outputViewModel.model.outputId));
            ref.dispose();
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2NlbGxPdXRwdXRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFnQyx5QkFBeUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xILE9BQU8sS0FBSyxLQUFLLE1BQU0scUJBQXFCLENBQUM7QUFDN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUF5RCwrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9ILE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXpH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