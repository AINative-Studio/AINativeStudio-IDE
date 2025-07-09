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
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { CopyAction } from '../../../../../editor/contrib/clipboard/browser/clipboard.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { accessibleViewInCodeBlock } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { reviewEdits } from '../../../inlineChat/browser/inlineChatController.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService } from '../../../terminal/browser/terminal.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatCopyKind, IChatService } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatCodeBlockContextProviderService, IChatWidgetService } from '../chat.js';
import { DefaultChatTextEditor } from '../codeBlockPart.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { ApplyCodeBlockOperation, InsertCodeBlockOperation } from './codeBlockOperations.js';
const shellLangIds = [
    'fish',
    'ps1',
    'pwsh',
    'powershell',
    'sh',
    'shellscript',
    'zsh'
];
export function isCodeBlockActionContext(thing) {
    return typeof thing === 'object' && thing !== null && 'code' in thing && 'element' in thing;
}
export function isCodeCompareBlockActionContext(thing) {
    return typeof thing === 'object' && thing !== null && 'element' in thing;
}
function isResponseFiltered(context) {
    return isResponseVM(context.element) && context.element.errorDetails?.responseIsFiltered;
}
class ChatCodeBlockAction extends Action2 {
    run(accessor, ...args) {
        let context = args[0];
        if (!isCodeBlockActionContext(context)) {
            const codeEditorService = accessor.get(ICodeEditorService);
            const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
            if (!editor) {
                return;
            }
            context = getContextFromEditor(editor, accessor);
            if (!isCodeBlockActionContext(context)) {
                return;
            }
        }
        return this.runWithContext(accessor, context);
    }
}
const APPLY_IN_EDITOR_ID = 'workbench.action.chat.applyInEditor';
let CodeBlockActionRendering = class CodeBlockActionRendering extends Disposable {
    static { this.ID = 'chat.codeBlockActionRendering'; }
    constructor(actionViewItemService, instantiationService, labelService) {
        super();
        const disposable = actionViewItemService.register(MenuId.ChatCodeBlock, APPLY_IN_EDITOR_ID, (action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(class extends MenuEntryActionViewItem {
                getTooltip() {
                    const context = this._context;
                    if (isCodeBlockActionContext(context) && context.codemapperUri) {
                        const label = labelService.getUriLabel(context.codemapperUri, { relative: true });
                        return localize('interactive.applyInEditorWithURL.label', "Apply to {0}", label);
                    }
                    return super.getTooltip();
                }
                setActionContext(newContext) {
                    super.setActionContext(newContext);
                    this.updateTooltip();
                }
            }, action, undefined);
        });
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
CodeBlockActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService),
    __param(2, ILabelService)
], CodeBlockActionRendering);
export { CodeBlockActionRendering };
export function registerChatCodeBlockActions() {
    registerAction2(class CopyCodeBlockAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyCodeBlock',
                title: localize2('interactive.copyCodeBlock.label', "Copy"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.copy,
                menu: {
                    id: MenuId.ChatCodeBlock,
                    group: 'navigation',
                    order: 30
                }
            });
        }
        run(accessor, ...args) {
            const context = args[0];
            if (!isCodeBlockActionContext(context) || isResponseFiltered(context)) {
                return;
            }
            const clipboardService = accessor.get(IClipboardService);
            clipboardService.writeText(context.code);
            if (isResponseVM(context.element)) {
                const chatService = accessor.get(IChatService);
                chatService.notifyUserAction({
                    agentId: context.element.agent?.id,
                    command: context.element.slashCommand?.name,
                    sessionId: context.element.sessionId,
                    requestId: context.element.requestId,
                    result: context.element.result,
                    action: {
                        kind: 'copy',
                        codeBlockIndex: context.codeBlockIndex,
                        copyKind: ChatCopyKind.Toolbar,
                        copiedCharacters: context.code.length,
                        totalCharacters: context.code.length,
                        copiedText: context.code,
                    }
                });
            }
        }
    });
    CopyAction?.addImplementation(50000, 'chat-codeblock', (accessor) => {
        // get active code editor
        const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!editor) {
            return false;
        }
        const editorModel = editor.getModel();
        if (!editorModel) {
            return false;
        }
        const context = getContextFromEditor(editor, accessor);
        if (!context) {
            return false;
        }
        const noSelection = editor.getSelections()?.length === 1 && editor.getSelection()?.isEmpty();
        const copiedText = noSelection ?
            editorModel.getValue() :
            editor.getSelections()?.reduce((acc, selection) => acc + editorModel.getValueInRange(selection), '') ?? '';
        const totalCharacters = editorModel.getValueLength();
        // Report copy to extensions
        const chatService = accessor.get(IChatService);
        const element = context.element;
        if (element) {
            chatService.notifyUserAction({
                agentId: element.agent?.id,
                command: element.slashCommand?.name,
                sessionId: element.sessionId,
                requestId: element.requestId,
                result: element.result,
                action: {
                    kind: 'copy',
                    codeBlockIndex: context.codeBlockIndex,
                    copyKind: ChatCopyKind.Action,
                    copiedText,
                    copiedCharacters: copiedText.length,
                    totalCharacters,
                }
            });
        }
        // Copy full cell if no selection, otherwise fall back on normal editor implementation
        if (noSelection) {
            accessor.get(IClipboardService).writeText(context.code);
            return true;
        }
        return false;
    });
    registerAction2(class SmartApplyInEditorAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: APPLY_IN_EDITOR_ID,
                title: localize2('interactive.applyInEditor.label', "Apply in Editor"),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.gitPullRequestGoToChanges,
                menu: [
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(...shellLangIds.map(e => ContextKeyExpr.notEquals(EditorContextKeys.languageId.key, e))),
                        order: 10
                    },
                    {
                        id: MenuId.ChatCodeBlock,
                        when: ContextKeyExpr.or(...shellLangIds.map(e => ContextKeyExpr.equals(EditorContextKeys.languageId.key, e)))
                    },
                ],
                keybinding: {
                    when: ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate()), accessibleViewInCodeBlock),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */ },
                    weight: 400 /* KeybindingWeight.ExternalExtension */ + 1
                },
            });
        }
        runWithContext(accessor, context) {
            if (!this.operation) {
                this.operation = accessor.get(IInstantiationService).createInstance(ApplyCodeBlockOperation);
            }
            return this.operation.run(context);
        }
    });
    registerAction2(class InsertAtCursorAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.insertCodeBlock',
                title: localize2('interactive.insertCodeBlock.label', "Insert At Cursor"),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.insert,
                menu: [{
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.Terminal)),
                        order: 20
                    }, {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Terminal)),
                        isHiddenByDefault: true,
                        order: 20
                    }],
                keybinding: {
                    when: ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate()), accessibleViewInCodeBlock),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */ },
                    weight: 400 /* KeybindingWeight.ExternalExtension */ + 1
                },
            });
        }
        runWithContext(accessor, context) {
            const operation = accessor.get(IInstantiationService).createInstance(InsertCodeBlockOperation);
            return operation.run(context);
        }
    });
    registerAction2(class InsertIntoNewFileAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.insertIntoNewFile',
                title: localize2('interactive.insertIntoNewFile.label', "Insert into New File"),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.newFile,
                menu: {
                    id: MenuId.ChatCodeBlock,
                    group: 'navigation',
                    isHiddenByDefault: true,
                    order: 40,
                }
            });
        }
        async runWithContext(accessor, context) {
            if (isResponseFiltered(context)) {
                // When run from command palette
                return;
            }
            const editorService = accessor.get(IEditorService);
            const chatService = accessor.get(IChatService);
            editorService.openEditor({ contents: context.code, languageId: context.languageId, resource: undefined });
            if (isResponseVM(context.element)) {
                chatService.notifyUserAction({
                    agentId: context.element.agent?.id,
                    command: context.element.slashCommand?.name,
                    sessionId: context.element.sessionId,
                    requestId: context.element.requestId,
                    result: context.element.result,
                    action: {
                        kind: 'insert',
                        codeBlockIndex: context.codeBlockIndex,
                        totalCharacters: context.code.length,
                        newFile: true
                    }
                });
            }
        }
    });
    registerAction2(class RunInTerminalAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.runInTerminal',
                title: localize2('interactive.runInTerminal.label', "Insert into Terminal"),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.terminal,
                menu: [{
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ContextKeyExpr.or(...shellLangIds.map(e => ContextKeyExpr.equals(EditorContextKeys.languageId.key, e)))),
                    },
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        isHiddenByDefault: true,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ...shellLangIds.map(e => ContextKeyExpr.notEquals(EditorContextKeys.languageId.key, e)))
                    }],
                keybinding: [{
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                        mac: {
                            primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */
                        },
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                        when: ContextKeyExpr.or(ChatContextKeys.inChatSession, accessibleViewInCodeBlock),
                    }]
            });
        }
        async runWithContext(accessor, context) {
            if (isResponseFiltered(context)) {
                // When run from command palette
                return;
            }
            const chatService = accessor.get(IChatService);
            const terminalService = accessor.get(ITerminalService);
            const editorService = accessor.get(IEditorService);
            const terminalEditorService = accessor.get(ITerminalEditorService);
            const terminalGroupService = accessor.get(ITerminalGroupService);
            let terminal = await terminalService.getActiveOrCreateInstance();
            // isFeatureTerminal = debug terminal or task terminal
            const unusableTerminal = terminal.xterm?.isStdinDisabled || terminal.shellLaunchConfig.isFeatureTerminal;
            terminal = unusableTerminal ? await terminalService.createTerminal() : terminal;
            terminalService.setActiveInstance(terminal);
            await terminal.focusWhenReady(true);
            if (terminal.target === TerminalLocation.Editor) {
                const existingEditors = editorService.findEditors(terminal.resource);
                terminalEditorService.openEditor(terminal, { viewColumn: existingEditors?.[0].groupId });
            }
            else {
                terminalGroupService.showPanel(true);
            }
            terminal.runCommand(context.code, false);
            if (isResponseVM(context.element)) {
                chatService.notifyUserAction({
                    agentId: context.element.agent?.id,
                    command: context.element.slashCommand?.name,
                    sessionId: context.element.sessionId,
                    requestId: context.element.requestId,
                    result: context.element.result,
                    action: {
                        kind: 'runInTerminal',
                        codeBlockIndex: context.codeBlockIndex,
                        languageId: context.languageId,
                    }
                });
            }
        }
    });
    function navigateCodeBlocks(accessor, reverse) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const editor = codeEditorService.getFocusedCodeEditor();
        const editorUri = editor?.getModel()?.uri;
        const curCodeBlockInfo = editorUri ? widget.getCodeBlockInfoForEditor(editorUri) : undefined;
        const focused = !widget.inputEditor.hasWidgetFocus() && widget.getFocus();
        const focusedResponse = isResponseVM(focused) ? focused : undefined;
        const elementId = curCodeBlockInfo?.elementId;
        const element = elementId ? widget.viewModel?.getItems().find(item => item.id === elementId) : undefined;
        const currentResponse = element ??
            (focusedResponse ?? widget.viewModel?.getItems().reverse().find((item) => isResponseVM(item)));
        if (!currentResponse || !isResponseVM(currentResponse)) {
            return;
        }
        widget.reveal(currentResponse);
        const responseCodeblocks = widget.getCodeBlockInfosForResponse(currentResponse);
        const focusIdx = curCodeBlockInfo ?
            (curCodeBlockInfo.codeBlockIndex + (reverse ? -1 : 1) + responseCodeblocks.length) % responseCodeblocks.length :
            reverse ? responseCodeblocks.length - 1 : 0;
        responseCodeblocks[focusIdx]?.focus();
    }
    registerAction2(class NextCodeBlockAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.nextCodeBlock',
                title: localize2('interactive.nextCodeBlock.label', "Next Code Block"),
                keybinding: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */, },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ChatContextKeys.inChatSession,
                },
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
            });
        }
        run(accessor, ...args) {
            navigateCodeBlocks(accessor);
        }
    });
    registerAction2(class PreviousCodeBlockAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.previousCodeBlock',
                title: localize2('interactive.previousCodeBlock.label', "Previous Code Block"),
                keybinding: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */, },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ChatContextKeys.inChatSession,
                },
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
            });
        }
        run(accessor, ...args) {
            navigateCodeBlocks(accessor, true);
        }
    });
}
function getContextFromEditor(editor, accessor) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const chatCodeBlockContextProviderService = accessor.get(IChatCodeBlockContextProviderService);
    const model = editor.getModel();
    if (!model) {
        return;
    }
    const widget = chatWidgetService.lastFocusedWidget;
    const codeBlockInfo = widget?.getCodeBlockInfoForEditor(model.uri);
    if (!codeBlockInfo) {
        for (const provider of chatCodeBlockContextProviderService.providers) {
            const context = provider.getCodeBlockContext(editor);
            if (context) {
                return context;
            }
        }
        return;
    }
    const element = widget?.viewModel?.getItems().find(item => item.id === codeBlockInfo.elementId);
    return {
        element,
        codeBlockIndex: codeBlockInfo.codeBlockIndex,
        code: editor.getValue(),
        languageId: editor.getModel().getLanguageId(),
        codemapperUri: codeBlockInfo.codemapperUri
    };
}
export function registerChatCodeCompareBlockActions() {
    class ChatCompareCodeBlockAction extends Action2 {
        run(accessor, ...args) {
            const context = args[0];
            if (!isCodeCompareBlockActionContext(context)) {
                return;
                // TODO@jrieken derive context
            }
            return this.runWithContext(accessor, context);
        }
    }
    registerAction2(class ApplyEditsCompareBlockAction extends ChatCompareCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.applyCompareEdits',
                title: localize2('interactive.compare.apply', "Apply Edits"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.gitPullRequestGoToChanges,
                precondition: ContextKeyExpr.and(EditorContextKeys.hasChanges, ChatContextKeys.editApplied.negate()),
                menu: {
                    id: MenuId.ChatCompareBlock,
                    group: 'navigation',
                    order: 1,
                }
            });
        }
        async runWithContext(accessor, context) {
            const instaService = accessor.get(IInstantiationService);
            const editorService = accessor.get(ICodeEditorService);
            const item = context.edit;
            const response = context.element;
            if (item.state?.applied) {
                // already applied
                return false;
            }
            if (!response.response.value.includes(item)) {
                // bogous item
                return false;
            }
            const firstEdit = item.edits[0]?.[0];
            if (!firstEdit) {
                return false;
            }
            const textEdits = AsyncIterableObject.fromArray(item.edits);
            const editorToApply = await editorService.openCodeEditor({ resource: item.uri }, null);
            if (editorToApply) {
                editorToApply.revealLineInCenterIfOutsideViewport(firstEdit.range.startLineNumber);
                instaService.invokeFunction(reviewEdits, editorToApply, textEdits, CancellationToken.None);
                response.setEditApplied(item, 1);
                return true;
            }
            return false;
        }
    });
    registerAction2(class DiscardEditsCompareBlockAction extends ChatCompareCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.discardCompareEdits',
                title: localize2('interactive.compare.discard', "Discard Edits"),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.trash,
                precondition: ContextKeyExpr.and(EditorContextKeys.hasChanges, ChatContextKeys.editApplied.negate()),
                menu: {
                    id: MenuId.ChatCompareBlock,
                    group: 'navigation',
                    order: 2,
                }
            });
        }
        async runWithContext(accessor, context) {
            const instaService = accessor.get(IInstantiationService);
            const editor = instaService.createInstance(DefaultChatTextEditor);
            editor.discard(context.element, context.edit);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvZGVibG9ja0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENvZGVibG9ja0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDMUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDN0csT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVB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