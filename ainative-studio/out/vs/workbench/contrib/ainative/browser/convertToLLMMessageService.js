var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getIsReasoningEnabledState, getReservedOutputTokenSpace, getModelCapabilities } from '../common/modelCapabilities.js';
import { reParsedToolXMLString, chat_systemMessage } from '../common/prompt/prompts.js';
import { IAINativeSettingsService } from '../common/ainativeSettingsService.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { ITerminalToolService } from './terminalToolService.js';
import { IAINativeModelService } from '../common/ainativeModelService.js';
import { URI } from '../../../../base/common/uri.js';
import { IMCPService } from '../common/mcpService.js';
export const EMPTY_MESSAGE = '(empty message)';
const CHARS_PER_TOKEN = 4; // assume abysmal chars per token
const TRIM_TO_LEN = 120;
// convert messages as if about to send to openai
/*
reference - https://platform.openai.com/docs/guides/function-calling#function-calling-steps
openai MESSAGE (role=assistant):
"tool_calls":[{
    "type": "function",
    "id": "call_12345xyz",
    "function": {
    "name": "get_weather",
    "arguments": "{\"latitude\":48.8566,\"longitude\":2.3522}"
}]

openai RESPONSE (role=user):
{   "role": "tool",
    "tool_call_id": tool_call.id,
    "content": str(result)    }

also see
openai on prompting - https://platform.openai.com/docs/guides/reasoning#advice-on-prompting
openai on developer system message - https://cdn.openai.com/spec/model-spec-2024-05-08.html#follow-the-chain-of-command
*/
const prepareMessages_openai_tools = (messages) => {
    const newMessages = [];
    for (let i = 0; i < messages.length; i += 1) {
        const currMsg = messages[i];
        if (currMsg.role !== 'tool') {
            newMessages.push(currMsg);
            continue;
        }
        // edit previous assistant message to have called the tool
        const prevMsg = 0 <= i - 1 && i - 1 <= newMessages.length ? newMessages[i - 1] : undefined;
        if (prevMsg?.role === 'assistant') {
            prevMsg.tool_calls = [{
                    type: 'function',
                    id: currMsg.id,
                    function: {
                        name: currMsg.name,
                        arguments: JSON.stringify(currMsg.rawParams)
                    }
                }];
        }
        // add the tool
        newMessages.push({
            role: 'tool',
            tool_call_id: currMsg.id,
            content: currMsg.content,
        });
    }
    return newMessages;
};
const prepareMessages_anthropic_tools = (messages, supportsAnthropicReasoning) => {
    const newMessages = messages;
    for (let i = 0; i < messages.length; i += 1) {
        const currMsg = messages[i];
        // add anthropic reasoning
        if (currMsg.role === 'assistant') {
            if (currMsg.anthropicReasoning && supportsAnthropicReasoning) {
                const content = currMsg.content;
                newMessages[i] = {
                    role: 'assistant',
                    content: content ? [...currMsg.anthropicReasoning, { type: 'text', text: content }] : currMsg.anthropicReasoning
                };
            }
            else {
                newMessages[i] = {
                    role: 'assistant',
                    content: currMsg.content,
                    // strip away anthropicReasoning
                };
            }
            continue;
        }
        if (currMsg.role === 'user') {
            newMessages[i] = {
                role: 'user',
                content: currMsg.content,
            };
            continue;
        }
        if (currMsg.role === 'tool') {
            // add anthropic tools
            const prevMsg = 0 <= i - 1 && i - 1 <= newMessages.length ? newMessages[i - 1] : undefined;
            // make it so the assistant called the tool
            if (prevMsg?.role === 'assistant') {
                if (typeof prevMsg.content === 'string')
                    prevMsg.content = [{ type: 'text', text: prevMsg.content }];
                prevMsg.content.push({ type: 'tool_use', id: currMsg.id, name: currMsg.name, input: currMsg.rawParams });
            }
            // turn each tool into a user message with tool results at the end
            newMessages[i] = {
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: currMsg.id, content: currMsg.content }]
            };
            continue;
        }
    }
    // we just removed the tools
    return newMessages;
};
const prepareMessages_XML_tools = (messages, supportsAnthropicReasoning) => {
    const llmChatMessages = [];
    for (let i = 0; i < messages.length; i += 1) {
        const c = messages[i];
        const next = 0 <= i + 1 && i + 1 <= messages.length - 1 ? messages[i + 1] : null;
        if (c.role === 'assistant') {
            // if called a tool (message after it), re-add its XML to the message
            // alternatively, could just hold onto the original output, but this way requires less piping raw strings everywhere
            let content = c.content;
            if (next?.role === 'tool') {
                content = `${content}\n\n${reParsedToolXMLString(next.name, next.rawParams)}`;
            }
            // anthropic reasoning
            if (c.anthropicReasoning && supportsAnthropicReasoning) {
                content = content ? [...c.anthropicReasoning, { type: 'text', text: content }] : c.anthropicReasoning;
            }
            llmChatMessages.push({
                role: 'assistant',
                content
            });
        }
        // add user or tool to the previous user message
        else if (c.role === 'user' || c.role === 'tool') {
            if (c.role === 'tool')
                c.content = `<${c.name}_result>\n${c.content}\n</${c.name}_result>`;
            if (llmChatMessages.length === 0 || llmChatMessages[llmChatMessages.length - 1].role !== 'user')
                llmChatMessages.push({
                    role: 'user',
                    content: c.content
                });
            else
                llmChatMessages[llmChatMessages.length - 1].content += '\n\n' + c.content;
        }
    }
    return llmChatMessages;
};
// --- CHAT ---
const prepareOpenAIOrAnthropicMessages = ({ messages: messages_, systemMessage, aiInstructions, supportsSystemMessage, specialToolFormat, supportsAnthropicReasoning, contextWindow, reservedOutputTokenSpace, }) => {
    reservedOutputTokenSpace = Math.max(contextWindow * 1 / 2, // reserve at least 1/4 of the token window length
    reservedOutputTokenSpace ?? 4_096 // defaults to 4096
    );
    let messages = deepClone(messages_);
    // ================ system message ================
    // A COMPLETE HACK: last message is system message for context purposes
    const sysMsgParts = [];
    if (aiInstructions)
        sysMsgParts.push(`GLOBAL RULES (from the user's .ainativerules file):\n${aiInstructions}`);
    if (systemMessage)
        sysMsgParts.push(systemMessage);
    const combinedSystemMessage = sysMsgParts.join('\n\n');
    messages.unshift({ role: 'system', content: combinedSystemMessage });
    // ================ trim ================
    messages = messages.map(m => ({ ...m, content: m.role !== 'tool' ? m.content.trim() : m.content }));
    // ================ fit into context ================
    // the higher the weight, the higher the desire to truncate - TRIM HIGHEST WEIGHT MESSAGES
    const alreadyTrimmedIdxes = new Set();
    const weight = (message, messages, idx) => {
        const base = message.content.length;
        let multiplier;
        multiplier = 1 + (messages.length - 1 - idx) / messages.length; // slow rampdown from 2 to 1 as index increases
        if (message.role === 'user') {
            multiplier *= 1;
        }
        else if (message.role === 'system') {
            multiplier *= .01; // very low weight
        }
        else {
            multiplier *= 10; // llm tokens are far less valuable than user tokens
        }
        // any already modified message should not be trimmed again
        if (alreadyTrimmedIdxes.has(idx)) {
            multiplier = 0;
        }
        // 1st and last messages should be very low weight
        if (idx <= 1 || idx >= messages.length - 1 - 3) {
            multiplier *= .05;
        }
        return base * multiplier;
    };
    const _findLargestByWeight = (messages_) => {
        let largestIndex = -1;
        let largestWeight = -Infinity;
        for (let i = 0; i < messages.length; i += 1) {
            const m = messages[i];
            const w = weight(m, messages_, i);
            if (w > largestWeight) {
                largestWeight = w;
                largestIndex = i;
            }
        }
        return largestIndex;
    };
    let totalLen = 0;
    for (const m of messages) {
        totalLen += m.content.length;
    }
    const charsNeedToTrim = totalLen - Math.max((contextWindow - reservedOutputTokenSpace) * CHARS_PER_TOKEN, // can be 0, in which case charsNeedToTrim=everything, bad
    5_000 // ensure we don't trim at least 5k chars (just a random small value)
    );
    // <----------------------------------------->
    // 0                      |    |             |
    //                        |    contextWindow |
    //                     contextWindow - maxOut|putTokens
    //                                          totalLen
    let remainingCharsToTrim = charsNeedToTrim;
    let i = 0;
    while (remainingCharsToTrim > 0) {
        i += 1;
        if (i > 100)
            break;
        const trimIdx = _findLargestByWeight(messages);
        const m = messages[trimIdx];
        // if can finish here, do
        const numCharsWillTrim = m.content.length - TRIM_TO_LEN;
        if (numCharsWillTrim > remainingCharsToTrim) {
            // trim remainingCharsToTrim + '...'.length chars
            m.content = m.content.slice(0, m.content.length - remainingCharsToTrim - '...'.length).trim() + '...';
            break;
        }
        remainingCharsToTrim -= numCharsWillTrim;
        m.content = m.content.substring(0, TRIM_TO_LEN - '...'.length) + '...';
        alreadyTrimmedIdxes.add(trimIdx);
    }
    // ================ system message hack ================
    const newSysMsg = messages.shift().content;
    // ================ tools and anthropicReasoning ================
    // SYSTEM MESSAGE HACK: we shifted (removed) the system message role, so now SimpleLLMMessage[] is valid
    let llmChatMessages = [];
    if (!specialToolFormat) { // XML tool behavior
        llmChatMessages = prepareMessages_XML_tools(messages, supportsAnthropicReasoning);
    }
    else if (specialToolFormat === 'anthropic-style') {
        llmChatMessages = prepareMessages_anthropic_tools(messages, supportsAnthropicReasoning);
    }
    else if (specialToolFormat === 'openai-style') {
        llmChatMessages = prepareMessages_openai_tools(messages);
    }
    const llmMessages = llmChatMessages;
    // ================ system message add as first llmMessage ================
    let separateSystemMessageStr = undefined;
    // if supports system message
    if (supportsSystemMessage) {
        if (supportsSystemMessage === 'separated')
            separateSystemMessageStr = newSysMsg;
        else if (supportsSystemMessage === 'system-role')
            llmMessages.unshift({ role: 'system', content: newSysMsg }); // add new first message
        else if (supportsSystemMessage === 'developer-role')
            llmMessages.unshift({ role: 'developer', content: newSysMsg }); // add new first message
    }
    // if does not support system message
    else {
        const newFirstMessage = {
            role: 'user',
            content: `<SYSTEM_MESSAGE>\n${newSysMsg}\n</SYSTEM_MESSAGE>\n${llmMessages[0].content}`
        };
        llmMessages.splice(0, 1); // delete first message
        llmMessages.unshift(newFirstMessage); // add new first message
    }
    // ================ no empty message ================
    for (let i = 0; i < llmMessages.length; i += 1) {
        const currMsg = llmMessages[i];
        const nextMsg = llmMessages[i + 1];
        if (currMsg.role === 'tool')
            continue;
        // if content is a string, replace string with empty msg
        if (typeof currMsg.content === 'string') {
            currMsg.content = currMsg.content || EMPTY_MESSAGE;
        }
        else {
            // allowed to be empty if has a tool in it or following it
            if (currMsg.content.find(c => c.type === 'tool_result' || c.type === 'tool_use')) {
                currMsg.content = currMsg.content.filter(c => !(c.type === 'text' && !c.text));
                continue;
            }
            if (nextMsg?.role === 'tool')
                continue;
            // replace any empty text entries with empty msg, and make sure there's at least 1 entry
            for (const c of currMsg.content) {
                if (c.type === 'text')
                    c.text = c.text || EMPTY_MESSAGE;
            }
            if (currMsg.content.length === 0)
                currMsg.content = [{ type: 'text', text: EMPTY_MESSAGE }];
        }
    }
    return {
        messages: llmMessages,
        separateSystemMessage: separateSystemMessageStr,
    };
};
const prepareGeminiMessages = (messages) => {
    let latestToolName = undefined;
    const messages2 = messages.map((m) => {
        if (m.role === 'assistant') {
            if (typeof m.content === 'string') {
                return { role: 'model', parts: [{ text: m.content }] };
            }
            else {
                const parts = m.content.map((c) => {
                    if (c.type === 'text') {
                        return { text: c.text };
                    }
                    else if (c.type === 'tool_use') {
                        latestToolName = c.name;
                        return { functionCall: { id: c.id, name: c.name, args: c.input } };
                    }
                    else
                        return null;
                }).filter(m => !!m);
                return { role: 'model', parts, };
            }
        }
        else if (m.role === 'user') {
            if (typeof m.content === 'string') {
                return { role: 'user', parts: [{ text: m.content }] };
            }
            else {
                const parts = m.content.map((c) => {
                    if (c.type === 'text') {
                        return { text: c.text };
                    }
                    else if (c.type === 'tool_result') {
                        if (!latestToolName)
                            return null;
                        return { functionResponse: { id: c.tool_use_id, name: latestToolName, response: { output: c.content } } };
                    }
                    else
                        return null;
                }).filter(m => !!m);
                return { role: 'user', parts, };
            }
        }
        else
            return null;
    }).filter(m => !!m);
    return messages2;
};
const prepareMessages = (params) => {
    const specialFormat = params.specialToolFormat; // this is just for ts stupidness
    // if need to convert to gemini style of messaes, do that (treat as anthropic style, then convert to gemini style)
    if (params.providerName === 'gemini' || specialFormat === 'gemini-style') {
        const res = prepareOpenAIOrAnthropicMessages({ ...params, specialToolFormat: specialFormat === 'gemini-style' ? 'anthropic-style' : undefined });
        const messages = res.messages;
        const messages2 = prepareGeminiMessages(messages);
        return { messages: messages2, separateSystemMessage: res.separateSystemMessage };
    }
    return prepareOpenAIOrAnthropicMessages({ ...params, specialToolFormat: specialFormat });
};
export const IConvertToLLMMessageService = createDecorator('ConvertToLLMMessageService');
let ConvertToLLMMessageService = class ConvertToLLMMessageService extends Disposable {
    constructor(modelService, workspaceContextService, editorService, directoryStrService, terminalToolService, ainativeSettingsService, ainativeModelService, mcpService, fileService) {
        super();
        this.modelService = modelService;
        this.workspaceContextService = workspaceContextService;
        this.editorService = editorService;
        this.directoryStrService = directoryStrService;
        this.terminalToolService = terminalToolService;
        this.ainativeSettingsService = ainativeSettingsService;
        this.ainativeModelService = ainativeModelService;
        this.mcpService = mcpService;
        this.fileService = fileService;
        // system message
        this._generateChatMessagesSystemMessage = async (chatMode, specialToolFormat) => {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders.map(f => f.uri.fsPath);
            const openedURIs = this.modelService.getModels().filter(m => m.isAttachedToEditor()).map(m => m.uri.fsPath) || [];
            const activeURI = this.editorService.activeEditor?.resource?.fsPath;
            const directoryStr = await this.directoryStrService.getAllDirectoriesStr({
                cutOffMessage: chatMode === 'agent' || chatMode === 'gather' ?
                    `...Directories string cut off, use tools to read more...`
                    : `...Directories string cut off, ask user for more if necessary...`
            });
            const includeXMLToolDefinitions = !specialToolFormat;
            const mcpTools = this.mcpService.getMCPTools();
            const persistentTerminalIDs = this.terminalToolService.listPersistentTerminalIds();
            const systemMessage = chat_systemMessage({ workspaceFolders, openedURIs, directoryStr, activeURI, persistentTerminalIDs, chatMode, mcpTools, includeXMLToolDefinitions });
            return systemMessage;
        };
        this.prepareLLMSimpleMessages = ({ simpleMessages, systemMessage, modelSelection, featureName }) => {
            if (modelSelection === null)
                return { messages: [], separateSystemMessage: undefined };
            const { overridesOfModel } = this.ainativeSettingsService.state;
            const { providerName, modelName } = modelSelection;
            const { specialToolFormat, contextWindow, supportsSystemMessage, } = getModelCapabilities(providerName, modelName, overridesOfModel);
            const modelSelectionOptions = this.ainativeSettingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName];
            // Get combined global rules (settings + .ainativerules). Note: prepareLLMSimpleMessages backs
            // one-shot auxiliary flows (commit messages, quick-edit, apply) and intentionally does not include
            // .ainative/steering/ docs — standing project steering is scoped to the main chat loop for now
            // (see prepareLLMChatMessages) to avoid an async directory read on every one-shot call site.
            const aiInstructions = this._getGlobalRulesAndSettingsInstructions();
            const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel);
            const reservedOutputTokenSpace = getReservedOutputTokenSpace(providerName, modelName, { isReasoningEnabled, overridesOfModel });
            const { messages, separateSystemMessage } = prepareMessages({
                messages: simpleMessages,
                systemMessage,
                aiInstructions,
                supportsSystemMessage,
                specialToolFormat,
                supportsAnthropicReasoning: providerName === 'anthropic',
                contextWindow,
                reservedOutputTokenSpace,
                providerName,
            });
            return { messages, separateSystemMessage };
        };
        this.prepareLLMChatMessages = async ({ chatMessages, chatMode, modelSelection }) => {
            if (modelSelection === null)
                return { messages: [], separateSystemMessage: undefined };
            const { overridesOfModel } = this.ainativeSettingsService.state;
            const { providerName, modelName } = modelSelection;
            const { specialToolFormat, contextWindow, supportsSystemMessage, } = getModelCapabilities(providerName, modelName, overridesOfModel);
            const { disableSystemMessage } = this.ainativeSettingsService.state.globalSettings;
            const fullSystemMessage = await this._generateChatMessagesSystemMessage(chatMode, specialToolFormat);
            const systemMessage = disableSystemMessage ? '' : fullSystemMessage;
            const modelSelectionOptions = this.ainativeSettingsService.state.optionsOfModelSelection['Chat'][modelSelection.providerName]?.[modelSelection.modelName];
            // Get combined global rules
            const aiInstructions = await this._getCombinedGlobalRules();
            const isReasoningEnabled = getIsReasoningEnabledState('Chat', providerName, modelName, modelSelectionOptions, overridesOfModel);
            const reservedOutputTokenSpace = getReservedOutputTokenSpace(providerName, modelName, { isReasoningEnabled, overridesOfModel });
            const llmMessages = this._chatMessagesToSimpleMessages(chatMessages);
            const { messages, separateSystemMessage } = prepareMessages({
                messages: llmMessages,
                systemMessage,
                aiInstructions,
                supportsSystemMessage,
                specialToolFormat,
                supportsAnthropicReasoning: providerName === 'anthropic',
                contextWindow,
                reservedOutputTokenSpace,
                providerName,
            });
            return { messages, separateSystemMessage };
        };
        // --- FIM ---
        this.prepareFIMMessage = ({ messages }) => {
            // Get combined global rules with the provided aiInstructions as the base.
            // Note: FIM (tab-autocomplete) is latency-sensitive and intentionally does NOT
            // read .ainative/steering/ (an async directory read) — steering context is scoped
            // to the main chat loop (prepareLLMChatMessages) for now.
            const combinedInstructions = this._getGlobalRulesAndSettingsInstructions();
            let prefix = `\
${!combinedInstructions ? '' : `\
// Instructions:
// Do not output an explanation. Try to avoid outputting comments. Only output the middle code.
${combinedInstructions.split('\n').map(line => `//${line}`).join('\n')}`}

${messages.prefix}`;
            const suffix = messages.suffix;
            const stopTokens = messages.stopTokens;
            return { prefix, suffix, stopTokens };
        };
    }
    // Read .ainativerules files from workspace folders
    _getGlobalRulesFileContents() {
        try {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            let globalRules = '';
            for (const folder of workspaceFolders) {
                const uri = URI.joinPath(folder.uri, '.ainativerules');
                const { model } = this.ainativeModelService.getModel(uri);
                if (!model)
                    continue;
                globalRules += model.getValue(1 /* EndOfLinePreference.LF */) + '\n\n';
            }
            return globalRules.trim();
        }
        catch (e) {
            return '';
        }
    }
    // Settings-based instructions + .ainativerules file contents (sync, no steering docs).
    // Shared by call sites that don't go through the main chat loop (FIM, one-shot simple messages).
    _getGlobalRulesAndSettingsInstructions() {
        const globalAIInstructions = this.ainativeSettingsService.state.globalSettings.aiInstructions;
        const globalRulesFileContent = this._getGlobalRulesFileContents();
        return [globalAIInstructions, globalRulesFileContent].filter(Boolean).join('\n\n');
    }
    // Read standing project-context ("steering") docs from .ainative/steering/*.md in each workspace folder.
    // These are always-on context (coding conventions, architecture notes, "never touch X") that the
    // agent should consult every turn, analogous to how this tool itself reads CLAUDE.md/AGENTS.md.
    async _getSteeringFileContents() {
        try {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            const sections = [];
            for (const folder of workspaceFolders) {
                const steeringDirUri = URI.joinPath(folder.uri, '.ainative', 'steering');
                let children;
                try {
                    const stat = await this.fileService.resolve(steeringDirUri);
                    children = stat.children;
                }
                catch (e) {
                    continue; // no .ainative/steering directory in this workspace folder
                }
                if (!children)
                    continue;
                const mdFiles = children
                    .filter(c => !c.isDirectory && c.name.toLowerCase().endsWith('.md'))
                    .sort((a, b) => a.name.localeCompare(b.name));
                for (const file of mdFiles) {
                    try {
                        const { model } = await this.ainativeModelService.getModelSafe(file.resource);
                        if (!model)
                            continue;
                        const content = model.getValue(1 /* EndOfLinePreference.LF */).trim();
                        if (!content)
                            continue;
                        sections.push(`### ${file.name}\n${content}`);
                    }
                    catch (e) {
                        continue; // skip unreadable steering file, don't fail the whole load
                    }
                }
            }
            return sections.join('\n\n').trim();
        }
        catch (e) {
            return '';
        }
    }
    // Get combined global rules from settings, .ainativerules files, and .ainative/steering/*.md docs.
    // Used by the main chat loop (prepareLLMChatMessages), where an extra async directory read per
    // message is an acceptable, one-time-per-turn cost.
    async _getCombinedGlobalRules() {
        const baseInstructions = this._getGlobalRulesAndSettingsInstructions();
        const steeringFileContent = await this._getSteeringFileContents();
        const ans = [];
        if (baseInstructions)
            ans.push(baseInstructions);
        if (steeringFileContent)
            ans.push(steeringFileContent);
        return ans.join('\n\n');
    }
    // --- LLM Chat messages ---
    _chatMessagesToSimpleMessages(chatMessages) {
        const simpleLLMMessages = [];
        for (const m of chatMessages) {
            if (m.role === 'checkpoint')
                continue;
            if (m.role === 'interrupted_streaming_tool')
                continue;
            if (m.role === 'assistant') {
                simpleLLMMessages.push({
                    role: m.role,
                    content: m.displayContent,
                    anthropicReasoning: m.anthropicReasoning,
                });
            }
            else if (m.role === 'tool') {
                simpleLLMMessages.push({
                    role: m.role,
                    content: m.content,
                    name: m.name,
                    id: m.id,
                    rawParams: m.rawParams,
                });
            }
            else if (m.role === 'user') {
                simpleLLMMessages.push({
                    role: m.role,
                    content: m.content,
                });
            }
        }
        return simpleLLMMessages;
    }
};
ConvertToLLMMessageService = __decorate([
    __param(0, IModelService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorService),
    __param(3, IDirectoryStrService),
    __param(4, ITerminalToolService),
    __param(5, IAINativeSettingsService),
    __param(6, IAINativeModelService),
    __param(7, IMCPService),
    __param(8, IFileService)
], ConvertToLLMMessageService);
registerSingleton(IConvertToLLMMessageService, ConvertToLLMMessageService, 0 /* InstantiationType.Eager */);
/*
Gemini has this, but they're openai-compat so we don't need to implement this
gemini request:
{   "role": "assistant",
    "content": null,
    "function_call": {
        "name": "get_weather",
        "arguments": {
            "latitude": 48.8566,
            "longitude": 2.3522
        }
    }
}

gemini response:
{   "role": "assistant",
    "function_response": {
        "name": "get_weather",
            "response": {
            "temperature": "15°C",
                "condition": "Cloudy"
        }
    }
}
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWxGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSwyQkFBMkIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXhGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFD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