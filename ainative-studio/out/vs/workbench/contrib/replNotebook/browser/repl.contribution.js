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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZXBsTm90ZWJvb2svYnJvd3Nlci9yZXBsLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDN0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIs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