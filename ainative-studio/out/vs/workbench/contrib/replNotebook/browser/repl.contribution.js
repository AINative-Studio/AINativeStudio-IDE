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
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { parse } from '../../../../base/common/marshalling.js';
import { isEqual } from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { localize2 } from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IWorkingCopyEditorService } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { ResourceNotebookCellEdit } from '../../bulkEdit/browser/bulkCellEdits.js';
import { getReplView } from '../../debug/browser/repl.js';
import { REPL_VIEW_ID } from '../../debug/common/debug.js';
import { InlineChatController } from '../../inlineChat/browser/inlineChatController.js';
import { IInteractiveHistoryService } from '../../interactive/browser/interactiveHistoryService.js';
import { NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT } from '../../notebook/browser/controller/coreActions.js';
import * as icons from '../../notebook/browser/notebookIcons.js';
import { ReplEditorAccessibleView } from '../../notebook/browser/replEditorAccessibleView.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CellKind, NotebookSetting, NotebookWorkingCopyTypeIdentifier, REPL_EDITOR_ID } from '../../notebook/common/notebookCommon.js';
import { IS_COMPOSITE_NOTEBOOK, MOST_RECENT_REPL_EDITOR, NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_EDITOR_FOCUSED } from '../../notebook/common/notebookContextKeys.js';
import { INotebookEditorModelResolverService } from '../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { isReplEditorControl, ReplEditor } from './replEditor.js';
import { ReplEditorHistoryAccessibilityHelp, ReplEditorInputAccessibilityHelp } from './replEditorAccessibilityHelp.js';
import { ReplEditorInput } from './replEditorInput.js';
class ReplEditorSerializer {
    canSerialize(input) {
        return input.typeId === ReplEditorInput.ID;
    }
    serialize(input) {
        assertType(input instanceof ReplEditorInput);
        const data = {
            resource: input.resource,
            preferredResource: input.preferredResource,
            viewType: input.viewType,
            options: input.options,
            label: input.getName()
        };
        return JSON.stringify(data);
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, viewType } = data;
        if (!data || !URI.isUri(resource) || typeof viewType !== 'string') {
            return undefined;
        }
        const input = instantiationService.createInstance(ReplEditorInput, resource, data.label);
        return input;
    }
}
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ReplEditor, REPL_EDITOR_ID, 'REPL Editor'), [
    new SyncDescriptor(ReplEditorInput)
]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(ReplEditorInput.ID, ReplEditorSerializer);
let ReplDocumentContribution = class ReplDocumentContribution extends Disposable {
    static { this.ID = 'workbench.contrib.replDocument'; }
    constructor(notebookService, editorResolverService, notebookEditorModelResolverService, instantiationService, configurationService) {
        super();
        this.notebookEditorModelResolverService = notebookEditorModelResolverService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.editorInputCache = new ResourceMap();
        editorResolverService.registerEditor(
        // don't match anything, we don't need to support re-opening files as REPL editor at this point
        ` `, {
            id: 'repl',
            label: 'repl Editor',
            priority: RegisteredEditorPriority.option
        }, {
            // We want to support all notebook types which could have any file extension,
            // so we just check if the resource corresponds to a notebook
            canSupportResource: uri => notebookService.getNotebookTextModel(uri) !== undefined,
            singlePerResource: true
        }, {
            createUntitledEditorInput: async ({ resource, options }) => {
                if (resource) {
                    const editor = this.editorInputCache.get(resource);
                    if (editor && !editor.isDisposed()) {
                        return { editor, options };
                    }
                    else if (editor) {
                        this.editorInputCache.delete(resource);
                    }
                }
                const scratchpad = this.configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true;
                const ref = await this.notebookEditorModelResolverService.resolve({ untitledResource: resource }, 'jupyter-notebook', { scratchpad, viewType: 'repl' });
                const notebookUri = ref.object.notebook.uri;
                // untitled notebooks are disposed when they get saved. we should not hold a reference
                // to such a disposed notebook and therefore dispose the reference as well
                ref.object.notebook.onWillDispose(() => {
                    ref.dispose();
                });
                const label = options?.label ?? undefined;
                const editor = this.instantiationService.createInstance(ReplEditorInput, notebookUri, label);
                this.editorInputCache.set(notebookUri, editor);
                Event.once(editor.onWillDispose)(() => this.editorInputCache.delete(notebookUri));
                return { editor, options };
            },
            createEditorInput: async ({ resource, options }) => {
                if (this.editorInputCache.has(resource)) {
                    return { editor: this.editorInputCache.get(resource), options };
                }
                const label = options?.label ?? undefined;
                const editor = this.instantiationService.createInstance(ReplEditorInput, resource, label);
                this.editorInputCache.set(resource, editor);
                Event.once(editor.onWillDispose)(() => this.editorInputCache.delete(resource));
                return { editor, options };
            }
        });
    }
};
ReplDocumentContribution = __decorate([
    __param(0, INotebookService),
    __param(1, IEditorResolverService),
    __param(2, INotebookEditorModelResolverService),
    __param(3, IInstantiationService),
    __param(4, IConfigurationService)
], ReplDocumentContribution);
export { ReplDocumentContribution };
let ReplWindowWorkingCopyEditorHandler = class ReplWindowWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.replWorkingCopyEditorHandler'; }
    constructor(instantiationService, workingCopyEditorService, extensionService, notebookService) {
        super();
        this.instantiationService = instantiationService;
        this.workingCopyEditorService = workingCopyEditorService;
        this.extensionService = extensionService;
        this.notebookService = notebookService;
        this._installHandler();
    }
    async handles(workingCopy) {
        const notebookType = this._getNotebookType(workingCopy);
        if (!notebookType) {
            return false;
        }
        return !!notebookType && notebookType.viewType === 'repl' && await this.notebookService.canResolve(notebookType.notebookType);
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return editor instanceof ReplEditorInput && isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return this.instantiationService.createInstance(ReplEditorInput, workingCopy.resource, undefined);
    }
    async _installHandler() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        this._register(this.workingCopyEditorService.registerHandler(this));
    }
    _getNotebookType(workingCopy) {
        return NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId);
    }
};
ReplWindowWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService),
    __param(3, INotebookService)
], ReplWindowWorkingCopyEditorHandler);
registerWorkbenchContribution2(ReplWindowWorkingCopyEditorHandler.ID, ReplWindowWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ReplDocumentContribution.ID, ReplDocumentContribution, 2 /* WorkbenchPhase.BlockRestore */);
AccessibleViewRegistry.register(new ReplEditorInputAccessibilityHelp());
AccessibleViewRegistry.register(new ReplEditorHistoryAccessibilityHelp());
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'repl.focusLastItemExecuted',
            title: localize2('repl.focusLastReplOutput', 'Focus Most Recent REPL Execution'),
            category: 'REPL',
            menu: {
                id: MenuId.CommandPalette,
                when: MOST_RECENT_REPL_EDITOR,
            },
            keybinding: [{
                    primary: KeyChord(512 /* KeyMod.Alt */ | 13 /* KeyCode.End */, 512 /* KeyMod.Alt */ | 13 /* KeyCode.End */),
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                    when: ContextKeyExpr.or(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate())
                }],
            precondition: MOST_RECENT_REPL_EDITOR
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        const contextKeyService = accessor.get(IContextKeyService);
        let notebookEditor;
        if (editorControl && isReplEditorControl(editorControl)) {
            notebookEditor = editorControl.notebookEditor;
        }
        else {
            const uriString = MOST_RECENT_REPL_EDITOR.getValue(contextKeyService);
            const uri = uriString ? URI.parse(uriString) : undefined;
            if (!uri) {
                return;
            }
            const replEditor = editorService.findEditors(uri)[0];
            if (replEditor) {
                const editor = await editorService.openEditor(replEditor.editor, replEditor.groupId);
                const editorControl = editor?.getControl();
                if (editorControl && isReplEditorControl(editorControl)) {
                    notebookEditor = editorControl.notebookEditor;
                }
            }
        }
        const viewModel = notebookEditor?.getViewModel();
        if (notebookEditor && viewModel) {
            // last cell of the viewmodel is the last cell history
            const lastCellIndex = viewModel.length - 1;
            if (lastCellIndex >= 0) {
                const cell = viewModel.viewCells[lastCellIndex];
                notebookEditor.focusNotebookCell(cell, 'container');
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'repl.input.focus',
            title: localize2('repl.input.focus', 'Focus Input Editor'),
            category: 'REPL',
            menu: {
                id: MenuId.CommandPalette,
                when: MOST_RECENT_REPL_EDITOR,
            },
            keybinding: [{
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED),
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
                }, {
                    when: ContextKeyExpr.and(MOST_RECENT_REPL_EDITOR),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
                    primary: KeyChord(512 /* KeyMod.Alt */ | 14 /* KeyCode.Home */, 512 /* KeyMod.Alt */ | 14 /* KeyCode.Home */),
                }]
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        const contextKeyService = accessor.get(IContextKeyService);
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            editorService.activeEditorPane?.focus();
        }
        else {
            const uriString = MOST_RECENT_REPL_EDITOR.getValue(contextKeyService);
            const uri = uriString ? URI.parse(uriString) : undefined;
            if (!uri) {
                return;
            }
            const replEditor = editorService.findEditors(uri)[0];
            if (replEditor) {
                await editorService.openEditor({ resource: uri, options: { preserveFocus: false } }, replEditor.groupId);
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'repl.execute',
            title: localize2('repl.execute', 'Execute REPL input'),
            category: 'REPL',
            keybinding: [{
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.repl'), NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }, {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.repl'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', true), NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }, {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.repl'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', false), NOTEBOOK_CELL_LIST_FOCUSED.negate()),
                    primary: 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }],
            menu: [
                {
                    id: MenuId.ReplInputExecute
                }
            ],
            icon: icons.executeIcon,
            f1: false,
            metadata: {
                description: 'Execute the Contents of the Input Box',
                args: [
                    {
                        name: 'resource',
                        description: 'Interactive resource Uri',
                        isOptional: true
                    }
                ]
            }
        });
    }
    async run(accessor, context) {
        const editorService = accessor.get(IEditorService);
        const bulkEditService = accessor.get(IBulkEditService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const notebookEditorService = accessor.get(INotebookEditorService);
        let editorControl;
        if (context) {
            const resourceUri = URI.revive(context);
            const editors = editorService.findEditors(resourceUri);
            for (const found of editors) {
                if (found.editor.typeId === ReplEditorInput.ID) {
                    const editor = await editorService.openEditor(found.editor, found.groupId);
                    editorControl = editor?.getControl();
                    break;
                }
            }
        }
        else {
            editorControl = editorService.activeEditorPane?.getControl();
        }
        if (isReplEditorControl(editorControl)) {
            executeReplInput(bulkEditService, historyService, notebookEditorService, editorControl);
        }
    }
});
async function executeReplInput(bulkEditService, historyService, notebookEditorService, editorControl) {
    if (editorControl && editorControl.notebookEditor && editorControl.activeCodeEditor) {
        const notebookDocument = editorControl.notebookEditor.textModel;
        const textModel = editorControl.activeCodeEditor.getModel();
        const activeKernel = editorControl.notebookEditor.activeKernel;
        const language = activeKernel?.supportedLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
        if (notebookDocument && textModel) {
            const index = notebookDocument.length - 1;
            const value = textModel.getValue();
            if (isFalsyOrWhitespace(value)) {
                return;
            }
            // Just accept any existing inline chat hunk
            const ctrl = InlineChatController.get(editorControl.activeCodeEditor);
            if (ctrl) {
                ctrl.acceptSession();
            }
            historyService.replaceLast(notebookDocument.uri, value);
            historyService.addToHistory(notebookDocument.uri, '');
            textModel.setValue('');
            notebookDocument.cells[index].resetTextBuffer(textModel.getTextBuffer());
            const collapseState = editorControl.notebookEditor.notebookOptions.getDisplayOptions().interactiveWindowCollapseCodeCells === 'fromEditor' ?
                {
                    inputCollapsed: false,
                    outputCollapsed: false
                } :
                undefined;
            await bulkEditService.apply([
                new ResourceNotebookCellEdit(notebookDocument.uri, {
                    editType: 1 /* CellEditType.Replace */,
                    index: index,
                    count: 0,
                    cells: [{
                            cellKind: CellKind.Code,
                            mime: undefined,
                            language,
                            source: value,
                            outputs: [],
                            metadata: {},
                            collapseState
                        }]
                })
            ]);
            // reveal the cell into view first
            const range = { start: index, end: index + 1 };
            editorControl.notebookEditor.revealCellRangeInView(range);
            await editorControl.notebookEditor.executeNotebookCells(editorControl.notebookEditor.getCellsInRange({ start: index, end: index + 1 }));
            // update the selection and focus in the extension host model
            const editor = notebookEditorService.getNotebookEditor(editorControl.notebookEditor.getId());
            if (editor) {
                editor.setSelections([range]);
                editor.setFocus(range);
            }
        }
    }
}
AccessibleViewRegistry.register(new ReplEditorAccessibleView());
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.find.replInputFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    when: ContextKeyExpr.equals('view', REPL_VIEW_ID),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
    secondary: [61 /* KeyCode.F3 */],
    handler: (accessor) => {
        getReplView(accessor.get(IViewsService))?.openFind();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVwbE5vdGVib29rL2Jyb3dzZXIvcmVwbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFC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