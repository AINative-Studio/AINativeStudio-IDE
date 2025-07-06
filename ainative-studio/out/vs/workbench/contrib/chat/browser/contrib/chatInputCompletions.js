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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0Q29tcGxldGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW5wdXRDb21wbGV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFtQixhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRyxPQUFPLEVBQXVKLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTdOLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFN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