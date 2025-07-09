/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { NotebookOutlineContext } from '../contrib/outline/notebookOutline.js';
import { FoldingController } from './foldingController.js';
import { CellEditState } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind } from '../../common/notebookCommon.js';
import { CELL_TITLE_CELL_GROUP_ID } from './coreActions.js';
import { executeSectionCondition } from './executeActions.js';
export class NotebookRunSingleCellInSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.runSingleCell',
            title: {
                ...localize2('runCell', "Run Cell"),
                mnemonicTitle: localize({ key: 'mirunCell', comment: ['&& denotes a mnemonic'] }, "&&Run Cell"),
            },
            shortTitle: localize('runCell', "Run Cell"),
            icon: icons.executeIcon,
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'inline',
                    order: 1,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Code), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren.toNegated(), NotebookOutlineContext.CellHasHeader.toNegated())
                }
            ]
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        context.notebookEditor.executeNotebookCells([context.outlineEntry.cell]);
    }
}
export class NotebookRunCellsInSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.runCells',
            title: {
                ...localize2('runCellsInSection', "Run Cells In Section"),
                mnemonicTitle: localize({ key: 'mirunCellsInSection', comment: ['&& denotes a mnemonic'] }, "&&Run Cells In Section"),
            },
            shortTitle: localize('runCellsInSection', "Run Cells In Section"),
            icon: icons.executeIcon, // TODO @Yoyokrazy replace this with new icon later
            menu: [
                {
                    id: MenuId.NotebookStickyScrollContext,
                    group: 'notebookExecution',
                    order: 1
                },
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'inline',
                    order: 1,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader)
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 0 /* CellToolbarOrder.RunSection */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: executeSectionCondition
                }
            ]
        });
    }
    async run(_accessor, context) {
        let cell;
        if (checkOutlineEntryContext(context)) {
            cell = context.outlineEntry.cell;
        }
        else if (checkNotebookCellContext(context)) {
            cell = context.cell;
        }
        else {
            return;
        }
        if (cell.getEditState() === CellEditState.Editing) {
            const foldingController = context.notebookEditor.getContribution(FoldingController.id);
            foldingController.recompute();
        }
        const cellIdx = context.notebookEditor.getViewModel()?.getCellIndex(cell);
        if (cellIdx === undefined) {
            return;
        }
        const sectionIdx = context.notebookEditor.getViewModel()?.getFoldingStartIndex(cellIdx);
        if (sectionIdx === undefined) {
            return;
        }
        const length = context.notebookEditor.getViewModel()?.getFoldedLength(sectionIdx);
        if (length === undefined) {
            return;
        }
        const cells = context.notebookEditor.getCellsInRange({ start: sectionIdx, end: sectionIdx + length + 1 });
        context.notebookEditor.executeNotebookCells(cells);
    }
}
export class NotebookFoldSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.foldSection',
            title: {
                ...localize2('foldSection', "Fold Section"),
                mnemonicTitle: localize({ key: 'mifoldSection', comment: ['&& denotes a mnemonic'] }, "&&Fold Section"),
            },
            shortTitle: localize('foldSection', "Fold Section"),
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'notebookFolding',
                    order: 2,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader, NotebookOutlineContext.CellFoldingState.isEqualTo(1 /* CellFoldingState.Expanded */))
                }
            ]
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        this.toggleFoldRange(context.outlineEntry, context.notebookEditor);
    }
    toggleFoldRange(entry, notebookEditor) {
        const foldingController = notebookEditor.getContribution(FoldingController.id);
        const index = entry.index;
        const headerLevel = entry.level;
        const newFoldingState = 2 /* CellFoldingState.Collapsed */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
    }
}
export class NotebookExpandSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.expandSection',
            title: {
                ...localize2('expandSection', "Expand Section"),
                mnemonicTitle: localize({ key: 'miexpandSection', comment: ['&& denotes a mnemonic'] }, "&&Expand Section"),
            },
            shortTitle: localize('expandSection', "Expand Section"),
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'notebookFolding',
                    order: 2,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader, NotebookOutlineContext.CellFoldingState.isEqualTo(2 /* CellFoldingState.Collapsed */))
                }
            ]
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        this.toggleFoldRange(context.outlineEntry, context.notebookEditor);
    }
    toggleFoldRange(entry, notebookEditor) {
        const foldingController = notebookEditor.getContribution(FoldingController.id);
        const index = entry.index;
        const headerLevel = entry.level;
        const newFoldingState = 1 /* CellFoldingState.Expanded */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
    }
}
/**
 * Take in context args and check if they exist. True if action is run from notebook sticky scroll context menu or
 * notebook outline context menu.
 *
 * @param context - Notebook Outline Context containing a notebook editor and outline entry
 * @returns true if context is valid, false otherwise
 */
function checkOutlineEntryContext(context) {
    return !!(context && context.notebookEditor && context.outlineEntry);
}
/**
 * Take in context args and check if they exist. True if action is run from a cell toolbar menu (potentially from the
 * notebook cell container or cell editor context menus, but not tested or implemented atm)
 *
 * @param context - Notebook Outline Context containing a notebook editor and outline entry
 * @returns true if context is valid, false otherwise
 */
function checkNotebookCellContext(context) {
    return !!(context && context.notebookEditor && context.cell);
}
registerAction2(NotebookRunSingleCellInSection);
registerAction2(NotebookRunCellsInSection);
registerAction2(NotebookFoldSection);
registerAction2(NotebookExpandSection);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdGlvbkFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL3NlY3Rpb25BY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRXpGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQXFELE1BQU0sdUJBQXVCLENBQUM7QUFDekcsT0FBTyxLQUFLLEtBQUssTUFBTSxxQkFBcUIsQ0FBQztBQUU3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFvQixNQUFNLGtCQUFrQixDQUFDO0FBQzlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBWTlELE1BQU0sT0FBTyw4QkFBK0IsU0FBUSxPQUFPO0lBQzFEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztnQkFDbkMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLENB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