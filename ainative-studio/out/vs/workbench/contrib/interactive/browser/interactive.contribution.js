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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { peekViewBorder } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { Context as SuggestContext } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { contrastBorder, ifDefinedThenElse, listInactiveSelectionBackground, registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { PANEL_BORDER } from '../../../common/theme.js';
import { ResourceNotebookCellEdit } from '../../bulkEdit/browser/bulkCellEdits.js';
import { ReplEditorSettings, INTERACTIVE_INPUT_CURSOR_BOUNDARY } from './interactiveCommon.js';
import { IInteractiveDocumentService, InteractiveDocumentService } from './interactiveDocumentService.js';
import { InteractiveEditor } from './interactiveEditor.js';
import { InteractiveEditorInput } from './interactiveEditorInput.js';
import { IInteractiveHistoryService, InteractiveHistoryService } from './interactiveHistoryService.js';
import { NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT } from '../../notebook/browser/controller/coreActions.js';
import * as icons from '../../notebook/browser/notebookIcons.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { CellKind, CellUri, INTERACTIVE_WINDOW_EDITOR_ID, NotebookSetting, NotebookWorkingCopyTypeIdentifier } from '../../notebook/common/notebookCommon.js';
import { InteractiveWindowOpen, IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED } from '../../notebook/common/notebookContextKeys.js';
import { INotebookKernelService } from '../../notebook/common/notebookKernelService.js';
import { INotebookService } from '../../notebook/common/notebookService.js';
import { columnToEditorGroup } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkingCopyEditorService } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { isReplEditorControl } from '../../replNotebook/browser/replEditor.js';
import { InlineChatController } from '../../inlineChat/browser/inlineChatController.js';
import { IsLinuxContext, IsWindowsContext } from '../../../../platform/contextkey/common/contextkeys.js';
const interactiveWindowCategory = localize2('interactiveWindow', "Interactive Window");
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(InteractiveEditor, INTERACTIVE_WINDOW_EDITOR_ID, 'Interactive Window'), [
    new SyncDescriptor(InteractiveEditorInput)
]);
let InteractiveDocumentContribution = class InteractiveDocumentContribution extends Disposable {
    static { this.ID = 'workbench.contrib.interactiveDocument'; }
    constructor(notebookService, editorResolverService, editorService, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        const info = notebookService.getContributedNotebookType('interactive');
        // We need to contribute a notebook type for the Interactive Window to provide notebook models.
        if (!info) {
            this._register(notebookService.registerContributedNotebookType('interactive', {
                providerDisplayName: 'Interactive Notebook',
                displayName: 'Interactive',
                filenamePattern: ['*.interactive'],
                priority: RegisteredEditorPriority.builtin
            }));
        }
        editorResolverService.registerEditor(`${Schemas.vscodeInteractiveInput}:/**`, {
            id: 'vscode-interactive-input',
            label: 'Interactive Editor',
            priority: RegisteredEditorPriority.exclusive
        }, {
            canSupportResource: uri => uri.scheme === Schemas.vscodeInteractiveInput,
            singlePerResource: true
        }, {
            createEditorInput: ({ resource }) => {
                const editorInput = editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).find(editor => editor.editor instanceof InteractiveEditorInput && editor.editor.inputResource.toString() === resource.toString());
                return editorInput;
            }
        });
        editorResolverService.registerEditor(`*.interactive`, {
            id: 'interactive',
            label: 'Interactive Editor',
            priority: RegisteredEditorPriority.exclusive
        }, {
            canSupportResource: uri => (uri.scheme === Schemas.untitled && extname(uri) === '.interactive') ||
                (uri.scheme === Schemas.vscodeNotebookCell && extname(uri) === '.interactive'),
            singlePerResource: true
        }, {
            createEditorInput: ({ resource, options }) => {
                const data = CellUri.parse(resource);
                let cellOptions;
                let iwResource = resource;
                if (data) {
                    cellOptions = { resource, options };
                    iwResource = data.notebook;
                }
                const notebookOptions = {
                    ...options,
                    cellOptions,
                    cellRevealType: undefined,
                    cellSelections: undefined,
                    isReadOnly: undefined,
                    viewState: undefined,
                    indexedCellOptions: undefined
                };
                const editorInput = createEditor(iwResource, this.instantiationService);
                return {
                    editor: editorInput,
                    options: notebookOptions
                };
            },
            createUntitledEditorInput: ({ resource, options }) => {
                if (!resource) {
                    throw new Error('Interactive window editors must have a resource name');
                }
                const data = CellUri.parse(resource);
                let cellOptions;
                if (data) {
                    cellOptions = { resource, options };
                }
                const notebookOptions = {
                    ...options,
                    cellOptions,
                    cellRevealType: undefined,
                    cellSelections: undefined,
                    isReadOnly: undefined,
                    viewState: undefined,
                    indexedCellOptions: undefined
                };
                const editorInput = createEditor(resource, this.instantiationService);
                return {
                    editor: editorInput,
                    options: notebookOptions
                };
            }
        });
    }
};
InteractiveDocumentContribution = __decorate([
    __param(0, INotebookService),
    __param(1, IEditorResolverService),
    __param(2, IEditorService),
    __param(3, IInstantiationService)
], InteractiveDocumentContribution);
export { InteractiveDocumentContribution };
let InteractiveInputContentProvider = class InteractiveInputContentProvider {
    static { this.ID = 'workbench.contrib.interactiveInputContentProvider'; }
    constructor(textModelService, _modelService) {
        this._modelService = _modelService;
        this._registration = textModelService.registerTextModelContentProvider(Schemas.vscodeInteractiveInput, this);
    }
    dispose() {
        this._registration.dispose();
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing) {
            return existing;
        }
        const result = this._modelService.createModel('', null, resource, false);
        return result;
    }
};
InteractiveInputContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], InteractiveInputContentProvider);
function createEditor(resource, instantiationService) {
    const counter = /\/Interactive-(\d+)/.exec(resource.path);
    const inputBoxPath = counter && counter[1] ? `/InteractiveInput-${counter[1]}` : 'InteractiveInput';
    const inputUri = URI.from({ scheme: Schemas.vscodeInteractiveInput, path: inputBoxPath });
    const editorInput = InteractiveEditorInput.create(instantiationService, resource, inputUri);
    return editorInput;
}
let InteractiveWindowWorkingCopyEditorHandler = class InteractiveWindowWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.interactiveWindowWorkingCopyEditorHandler'; }
    constructor(_instantiationService, _workingCopyEditorService, _extensionService) {
        super();
        this._instantiationService = _instantiationService;
        this._workingCopyEditorService = _workingCopyEditorService;
        this._extensionService = _extensionService;
        this._installHandler();
    }
    handles(workingCopy) {
        const viewType = this._getViewType(workingCopy);
        return !!viewType && viewType === 'interactive';
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return editor instanceof InteractiveEditorInput && isEqual(workingCopy.resource, editor.resource);
    }
    createEditor(workingCopy) {
        return createEditor(workingCopy.resource, this._instantiationService);
    }
    async _installHandler() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        this._register(this._workingCopyEditorService.registerHandler(this));
    }
    _getViewType(workingCopy) {
        return NotebookWorkingCopyTypeIdentifier.parse(workingCopy.typeId)?.viewType;
    }
};
InteractiveWindowWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService),
    __param(2, IExtensionService)
], InteractiveWindowWorkingCopyEditorHandler);
registerWorkbenchContribution2(InteractiveDocumentContribution.ID, InteractiveDocumentContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(InteractiveInputContentProvider.ID, InteractiveInputContentProvider, {
    editorTypeId: INTERACTIVE_WINDOW_EDITOR_ID
});
registerWorkbenchContribution2(InteractiveWindowWorkingCopyEditorHandler.ID, InteractiveWindowWorkingCopyEditorHandler, {
    editorTypeId: INTERACTIVE_WINDOW_EDITOR_ID
});
export class InteractiveEditorSerializer {
    static { this.ID = InteractiveEditorInput.ID; }
    canSerialize(editor) {
        if (!(editor instanceof InteractiveEditorInput)) {
            return false;
        }
        return URI.isUri(editor.primary.resource) && URI.isUri(editor.inputResource);
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        return JSON.stringify({
            resource: input.primary.resource,
            inputResource: input.inputResource,
            name: input.getName(),
            language: input.language
        });
    }
    deserialize(instantiationService, raw) {
        const data = parse(raw);
        if (!data) {
            return undefined;
        }
        const { resource, inputResource, name, language } = data;
        if (!URI.isUri(resource) || !URI.isUri(inputResource)) {
            return undefined;
        }
        const input = InteractiveEditorInput.create(instantiationService, resource, inputResource, name, language);
        return input;
    }
}
Registry.as(EditorExtensions.EditorFactory)
    .registerEditorSerializer(InteractiveEditorSerializer.ID, InteractiveEditorSerializer);
registerSingleton(IInteractiveHistoryService, InteractiveHistoryService, 1 /* InstantiationType.Delayed */);
registerSingleton(IInteractiveDocumentService, InteractiveDocumentService, 1 /* InstantiationType.Delayed */);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: '_interactive.open',
            title: localize2('interactive.open', 'Open Interactive Window'),
            f1: false,
            category: interactiveWindowCategory,
            metadata: {
                description: localize('interactive.open', 'Open Interactive Window'),
                args: [
                    {
                        name: 'showOptions',
                        description: 'Show Options',
                        schema: {
                            type: 'object',
                            properties: {
                                'viewColumn': {
                                    type: 'number',
                                    default: -1
                                },
                                'preserveFocus': {
                                    type: 'boolean',
                                    default: true
                                }
                            },
                        }
                    },
                    {
                        name: 'resource',
                        description: 'Interactive resource Uri',
                        isOptional: true
                    },
                    {
                        name: 'controllerId',
                        description: 'Notebook controller Id',
                        isOptional: true
                    },
                    {
                        name: 'title',
                        description: 'Notebook editor title',
                        isOptional: true
                    }
                ]
            }
        });
    }
    async run(accessor, showOptions, resource, id, title) {
        const editorService = accessor.get(IEditorService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const kernelService = accessor.get(INotebookKernelService);
        const logService = accessor.get(ILogService);
        const configurationService = accessor.get(IConfigurationService);
        const group = columnToEditorGroup(editorGroupService, configurationService, typeof showOptions === 'number' ? showOptions : showOptions?.viewColumn);
        const editorOptions = {
            activation: EditorActivation.PRESERVE,
            preserveFocus: typeof showOptions !== 'number' ? (showOptions?.preserveFocus ?? false) : false
        };
        if (resource && extname(resource) === '.interactive') {
            logService.debug('Open interactive window from resource:', resource.toString());
            const resourceUri = URI.revive(resource);
            const editors = editorService.findEditors(resourceUri).filter(id => id.editor instanceof InteractiveEditorInput && id.editor.resource?.toString() === resourceUri.toString());
            if (editors.length) {
                logService.debug('Find existing interactive window:', resource.toString());
                const editorInput = editors[0].editor;
                const currentGroup = editors[0].groupId;
                const editor = await editorService.openEditor(editorInput, editorOptions, currentGroup);
                const editorControl = editor?.getControl();
                return {
                    notebookUri: editorInput.resource,
                    inputUri: editorInput.inputResource,
                    notebookEditorId: editorControl?.notebookEditor?.getId()
                };
            }
        }
        const existingNotebookDocument = new Set();
        editorService.getEditors(1 /* EditorsOrder.SEQUENTIAL */).forEach(editor => {
            if (editor.editor.resource) {
                existingNotebookDocument.add(editor.editor.resource.toString());
            }
        });
        let notebookUri = undefined;
        let inputUri = undefined;
        let counter = 1;
        do {
            notebookUri = URI.from({ scheme: Schemas.untitled, path: `/Interactive-${counter}.interactive` });
            inputUri = URI.from({ scheme: Schemas.vscodeInteractiveInput, path: `/InteractiveInput-${counter}` });
            counter++;
        } while (existingNotebookDocument.has(notebookUri.toString()));
        InteractiveEditorInput.setName(notebookUri, title);
        logService.debug('Open new interactive window:', notebookUri.toString(), inputUri.toString());
        if (id) {
            const allKernels = kernelService.getMatchingKernel({ uri: notebookUri, notebookType: 'interactive' }).all;
            const preferredKernel = allKernels.find(kernel => kernel.id === id);
            if (preferredKernel) {
                kernelService.preselectKernelForNotebook(preferredKernel, { uri: notebookUri, notebookType: 'interactive' });
            }
        }
        historyService.clearHistory(notebookUri);
        const editorInput = { resource: notebookUri, options: editorOptions };
        const editorPane = await editorService.openEditor(editorInput, group);
        const editorControl = editorPane?.getControl();
        // Extensions must retain references to these URIs to manipulate the interactive editor
        logService.debug('New interactive window opened. Notebook editor id', editorControl?.notebookEditor?.getId());
        return { notebookUri, inputUri, notebookEditorId: editorControl?.notebookEditor?.getId() };
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.execute',
            title: localize2('interactive.execute', 'Execute Code'),
            category: interactiveWindowCategory,
            keybinding: [{
                    // when: NOTEBOOK_CELL_LIST_FOCUSED,
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive')),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }, {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', true)),
                    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }, {
                    when: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'), ContextKeyExpr.equals('config.interactiveWindow.executeWithShiftEnter', false)),
                    primary: 3 /* KeyCode.Enter */,
                    weight: NOTEBOOK_EDITOR_WIDGET_ACTION_WEIGHT
                }],
            menu: [
                {
                    id: MenuId.InteractiveInputExecute
                },
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
                if (found.editor.typeId === InteractiveEditorInput.ID) {
                    const editor = await editorService.openEditor(found.editor, found.groupId);
                    editorControl = editor?.getControl();
                    break;
                }
            }
        }
        else {
            editorControl = editorService.activeEditorPane?.getControl();
        }
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const textModel = editorControl.activeCodeEditor?.getModel();
            const activeKernel = editorControl.notebookEditor.activeKernel;
            const language = activeKernel?.supportedLanguages[0] ?? PLAINTEXT_LANGUAGE_ID;
            if (notebookDocument && textModel && editorControl.activeCodeEditor) {
                const index = notebookDocument.length;
                const value = textModel.getValue();
                if (isFalsyOrWhitespace(value)) {
                    return;
                }
                const ctrl = InlineChatController.get(editorControl.activeCodeEditor);
                if (ctrl) {
                    ctrl.acceptSession();
                }
                historyService.replaceLast(notebookDocument.uri, value);
                historyService.addToHistory(notebookDocument.uri, '');
                textModel.setValue('');
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
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.input.clear',
            title: localize2('interactive.input.clear', 'Clear the interactive window input editor contents'),
            category: interactiveWindowCategory,
            f1: false
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const editor = editorControl.activeCodeEditor;
            const range = editor?.getModel()?.getFullModelRange();
            if (notebookDocument && editor && range) {
                editor.executeEdits('', [EditOperation.replace(range, null)]);
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.history.previous',
            title: localize2('interactive.history.previous', 'Previous value in history'),
            category: interactiveWindowCategory,
            f1: false,
            keybinding: {
                when: ContextKeyExpr.and(INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('bottom'), INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('none'), SuggestContext.Visible.toNegated()),
                primary: 16 /* KeyCode.UpArrow */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            precondition: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED.negate())
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const textModel = editorControl.activeCodeEditor?.getModel();
            if (notebookDocument && textModel) {
                const previousValue = historyService.getPreviousValue(notebookDocument.uri);
                if (previousValue) {
                    textModel.setValue(previousValue);
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.history.next',
            title: localize2('interactive.history.next', 'Next value in history'),
            category: interactiveWindowCategory,
            f1: false,
            keybinding: {
                when: ContextKeyExpr.and(INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('top'), INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('none'), SuggestContext.Visible.toNegated()),
                primary: 18 /* KeyCode.DownArrow */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            precondition: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED.negate())
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const historyService = accessor.get(IInteractiveHistoryService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            const notebookDocument = editorControl.notebookEditor.textModel;
            const textModel = editorControl.activeCodeEditor?.getModel();
            if (notebookDocument && textModel) {
                const nextValue = historyService.getNextValue(notebookDocument.uri);
                if (nextValue !== null) {
                    textModel.setValue(nextValue);
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.scrollToTop',
            title: localize('interactiveScrollToTop', 'Scroll to Top'),
            keybinding: {
                when: ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'),
                primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            category: interactiveWindowCategory,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            if (editorControl.notebookEditor.getLength() === 0) {
                return;
            }
            editorControl.notebookEditor.revealCellRangeInView({ start: 0, end: 1 });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.scrollToBottom',
            title: localize('interactiveScrollToBottom', 'Scroll to Bottom'),
            keybinding: {
                when: ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'),
                primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            category: interactiveWindowCategory,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            if (editorControl.notebookEditor.getLength() === 0) {
                return;
            }
            const len = editorControl.notebookEditor.getLength();
            editorControl.notebookEditor.revealCellRangeInView({ start: len - 1, end: len });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.input.focus',
            title: localize2('interactive.input.focus', 'Focus Input Editor'),
            category: interactiveWindowCategory,
            menu: {
                id: MenuId.CommandPalette,
                when: InteractiveWindowOpen
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            editorService.activeEditorPane?.focus();
        }
        else {
            // find and open the most recent interactive window
            const openEditors = editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */);
            const interactiveWindow = Iterable.find(openEditors, identifier => { return identifier.editor.typeId === InteractiveEditorInput.ID; });
            if (interactiveWindow) {
                const editorInput = interactiveWindow.editor;
                const currentGroup = interactiveWindow.groupId;
                const editor = await editorService.openEditor(editorInput, currentGroup);
                const editorControl = editor?.getControl();
                if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
                    editorService.activeEditorPane?.focus();
                }
            }
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'interactive.history.focus',
            title: localize2('interactive.history.focus', 'Focus History'),
            category: interactiveWindowCategory,
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.equals('activeEditor', 'workbench.editor.interactive'),
            },
            keybinding: [{
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    when: ContextKeyExpr.and(INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('bottom'), INTERACTIVE_INPUT_CURSOR_BOUNDARY.notEqualsTo('none')),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */
                },
                {
                    when: ContextKeyExpr.or(IsWindowsContext, IsLinuxContext),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                }],
            precondition: ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED.negate())
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editorControl = editorService.activeEditorPane?.getControl();
        if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
            editorControl.notebookEditor.focus();
        }
    }
});
registerColor('interactive.activeCodeBorder', {
    dark: ifDefinedThenElse(peekViewBorder, peekViewBorder, '#007acc'),
    light: ifDefinedThenElse(peekViewBorder, peekViewBorder, '#007acc'),
    hcDark: contrastBorder,
    hcLight: contrastBorder
}, localize('interactive.activeCodeBorder', 'The border color for the current interactive code cell when the editor has focus.'));
registerColor('interactive.inactiveCodeBorder', {
    //dark: theme.getColor(listInactiveSelectionBackground) ?? transparent(listInactiveSelectionBackground, 1),
    dark: ifDefinedThenElse(listInactiveSelectionBackground, listInactiveSelectionBackground, '#37373D'),
    light: ifDefinedThenElse(listInactiveSelectionBackground, listInactiveSelectionBackground, '#E4E6F1'),
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER
}, localize('interactive.inactiveCodeBorder', 'The border color for the current interactive code cell when the editor does not have focus.'));
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'interactiveWindow',
    order: 100,
    type: 'object',
    'properties': {
        [ReplEditorSettings.interactiveWindowAlwaysScrollOnNewCell]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('interactiveWindow.alwaysScrollOnNewCell', "Automatically scroll the interactive window to show the output of the last statement executed. If this value is false, the window will only scroll if the last cell was already the one scrolled to.")
        },
        [NotebookSetting.InteractiveWindowPromptToSave]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('interactiveWindow.promptToSaveOnClose', "Prompt to save the interactive window when it is closed. Only new interactive windows will be affected by this setting change.")
        },
        [ReplEditorSettings.executeWithShiftEnter]: {
            type: 'boolean',
            default: false,
            markdownDescription: localize('interactiveWindow.executeWithShiftEnter', "Execute the Interactive Window (REPL) input box with shift+enter, so that enter can be used to create a newline."),
            tags: ['replExecute']
        },
        [ReplEditorSettings.showExecutionHint]: {
            type: 'boolean',
            default: true,
            markdownDescription: localize('interactiveWindow.showExecutionHint', "Display a hint in the Interactive Window (REPL) input box to indicate how to execute code."),
            tags: ['replExecute']
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW50ZXJhY3RpdmUvYnJvd3Nlci9pbnRlcmFjdGl2ZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sSUFBSSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRyxPQUFP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