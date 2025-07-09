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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { inputPlaceholderForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { chatSlashCommandBackground, chatSlashCommandForeground } from '../../common/chatColors.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, ChatRequestTextPart, ChatRequestToolPart, chatAgentLeader, chatSubcommandLeader } from '../../common/chatParserTypes.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { ChatWidget } from '../chatWidget.js';
import { dynamicVariableDecorationType } from './chatDynamicVariables.js';
const decorationDescription = 'chat';
const placeholderDecorationType = 'chat-session-detail';
const slashCommandTextDecorationType = 'chat-session-text';
const variableTextDecorationType = 'chat-variable-text';
function agentAndCommandToKey(agent, subcommand) {
    return subcommand ? `${agent.id}__${subcommand}` : agent.id;
}
let InputEditorDecorations = class InputEditorDecorations extends Disposable {
    constructor(widget, codeEditorService, themeService, chatAgentService) {
        super();
        this.widget = widget;
        this.codeEditorService = codeEditorService;
        this.themeService = themeService;
        this.chatAgentService = chatAgentService;
        this.id = 'inputEditorDecorations';
        this.previouslyUsedAgents = new Set();
        this.viewModelDisposables = this._register(new MutableDisposable());
        this.codeEditorService.registerDecorationType(decorationDescription, placeholderDecorationType, {});
        this._register(this.themeService.onDidColorThemeChange(() => this.updateRegisteredDecorationTypes()));
        this.updateRegisteredDecorationTypes();
        this.updateInputEditorDecorations();
        this._register(this.widget.inputEditor.onDidChangeModelContent(() => this.updateInputEditorDecorations()));
        this._register(this.widget.onDidChangeParsedInput(() => this.updateInputEditorDecorations()));
        this._register(this.widget.onDidChangeViewModel(() => {
            this.registerViewModelListeners();
            this.previouslyUsedAgents.clear();
            this.updateInputEditorDecorations();
        }));
        this._register(this.widget.onDidSubmitAgent((e) => {
            this.previouslyUsedAgents.add(agentAndCommandToKey(e.agent, e.slashCommand?.name));
        }));
        this._register(this.chatAgentService.onDidChangeAgents(() => this.updateInputEditorDecorations()));
        this.registerViewModelListeners();
    }
    registerViewModelListeners() {
        this.viewModelDisposables.value = this.widget.viewModel?.onDidChange(e => {
            if (e?.kind === 'changePlaceholder' || e?.kind === 'initialize') {
                this.updateInputEditorDecorations();
            }
        });
    }
    updateRegisteredDecorationTypes() {
        this.codeEditorService.removeDecorationType(variableTextDecorationType);
        this.codeEditorService.removeDecorationType(dynamicVariableDecorationType);
        this.codeEditorService.removeDecorationType(slashCommandTextDecorationType);
        const theme = this.themeService.getColorTheme();
        this.codeEditorService.registerDecorationType(decorationDescription, slashCommandTextDecorationType, {
            color: theme.getColor(chatSlashCommandForeground)?.toString(),
            backgroundColor: theme.getColor(chatSlashCommandBackground)?.toString(),
            borderRadius: '3px'
        });
        this.codeEditorService.registerDecorationType(decorationDescription, variableTextDecorationType, {
            color: theme.getColor(chatSlashCommandForeground)?.toString(),
            backgroundColor: theme.getColor(chatSlashCommandBackground)?.toString(),
            borderRadius: '3px'
        });
        this.codeEditorService.registerDecorationType(decorationDescription, dynamicVariableDecorationType, {
            color: theme.getColor(chatSlashCommandForeground)?.toString(),
            backgroundColor: theme.getColor(chatSlashCommandBackground)?.toString(),
            borderRadius: '3px'
        });
        this.updateInputEditorDecorations();
    }
    getPlaceholderColor() {
        const theme = this.themeService.getColorTheme();
        const transparentForeground = theme.getColor(inputPlaceholderForeground);
        return transparentForeground?.toString();
    }
    async updateInputEditorDecorations() {
        const inputValue = this.widget.inputEditor.getValue();
        const viewModel = this.widget.viewModel;
        if (!viewModel) {
            return;
        }
        if (!inputValue) {
            const defaultAgent = this.chatAgentService.getDefaultAgent(this.widget.location, this.widget.input.currentMode);
            const decoration = [
                {
                    range: {
                        startLineNumber: 1,
                        endLineNumber: 1,
                        startColumn: 1,
                        endColumn: 1000
                    },
                    renderOptions: {
                        after: {
                            contentText: viewModel.inputPlaceholder || (defaultAgent?.description ?? ''),
                            color: this.getPlaceholderColor()
                        }
                    }
                }
            ];
            this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, decoration);
            return;
        }
        const parsedRequest = this.widget.parsedInput.parts;
        let placeholderDecoration;
        const agentPart = parsedRequest.find((p) => p instanceof ChatRequestAgentPart);
        const agentSubcommandPart = parsedRequest.find((p) => p instanceof ChatRequestAgentSubcommandPart);
        const slashCommandPart = parsedRequest.find((p) => p instanceof ChatRequestSlashCommandPart);
        const exactlyOneSpaceAfterPart = (part) => {
            const partIdx = parsedRequest.indexOf(part);
            if (parsedRequest.length > partIdx + 2) {
                return false;
            }
            const nextPart = parsedRequest[partIdx + 1];
            return nextPart && nextPart instanceof ChatRequestTextPart && nextPart.text === ' ';
        };
        const getRangeForPlaceholder = (part) => ({
            startLineNumber: part.editorRange.startLineNumber,
            endLineNumber: part.editorRange.endLineNumber,
            startColumn: part.editorRange.endColumn + 1,
            endColumn: 1000
        });
        const onlyAgentAndWhitespace = agentPart && parsedRequest.every(p => p instanceof ChatRequestTextPart && !p.text.trim().length || p instanceof ChatRequestAgentPart);
        if (onlyAgentAndWhitespace) {
            // Agent reference with no other text - show the placeholder
            const isFollowupSlashCommand = this.previouslyUsedAgents.has(agentAndCommandToKey(agentPart.agent, undefined));
            const shouldRenderFollowupPlaceholder = isFollowupSlashCommand && agentPart.agent.metadata.followupPlaceholder;
            if (agentPart.agent.description && exactlyOneSpaceAfterPart(agentPart)) {
                placeholderDecoration = [{
                        range: getRangeForPlaceholder(agentPart),
                        renderOptions: {
                            after: {
                                contentText: shouldRenderFollowupPlaceholder ? agentPart.agent.metadata.followupPlaceholder : agentPart.agent.description,
                                color: this.getPlaceholderColor(),
                            }
                        }
                    }];
            }
        }
        const onlyAgentAndAgentCommandAndWhitespace = agentPart && agentSubcommandPart && parsedRequest.every(p => p instanceof ChatRequestTextPart && !p.text.trim().length || p instanceof ChatRequestAgentPart || p instanceof ChatRequestAgentSubcommandPart);
        if (onlyAgentAndAgentCommandAndWhitespace) {
            // Agent reference and subcommand with no other text - show the placeholder
            const isFollowupSlashCommand = this.previouslyUsedAgents.has(agentAndCommandToKey(agentPart.agent, agentSubcommandPart.command.name));
            const shouldRenderFollowupPlaceholder = isFollowupSlashCommand && agentSubcommandPart.command.followupPlaceholder;
            if (agentSubcommandPart?.command.description && exactlyOneSpaceAfterPart(agentSubcommandPart)) {
                placeholderDecoration = [{
                        range: getRangeForPlaceholder(agentSubcommandPart),
                        renderOptions: {
                            after: {
                                contentText: shouldRenderFollowupPlaceholder ? agentSubcommandPart.command.followupPlaceholder : agentSubcommandPart.command.description,
                                color: this.getPlaceholderColor(),
                            }
                        }
                    }];
            }
        }
        const onlyAgentCommandAndWhitespace = agentSubcommandPart && parsedRequest.every(p => p instanceof ChatRequestTextPart && !p.text.trim().length || p instanceof ChatRequestAgentSubcommandPart);
        if (onlyAgentCommandAndWhitespace) {
            // Agent subcommand with no other text - show the placeholder
            if (agentSubcommandPart?.command.description && exactlyOneSpaceAfterPart(agentSubcommandPart)) {
                placeholderDecoration = [{
                        range: getRangeForPlaceholder(agentSubcommandPart),
                        renderOptions: {
                            after: {
                                contentText: agentSubcommandPart.command.description,
                                color: this.getPlaceholderColor(),
                            }
                        }
                    }];
            }
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, placeholderDecorationType, placeholderDecoration ?? []);
        const textDecorations = [];
        if (agentPart) {
            textDecorations.push({ range: agentPart.editorRange });
        }
        if (agentSubcommandPart) {
            textDecorations.push({ range: agentSubcommandPart.editorRange, hoverMessage: new MarkdownString(agentSubcommandPart.command.description) });
        }
        if (slashCommandPart) {
            textDecorations.push({ range: slashCommandPart.editorRange });
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, slashCommandTextDecorationType, textDecorations);
        const varDecorations = [];
        const toolParts = parsedRequest.filter((p) => p instanceof ChatRequestToolPart);
        for (const tool of toolParts) {
            varDecorations.push({ range: tool.editorRange });
        }
        this.widget.inputEditor.setDecorationsByType(decorationDescription, variableTextDecorationType, varDecorations);
    }
};
InputEditorDecorations = __decorate([
    __param(1, ICodeEditorService),
    __param(2, IThemeService),
    __param(3, IChatAgentService)
], InputEditorDecorations);
class InputEditorSlashCommandMode extends Disposable {
    constructor(widget) {
        super();
        this.widget = widget;
        this.id = 'InputEditorSlashCommandMode';
        this._register(this.widget.onDidChangeAgent(e => {
            if (e.slashCommand && e.slashCommand.isSticky || !e.slashCommand && e.agent.metadata.isSticky) {
                this.repopulateAgentCommand(e.agent, e.slashCommand);
            }
        }));
        this._register(this.widget.onDidSubmitAgent(e => {
            this.repopulateAgentCommand(e.agent, e.slashCommand);
        }));
    }
    async repopulateAgentCommand(agent, slashCommand) {
        // Make sure we don't repopulate if the user already has something in the input
        if (this.widget.inputEditor.getValue().trim()) {
            return;
        }
        let value;
        if (slashCommand && slashCommand.isSticky) {
            value = `${chatAgentLeader}${agent.name} ${chatSubcommandLeader}${slashCommand.name} `;
        }
        else if (agent.metadata.isSticky) {
            value = `${chatAgentLeader}${agent.name} `;
        }
        if (value) {
            this.widget.inputEditor.setValue(value);
            this.widget.inputEditor.setPosition({ lineNumber: 1, column: value.length + 1 });
        }
    }
}
ChatWidget.CONTRIBS.push(InputEditorDecorations, InputEditorSlashCommandMode);
let ChatTokenDeleter = class ChatTokenDeleter extends Disposable {
    constructor(widget, instantiationService) {
        super();
        this.widget = widget;
        this.instantiationService = instantiationService;
        this.id = 'chatTokenDeleter';
        const parser = this.instantiationService.createInstance(ChatRequestParser);
        const inputValue = this.widget.inputEditor.getValue();
        let previousInputValue;
        let previousSelectedAgent;
        // A simple heuristic to delete the previous token when the user presses backspace.
        // The sophisticated way to do this would be to have a parse tree that can be updated incrementally.
        this._register(this.widget.inputEditor.onDidChangeModelContent(e => {
            if (!previousInputValue) {
                previousInputValue = inputValue;
                previousSelectedAgent = this.widget.lastSelectedAgent;
            }
            // Don't try to handle multicursor edits right now
            const change = e.changes[0];
            // If this was a simple delete, try to find out whether it was inside a token
            if (!change.text && this.widget.viewModel) {
                const previousParsedValue = parser.parseChatRequest(this.widget.viewModel.sessionId, previousInputValue, widget.location, { selectedAgent: previousSelectedAgent, mode: this.widget.input.currentMode });
                // For dynamic variables, this has to happen in ChatDynamicVariableModel with the other bookkeeping
                const deletableTokens = previousParsedValue.parts.filter(p => p instanceof ChatRequestAgentPart || p instanceof ChatRequestAgentSubcommandPart || p instanceof ChatRequestSlashCommandPart || p instanceof ChatRequestToolPart);
                deletableTokens.forEach(token => {
                    const deletedRangeOfToken = Range.intersectRanges(token.editorRange, change.range);
                    // Part of this token was deleted, or the space after it was deleted, and the deletion range doesn't go off the front of the token, for simpler math
                    if (deletedRangeOfToken && Range.compareRangesUsingStarts(token.editorRange, change.range) < 0) {
                        // Assume single line tokens
                        const length = deletedRangeOfToken.endColumn - deletedRangeOfToken.startColumn;
                        const rangeToDelete = new Range(token.editorRange.startLineNumber, token.editorRange.startColumn, token.editorRange.endLineNumber, token.editorRange.endColumn - length);
                        this.widget.inputEditor.executeEdits(this.id, [{
                                range: rangeToDelete,
                                text: '',
                            }]);
                        this.widget.refreshParsedInput();
                    }
                });
            }
            previousInputValue = this.widget.inputEditor.getValue();
            previousSelectedAgent = this.widget.lastSelectedAgent;
        }));
    }
};
ChatTokenDeleter = __decorate([
    __param(1, IInstantiationService)
], ChatTokenDeleter);
ChatWidget.CONTRIBS.push(ChatTokenDeleter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0RWRpdG9yQ29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW5wdXRFZGl0b3JDb250cmliLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQXFDLGlCQUFpQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDhCQUE4QixFQUFFLDJCQUEyQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUEwQixlQUFlLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3TyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDOUMsT0FBTyxFQUFFLDZC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