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
var BuiltinDynamicCompletions_1, ToolCompletions_1;
import { coalesce } from '../../../../../base/common/arrays.js';
import { raceTimeout } from '../../../../../base/common/async.js';
import { isPatternInWord } from '../../../../../base/common/filters.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { dirname } from '../../../../../base/common/resources.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { getWordAtText } from '../../../../../editor/common/core/wordHelper.js';
import { SymbolKinds } from '../../../../../editor/common/languages.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IOutlineModelService } from '../../../../../editor/contrib/documentSymbols/browser/outlineModel.js';
import { localize } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { Extensions as WorkbenchExtensions } from '../../../../common/contributions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHistoryService } from '../../../../services/history/common/history.js';
import { QueryBuilder } from '../../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../../services/search/common/search.js';
import { IChatAgentNameService, IChatAgentService, getFullyQualifiedId } from '../../common/chatAgents.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestTextPart, ChatRequestToolPart, chatAgentLeader, chatSubcommandLeader, chatVariableLeader } from '../../common/chatParserTypes.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ChatEditingSessionSubmitAction, ChatSubmitAction } from '../actions/chatExecuteActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatInputPart } from '../chatInputPart.js';
import { ChatDynamicVariableModel, SelectAndInsertFileAction, SelectAndInsertFolderAction, SelectAndInsertProblemAction, SelectAndInsertSymAction, getTopLevelFolders, searchFolders } from './chatDynamicVariables.js';
let SlashCommandCompletions = class SlashCommandCompletions extends Disposable {
    constructor(languageFeaturesService, chatWidgetService, chatSlashCommandService) {
        super();
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this.chatSlashCommandService = chatSlashCommandService;
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'globalSlashCommands',
            triggerCharacters: ['/'],
            provideCompletionItems: async (model, position, _context, _token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return null;
                }
                const range = computeCompletionRanges(model, position, /\/\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const parsedRequest = widget.parsedInput.parts;
                const usedAgent = parsedRequest.find(p => p instanceof ChatRequestAgentPart);
                if (usedAgent) {
                    // No (classic) global slash commands when an agent is used
                    return;
                }
                const slashCommands = this.chatSlashCommandService.getCommands(widget.location, widget.input.currentMode);
                if (!slashCommands) {
                    return null;
                }
                return {
                    suggestions: slashCommands.map((c, i) => {
                        const withSlash = `/${c.command}`;
                        return {
                            label: withSlash,
                            insertText: c.executeImmediately ? '' : `${withSlash} `,
                            documentation: c.detail,
                            range,
                            sortText: c.sortText ?? 'a'.repeat(i + 1),
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway,
                            command: c.executeImmediately ? { id: widget.location === ChatAgentLocation.EditingSession ? ChatEditingSessionSubmitAction.ID : ChatSubmitAction.ID, title: withSlash, arguments: [{ widget, inputValue: `${withSlash} ` }] } : undefined,
                        };
                    })
                };
            }
        }));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'globalSlashCommandsAt',
            triggerCharacters: [chatAgentLeader],
            provideCompletionItems: async (model, position, _context, _token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return null;
                }
                const range = computeCompletionRanges(model, position, /@\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const slashCommands = this.chatSlashCommandService.getCommands(widget.location, widget.input.currentMode);
                if (!slashCommands) {
                    return null;
                }
                return {
                    suggestions: slashCommands.map((c, i) => {
                        const withSlash = `${chatSubcommandLeader}${c.command}`;
                        return {
                            label: withSlash,
                            insertText: c.executeImmediately ? '' : `${withSlash} `,
                            documentation: c.detail,
                            range,
                            filterText: `${chatAgentLeader}${c.command}`,
                            sortText: c.sortText ?? 'z'.repeat(i + 1),
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway,
                            command: c.executeImmediately ? { id: widget.location === ChatAgentLocation.EditingSession ? ChatEditingSessionSubmitAction.ID : ChatSubmitAction.ID, title: withSlash, arguments: [{ widget, inputValue: `${withSlash} ` }] } : undefined,
                        };
                    })
                };
            }
        }));
    }
};
SlashCommandCompletions = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, IChatSlashCommandService)
], SlashCommandCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(SlashCommandCompletions, 4 /* LifecyclePhase.Eventually */);
let AgentCompletions = class AgentCompletions extends Disposable {
    constructor(languageFeaturesService, chatWidgetService, chatAgentService, chatAgentNameService) {
        super();
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this.chatAgentService = chatAgentService;
        this.chatAgentNameService = chatAgentNameService;
        const subCommandProvider = {
            _debugDisplayName: 'chatAgentSubcommand',
            triggerCharacters: ['/'],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.viewModel) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /\/\w*/g);
                if (!range) {
                    return null;
                }
                const parsedRequest = widget.parsedInput.parts;
                const usedAgentIdx = parsedRequest.findIndex((p) => p instanceof ChatRequestAgentPart);
                if (usedAgentIdx < 0) {
                    return;
                }
                const usedSubcommand = parsedRequest.find(p => p instanceof ChatRequestAgentSubcommandPart);
                if (usedSubcommand) {
                    // Only one allowed
                    return;
                }
                for (const partAfterAgent of parsedRequest.slice(usedAgentIdx + 1)) {
                    // Could allow text after 'position'
                    if (!(partAfterAgent instanceof ChatRequestTextPart) || !partAfterAgent.text.trim().match(/^(\/\w*)?$/)) {
                        // No text allowed between agent and subcommand
                        return;
                    }
                }
                const usedAgent = parsedRequest[usedAgentIdx];
                return {
                    suggestions: usedAgent.agent.slashCommands.map((c, i) => {
                        const withSlash = `/${c.name}`;
                        return {
                            label: withSlash,
                            insertText: `${withSlash} `,
                            documentation: c.description,
                            range,
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                        };
                    })
                };
            }
        };
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, subCommandProvider));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentAndSubcommand',
            triggerCharacters: [chatAgentLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                const viewModel = widget?.viewModel;
                if (!widget || !viewModel || widget.input.currentMode !== ChatMode.Ask) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /(@|\/)\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const agents = this.chatAgentService.getAgents()
                    .filter(a => a.locations.includes(widget.location));
                // When the input is only `/`, items are sorted by sortText.
                // When typing, filterText is used to score and sort.
                // The same list is refiltered/ranked while typing.
                const getFilterText = (agent, command) => {
                    // This is hacking the filter algorithm to make @terminal /explain match worse than @workspace /explain by making its match index later in the string.
                    // When I type `/exp`, the workspace one should be sorted over the terminal one.
                    const dummyPrefix = agent.id === 'github.copilot.terminalPanel' ? `0000` : ``;
                    return `${chatAgentLeader}${dummyPrefix}${agent.name}.${command}`;
                };
                const justAgents = agents
                    .filter(a => !a.isDefault)
                    .map(agent => {
                    const { label: agentLabel, isDupe } = this.getAgentCompletionDetails(agent);
                    const detail = agent.description;
                    return {
                        label: isDupe ?
                            { label: agentLabel, description: agent.description, detail: ` (${agent.publisherDisplayName})` } :
                            agentLabel,
                        documentation: detail,
                        filterText: `${chatAgentLeader}${agent.name}`,
                        insertText: `${agentLabel} `,
                        range,
                        kind: 18 /* CompletionItemKind.Text */,
                        sortText: `${chatAgentLeader}${agent.name}`,
                        command: { id: AssignSelectedAgentAction.ID, title: AssignSelectedAgentAction.ID, arguments: [{ agent, widget }] },
                    };
                });
                return {
                    suggestions: justAgents.concat(coalesce(agents.flatMap(agent => agent.slashCommands.map((c, i) => {
                        if (agent.isDefault && this.chatAgentService.getDefaultAgent(widget.location, widget.input.currentMode)?.id !== agent.id) {
                            return;
                        }
                        const { label: agentLabel, isDupe } = this.getAgentCompletionDetails(agent);
                        const label = `${agentLabel} ${chatSubcommandLeader}${c.name}`;
                        const item = {
                            label: isDupe ?
                                { label, description: c.description, detail: isDupe ? ` (${agent.publisherDisplayName})` : undefined } :
                                label,
                            documentation: c.description,
                            filterText: getFilterText(agent, c.name),
                            commitCharacters: [' '],
                            insertText: label + ' ',
                            range,
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                            sortText: `x${chatAgentLeader}${agent.name}${c.name}`,
                            command: { id: AssignSelectedAgentAction.ID, title: AssignSelectedAgentAction.ID, arguments: [{ agent, widget }] },
                        };
                        if (agent.isDefault) {
                            // default agent isn't mentioned nor inserted
                            const label = `${chatSubcommandLeader}${c.name}`;
                            item.label = label;
                            item.insertText = `${label} `;
                            item.documentation = c.description;
                        }
                        return item;
                    }))))
                };
            }
        }));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatAgentAndSubcommand',
            triggerCharacters: [chatSubcommandLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                const viewModel = widget?.viewModel;
                if (!widget || !viewModel || widget.input.currentMode !== ChatMode.Ask) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /(@|\/)\w*/g);
                if (!range) {
                    return null;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const agents = this.chatAgentService.getAgents()
                    .filter(a => a.locations.includes(widget.location));
                return {
                    suggestions: coalesce(agents.flatMap(agent => agent.slashCommands.map((c, i) => {
                        if (agent.isDefault && this.chatAgentService.getDefaultAgent(widget.location, widget.input.currentMode)?.id !== agent.id) {
                            return;
                        }
                        const { label: agentLabel, isDupe } = this.getAgentCompletionDetails(agent);
                        const withSlash = `${chatSubcommandLeader}${c.name}`;
                        const extraSortText = agent.id === 'github.copilot.terminalPanel' ? `z` : ``;
                        const sortText = `${chatSubcommandLeader}${extraSortText}${agent.name}${c.name}`;
                        const item = {
                            label: { label: withSlash, description: agentLabel, detail: isDupe ? ` (${agent.publisherDisplayName})` : undefined },
                            commitCharacters: [' '],
                            insertText: `${agentLabel} ${withSlash} `,
                            documentation: `(${agentLabel}) ${c.description ?? ''}`,
                            range,
                            kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                            sortText,
                            command: { id: AssignSelectedAgentAction.ID, title: AssignSelectedAgentAction.ID, arguments: [{ agent, widget }] },
                        };
                        if (agent.isDefault) {
                            // default agent isn't mentioned nor inserted
                            const label = `${chatSubcommandLeader}${c.name}`;
                            item.label = label;
                            item.insertText = `${label} `;
                            item.documentation = c.description;
                        }
                        return item;
                    })))
                };
            }
        }));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'installChatExtensions',
            triggerCharacters: [chatAgentLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                if (!model.getLineContent(1).startsWith(chatAgentLeader)) {
                    return;
                }
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (widget?.location !== ChatAgentLocation.Panel || widget.input.currentMode !== ChatMode.Ask) {
                    return;
                }
                const range = computeCompletionRanges(model, position, /(@|\/)\w*/g);
                if (!range) {
                    return;
                }
                if (!isEmptyUpToCompletionWord(model, range)) {
                    // No text allowed before the completion
                    return;
                }
                const label = localize('installLabel', "Install Chat Extensions...");
                const item = {
                    label,
                    insertText: '',
                    range,
                    kind: 18 /* CompletionItemKind.Text */, // The icons are disabled here anyway
                    command: { id: 'workbench.extensions.search', title: '', arguments: ['@tag:chat-participant'] },
                    filterText: chatAgentLeader + label,
                    sortText: 'zzz'
                };
                return {
                    suggestions: [item]
                };
            }
        }));
    }
    getAgentCompletionDetails(agent) {
        const isAllowed = this.chatAgentNameService.getAgentNameRestriction(agent);
        const agentLabel = `${chatAgentLeader}${isAllowed ? agent.name : getFullyQualifiedId(agent)}`;
        const isDupe = isAllowed && this.chatAgentService.agentHasDupeName(agent.id);
        return { label: agentLabel, isDupe };
    }
};
AgentCompletions = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, IChatAgentService),
    __param(3, IChatAgentNameService)
], AgentCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(AgentCompletions, 4 /* LifecyclePhase.Eventually */);
class AssignSelectedAgentAction extends Action2 {
    static { this.ID = 'workbench.action.chat.assignSelectedAgent'; }
    constructor() {
        super({
            id: AssignSelectedAgentAction.ID,
            title: '' // not displayed
        });
    }
    async run(accessor, ...args) {
        const arg = args[0];
        if (!arg || !arg.widget || !arg.agent) {
            return;
        }
        arg.widget.lastSelectedAgent = arg.agent;
    }
}
registerAction2(AssignSelectedAgentAction);
class ReferenceArgument {
    constructor(widget, variable) {
        this.widget = widget;
        this.variable = variable;
    }
}
let BuiltinDynamicCompletions = class BuiltinDynamicCompletions extends Disposable {
    static { BuiltinDynamicCompletions_1 = this; }
    static { this.addReferenceCommand = '_addReferenceCmd'; }
    static { this.VariableNameDef = new RegExp(`${chatVariableLeader}[\\w:]*`, 'g'); } // MUST be using `g`-flag
    constructor(historyService, workspaceContextService, searchService, labelService, languageFeaturesService, chatWidgetService, _chatEditingService, instantiationService, outlineService, editorService, configurationService, fileService, markerService) {
        super();
        this.historyService = historyService;
        this.workspaceContextService = workspaceContextService;
        this.searchService = searchService;
        this.labelService = labelService;
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this._chatEditingService = _chatEditingService;
        this.instantiationService = instantiationService;
        this.outlineService = outlineService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        // File completions
        this.registerVariableCompletions('file', async ({ widget, range, position, model }, token) => {
            if (!widget.supportsFileReferences) {
                return null;
            }
            const result = { suggestions: [] };
            const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + '#file:'.length);
            result.suggestions.push({
                label: `${chatVariableLeader}file`,
                insertText: `${chatVariableLeader}file:`,
                documentation: localize('pickFileLabel', "Pick a file"),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: { id: SelectAndInsertFileAction.ID, title: SelectAndInsertFileAction.ID, arguments: [{ widget, range: afterRange }] },
                sortText: 'z'
            });
            const range2 = computeCompletionRanges(model, position, new RegExp(`${chatVariableLeader}[^\\s]*`, 'g'), true);
            if (range2) {
                await this.addFileEntries(widget, result, range2, token);
            }
            return result;
        });
        // Folder completions
        this.registerVariableCompletions('folder', async ({ widget, range, position, model }, token) => {
            if (!widget.supportsFileReferences) {
                return null;
            }
            const result = { suggestions: [] };
            const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + '#folder:'.length);
            result.suggestions.push({
                label: `${chatVariableLeader}folder`,
                insertText: `${chatVariableLeader}folder:`,
                documentation: localize('pickFolderLabel', "Pick a folder"),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: { id: SelectAndInsertFolderAction.ID, title: SelectAndInsertFolderAction.ID, arguments: [{ widget, range: afterRange }] },
                sortText: 'z'
            });
            const range2 = computeCompletionRanges(model, position, new RegExp(`${chatVariableLeader}[^\\s]*`, 'g'), true);
            if (range2) {
                await this.addFolderEntries(widget, result, range2, token);
            }
            return result;
        });
        // Selection completion
        this.registerVariableCompletions('selection', ({ widget, range }, token) => {
            if (!widget.supportsFileReferences) {
                return;
            }
            if (widget.location === ChatAgentLocation.Editor) {
                return;
            }
            const active = this.editorService.activeTextEditorControl;
            if (!isCodeEditor(active)) {
                return;
            }
            const currentResource = active.getModel()?.uri;
            const currentSelection = active.getSelection();
            if (!currentSelection || !currentResource || currentSelection.isEmpty()) {
                return;
            }
            const basename = this.labelService.getUriBasenameLabel(currentResource);
            const text = `${chatVariableLeader}file:${basename}:${currentSelection.startLineNumber}-${currentSelection.endLineNumber}`;
            const fullRangeText = `:${currentSelection.startLineNumber}:${currentSelection.startColumn}-${currentSelection.endLineNumber}:${currentSelection.endColumn}`;
            const description = this.labelService.getUriLabel(currentResource, { relative: true }) + fullRangeText;
            const result = { suggestions: [] };
            result.suggestions.push({
                label: { label: `${chatVariableLeader}selection`, description },
                filterText: `${chatVariableLeader}selection`,
                insertText: range.varWord?.endColumn === range.replace.endColumn ? `${text} ` : text,
                range,
                kind: 18 /* CompletionItemKind.Text */,
                sortText: 'z',
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand, title: '', arguments: [new ReferenceArgument(widget, {
                            id: 'vscode.selection',
                            prefix: 'file',
                            isFile: true,
                            range: { startLineNumber: range.replace.startLineNumber, startColumn: range.replace.startColumn, endLineNumber: range.replace.endLineNumber, endColumn: range.replace.startColumn + text.length },
                            data: { range: currentSelection, uri: currentResource }
                        })]
                }
            });
            return result;
        });
        // Symbol completions
        this.registerVariableCompletions('symbol', ({ widget, range, position, model }, token) => {
            if (!widget.supportsFileReferences) {
                return null;
            }
            const result = { suggestions: [] };
            const afterRangeSym = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + '#sym:'.length);
            result.suggestions.push({
                label: `${chatVariableLeader}sym`,
                insertText: `${chatVariableLeader}sym:`,
                documentation: localize('pickSymbolLabel', "Pick a symbol"),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: { id: SelectAndInsertSymAction.ID, title: SelectAndInsertSymAction.ID, arguments: [{ widget, range: afterRangeSym }] },
                sortText: 'z'
            });
            const range2 = computeCompletionRanges(model, position, new RegExp(`${chatVariableLeader}[^\\s]*`, 'g'), true);
            if (range2) {
                this.addSymbolEntries(widget, result, range2, token);
            }
            return result;
        });
        // Problems completions, we just attach all problems in this case
        this.registerVariableCompletions(SelectAndInsertProblemAction.Name, ({ widget, range, position, model }, token) => {
            const stats = markerService.getStatistics();
            if (!stats.errors && !stats.warnings) {
                return null;
            }
            const result = { suggestions: [] };
            const completedText = `${chatVariableLeader}${SelectAndInsertProblemAction.Name}:`;
            const afterTextRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + completedText.length);
            result.suggestions.push({
                label: `${chatVariableLeader}${SelectAndInsertProblemAction.Name}`,
                insertText: completedText,
                documentation: localize('pickProblemsLabel', "Problems in your workspace"),
                range,
                kind: 18 /* CompletionItemKind.Text */,
                command: { id: SelectAndInsertProblemAction.ID, title: SelectAndInsertProblemAction.ID, arguments: [{ widget, range: afterTextRange }] },
                sortText: 'z'
            });
            return result;
        });
        this._register(CommandsRegistry.registerCommand(BuiltinDynamicCompletions_1.addReferenceCommand, (_services, arg) => this.cmdAddReference(arg)));
        this.queryBuilder = this.instantiationService.createInstance(QueryBuilder);
    }
    registerVariableCompletions(debugName, provider) {
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: `chatVarCompletions-${debugName}`,
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget) {
                    return;
                }
                const range = computeCompletionRanges(model, position, BuiltinDynamicCompletions_1.VariableNameDef, true);
                if (range) {
                    return provider({ model, position, widget, range, context }, token);
                }
                return;
            }
        }));
    }
    async addFileEntries(widget, result, info, token) {
        const makeFileCompletionItem = (resource, description) => {
            const basename = this.labelService.getUriBasenameLabel(resource);
            const text = `${chatVariableLeader}file:${basename}`;
            const uriLabel = this.labelService.getUriLabel(resource, { relative: true });
            const labelDescription = description
                ? localize('fileEntryDescription', '{0} ({1})', uriLabel, description)
                : uriLabel;
            const sortText = description ? 'z' : '{'; // after `z`
            return {
                label: { label: basename, description: labelDescription },
                filterText: `${chatVariableLeader}${basename}`,
                insertText: info.varWord?.endColumn === info.replace.endColumn ? `${text} ` : text,
                range: info,
                kind: 20 /* CompletionItemKind.File */,
                sortText,
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand, title: '', arguments: [new ReferenceArgument(widget, {
                            id: 'vscode.file',
                            prefix: 'file',
                            isFile: true,
                            range: { startLineNumber: info.replace.startLineNumber, startColumn: info.replace.startColumn, endLineNumber: info.replace.endLineNumber, endColumn: info.replace.startColumn + text.length },
                            data: resource
                        })]
                }
            };
        };
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1); // remove leading #
        }
        const seen = new ResourceSet();
        const len = result.suggestions.length;
        // RELATED FILES
        if (widget.input.currentMode !== ChatMode.Ask && widget.viewModel && widget.viewModel.model.editingSession) {
            const relatedFiles = (await raceTimeout(this._chatEditingService.getRelatedFiles(widget.viewModel.sessionId, widget.getInput(), widget.attachmentModel.fileAttachments, token), 200)) ?? [];
            for (const relatedFileGroup of relatedFiles) {
                for (const relatedFile of relatedFileGroup.files) {
                    if (seen.has(relatedFile.uri)) {
                        continue;
                    }
                    seen.add(relatedFile.uri);
                    result.suggestions.push(makeFileCompletionItem(relatedFile.uri, relatedFile.description));
                }
            }
        }
        // HISTORY
        // always take the last N items
        for (const item of this.historyService.getHistory()) {
            if (!item.resource || !this.workspaceContextService.getWorkspaceFolder(item.resource)) {
                // ignore "forgein" editors
                continue;
            }
            if (pattern) {
                // use pattern if available
                const basename = this.labelService.getUriBasenameLabel(item.resource).toLowerCase();
                if (!isPatternInWord(pattern, 0, pattern.length, basename, 0, basename.length)) {
                    continue;
                }
            }
            seen.add(item.resource);
            const newLen = result.suggestions.push(makeFileCompletionItem(item.resource));
            if (newLen - len >= 5) {
                break;
            }
        }
        // SEARCH
        // use file search when having a pattern
        if (pattern) {
            const cacheKey = this.updateCacheKey();
            const query = this.queryBuilder.file(this.workspaceContextService.getWorkspace().folders, {
                filePattern: pattern,
                sortByScore: true,
                maxResults: 250,
                cacheKey: cacheKey.key
            });
            const data = await this.searchService.fileSearch(query, token);
            for (const match of data.results) {
                if (seen.has(match.resource)) {
                    // already included via history
                    continue;
                }
                result.suggestions.push(makeFileCompletionItem(match.resource));
            }
        }
        // mark results as incomplete because further typing might yield
        // in more search results
        result.incomplete = true;
    }
    async addFolderEntries(widget, result, info, token) {
        const folderLeader = `${chatVariableLeader}folder:`;
        const makeFolderCompletionItem = (resource, description) => {
            const basename = this.labelService.getUriBasenameLabel(resource);
            const text = `${folderLeader}${basename}`;
            const uriLabel = this.labelService.getUriLabel(dirname(resource), { relative: true });
            const labelDescription = description
                ? localize('folderEntryDescription', '{0} ({1})', uriLabel, description)
                : uriLabel;
            const sortText = description ? 'z' : '{'; // after `z`
            return {
                label: { label: basename, description: labelDescription },
                filterText: `${folderLeader}${basename}`,
                insertText: info.varWord?.endColumn === info.replace.endColumn ? `${text} ` : text,
                range: info,
                kind: 23 /* CompletionItemKind.Folder */,
                sortText,
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand, title: '', arguments: [new ReferenceArgument(widget, {
                            id: 'vscode.folder',
                            prefix: 'folder',
                            isFile: false,
                            isDirectory: true,
                            range: { startLineNumber: info.replace.startLineNumber, startColumn: info.replace.startColumn, endLineNumber: info.replace.endLineNumber, endColumn: info.replace.startColumn + text.length },
                            data: resource
                        })]
                }
            };
        };
        const seen = new ResourceSet();
        const workspaces = this.workspaceContextService.getWorkspace().folders.map(folder => folder.uri);
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(folderLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(folderLeader.length);
            for (const folder of await getTopLevelFolders(workspaces, this.fileService)) {
                result.suggestions.push(makeFolderCompletionItem(folder));
                seen.add(folder);
            }
        }
        // SEARCH
        // use folder search when having a pattern
        if (pattern) {
            const cacheKey = this.updateCacheKey();
            const folders = await Promise.all(workspaces.map(workspace => searchFolders(workspace, pattern, true, token, cacheKey.key, this.configurationService, this.searchService)));
            for (const resource of folders.flat()) {
                if (seen.has(resource)) {
                    // already included via history
                    continue;
                }
                seen.add(resource);
                result.suggestions.push(makeFolderCompletionItem(resource));
            }
        }
        // mark results as incomplete because further typing might yield
        // in more search results
        result.incomplete = true;
    }
    addSymbolEntries(widget, result, info, token) {
        const makeSymbolCompletionItem = (symbolItem, pattern) => {
            const text = `${chatVariableLeader}sym:${symbolItem.name}`;
            const resource = symbolItem.location.uri;
            const uriLabel = this.labelService.getUriLabel(resource, { relative: true });
            const sortText = pattern ? '{' /* after z */ : '|' /* after { */;
            return {
                label: { label: symbolItem.name, description: uriLabel },
                filterText: `${chatVariableLeader}${symbolItem.name}`,
                insertText: info.varWord?.endColumn === info.replace.endColumn ? `${text} ` : text,
                range: info,
                kind: SymbolKinds.toCompletionKind(symbolItem.kind),
                sortText,
                command: {
                    id: BuiltinDynamicCompletions_1.addReferenceCommand, title: '', arguments: [new ReferenceArgument(widget, {
                            id: 'vscode.symbol',
                            prefix: 'sym',
                            fullName: symbolItem.name,
                            range: { startLineNumber: info.replace.startLineNumber, startColumn: info.replace.startColumn, endLineNumber: info.replace.endLineNumber, endColumn: info.replace.startColumn + text.length },
                            data: symbolItem.location
                        })]
                }
            };
        };
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1); // remove leading #
        }
        const symbolsToAdd = [];
        for (const outlineModel of this.outlineService.getCachedModels()) {
            if (pattern) {
                symbolsToAdd.push(...outlineModel.asListOfDocumentSymbols().map(symbol => ({ symbol, uri: outlineModel.uri })));
            }
            else {
                symbolsToAdd.push(...outlineModel.getTopLevelSymbols().map(symbol => ({ symbol, uri: outlineModel.uri })));
            }
        }
        const symbolsToAddFiltered = symbolsToAdd.filter(fileSymbol => {
            switch (fileSymbol.symbol.kind) {
                case 9 /* SymbolKind.Enum */:
                case 4 /* SymbolKind.Class */:
                case 5 /* SymbolKind.Method */:
                case 11 /* SymbolKind.Function */:
                case 2 /* SymbolKind.Namespace */:
                case 1 /* SymbolKind.Module */:
                case 10 /* SymbolKind.Interface */:
                    return true;
                default:
                    return false;
            }
        });
        for (const symbol of symbolsToAddFiltered) {
            result.suggestions.push(makeSymbolCompletionItem({ ...symbol.symbol, location: { uri: symbol.uri, range: symbol.symbol.range } }, pattern ?? ''));
        }
        result.incomplete = !!pattern;
    }
    updateCacheKey() {
        if (this.cacheKey && Date.now() - this.cacheKey.time > 60000) {
            this.searchService.clearCache(this.cacheKey.key);
            this.cacheKey = undefined;
        }
        if (!this.cacheKey) {
            this.cacheKey = {
                key: generateUuid(),
                time: Date.now()
            };
        }
        this.cacheKey.time = Date.now();
        return this.cacheKey;
    }
    cmdAddReference(arg) {
        // invoked via the completion command
        arg.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference(arg.variable);
    }
};
BuiltinDynamicCompletions = BuiltinDynamicCompletions_1 = __decorate([
    __param(0, IHistoryService),
    __param(1, IWorkspaceContextService),
    __param(2, ISearchService),
    __param(3, ILabelService),
    __param(4, ILanguageFeaturesService),
    __param(5, IChatWidgetService),
    __param(6, IChatEditingService),
    __param(7, IInstantiationService),
    __param(8, IOutlineModelService),
    __param(9, IEditorService),
    __param(10, IConfigurationService),
    __param(11, IFileService),
    __param(12, IMarkerService)
], BuiltinDynamicCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BuiltinDynamicCompletions, 4 /* LifecyclePhase.Eventually */);
export function computeCompletionRanges(model, position, reg, onlyOnWordStart = false) {
    const varWord = getWordAtText(position.column, reg, model.getLineContent(position.lineNumber), 0);
    if (!varWord && model.getWordUntilPosition(position).word) {
        // inside a "normal" word
        return;
    }
    if (!varWord && position.column > 1) {
        const textBefore = model.getValueInRange(new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column));
        if (textBefore !== ' ') {
            return;
        }
    }
    if (varWord && onlyOnWordStart) {
        const wordBefore = model.getWordUntilPosition({ lineNumber: position.lineNumber, column: varWord.startColumn });
        if (wordBefore.word) {
            // inside a word
            return;
        }
    }
    let insert;
    let replace;
    if (!varWord) {
        insert = replace = Range.fromPositions(position);
    }
    else {
        insert = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, position.column);
        replace = new Range(position.lineNumber, varWord.startColumn, position.lineNumber, varWord.endColumn);
    }
    return { insert, replace, varWord };
}
function isEmptyUpToCompletionWord(model, rangeResult) {
    const startToCompletionWordStart = new Range(1, 1, rangeResult.replace.startLineNumber, rangeResult.replace.startColumn);
    return !!model.getValueInRange(startToCompletionWordStart).match(/^\s*$/);
}
let ToolCompletions = class ToolCompletions extends Disposable {
    static { ToolCompletions_1 = this; }
    static { this.VariableNameDef = new RegExp(`(?<=^|\\s)${chatVariableLeader}\\w*`, 'g'); } // MUST be using `g`-flag
    constructor(languageFeaturesService, chatWidgetService, toolsService) {
        super();
        this.languageFeaturesService = languageFeaturesService;
        this.chatWidgetService = chatWidgetService;
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: ChatInputPart.INPUT_SCHEME, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatVariables',
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, _context, _token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget) {
                    return null;
                }
                const range = computeCompletionRanges(model, position, ToolCompletions_1.VariableNameDef, true);
                if (!range) {
                    return null;
                }
                const usedTools = widget.parsedInput.parts.filter((p) => p instanceof ChatRequestToolPart);
                const usedToolNames = new Set(usedTools.map(v => v.toolName));
                const toolItems = [];
                toolItems.push(...Array.from(toolsService.getTools())
                    .filter(t => t.canBeReferencedInPrompt)
                    .filter(t => !usedToolNames.has(t.toolReferenceName ?? ''))
                    .map((t) => {
                    const withLeader = `${chatVariableLeader}${t.toolReferenceName}`;
                    return {
                        label: withLeader,
                        range,
                        insertText: withLeader + ' ',
                        documentation: t.userDescription,
                        kind: 18 /* CompletionItemKind.Text */,
                        sortText: 'z'
                    };
                }));
                return {
                    suggestions: toolItems
                };
            }
        }));
    }
};
ToolCompletions = ToolCompletions_1 = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IChatWidgetService),
    __param(2, ILanguageModelToolsService)
], ToolCompletions);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ToolCompletions, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0Q29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvY2hhdElucHV0Q29tcGxldGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFOUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBbUIsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakcsT0FBTyxFQUF1SixXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUU3TixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNyRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFB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