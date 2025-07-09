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
var ChatToolInvocationSubPart_1;
import * as dom from '../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { createToolInputUri, ILanguageModelToolsService, isToolResultInputOutputDetails } from '../../common/languageModelToolsService.js';
import { CancelChatActionId } from '../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../actions/chatToolActions.js';
import { ChatCollapsibleEditorContentPart } from './chatCollapsibleContentPart.js';
import { ChatConfirmationWidget, ChatCustomConfirmationWidget } from './chatConfirmationWidget.js';
import { ChatMarkdownContentPart } from './chatMarkdownContentPart.js';
import { ChatCustomProgressPart, ChatProgressContentPart } from './chatProgressContentPart.js';
import { ChatCollapsibleListContentPart } from './chatReferencesContentPart.js';
let ChatToolInvocationPart = class ChatToolInvocationPart extends Disposable {
    get codeblocks() {
        return this.subPart?.codeblocks ?? [];
    }
    get codeblocksPartId() {
        return this.subPart?.codeblocksPartId;
    }
    constructor(toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService) {
        super();
        this.toolInvocation = toolInvocation;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.domNode = dom.$('.chat-tool-invocation-part');
        if (toolInvocation.presentation === 'hidden') {
            return;
        }
        // This part is a bit different, since IChatToolInvocation is not an immutable model object. So this part is able to rerender itself.
        // If this turns out to be a typical pattern, we could come up with a more reusable pattern, like telling the list to rerender an element
        // when the model changes, or trying to make the model immutable and swap out one content part for a new one based on user actions in the view.
        const partStore = this._register(new DisposableStore());
        const render = () => {
            dom.clearNode(this.domNode);
            partStore.clear();
            this.subPart = partStore.add(instantiationService.createInstance(ChatToolInvocationSubPart, toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex));
            this.domNode.appendChild(this.subPart.domNode);
            partStore.add(this.subPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            partStore.add(this.subPart.onNeedsRerender(() => {
                render();
                this._onDidChangeHeight.fire();
            }));
        };
        render();
    }
    hasSameContent(other, followingContent, element) {
        return (other.kind === 'toolInvocation' || other.kind === 'toolInvocationSerialized') && this.toolInvocation.toolCallId === other.toolCallId;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatToolInvocationPart = __decorate([
    __param(8, IInstantiationService)
], ChatToolInvocationPart);
export { ChatToolInvocationPart };
let ChatToolInvocationSubPart = class ChatToolInvocationSubPart extends Disposable {
    static { ChatToolInvocationSubPart_1 = this; }
    static { this.idPool = 0; }
    get codeblocks() {
        // TODO this is weird, the separate cases should maybe be their own "subparts"
        return this.markdownPart?.codeblocks ?? this._codeblocks;
    }
    get codeblocksPartId() {
        return this.markdownPart?.codeblocksPartId ?? this._codeblocksPartId;
    }
    constructor(toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, keybindingService, modelService, languageService, contextKeyService, languageModelToolsService) {
        super();
        this.toolInvocation = toolInvocation;
        this.context = context;
        this.renderer = renderer;
        this.listPool = listPool;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextKeyService = contextKeyService;
        this.languageModelToolsService = languageModelToolsService;
        this._codeblocksPartId = 'tool-' + (ChatToolInvocationSubPart_1.idPool++);
        this._onNeedsRerender = this._register(new Emitter());
        this.onNeedsRerender = this._onNeedsRerender.event;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._codeblocks = [];
        if (toolInvocation.kind === 'toolInvocation' && toolInvocation.confirmationMessages) {
            if (toolInvocation.toolSpecificData?.kind === 'terminal') {
                this.domNode = this.createTerminalConfirmationWidget(toolInvocation, toolInvocation.toolSpecificData);
            }
            else {
                this.domNode = this.createConfirmationWidget(toolInvocation);
            }
        }
        else if (toolInvocation.toolSpecificData?.kind === 'terminal') {
            this.domNode = this.createTerminalMarkdownProgressPart(toolInvocation, toolInvocation.toolSpecificData);
        }
        else if (Array.isArray(toolInvocation.resultDetails) && toolInvocation.resultDetails?.length) {
            this.domNode = this.createResultList(toolInvocation.pastTenseMessage ?? toolInvocation.invocationMessage, toolInvocation.resultDetails);
        }
        else if (isToolResultInputOutputDetails(toolInvocation.resultDetails)) {
            this.domNode = this.createInputOutputMarkdownProgressPart(toolInvocation.pastTenseMessage ?? toolInvocation.invocationMessage, toolInvocation.resultDetails);
        }
        else {
            this.domNode = this.createProgressPart();
        }
        if (toolInvocation.kind === 'toolInvocation' && !toolInvocation.isComplete) {
            toolInvocation.isCompletePromise.then(() => this._onNeedsRerender.fire());
        }
    }
    createConfirmationWidget(toolInvocation) {
        if (!toolInvocation.confirmationMessages) {
            throw new Error('Confirmation messages are missing');
        }
        const title = toolInvocation.confirmationMessages.title;
        const message = toolInvocation.confirmationMessages.message;
        const allowAutoConfirm = toolInvocation.confirmationMessages.allowAutoConfirm;
        const continueLabel = localize('continue', "Continue");
        const continueKeybinding = this.keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
        const continueTooltip = continueKeybinding ? `${continueLabel} (${continueKeybinding})` : continueLabel;
        const cancelLabel = localize('cancel', "Cancel");
        const cancelKeybinding = this.keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
        const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
        let ConfirmationOutcome;
        (function (ConfirmationOutcome) {
            ConfirmationOutcome[ConfirmationOutcome["Allow"] = 0] = "Allow";
            ConfirmationOutcome[ConfirmationOutcome["Disallow"] = 1] = "Disallow";
            ConfirmationOutcome[ConfirmationOutcome["AllowWorkspace"] = 2] = "AllowWorkspace";
            ConfirmationOutcome[ConfirmationOutcome["AllowGlobally"] = 3] = "AllowGlobally";
            ConfirmationOutcome[ConfirmationOutcome["AllowSession"] = 4] = "AllowSession";
        })(ConfirmationOutcome || (ConfirmationOutcome = {}));
        const buttons = [
            {
                label: continueLabel,
                data: 0 /* ConfirmationOutcome.Allow */,
                tooltip: continueTooltip,
                moreActions: !allowAutoConfirm ? undefined : [
                    { label: localize('allowSession', 'Allow in this Session'), data: 4 /* ConfirmationOutcome.AllowSession */, tooltip: localize('allowSesssionTooltip', 'Allow this tool to run in this session without confirmation.') },
                    { label: localize('allowWorkspace', 'Allow in this Workspace'), data: 2 /* ConfirmationOutcome.AllowWorkspace */, tooltip: localize('allowWorkspaceTooltip', 'Allow this tool to run in this workspace without confirmation.') },
                    { label: localize('allowGlobally', 'Always Allow'), data: 3 /* ConfirmationOutcome.AllowGlobally */, tooltip: localize('allowGloballTooltip', 'Always allow this tool to run without confirmation.') },
                ],
            },
            {
                label: localize('cancel', "Cancel"),
                data: 1 /* ConfirmationOutcome.Disallow */,
                isSecondary: true,
                tooltip: cancelTooltip
            }
        ];
        let confirmWidget;
        if (typeof message === 'string') {
            confirmWidget = this._register(this.instantiationService.createInstance(ChatConfirmationWidget, title, message, buttons));
        }
        else {
            const chatMarkdownContent = {
                kind: 'markdownContent',
                content: message,
            };
            const codeBlockRenderOptions = {
                hideToolbar: true,
                reserveWidth: 19,
                verticalPadding: 5,
                editorOptions: {
                    wordWrap: 'on'
                }
            };
            const elements = dom.h('div', [
                dom.h('.message@message'),
                dom.h('.editor@editor'),
            ]);
            if (toolInvocation.toolSpecificData?.kind === 'input') {
                const inputData = toolInvocation.toolSpecificData;
                const codeBlockRenderOptions = {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'on',
                        readOnly: false
                    }
                };
                const langId = this.languageService.getLanguageIdByLanguageName('json');
                const model = this._register(this.modelService.createModel(JSON.stringify(inputData.rawInput, undefined, 2), this.languageService.createById(langId), createToolInputUri(toolInvocation.toolId)));
                const editor = this._register(this.editorPool.get());
                editor.object.render({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codeBlockPartIndex: 0,
                    element: this.context.element,
                    languageId: langId ?? 'json',
                    renderOptions: codeBlockRenderOptions,
                    textModel: Promise.resolve(model)
                }, this.currentWidthDelegate());
                this._codeblocks.push({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codemapperUri: undefined,
                    elementId: this.context.element.id,
                    focus: () => editor.object.focus(),
                    isStreaming: false,
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    uriPromise: Promise.resolve(model.uri)
                });
                this._register(editor.object.onDidChangeContentHeight(() => {
                    editor.object.layout(this.currentWidthDelegate());
                    this._onDidChangeHeight.fire();
                }));
                this._register(model.onDidChangeContent(e => {
                    try {
                        inputData.rawInput = JSON.parse(model.getValue());
                    }
                    catch {
                        // ignore
                    }
                }));
                elements.editor.append(editor.object.element);
            }
            this.markdownPart = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
            elements.message.append(this.markdownPart.domNode);
            this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            confirmWidget = this._register(this.instantiationService.createInstance(ChatCustomConfirmationWidget, title, elements.root, toolInvocation.toolSpecificData?.kind === 'input', buttons));
        }
        const hasToolConfirmation = ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService);
        hasToolConfirmation.set(true);
        this._register(confirmWidget.onDidClick(button => {
            switch (button.data) {
                case 3 /* ConfirmationOutcome.AllowGlobally */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'profile', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 2 /* ConfirmationOutcome.AllowWorkspace */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'workspace', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 4 /* ConfirmationOutcome.AllowSession */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'memory', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 0 /* ConfirmationOutcome.Allow */:
                    toolInvocation.confirmed.complete(true);
                    break;
                case 1 /* ConfirmationOutcome.Disallow */:
                    toolInvocation.confirmed.complete(false);
                    break;
            }
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => hasToolConfirmation.reset()));
        toolInvocation.confirmed.p.then(() => {
            hasToolConfirmation.reset();
            this._onNeedsRerender.fire();
        });
        return confirmWidget.domNode;
    }
    createTerminalConfirmationWidget(toolInvocation, terminalData) {
        if (!toolInvocation.confirmationMessages) {
            throw new Error('Confirmation messages are missing');
        }
        const title = toolInvocation.confirmationMessages.title;
        const message = toolInvocation.confirmationMessages.message;
        const continueLabel = localize('continue', "Continue");
        const continueKeybinding = this.keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
        const continueTooltip = continueKeybinding ? `${continueLabel} (${continueKeybinding})` : continueLabel;
        const cancelLabel = localize('cancel', "Cancel");
        const cancelKeybinding = this.keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
        const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
        const buttons = [
            {
                label: continueLabel,
                data: true,
                tooltip: continueTooltip
            },
            {
                label: cancelLabel,
                data: false,
                isSecondary: true,
                tooltip: cancelTooltip
            }
        ];
        const renderedMessage = this._register(this.renderer.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
                readOnly: false
            }
        };
        const langId = this.languageService.getLanguageIdByLanguageName(terminalData.language ?? 'sh') ?? 'shellscript';
        const model = this.modelService.createModel(terminalData.command, this.languageService.createById(langId));
        const editor = this._register(this.editorPool.get());
        editor.object.render({
            codeBlockIndex: this.codeBlockStartIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            languageId: langId,
            renderOptions: codeBlockRenderOptions,
            textModel: Promise.resolve(model)
        }, this.currentWidthDelegate());
        this._codeblocks.push({
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => editor.object.focus(),
            isStreaming: false,
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri)
        });
        this._register(editor.object.onDidChangeContentHeight(() => {
            editor.object.layout(this.currentWidthDelegate());
            this._onDidChangeHeight.fire();
        }));
        this._register(model.onDidChangeContent(e => {
            terminalData.command = model.getValue();
        }));
        const element = dom.$('');
        dom.append(element, editor.object.element);
        dom.append(element, renderedMessage.element);
        const confirmWidget = this._register(this.instantiationService.createInstance(ChatCustomConfirmationWidget, title, element, false, buttons));
        ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService).set(true);
        this._register(confirmWidget.onDidClick(button => {
            toolInvocation.confirmed.complete(button.data);
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        toolInvocation.confirmed.p.then(() => {
            ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService).set(false);
            this._onNeedsRerender.fire();
        });
        return confirmWidget.domNode;
    }
    createProgressPart() {
        let content;
        if (this.toolInvocation.isComplete && this.toolInvocation.isConfirmed !== false && this.toolInvocation.pastTenseMessage) {
            content = typeof this.toolInvocation.pastTenseMessage === 'string' ?
                new MarkdownString().appendText(this.toolInvocation.pastTenseMessage) :
                this.toolInvocation.pastTenseMessage;
        }
        else {
            content = typeof this.toolInvocation.invocationMessage === 'string' ?
                new MarkdownString().appendText(this.toolInvocation.invocationMessage + '…') :
                MarkdownString.lift(this.toolInvocation.invocationMessage).appendText('…');
        }
        const progressMessage = {
            kind: 'progressMessage',
            content
        };
        const iconOverride = !this.toolInvocation.isConfirmed ?
            Codicon.error :
            this.toolInvocation.isComplete ?
                Codicon.check : undefined;
        const progressPart = this._register(this.instantiationService.createInstance(ChatProgressContentPart, progressMessage, this.renderer, this.context, undefined, true, iconOverride));
        return progressPart.domNode;
    }
    createTerminalMarkdownProgressPart(toolInvocation, terminalData) {
        const content = new MarkdownString(`\`\`\`${terminalData.language}\n${terminalData.command}\n\`\`\``);
        const chatMarkdownContent = {
            kind: 'markdownContent',
            content: content,
        };
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on'
            }
        };
        this.markdownPart = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        const icon = !this.toolInvocation.isConfirmed ?
            Codicon.error :
            this.toolInvocation.isComplete ?
                Codicon.check : ThemeIcon.modify(Codicon.loading, 'spin');
        const progressPart = this.instantiationService.createInstance(ChatCustomProgressPart, this.markdownPart.domNode, icon);
        return progressPart.domNode;
    }
    createInputOutputMarkdownProgressPart(message, inputOutputData) {
        const model = this._register(this.modelService.createModel(`${inputOutputData.input}\n\n${inputOutputData.output}`, this.languageService.createById('json')));
        const collapsibleListPart = this._register(this.instantiationService.createInstance(ChatCollapsibleEditorContentPart, message, this.context, this.editorPool, Promise.resolve(model), model.getLanguageId(), {
            hideToolbar: true,
            reserveWidth: 19,
            maxHeightInLines: 13,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on'
            }
        }, {
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => { },
            isStreaming: false,
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri)
        }));
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        return collapsibleListPart.domNode;
    }
    createResultList(message, toolDetails) {
        const collapsibleListPart = this._register(this.instantiationService.createInstance(ChatCollapsibleListContentPart, toolDetails.map(detail => ({
            kind: 'reference',
            reference: detail,
        })), message, this.context, this.listPool));
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        return collapsibleListPart.domNode;
    }
};
ChatToolInvocationSubPart = ChatToolInvocationSubPart_1 = __decorate([
    __param(8, IInstantiationService),
    __param(9, IKeybindingService),
    __param(10, IModelService),
    __param(11, ILanguageService),
    __param(12, IContextKeyService),
    __param(13, ILanguageModelToolsService)
], ChatToolInvocationSubPart);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0VG9vbEludm9jYXRpb25QYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFJbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDBCQUEwQixFQUFFLDhCQUE4QixFQUFp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