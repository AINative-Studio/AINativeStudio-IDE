/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { revive } from '../../../../base/common/marshalling.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { OffsetRange } from '../../../../editor/common/core/offsetRange.js';
import { reviveSerializedAgent } from './chatAgents.js';
import { IDiagnosticVariableEntryFilterData } from './chatModel.js';
export function getPromptText(request) {
    const message = request.parts.map(r => r.promptText).join('').trimStart();
    const diff = request.text.length - message.length;
    return { message, diff };
}
export class ChatRequestTextPart {
    static { this.Kind = 'text'; }
    constructor(range, editorRange, text) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.kind = ChatRequestTextPart.Kind;
    }
    get promptText() {
        return this.text;
    }
}
// warning, these also show up in a regex in the parser
export const chatVariableLeader = '#';
export const chatAgentLeader = '@';
export const chatSubcommandLeader = '/';
/**
 * An invocation of a static variable that can be resolved by the variable service
 * @deprecated, but kept for backwards compatibility with old persisted chat requests
 */
class ChatRequestVariablePart {
    static { this.Kind = 'var'; }
    constructor(range, editorRange, variableName, variableArg, variableId) {
        this.range = range;
        this.editorRange = editorRange;
        this.variableName = variableName;
        this.variableArg = variableArg;
        this.variableId = variableId;
        this.kind = ChatRequestVariablePart.Kind;
    }
    get text() {
        const argPart = this.variableArg ? `:${this.variableArg}` : '';
        return `${chatVariableLeader}${this.variableName}${argPart}`;
    }
    get promptText() {
        return this.text;
    }
}
/**
 * An invocation of a tool
 */
export class ChatRequestToolPart {
    static { this.Kind = 'tool'; }
    constructor(range, editorRange, toolName, toolId, displayName, icon) {
        this.range = range;
        this.editorRange = editorRange;
        this.toolName = toolName;
        this.toolId = toolId;
        this.displayName = displayName;
        this.icon = icon;
        this.kind = ChatRequestToolPart.Kind;
    }
    get text() {
        return `${chatVariableLeader}${this.toolName}`;
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        return { id: this.toolId, name: this.toolName, range: this.range, value: undefined, isTool: true, icon: ThemeIcon.isThemeIcon(this.icon) ? this.icon : undefined, fullName: this.displayName };
    }
}
/**
 * An invocation of an agent that can be resolved by the agent service
 */
export class ChatRequestAgentPart {
    static { this.Kind = 'agent'; }
    constructor(range, editorRange, agent) {
        this.range = range;
        this.editorRange = editorRange;
        this.agent = agent;
        this.kind = ChatRequestAgentPart.Kind;
    }
    get text() {
        return `${chatAgentLeader}${this.agent.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of an agent's subcommand
 */
export class ChatRequestAgentSubcommandPart {
    static { this.Kind = 'subcommand'; }
    constructor(range, editorRange, command) {
        this.range = range;
        this.editorRange = editorRange;
        this.command = command;
        this.kind = ChatRequestAgentSubcommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.command.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of a standalone slash command
 */
export class ChatRequestSlashCommandPart {
    static { this.Kind = 'slash'; }
    constructor(range, editorRange, slashCommand) {
        this.range = range;
        this.editorRange = editorRange;
        this.slashCommand = slashCommand;
        this.kind = ChatRequestSlashCommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
    get promptText() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
}
/**
 * An invocation of a dynamic reference like '#file:'
 */
export class ChatRequestDynamicVariablePart {
    static { this.Kind = 'dynamic'; }
    constructor(range, editorRange, text, id, modelDescription, data, fullName, icon, isFile, isDirectory) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.id = id;
        this.modelDescription = modelDescription;
        this.data = data;
        this.fullName = fullName;
        this.icon = icon;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.kind = ChatRequestDynamicVariablePart.Kind;
    }
    get referenceText() {
        return this.text.replace(chatVariableLeader, '');
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        if (this.id === 'vscode.problems') {
            return IDiagnosticVariableEntryFilterData.toEntry(this.data.filter);
        }
        return { id: this.id, name: this.referenceText, range: this.range, value: this.data, fullName: this.fullName, icon: this.icon, isFile: this.isFile, isDirectory: this.isDirectory };
    }
}
export function reviveParsedChatRequest(serialized) {
    return {
        text: serialized.text,
        parts: serialized.parts.map(part => {
            if (part.kind === ChatRequestTextPart.Kind) {
                return new ChatRequestTextPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text);
            }
            else if (part.kind === ChatRequestVariablePart.Kind) {
                return new ChatRequestVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.variableName, part.variableArg, part.variableId || '');
            }
            else if (part.kind === ChatRequestToolPart.Kind) {
                return new ChatRequestToolPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.toolName, part.toolId, part.displayName, part.icon);
            }
            else if (part.kind === ChatRequestAgentPart.Kind) {
                let agent = part.agent;
                agent = reviveSerializedAgent(agent);
                return new ChatRequestAgentPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, agent);
            }
            else if (part.kind === ChatRequestAgentSubcommandPart.Kind) {
                return new ChatRequestAgentSubcommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.command);
            }
            else if (part.kind === ChatRequestSlashCommandPart.Kind) {
                return new ChatRequestSlashCommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.slashCommand);
            }
            else if (part.kind === ChatRequestDynamicVariablePart.Kind) {
                return new ChatRequestDynamicVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text, part.id, part.modelDescription, revive(part.data), part.fullName, part.icon, part.isFile, part.isDirectory);
            }
            else {
                throw new Error(`Unknown chat request part: ${part.kind}`);
            }
        })
    };
}
export function extractAgentAndCommand(parsed) {
    const agentPart = parsed.parts.find((r) => r instanceof ChatRequestAgentPart);
    const commandPart = parsed.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
    return { agentPart, commandPart };
}
export function formatChatQuestion(chatAgentService, location, prompt, participant = null, command = null) {
    let question = '';
    if (participant && participant !== chatAgentService.getDefaultAgent(location)?.id) {
        const agent = chatAgentService.getAgent(participant);
        if (!agent) {
            // Refers to agent that doesn't exist
            return undefined;
        }
        question += `${chatAgentLeader}${agent.name} `;
        if (command) {
            question += `${chatSubcommandLeader}${command} `;
        }
    }
    return question + prompt;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnNlclR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFBhcnNlclR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFnQixXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUUxRixPQUFPLEVBQXdELHFCQUFxQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDOUcsT0FBTyxFQUE2QixrQ0FBa0MsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBc0IvRixNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQTJCO0lBQ3hELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMxRSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBRWxELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELE1BQU0sT0FBTyxtQkFBbUI7YUFDZixTQUFJLEdBQUcsTUFBTSxBQUFULENBQVU7SUFFOUIsWUFBcUIsS0FBa0IsRUFBVyxXQUFtQixFQUFXLElBQVk7UUFBdkUsVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsU0FBSSxHQUFKLElBQUks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