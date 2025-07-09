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
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { codiconsLibrary } from '../../../../../../base/common/codiconsLibrary.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { registerWorkbenchContribution2 } from '../../../../../common/contributions.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IChatWidgetService } from '../../../../chat/browser/chat.js';
import { ChatInputPart } from '../../../../chat/browser/chatInputPart.js';
import { ChatDynamicVariableModel } from '../../../../chat/browser/contrib/chatDynamicVariables.js';
import { computeCompletionRanges } from '../../../../chat/browser/contrib/chatInputCompletions.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
import { ChatContextKeys } from '../../../../chat/common/chatContextKeys.js';
import { chatVariableLeader } from '../../../../chat/common/chatParserTypes.js';
import { NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT, NOTEBOOK_CELL_OUTPUT_MIMETYPE } from '../../../common/notebookContextKeys.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import * as icons from '../../notebookIcons.js';
import { getOutputViewModelFromId } from '../cellOutputActions.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from '../coreActions.js';
import { CellUri } from '../../../common/notebookCommon.js';
import './cellChatActions.js';
import { CTX_NOTEBOOK_CHAT_HAS_AGENT } from './notebookChatContext.js';
const NotebookKernelVariableKey = 'kernelVariable';
const NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST = ['text/plain', 'text/html',
    'application/vnd.code.notebook.error',
    'application/vnd.code.notebook.stdout',
    'application/x.notebook.stdout',
    'application/x.notebook.stream',
    'application/vnd.code.notebook.stderr',
    'application/x.notebook.stderr',
    'image/png',
    'image/jpeg',
    'image/svg',
];
let NotebookChatContribution = class NotebookChatContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebookChatContribution'; }
    constructor(contextKeyService, chatAgentService, editorService, chatWidgetService, notebookKernelService, languageFeaturesService) {
        super();
        this.editorService = editorService;
        this.chatWidgetService = chatWidgetService;
        this.notebookKernelService = notebookKernelService;
        this.languageFeaturesService = languageFeaturesService;
        this._ctxHasProvider = CTX_NOTEBOOK_CHAT_HAS_AGENT.bindTo(contextKeyService);
        const updateNotebookAgentStatus = () => {
            const hasNotebookAgent = Boolean(chatAgentService.getDefaultAgent(ChatAgentLocation.Notebook));
            this._ctxHasProvider.set(hasNotebookAgent);
        };
        updateNotebookAgentStatus();
        this._register(chatAgentService.onDidChangeAgents(updateNotebookAgentStatus));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatKernelDynamicCompletions',
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.supportsFileReferences) {
                    return null;
                }
                if (widget.location !== ChatAgentLocation.Notebook) {
                    return null;
                }
                const variableNameDef = new RegExp(`${chatVariableLeader}\\w*`, 'g');
                const range = computeCompletionRanges(model, position, variableNameDef, true);
                if (!range) {
                    return null;
                }
                const result = { suggestions: [] };
                const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + `${chatVariableLeader}${NotebookKernelVariableKey}:`.length);
                result.suggestions.push({
                    label: `${chatVariableLeader}${NotebookKernelVariableKey}`,
                    insertText: `${chatVariableLeader}${NotebookKernelVariableKey}:`,
                    detail: localize('pickKernelVariableLabel', "Pick a variable from the kernel"),
                    range,
                    kind: 18 /* CompletionItemKind.Text */,
                    command: { id: SelectAndInsertKernelVariableAction.ID, title: SelectAndInsertKernelVariableAction.ID, arguments: [{ widget, range: afterRange }] },
                    sortText: 'z'
                });
                await this.addKernelVariableCompletion(widget, result, range, token);
                return result;
            }
        }));
        // output context
        NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT.bindTo(contextKeyService).set(NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST);
    }
    async addKernelVariableCompletion(widget, result, info, token) {
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1);
        }
        const notebook = getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
        if (!notebook) {
            return;
        }
        const selectedKernel = this.notebookKernelService.getMatchingKernel(notebook).selected;
        const hasVariableProvider = selectedKernel?.hasVariableProvider;
        if (!hasVariableProvider) {
            return;
        }
        const variables = await selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
        for await (const variable of variables) {
            if (pattern && !variable.name.toLowerCase().includes(pattern)) {
                continue;
            }
            result.suggestions.push({
                label: { label: variable.name, description: variable.type },
                insertText: `${chatVariableLeader}${NotebookKernelVariableKey}:${variable.name} `,
                filterText: `${chatVariableLeader}${variable.name}`,
                range: info,
                kind: 4 /* CompletionItemKind.Variable */,
                sortText: 'z',
                command: { id: SelectAndInsertKernelVariableAction.ID, title: SelectAndInsertKernelVariableAction.ID, arguments: [{ widget, range: info.insert, variable: variable.name }] },
                detail: variable.type,
                documentation: variable.value,
            });
        }
    }
};
NotebookChatContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, INotebookKernelService),
    __param(5, ILanguageFeaturesService)
], NotebookChatContribution);
export class SelectAndInsertKernelVariableAction extends Action2 {
    constructor() {
        super({
            id: SelectAndInsertKernelVariableAction.ID,
            title: '' // not displayed
        });
    }
    static { this.ID = 'notebook.chat.selectAndInsertKernelVariable'; }
    async run(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const notebookKernelService = accessor.get(INotebookKernelService);
        const quickInputService = accessor.get(IQuickInputService);
        const notebook = getNotebookEditorFromEditorPane(editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
        if (!notebook) {
            return;
        }
        const context = args[0];
        if (!context || !('widget' in context) || !('range' in context)) {
            return;
        }
        const widget = context.widget;
        const range = context.range;
        const variable = context.variable;
        if (variable !== undefined) {
            this.addVariableReference(widget, variable, range, false);
            return;
        }
        const selectedKernel = notebookKernelService.getMatchingKernel(notebook).selected;
        const hasVariableProvider = selectedKernel?.hasVariableProvider;
        if (!hasVariableProvider) {
            return;
        }
        const variables = await selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
        const quickPickItems = [];
        for await (const variable of variables) {
            quickPickItems.push({
                label: variable.name,
                description: variable.value,
                detail: variable.type,
            });
        }
        const pickedVariable = await quickInputService.pick(quickPickItems, { placeHolder: 'Select a kernel variable' });
        if (!pickedVariable) {
            return;
        }
        this.addVariableReference(widget, pickedVariable.label, range, true);
    }
    addVariableReference(widget, variableName, range, updateText) {
        if (range) {
            const text = `#kernelVariable:${variableName}`;
            if (updateText) {
                const editor = widget.inputEditor;
                const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
                if (!success) {
                    return;
                }
            }
            widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
                id: 'vscode.notebook.variable',
                range: { startLineNumber: range.startLineNumber, startColumn: range.startColumn, endLineNumber: range.endLineNumber, endColumn: range.startColumn + text.length },
                data: variableName,
                fullName: variableName,
                icon: codiconsLibrary.variable,
            });
        }
        else {
            widget.attachmentModel.addContext({
                id: 'vscode.notebook.variable',
                name: variableName,
                value: variableName,
                icon: codiconsLibrary.variable,
            });
        }
    }
}
registerAction2(class CopyCellOutputAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.cellOutput.addToChat',
            title: localize('notebookActions.addOutputToChat', "Add Cell Output to Chat"),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, ContextKeyExpr.in(NOTEBOOK_CELL_OUTPUT_MIMETYPE.key, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT.key)),
                order: 10
            },
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
            precondition: ChatContextKeys.enabled
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
        const chatWidgetService = accessor.get(IChatWidgetService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            const widgets = chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel);
            if (widgets.length === 0) {
                return;
            }
            widget = widgets[0];
        }
        if (mimeType && NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST.includes(mimeType)) {
            // get the cell index
            const cellFromViewModelHandle = outputViewModel.cellViewModel.handle;
            const cell = notebookEditor.getCellByHandle(cellFromViewModelHandle);
            if (!cell) {
                return;
            }
            // uri of the cell
            const cellUri = cell.uri;
            // get the output index
            const outputId = outputViewModel?.model.outputId;
            let outputIndex = 0;
            if (outputId !== undefined) {
                // find the output index
                outputIndex = cell.outputsViewModels.findIndex(output => {
                    return output.model.outputId === outputId;
                });
            }
            // get URI of notebook
            let notebookUri = notebookEditor.textModel?.uri;
            if (!notebookUri) {
                // if the notebook is not found, try to parse the cell uri
                const parsedCellUri = CellUri.parse(cellUri);
                notebookUri = parsedCellUri?.notebook;
                if (!notebookUri) {
                    return;
                }
            }
            // construct the URI using the cell uri and output index
            const outputCellUri = CellUri.generateCellOutputUriWithIndex(notebookUri, cellUri, outputIndex);
            const l = {
                value: outputCellUri,
                id: outputCellUri.toString(),
                name: outputCellUri.toString(),
                isFile: true,
            };
            widget.attachmentModel.addContext(l);
        }
    }
});
registerAction2(SelectAndInsertKernelVariableAction);
registerWorkbenchContribution2(NotebookChatContribution.ID, NotebookChatContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2suY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2NoYXQvbm90ZWJvb2suY2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFJdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUU3SCxPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0sNERBQTRELENBQUM7QUFDaEgsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEYsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx3QkFB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