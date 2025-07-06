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
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getIsReasoningEnabledState, getReservedOutputTokenSpace, getModelCapabilities } from '../common/modelCapabilities.js';
import { reParsedToolXMLString, chat_systemMessage } from '../common/prompt/prompts.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { ITerminalToolService } from './terminalToolService.js';
import { IVoidModelService } from '../common/voidModelService.js';
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
        sysMsgParts.push(`GUIDELINES (from the user's .voidrules file):\n${aiInstructions}`);
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
    constructor(modelService, workspaceContextService, editorService, directoryStrService, terminalToolService, voidSettingsService, voidModelService, mcpService) {
        super();
        this.modelService = modelService;
        this.workspaceContextService = workspaceContextService;
        this.editorService = editorService;
        this.directoryStrService = directoryStrService;
        this.terminalToolService = terminalToolService;
        this.voidSettingsService = voidSettingsService;
        this.voidModelService = voidModelService;
        this.mcpService = mcpService;
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
            const { overridesOfModel } = this.voidSettingsService.state;
            const { providerName, modelName } = modelSelection;
            const { specialToolFormat, contextWindow, supportsSystemMessage, } = getModelCapabilities(providerName, modelName, overridesOfModel);
            const modelSelectionOptions = this.voidSettingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName];
            // Get combined AI instructions
            const aiInstructions = this._getCombinedAIInstructions();
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
            const { overridesOfModel } = this.voidSettingsService.state;
            const { providerName, modelName } = modelSelection;
            const { specialToolFormat, contextWindow, supportsSystemMessage, } = getModelCapabilities(providerName, modelName, overridesOfModel);
            const { disableSystemMessage } = this.voidSettingsService.state.globalSettings;
            const fullSystemMessage = await this._generateChatMessagesSystemMessage(chatMode, specialToolFormat);
            const systemMessage = disableSystemMessage ? '' : fullSystemMessage;
            const modelSelectionOptions = this.voidSettingsService.state.optionsOfModelSelection['Chat'][modelSelection.providerName]?.[modelSelection.modelName];
            // Get combined AI instructions
            const aiInstructions = this._getCombinedAIInstructions();
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
            // Get combined AI instructions with the provided aiInstructions as the base
            const combinedInstructions = this._getCombinedAIInstructions();
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
    // Read .voidrules files from workspace folders
    _getVoidRulesFileContents() {
        try {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            let voidRules = '';
            for (const folder of workspaceFolders) {
                const uri = URI.joinPath(folder.uri, '.voidrules');
                const { model } = this.voidModelService.getModel(uri);
                if (!model)
                    continue;
                voidRules += model.getValue(1 /* EndOfLinePreference.LF */) + '\n\n';
            }
            return voidRules.trim();
        }
        catch (e) {
            return '';
        }
    }
    // Get combined AI instructions from settings and .voidrules files
    _getCombinedAIInstructions() {
        const globalAIInstructions = this.voidSettingsService.state.globalSettings.aiInstructions;
        const voidRulesFileContent = this._getVoidRulesFileContents();
        const ans = [];
        if (globalAIInstructions)
            ans.push(globalAIInstructions);
        if (voidRulesFileContent)
            ans.push(voidRulesFileContent);
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
    __param(5, IVoidSettingsService),
    __param(6, IVoidModelService),
    __param(7, IMCPService)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDJCQUEyQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDL0gsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JE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