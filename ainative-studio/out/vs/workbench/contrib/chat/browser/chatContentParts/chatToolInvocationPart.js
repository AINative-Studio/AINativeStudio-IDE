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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUb29sSW52b2NhdGlvblBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUlwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUlsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsOEJBQThCLEVBQWlD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