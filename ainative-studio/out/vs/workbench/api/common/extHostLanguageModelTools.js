/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { isToolInvocationContext } from '../../contrib/chat/common/languageModelToolsService.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { InternalFetchWebPageToolId } from '../../contrib/chat/common/tools/tools.js';
import { EditToolData, InternalEditToolId, EditToolInputProcessor, ExtensionEditToolId } from '../../contrib/chat/common/tools/editFileTool.js';
export class ExtHostLanguageModelTools {
    constructor(mainContext, _languageModels) {
        this._languageModels = _languageModels;
        /** A map of tools that were registered in this EH */
        this._registeredTools = new Map();
        this._tokenCountFuncs = new Map();
        /** A map of all known tools, from other EHs or registered in vscode core */
        this._allTools = new Map();
        this._toolInputProcessors = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadLanguageModelTools);
        this._proxy.$getTools().then(tools => {
            for (const tool of tools) {
                this._allTools.set(tool.id, revive(tool));
            }
        });
        this._toolInputProcessors.set(EditToolData.id, new EditToolInputProcessor());
    }
    async $countTokensForInvocation(callId, input, token) {
        const fn = this._tokenCountFuncs.get(callId);
        if (!fn) {
            throw new Error(`Tool invocation call ${callId} not found`);
        }
        return await fn(input, token);
    }
    async invokeTool(extension, toolId, options, token) {
        const callId = generateUuid();
        if (options.tokenizationOptions) {
            this._tokenCountFuncs.set(callId, options.tokenizationOptions.countTokens);
        }
        try {
            if (options.toolInvocationToken && !isToolInvocationContext(options.toolInvocationToken)) {
                throw new Error(`Invalid tool invocation token`);
            }
            if ((toolId === InternalEditToolId || toolId === ExtensionEditToolId) && !isProposedApiEnabled(extension, 'chatParticipantPrivate')) {
                throw new Error(`Invalid tool: ${toolId}`);
            }
            // Making the round trip here because not all tools were necessarily registered in this EH
            const processedInput = this._toolInputProcessors.get(toolId)?.processInput(options.input) ?? options.input;
            const result = await this._proxy.$invokeTool({
                toolId,
                callId,
                parameters: processedInput,
                tokenBudget: options.tokenizationOptions?.tokenBudget,
                context: options.toolInvocationToken,
                chatRequestId: isProposedApiEnabled(extension, 'chatParticipantPrivate') ? options.chatRequestId : undefined,
                chatInteractionId: isProposedApiEnabled(extension, 'chatParticipantPrivate') ? options.chatInteractionId : undefined,
            }, token);
            return typeConvert.LanguageModelToolResult.to(revive(result));
        }
        finally {
            this._tokenCountFuncs.delete(callId);
        }
    }
    $onDidChangeTools(tools) {
        this._allTools.clear();
        for (const tool of tools) {
            this._allTools.set(tool.id, tool);
        }
    }
    getTools(extension) {
        return Array.from(this._allTools.values())
            .map(tool => typeConvert.LanguageModelToolDescription.to(tool))
            .filter(tool => {
            switch (tool.name) {
                case InternalEditToolId:
                case ExtensionEditToolId:
                case InternalFetchWebPageToolId:
                    return isProposedApiEnabled(extension, 'chatParticipantPrivate');
                default:
                    return true;
            }
        });
    }
    async $invokeTool(dto, token) {
        const item = this._registeredTools.get(dto.toolId);
        if (!item) {
            throw new Error(`Unknown tool ${dto.toolId}`);
        }
        const options = {
            input: dto.parameters,
            toolInvocationToken: dto.context,
        };
        if (isProposedApiEnabled(item.extension, 'chatParticipantPrivate')) {
            options.chatRequestId = dto.chatRequestId;
            options.chatInteractionId = dto.chatInteractionId;
            options.chatSessionId = dto.context?.sessionId;
            if (dto.toolSpecificData?.kind === 'terminal') {
                options.terminalCommand = dto.toolSpecificData.command;
            }
        }
        if (isProposedApiEnabled(item.extension, 'chatParticipantAdditions') && dto.modelId) {
            options.model = await this.getModel(dto.modelId, item.extension);
        }
        if (dto.tokenBudget !== undefined) {
            options.tokenizationOptions = {
                tokenBudget: dto.tokenBudget,
                countTokens: this._tokenCountFuncs.get(dto.callId) || ((value, token = CancellationToken.None) => this._proxy.$countTokensForInvocation(dto.callId, value, token))
            };
        }
        const extensionResult = await raceCancellation(Promise.resolve(item.tool.invoke(options, token)), token);
        if (!extensionResult) {
            throw new CancellationError();
        }
        return typeConvert.LanguageModelToolResult.from(extensionResult, item.extension);
    }
    async getModel(modelId, extension) {
        let model;
        if (modelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, modelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    async $prepareToolInvocation(toolId, input, token) {
        const item = this._registeredTools.get(toolId);
        if (!item) {
            throw new Error(`Unknown tool ${toolId}`);
        }
        const options = { input };
        if (isProposedApiEnabled(item.extension, 'chatParticipantPrivate') && item.tool.prepareInvocation2) {
            const result = await item.tool.prepareInvocation2(options, token);
            if (!result) {
                return undefined;
            }
            return {
                confirmationMessages: result.confirmationMessages ? {
                    title: result.confirmationMessages.title,
                    message: typeof result.confirmationMessages.message === 'string' ? result.confirmationMessages.message : typeConvert.MarkdownString.from(result.confirmationMessages.message),
                } : undefined,
                toolSpecificData: {
                    kind: 'terminal',
                    language: result.language,
                    command: result.command,
                }
            };
        }
        else if (item.tool.prepareInvocation) {
            const result = await item.tool.prepareInvocation(options, token);
            if (!result) {
                return undefined;
            }
            if (result.pastTenseMessage || result.presentation) {
                checkProposedApiEnabled(item.extension, 'chatParticipantPrivate');
            }
            return {
                confirmationMessages: result.confirmationMessages ? {
                    title: result.confirmationMessages.title,
                    message: typeof result.confirmationMessages.message === 'string' ? result.confirmationMessages.message : typeConvert.MarkdownString.from(result.confirmationMessages.message),
                } : undefined,
                invocationMessage: typeConvert.MarkdownString.fromStrict(result.invocationMessage),
                pastTenseMessage: typeConvert.MarkdownString.fromStrict(result.pastTenseMessage),
                presentation: result.presentation
            };
        }
        return undefined;
    }
    registerTool(extension, id, tool) {
        this._registeredTools.set(id, { extension, tool });
        this._proxy.$registerTool(id);
        return toDisposable(() => {
            this._registeredTools.delete(id);
            this._proxy.$unregisterTool(id);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxUb29scy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TGFuZ3VhZ2VNb2RlbFRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRTVELE9BQU8sRUFBMkIsdUJBQXVCLEVBQXdELE1BQU0sd0RBQXdELENBQUM7QUFDaEwsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0csT0FBTyxFQUE4RCxXQUFXLEVBQXFDLE1BQU0sdUJBQXVCLENBQUM7QUFDbkosT0FBTyxLQUFLLFdBQVcsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsMEJBQTBCLEVBQXVCLE1BQU0sMENBQTBDLENBQUM7QUFDM0csT0FBTyxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBSWhKLE1BQU0sT0FBTyx5QkFBeUI7SUFXckMsWUFDQyxXQUF5QixFQUNSLGVBQXNDO1FBQXRDLG9CQUFlLEdBQWYsZUFBZSxDQUF1QjtRQVp4RCxxREFB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