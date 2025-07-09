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
import { OffsetRange } from '../../../../editor/common/core/offsetRange.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestDynamicVariablePart, ChatRequestSlashCommandPart, ChatRequestTextPart, ChatRequestToolPart, chatAgentLeader, chatSubcommandLeader, chatVariableLeader } from './chatParserTypes.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatVariablesService } from './chatVariables.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const agentReg = /^@([\w_\-\.]+)(?=(\s|$|\b))/i; // An @-agent
const variableReg = /^#([\w_\-]+)(:\d+)?(?=(\s|$|\b))/i; // A #-variable with an optional numeric : arg (@response:2)
const slashReg = /\/([\w_\-]+)(?=(\s|$|\b))/i; // A / command
let ChatRequestParser = class ChatRequestParser {
    constructor(agentService, variableService, slashCommandService, toolsService) {
        this.agentService = agentService;
        this.variableService = variableService;
        this.slashCommandService = slashCommandService;
        this.toolsService = toolsService;
    }
    parseChatRequest(sessionId, message, location = ChatAgentLocation.Panel, context) {
        const parts = [];
        const references = this.variableService.getDynamicVariables(sessionId); // must access this list before any async calls
        let lineNumber = 1;
        let column = 1;
        for (let i = 0; i < message.length; i++) {
            const previousChar = message.charAt(i - 1);
            const char = message.charAt(i);
            let newPart;
            if (previousChar.match(/\s/) || i === 0) {
                if (char === chatVariableLeader) {
                    newPart = this.tryToParseVariable(message.slice(i), i, new Position(lineNumber, column), parts);
                }
                else if (char === chatAgentLeader) {
                    newPart = this.tryToParseAgent(message.slice(i), message, i, new Position(lineNumber, column), parts, location, context);
                }
                else if (char === chatSubcommandLeader) {
                    newPart = this.tryToParseSlashCommand(message.slice(i), message, i, new Position(lineNumber, column), parts, location, context);
                }
                if (!newPart) {
                    newPart = this.tryToParseDynamicVariable(message.slice(i), i, new Position(lineNumber, column), references);
                }
            }
            if (newPart) {
                if (i !== 0) {
                    // Insert a part for all the text we passed over, then insert the new parsed part
                    const previousPart = parts.at(-1);
                    const previousPartEnd = previousPart?.range.endExclusive ?? 0;
                    const previousPartEditorRangeEndLine = previousPart?.editorRange.endLineNumber ?? 1;
                    const previousPartEditorRangeEndCol = previousPart?.editorRange.endColumn ?? 1;
                    parts.push(new ChatRequestTextPart(new OffsetRange(previousPartEnd, i), new Range(previousPartEditorRangeEndLine, previousPartEditorRangeEndCol, lineNumber, column), message.slice(previousPartEnd, i)));
                }
                parts.push(newPart);
            }
            if (char === '\n') {
                lineNumber++;
                column = 1;
            }
            else {
                column++;
            }
        }
        const lastPart = parts.at(-1);
        const lastPartEnd = lastPart?.range.endExclusive ?? 0;
        if (lastPartEnd < message.length) {
            parts.push(new ChatRequestTextPart(new OffsetRange(lastPartEnd, message.length), new Range(lastPart?.editorRange.endLineNumber ?? 1, lastPart?.editorRange.endColumn ?? 1, lineNumber, column), message.slice(lastPartEnd, message.length)));
        }
        return {
            parts,
            text: message,
        };
    }
    tryToParseAgent(message, fullMessage, offset, position, parts, location, context) {
        const nextAgentMatch = message.match(agentReg);
        if (!nextAgentMatch || context?.mode !== undefined && context.mode !== ChatMode.Ask) {
            return;
        }
        const [full, name] = nextAgentMatch;
        const agentRange = new OffsetRange(offset, offset + full.length);
        const agentEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        let agents = this.agentService.getAgentsByName(name);
        if (!agents.length) {
            const fqAgent = this.agentService.getAgentByFullyQualifiedId(name);
            if (fqAgent) {
                agents = [fqAgent];
            }
        }
        // If there is more than one agent with this name, and the user picked it from the suggest widget, then the selected agent should be in the
        // context and we use that one.
        const agent = agents.length > 1 && context?.selectedAgent ?
            context.selectedAgent :
            agents.find((a) => a.locations.includes(location));
        if (!agent) {
            return;
        }
        if (parts.some(p => p instanceof ChatRequestAgentPart)) {
            // Only one agent allowed
            return;
        }
        // The agent must come first
        if (parts.some(p => (p instanceof ChatRequestTextPart && p.text.trim() !== '') || !(p instanceof ChatRequestAgentPart))) {
            return;
        }
        const previousPart = parts.at(-1);
        const previousPartEnd = previousPart?.range.endExclusive ?? 0;
        const textSincePreviousPart = fullMessage.slice(previousPartEnd, offset);
        if (textSincePreviousPart.trim() !== '') {
            return;
        }
        return new ChatRequestAgentPart(agentRange, agentEditorRange, agent);
    }
    tryToParseVariable(message, offset, position, parts) {
        const nextVariableMatch = message.match(variableReg);
        if (!nextVariableMatch) {
            return;
        }
        const [full, name] = nextVariableMatch;
        const varRange = new OffsetRange(offset, offset + full.length);
        const varEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        const tool = this.toolsService.getToolByName(name);
        if (tool && tool.canBeReferencedInPrompt) {
            return new ChatRequestToolPart(varRange, varEditorRange, name, tool.id, tool.displayName, tool.icon);
        }
        return;
    }
    tryToParseSlashCommand(remainingMessage, fullMessage, offset, position, parts, location, context) {
        const nextSlashMatch = remainingMessage.match(slashReg);
        if (!nextSlashMatch) {
            return;
        }
        if (parts.some(p => p instanceof ChatRequestSlashCommandPart)) {
            // Only one slash command allowed
            return;
        }
        const [full, command] = nextSlashMatch;
        const slashRange = new OffsetRange(offset, offset + full.length);
        const slashEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        const usedAgent = parts.find((p) => p instanceof ChatRequestAgentPart);
        if (usedAgent) {
            // The slash command must come immediately after the agent
            if (parts.some(p => (p instanceof ChatRequestTextPart && p.text.trim() !== '') || !(p instanceof ChatRequestAgentPart) && !(p instanceof ChatRequestTextPart))) {
                return;
            }
            const previousPart = parts.at(-1);
            const previousPartEnd = previousPart?.range.endExclusive ?? 0;
            const textSincePreviousPart = fullMessage.slice(previousPartEnd, offset);
            if (textSincePreviousPart.trim() !== '') {
                return;
            }
            const subCommand = usedAgent.agent.slashCommands.find(c => c.name === command);
            if (subCommand) {
                // Valid agent subcommand
                return new ChatRequestAgentSubcommandPart(slashRange, slashEditorRange, subCommand);
            }
        }
        else {
            const slashCommands = this.slashCommandService.getCommands(location, context?.mode ?? ChatMode.Ask);
            const slashCommand = slashCommands.find(c => c.command === command);
            if (slashCommand) {
                // Valid standalone slash command
                return new ChatRequestSlashCommandPart(slashRange, slashEditorRange, slashCommand);
            }
            else {
                // check for with default agent for this location
                const defaultAgent = this.agentService.getDefaultAgent(location, context?.mode);
                const subCommand = defaultAgent?.slashCommands.find(c => c.name === command);
                if (subCommand) {
                    // Valid default agent subcommand
                    return new ChatRequestAgentSubcommandPart(slashRange, slashEditorRange, subCommand);
                }
            }
        }
        return;
    }
    tryToParseDynamicVariable(message, offset, position, references) {
        const refAtThisPosition = references.find(r => r.range.startLineNumber === position.lineNumber &&
            r.range.startColumn === position.column);
        if (refAtThisPosition) {
            const length = refAtThisPosition.range.endColumn - refAtThisPosition.range.startColumn;
            const text = message.substring(0, length);
            const range = new OffsetRange(offset, offset + length);
            return new ChatRequestDynamicVariablePart(range, refAtThisPosition.range, text, refAtThisPosition.id, refAtThisPosition.modelDescription, refAtThisPosition.data, refAtThisPosition.fullName, refAtThisPosition.icon, refAtThisPosition.isFile, refAtThisPosition.isDirectory);
        }
        return;
    }
};
ChatRequestParser = __decorate([
    __param(0, IChatAgentService),
    __param(1, IChatVariablesService),
    __param(2, IChatSlashCommandService),
    __param(3, ILanguageModelToolsService)
], ChatRequestParser);
export { ChatRequestParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlcXVlc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFJlcXVlc3RQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzVFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEUsT0FBTyxFQUFrQixpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSw4QkFBOEIsRUFBRSw4QkFBOEIsRUFBRSwyQkFBMkIsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBOEMsZUFBZSxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDMVMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLG9CQUFvQixDQUFDO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU1RSxNQUFNLFFBQVEsR0FBRyw4QkFBOEIsQ0FBQyxDQUFDLGFBQWE7QUFDOUQsTUFBTSxXQUFXLEdBQUcsbUNBQW1DLENBQUMsQ0FBQyw0REFBNEQ7QUFDckgsTUFBTSxRQUFRLEdBQUcsNEJBQTRCLENBQUMsQ0FBQyxjQUFjO0FBUXRELElBQU0saUJBQWlCLEdBQXZCLE1B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