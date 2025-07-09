/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { getNotebookEditorFromEditorPane, cellRangeToViewCells } from '../notebookBrowser.js';
import { INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_IS_ACTIVE_EDITOR, NOTEBOOK_KERNEL_COUNT, NOTEBOOK_KERNEL_SOURCE_COUNT, REPL_NOTEBOOK_IS_ACTIVE_EDITOR } from '../../common/notebookContextKeys.js';
import { isICellRange } from '../../common/notebookRange.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isEditorCommandsContext } from '../../../../common/editor.js';
import { INotebookEditorService } from '../services/notebookEditorService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { isEqual } from '../../../../../base/common/resources.js';
// Kernel Command
export const SELECT_KERNEL_ID = '_notebook.selectKernel';
export const NOTEBOOK_ACTIONS_CATEGORY = localize2('notebookActions.category', 'Notebook');
export const CELL_TITLE_CELL_GROUP_ID = 'inline/cell';
export const CELL_TITLE_OUTPUT_GROUP_ID = 'inline/output';
export const NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT = 100 /* KeybindingWeight.EditorContrib */; // smaller than Suggest Widget, etc
export const NOTEBOOK_OUTPUT_WEBVIEW_ACTION_WEIGHT = 200 /* KeybindingWeight.WorkbenchContrib */ + 1; // higher than Workbench contribution (such as Notebook List View), etc
export var CellToolbarOrder;
(function (CellToolbarOrder) {
    CellToolbarOrder[CellToolbarOrder["RunSection"] = 0] = "RunSection";
    CellToolbarOrder[CellToolbarOrder["EditCell"] = 1] = "EditCell";
    CellToolbarOrder[CellToolbarOrder["ExecuteAboveCells"] = 2] = "ExecuteAboveCells";
    CellToolbarOrder[CellToolbarOrder["ExecuteCellAndBelow"] = 3] = "ExecuteCellAndBelow";
    CellToolbarOrder[CellToolbarOrder["SaveCell"] = 4] = "SaveCell";
    CellToolbarOrder[CellToolbarOrder["SplitCell"] = 5] = "SplitCell";
    CellToolbarOrder[CellToolbarOrder["ClearCellOutput"] = 6] = "ClearCellOutput";
})(CellToolbarOrder || (CellToolbarOrder = {}));
export var CellOverflowToolbarGroups;
(function (CellOverflowToolbarGroups) {
    CellOverflowToolbarGroups["Copy"] = "1_copy";
    CellOverflowToolbarGroups["Insert"] = "2_insert";
    CellOverflowToolbarGroups["Edit"] = "3_edit";
    CellOverflowToolbarGroups["Share"] = "4_share";
})(CellOverflowToolbarGroups || (CellOverflowToolbarGroups = {}));
export function getContextFromActiveEditor(editorService) {
    const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    if (!editor || !editor.hasModel()) {
        return;
    }
    const activeCell = editor.getActiveCell();
    const selectedCells = editor.getSelectionViewModels();
    return {
        cell: activeCell,
        selectedCells,
        notebookEditor: editor
    };
}
function getWidgetFromUri(accessor, uri) {
    const notebookEditorService = accessor.get(INotebookEditorService);
    const widget = notebookEditorService.listNotebookEditors().find(widget => widget.hasModel() && widget.textModel.uri.toString() === uri.toString());
    if (widget && widget.hasModel()) {
        return widget;
    }
    return undefined;
}
export function getContextFromUri(accessor, context) {
    const uri = URI.revive(context);
    if (uri) {
        const widget = getWidgetFromUri(accessor, uri);
        if (widget) {
            return {
                notebookEditor: widget,
            };
        }
    }
    return undefined;
}
export function findTargetCellEditor(context, targetCell) {
    let foundEditor = undefined;
    for (const [, codeEditor] of context.notebookEditor.codeEditors) {
        if (isEqual(codeEditor.getModel()?.uri, targetCell.uri)) {
            foundEditor = codeEditor;
            break;
        }
    }
    return foundEditor;
}
export class NotebookAction extends Action2 {
    constructor(desc) {
        if (desc.f1 !== false) {
            desc.f1 = false;
            const f1Menu = {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.or(NOTEBOOK_IS_ACTIVE_EDITOR, INTERACTIVE_WINDOW_IS_ACTIVE_EDITOR, REPL_NOTEBOOK_IS_ACTIVE_EDITOR)
            };
            if (!desc.menu) {
                desc.menu = [];
            }
            else if (!Array.isArray(desc.menu)) {
                desc.menu = [desc.menu];
            }
            desc.menu = [
                ...desc.menu,
                f1Menu
            ];
        }
        desc.category = NOTEBOOK_ACTIONS_CATEGORY;
        super(desc);
    }
    async run(accessor, context, ...additionalArgs) {
        sendEntryTelemetry(accessor, this.desc.id, context);
        if (!this.isNotebookActionContext(context)) {
            context = this.getEditorContextFromArgsOrActive(accessor, context, ...additionalArgs);
            if (!context) {
                return;
            }
        }
        return this.runWithContext(accessor, context);
    }
    isNotebookActionContext(context) {
        return !!context && !!context.notebookEditor;
    }
    getEditorContextFromArgsOrActive(accessor, context, ...additionalArgs) {
        return getContextFromActiveEditor(accessor.get(IEditorService));
    }
}
// todo@rebornix, replace NotebookAction with this
export class NotebookMultiCellAction extends Action2 {
    constructor(desc) {
        if (desc.f1 !== false) {
            desc.f1 = false;
            const f1Menu = {
                id: MenuId.CommandPalette,
                when: NOTEBOOK_IS_ACTIVE_EDITOR
            };
            if (!desc.menu) {
                desc.menu = [];
            }
            else if (!Array.isArray(desc.menu)) {
                desc.menu = [desc.menu];
            }
            desc.menu = [
                ...desc.menu,
                f1Menu
            ];
        }
        desc.category = NOTEBOOK_ACTIONS_CATEGORY;
        super(desc);
    }
    parseArgs(accessor, ...args) {
        return undefined;
    }
    /**
     * The action/command args are resolved in following order
     * `run(accessor, cellToolbarContext)` from cell toolbar
     * `run(accessor, ...args)` from command service with arguments
     * `run(accessor, undefined)` from keyboard shortcuts, command palatte, etc
     */
    async run(accessor, ...additionalArgs) {
        const context = additionalArgs[0];
        sendEntryTelemetry(accessor, this.desc.id, context);
        const isFromCellToolbar = isCellToolbarContext(context);
        if (isFromCellToolbar) {
            return this.runWithContext(accessor, context);
        }
        // handle parsed args
        const parsedArgs = this.parseArgs(accessor, ...additionalArgs);
        if (parsedArgs) {
            return this.runWithContext(accessor, parsedArgs);
        }
        // no parsed args, try handle active editor
        const editor = getEditorFromArgsOrActivePane(accessor);
        if (editor) {
            const selectedCellRange = editor.getSelections().length === 0 ? [editor.getFocus()] : editor.getSelections();
            return this.runWithContext(accessor, {
                ui: false,
                notebookEditor: editor,
                selectedCells: cellRangeToViewCells(editor, selectedCellRange)
            });
        }
    }
}
export class NotebookCellAction extends NotebookAction {
    isCellActionContext(context) {
        return !!context && !!context.notebookEditor && !!context.cell;
    }
    getCellContextFromArgs(accessor, context, ...additionalArgs) {
        return undefined;
    }
    async run(accessor, context, ...additionalArgs) {
        sendEntryTelemetry(accessor, this.desc.id, context);
        if (this.isCellActionContext(context)) {
            return this.runWithContext(accessor, context);
        }
        const contextFromArgs = this.getCellContextFromArgs(accessor, context, ...additionalArgs);
        if (contextFromArgs) {
            return this.runWithContext(accessor, contextFromArgs);
        }
        const activeEditorContext = this.getEditorContextFromArgsOrActive(accessor);
        if (this.isCellActionContext(activeEditorContext)) {
            return this.runWithContext(accessor, activeEditorContext);
        }
    }
}
export const executeNotebookCondition = ContextKeyExpr.or(ContextKeyExpr.greater(NOTEBOOK_KERNEL_COUNT.key, 0), ContextKeyExpr.greater(NOTEBOOK_KERNEL_SOURCE_COUNT.key, 0));
function sendEntryTelemetry(accessor, id, context) {
    if (context) {
        const telemetryService = accessor.get(ITelemetryService);
        if (context.source) {
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: context.source });
        }
        else if (URI.isUri(context)) {
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: 'cellEditorContextMenu' });
        }
        else if (context && 'from' in context && context.from === 'cellContainer') {
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: 'cellContainer' });
        }
        else {
            const from = isCellToolbarContext(context) ? 'cellToolbar' : (isEditorCommandsContext(context) ? 'editorToolbar' : 'other');
            telemetryService.publicLog2('workbenchActionExecuted', { id: id, from: from });
        }
    }
}
function isCellToolbarContext(context) {
    return !!context && !!context.notebookEditor && context.$mid === 13 /* MarshalledId.NotebookCellActionContext */;
}
function isMultiCellArgs(arg) {
    if (arg === undefined) {
        return false;
    }
    const ranges = arg.ranges;
    if (!ranges) {
        return false;
    }
    if (!Array.isArray(ranges) || ranges.some(range => !isICellRange(range))) {
        return false;
    }
    if (arg.document) {
        const uri = URI.revive(arg.document);
        if (!uri) {
            return false;
        }
    }
    return true;
}
export function getEditorFromArgsOrActivePane(accessor, context) {
    const editorFromUri = getContextFromUri(accessor, context)?.notebookEditor;
    if (editorFromUri) {
        return editorFromUri;
    }
    const editor = getNotebookEditorFromEditorPane(accessor.get(IEditorService).activeEditorPane);
    if (!editor || !editor.hasModel()) {
        return;
    }
    return editor;
}
export function parseMultiCellExecutionArgs(accessor, ...args) {
    const firstArg = args[0];
    if (isMultiCellArgs(firstArg)) {
        const editor = getEditorFromArgsOrActivePane(accessor, firstArg.document);
        if (!editor) {
            return;
        }
        const ranges = firstArg.ranges;
        const selectedCells = ranges.map(range => editor.getCellsInRange(range).slice(0)).flat();
        const autoReveal = firstArg.autoReveal;
        return {
            ui: false,
            notebookEditor: editor,
            selectedCells,
            autoReveal
        };
    }
    // handle legacy arguments
    if (isICellRange(firstArg)) {
        // cellRange, document
        const secondArg = args[1];
        const editor = getEditorFromArgsOrActivePane(accessor, secondArg);
        if (!editor) {
            return;
        }
        return {
            ui: false,
            notebookEditor: editor,
            selectedCells: editor.getCellsInRange(firstArg)
        };
    }
    // let's just execute the active cell
    const context = getContextFromActiveEditor(accessor.get(IEditorService));
    return context ? {
        ui: false,
        notebookEditor: context.notebookEditor,
        selectedCells: context.selectedCells ?? [],
        cell: context.cell
    } : undefined;
}
export const cellExecutionArgs = [
    {
        isOptional: true,
        name: 'options',
        description: 'The cell range options',
        schema: {
            'type': 'object',
            'required': ['ranges'],
            'properties': {
                'ranges': {
                    'type': 'array',
                    items: [
                        {
                            'type': 'object',
                            'required': ['start', 'end'],
                            'properties': {
                                'start': {
                                    'type': 'number'
                                },
                                'end': {
                                    'type': 'number'
                                }
                            }
                        }
                    ]
                },
                'document': {
                    'type': 'object',
                    'description': 'The document uri',
                },
                'autoReveal': {
                    'type': 'boolean',
                    'description': 'Whether the cell should be revealed into view automatically'
                }
            }
        }
    }
];
MenuRegistry.appendMenuItem(MenuId.NotebookCellTitle, {
    submenu: MenuId.NotebookCellInsert,
    title: localize('notebookMenu.insertCell', "Insert Cell"),
    group: "2_insert" /* CellOverflowToolbarGroups.Insert */,
    when: NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true)
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.NotebookCellTitle,
    title: localize('notebookMenu.cellTitle', "Notebook Cell"),
    group: "2_insert" /* CellOverflowToolbarGroups.Insert */,
    when: NOTEBOOK_EDITOR_FOCUSED
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellTitle, {
    title: localize('miShare', "Share"),
    submenu: MenuId.EditorContextShare,
    group: "4_share" /* CellOverflowToolbarGroups.Share */
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2NvcmVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFtQixNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBR3pGLE9BQU8sRUFBRSwrQkFBK0IsRUFBeUMsb0JBQW9CLEVBQXdCLE1BQU0sdUJBQXVCLENBQUM7QUFDM0osT0FBTyxFQUFFLG1DQUFtQyxFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLHFCQUFxQixFQUFFLDRCQUE0QixFQUFFLDhCQUE4QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN1AsT0FBTyxFQUFjLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQU0xRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEUsaUJBQWlCO0FBQ2pCLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLHdCQUF3QixDQUFDO0FBQ3pELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUUzRixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxhQUFhLENBQUM7QUFDdEQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsZUFBZSxDQUFDO0FBRTFELE1BQU0sQ0FBQyxNQUFNLG9DQUFvQywyQ0FBaUMsQ0FBQyxDQUFDLG1DQUFtQztBQUN2SCxNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBRyw4Q0FBb0MsQ0FBQyxDQUFDLENBQUMsdUVBQXVFO0FBRW5LLE1BQU0sQ0FBTixJQUFrQixnQkFRakI7QUFSRCxXQUFrQixnQkFBZ0I7SUFDakMsbUVBQVUsQ0FBQTtJQUNWLCtEQUFRLENBQUE7SUFDUixpRkFBaUIsQ0FBQTtJQUNqQixxRkFBbUIsQ0FBQTtJQUNuQiwrREFBUSxDQUFBO0lBQ1IsaUVBQVMsQ0FBQTtJQUNULDZFQUFlLENBQUE7QUFDaEIsQ0FBQyxFQVJpQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBUWpDO0FBRUQsTUFBTSxDQUFOLElBQWtCLHlCQUtqQjtBQUxELFdBQWtCLHlCQUF5QjtJQUMxQyw0Q0FBZSxDQUFBO0lBQ2YsZ0RBQW1CLENBQUE7SUFDbkIsNENBQWUsQ0FBQTtJQUNmLDhDQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFMaUIseUJBQXlCLEtBQXpCLHlCQUF5QixRQUsxQztBQTRCRCxNQUFNLFVBQVUsMEJBQTBCLENBQUMsYUFBNkI7SUFDdkUsTUFBTSxNQUFNLEdBQUcsK0JBQStCLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDL0UsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ25DLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQzFDLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO0lBQ3RELE9BQU87UUFDTixJQUFJLEVBQUUsVUFBVTtRQUNoQixhQUFhO1FBQ2IsY0FBYyxFQUFFLE1BQU07S0FDdEIsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLFFBQTBCLEVBQUUsR0FBUTtJQUM3RCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNuRSxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUVuSixJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNqQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFFBQTBCLEVBQUUsT0FBYTtJQUMxRSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRWhDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDVCxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFFL0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ04sY0FBYyxFQUFFLE1BQU07YUFDdEIsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxPQUFtQyxFQUFFLFVBQTBCO0lBQ25HLElBQUksV0FBVyxHQUE0QixTQUFTLENBQUM7SUFDckQsS0FBSyxNQUFNLENBQUMsRUFBRSxVQUFVLENBQUMsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2pFLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekQsV0FBVyxHQUFHLFVBQVUsQ0FBQztZQUN6QixNQUFNO1FBQ1AsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLFdBQVcsQ0FBQztBQUNwQixDQUFDO0FBRUQsTUFBTSxPQUFnQixjQUFlLFNBQVEsT0FBTztJQUNuRCxZQUFZLElBQXFCO1FBQ2hDLElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQztZQUNoQixNQUFNLE1BQU0sR0FBRztnQkFDZCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLHlCQUF5QixFQUFFLG1DQUFtQyxFQUFFLDhCQUE4QixDQUFDO2FBQ3ZILENBQUM7WUFFRixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNoQixDQUFDO2lCQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLENBQUM7WUFFRCxJQUFJLENBQUMsSUFBSSxHQUFHO2dCQUNYLEdBQUcsSUFBSSxDQUFDLElBQUk7Z0JBQ1osTUFBTTthQUNOLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyx5QkFBeUIsQ0FBQztRQUUxQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDYixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE9BQWEsRUFBRSxHQUFHLGNBQXFCO1FBQzVFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsY0FBYyxDQUFDLENBQUM7WUFDdEYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUlPLHVCQUF1QixDQUFDLE9BQWlCO1FBQ2hELE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUUsT0FBa0MsQ0FBQyxjQUFjLENBQUM7SUFDMUUsQ0FBQztJQUVELGdDQUFnQyxDQUFDLFFBQTBCLEVBQUUsT0FBYSxFQUFFLEdBQUcsY0FBcUI7UUFDbkcsT0FBTywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDakUsQ0FBQztDQUNEO0FBRUQsa0RBQWtEO0FBQ2xELE1BQU0sT0FBZ0IsdUJBQXdCLFNBQVEsT0FBTztJQUM1RCxZQUFZLElBQXFCO1FBQ2hDLElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQztZQUNoQixNQUFNLE1BQU0sR0FBRztnQkFDZCxFQUFFLEVBQUUsTUFBTSxDQUFDLGNBQWM7Z0JBQ3pCLElBQUksRUFBRSx5QkFBeUI7YUFDL0IsQ0FBQztZQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2hCLENBQUM7aUJBQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLEdBQUc7Z0JBQ1gsR0FBRyxJQUFJLENBQUMsSUFBSTtnQkFDWixNQUFNO2FBQ04sQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLHlCQUF5QixDQUFDO1FBRTFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNiLENBQUM7SUFFRCxTQUFTLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDbkQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUlEOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQUcsY0FBcUI7UUFDN0QsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVwRCxNQUFNLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hELElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxjQUFjLENBQUMsQ0FBQztRQUMvRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxNQUFNLE1BQU0sR0FBRyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2RCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osTUFBTSxpQkFBaUIsR0FBaUIsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUczSCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFO2dCQUNwQyxFQUFFLEVBQUUsS0FBSztnQkFDVCxjQUFjLEVBQUUsTUFBTTtnQkFDdEIsYUFBYSxFQUFFLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQzthQUM5RCxDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFnQixrQkFBbUQsU0FBUSxjQUFjO0lBQ3BGLG1CQUFtQixDQUFDLE9BQWlCO1FBQzlDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUUsT0FBc0MsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFFLE9BQXNDLENBQUMsSUFBSSxDQUFDO0lBQ2hJLENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxRQUEwQixFQUFFLE9BQVcsRUFBRSxHQUFHLGNBQXFCO1FBQ2pHLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsT0FBb0MsRUFBRSxHQUFHLGNBQXFCO1FBQzVHLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVwRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsY0FBYyxDQUFDLENBQUM7UUFFMUYsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1RSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7WUFDbkQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDRixDQUFDO0NBR0Q7QUFFRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxjQUFjLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFRN0ssU0FBUyxrQkFBa0IsQ0FBQyxRQUEwQixFQUFFLEVBQVUsRUFBRSxPQUFhO0lBQ2hGLElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0IsQ0FBQyxVQUFVLENBQXNFLHlCQUF5QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDL0osQ0FBQzthQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQy9CLGdCQUFnQixDQUFDLFVBQVUsQ0FBc0UseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDeEssQ0FBQzthQUFNLElBQUksT0FBTyxJQUFJLE1BQU0sSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxlQUFlLEVBQUUsQ0FBQztZQUM3RSxnQkFBZ0IsQ0FBQyxVQUFVLENBQXNFLHlCQUF5QixFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNoSyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxHQUFHLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUgsZ0JBQWdCLENBQUMsVUFBVSxDQUFzRSx5QkFBeUIsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDckosQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxPQUFpQjtJQUM5QyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFFLE9BQWtDLENBQUMsY0FBYyxJQUFLLE9BQWUsQ0FBQyxJQUFJLG9EQUEyQyxDQUFDO0FBQzlJLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxHQUFZO0lBQ3BDLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3ZCLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUFJLEdBQXNCLENBQUMsTUFBTSxDQUFDO0lBQzlDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDMUUsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSyxHQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUUsR0FBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV6RCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDYixDQUFDO0FBRUQsTUFBTSxVQUFVLDZCQUE2QixDQUFDLFFBQTBCLEVBQUUsT0FBdUI7SUFDaEcsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUFFLGNBQWMsQ0FBQztJQUUzRSxJQUFJLGFBQWEsRUFBRSxDQUFDO1FBQ25CLE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDOUYsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ25DLE9BQU87SUFDUixDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO0lBQ3JGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV6QixJQUFJLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQy9CLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pGLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFDdkMsT0FBTztZQUNOLEVBQUUsRUFBRSxLQUFLO1lBQ1QsY0FBYyxFQUFFLE1BQU07WUFDdEIsYUFBYTtZQUNiLFVBQVU7U0FDVixDQUFDO0lBQ0gsQ0FBQztJQUVELDBCQUEwQjtJQUMxQixJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVCLHNCQUFzQjtRQUN0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxNQUFNLEdBQUcsNkJBQTZCLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU87UUFDUixDQUFDO1FBRUQsT0FBTztZQUNOLEVBQUUsRUFBRSxLQUFLO1lBQ1QsY0FBYyxFQUFFLE1BQU07WUFDdEIsYUFBYSxFQUFFLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDO1NBQy9DLENBQUM7SUFDSCxDQUFDO0lBRUQscUNBQXFDO0lBQ3JDLE1BQU0sT0FBTyxHQUFHLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUN6RSxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDaEIsRUFBRSxFQUFFLEtBQUs7UUFDVCxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7UUFDdEMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLElBQUksRUFBRTtRQUMxQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7S0FDbEIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ2YsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQU16QjtJQUNIO1FBQ0MsVUFBVSxFQUFFLElBQUk7UUFDaEIsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsd0JBQXdCO1FBQ3JDLE1BQU0sRUFBRTtZQUNQLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLFVBQVUsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUN0QixZQUFZLEVBQUU7Z0JBQ2IsUUFBUSxFQUFFO29CQUNULE1BQU0sRUFBRSxPQUFPO29CQUNmLEtBQUssRUFBRTt3QkFDTjs0QkFDQyxNQUFNLEVBQUUsUUFBUTs0QkFDaEIsVUFBVSxFQUFFLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQzs0QkFDNUIsWUFBWSxFQUFFO2dDQUNiLE9BQU8sRUFBRTtvQ0FDUixNQUFNLEVBQUUsUUFBUTtpQ0FDaEI7Z0NBQ0QsS0FBSyxFQUFFO29DQUNOLE1BQU0sRUFBRSxRQUFRO2lDQUNoQjs2QkFDRDt5QkFDRDtxQkFDRDtpQkFDRDtnQkFDRCxVQUFVLEVBQUU7b0JBQ1gsTUFBTSxFQUFFLFFBQVE7b0JBQ2hCLGFBQWEsRUFBRSxrQkFBa0I7aUJBQ2pDO2dCQUNELFlBQVksRUFBRTtvQkFDYixNQUFNLEVBQUUsU0FBUztvQkFDakIsYUFBYSxFQUFFLDZEQUE2RDtpQkFDNUU7YUFDRDtTQUNEO0tBQ0Q7Q0FDRCxDQUFDO0FBR0gsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUU7SUFDckQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7SUFDbEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxhQUFhLENBQUM7SUFDekQsS0FBSyxtREFBa0M7SUFDdkMsSUFBSSxFQUFFLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7Q0FDOUMsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFO0lBQ2pELE9BQU8sRUFBRSxNQUFNLENBQUMsaUJBQWlCO0lBQ2pDLEtBQUssRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZUFBZSxDQUFDO0lBQzFELEtBQUssbURBQWtDO0lBQ3ZDLElBQUksRUFBRSx1QkFBdUI7Q0FDN0IsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUU7SUFDckQsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDO0lBQ25DLE9BQU8sRUFBRSxNQUFNLENBQUMsa0JBQWtCO0lBQ2xDLEtBQUssaURBQWlDO0NBQ3RDLENBQUMsQ0FBQyJ9