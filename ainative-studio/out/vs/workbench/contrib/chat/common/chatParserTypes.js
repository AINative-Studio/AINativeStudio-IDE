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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnNlclR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRQYXJzZXJUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBZ0IsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFMUYsT0FBTyxFQUF3RCxxQkFBcUIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzlHLE9BQU8sRUFBNkIsa0NBQWtDLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQXNCL0YsTUFBTSxVQUFVLGFBQWEsQ0FBQyxPQUEyQjtJQUN4RCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDMUUsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUVsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQzFCLENBQUM7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO2FBQ2YsU0FBSSxHQUFHLE1BQU0sQUFBVCxDQUFVO0lBRTlCLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxJQUFZO1FBQXZFLFVBQUssR0FBTCxLQUFLLENBQWE7UUFBVyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFXLFNBQUksR0FBSixJQUFJLENBQVE7UUFEbkYsU0FBSSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQztJQUN1RCxDQUFDO0lBRWpHLElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsQixDQUFDOztBQUdGLHVEQUF1RDtBQUN2RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUM7QUFDdEMsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQztBQUNuQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUM7QUFFeEM7OztHQUdHO0FBQ0gsTUFBTSx1QkFBdUI7YUFDWixTQUFJLEdBQUcsS0FBSyxBQUFSLENBQVM7SUFFN0IsWUFBcUIsS0FBa0IsRUFBVyxXQUFtQixFQUFXLFlBQW9CLEVBQVcsV0FBbUIsRUFBVyxVQUFrQjtRQUExSSxVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUR0SixTQUFJLEdBQUcsdUJBQXVCLENBQUMsSUFBSSxDQUFDO0lBQ3NILENBQUM7SUFFcEssSUFBSSxJQUFJO1FBQ1AsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvRCxPQUFPLEdBQUcsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW1CO2FBQ2YsU0FBSSxHQUFHLE1BQU0sQUFBVCxDQUFVO0lBRTlCLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxRQUFnQixFQUFXLE1BQWMsRUFBVyxXQUFvQixFQUFXLElBQXdCO1FBQXRLLFVBQUssR0FBTCxLQUFLLENBQWE7UUFBVyxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUFXLGFBQVEsR0FBUixRQUFRLENBQVE7UUFBVyxXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVM7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFvQjtRQURsTCxTQUFJLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDO0lBQ3NKLENBQUM7SUFFaE0sSUFBSSxJQUFJO1FBQ1AsT0FBTyxHQUFHLGtCQUFrQixHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2hNLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBQ2hCLFNBQUksR0FBRyxPQUFPLEFBQVYsQ0FBVztJQUUvQixZQUFxQixLQUFrQixFQUFXLFdBQW1CLEVBQVcsS0FBcUI7UUFBaEYsVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsVUFBSyxHQUFMLEtBQUssQ0FBZ0I7UUFENUYsU0FBSSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQztJQUMrRCxDQUFDO0lBRTFHLElBQUksSUFBSTtRQUNQLE9BQU8sR0FBRyxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjthQUMxQixTQUFJLEdBQUcsWUFBWSxBQUFmLENBQWdCO0lBRXBDLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxPQUEwQjtRQUFyRixVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtRQURqRyxTQUFJLEdBQUcsOEJBQThCLENBQUMsSUFBSSxDQUFDO0lBQzBELENBQUM7SUFFL0csSUFBSSxJQUFJO1FBQ1AsT0FBTyxHQUFHLG9CQUFvQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdEQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQzs7QUFHRjs7R0FFRztBQUNILE1BQU0sT0FBTywyQkFBMkI7YUFDdkIsU0FBSSxHQUFHLE9BQU8sQUFBVixDQUFXO0lBRS9CLFlBQXFCLEtBQWtCLEVBQVcsV0FBbUIsRUFBVyxZQUE0QjtRQUF2RixVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxpQkFBWSxHQUFaLFlBQVksQ0FBZ0I7UUFEbkcsU0FBSSxHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQztJQUMrRCxDQUFDO0lBRWpILElBQUksSUFBSTtRQUNQLE9BQU8sR0FBRyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlELENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDYixPQUFPLEdBQUcsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM5RCxDQUFDOztBQUdGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDhCQUE4QjthQUMxQixTQUFJLEdBQUcsU0FBUyxBQUFaLENBQWE7SUFFakMsWUFBcUIsS0FBa0IsRUFBVyxXQUFtQixFQUFXLElBQVksRUFBVyxFQUFVLEVBQVcsZ0JBQW9DLEVBQVcsSUFBK0IsRUFBVyxRQUFpQixFQUFXLElBQWdCLEVBQVcsTUFBZ0IsRUFBVyxXQUFxQjtRQUF2UyxVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQVcsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVcsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUFXLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBb0I7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUEyQjtRQUFXLGFBQVEsR0FBUixRQUFRLENBQVM7UUFBVyxTQUFJLEdBQUosSUFBSSxDQUFZO1FBQVcsV0FBTSxHQUFOLE1BQU0sQ0FBVTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFVO1FBRG5ULFNBQUksR0FBRyw4QkFBOEIsQ0FBQyxJQUFJLENBQUM7SUFDNFEsQ0FBQztJQUVqVSxJQUFJLGFBQWE7UUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRCxlQUFlO1FBQ2QsSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDbkMsT0FBTyxrQ0FBa0MsQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLElBQXFDLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkcsQ0FBQztRQUVELE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3JMLENBQUM7O0FBR0YsTUFBTSxVQUFVLHVCQUF1QixDQUFDLFVBQThCO0lBQ3JFLE9BQU87UUFDTixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7UUFDckIsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUMxRCxJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsSUFBSSxDQUNULENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDdkQsT0FBTyxJQUFJLHVCQUF1QixDQUNqQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUMxRCxJQUFJLENBQUMsV0FBVyxFQUNmLElBQWdDLENBQUMsWUFBWSxFQUM3QyxJQUFnQyxDQUFDLFdBQVcsRUFDNUMsSUFBZ0MsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUNsRCxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25ELE9BQU8sSUFBSSxtQkFBbUIsQ0FDN0IsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDMUQsSUFBSSxDQUFDLFdBQVcsRUFDZixJQUE0QixDQUFDLFFBQVEsRUFDckMsSUFBNEIsQ0FBQyxNQUFNLEVBQ25DLElBQTRCLENBQUMsV0FBVyxFQUN4QyxJQUE0QixDQUFDLElBQUksQ0FDbEMsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwRCxJQUFJLEtBQUssR0FBSSxJQUE2QixDQUFDLEtBQUssQ0FBQztnQkFDakQsS0FBSyxHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUVyQyxPQUFPLElBQUksb0JBQW9CLENBQzlCLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQzFELElBQUksQ0FBQyxXQUFXLEVBQ2hCLEtBQUssQ0FDTCxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssOEJBQThCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzlELE9BQU8sSUFBSSw4QkFBOEIsQ0FDeEMsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsRUFDMUQsSUFBSSxDQUFDLFdBQVcsRUFDZixJQUF1QyxDQUFDLE9BQU8sQ0FDaEQsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMzRCxPQUFPLElBQUksMkJBQTJCLENBQ3JDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQzFELElBQUksQ0FBQyxXQUFXLEVBQ2YsSUFBb0MsQ0FBQyxZQUFZLENBQ2xELENBQUM7WUFDSCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDOUQsT0FBTyxJQUFJLDhCQUE4QixDQUN4QyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUMxRCxJQUFJLENBQUMsV0FBVyxFQUNmLElBQXVDLENBQUMsSUFBSSxFQUM1QyxJQUF1QyxDQUFDLEVBQUUsRUFDMUMsSUFBdUMsQ0FBQyxnQkFBZ0IsRUFDekQsTUFBTSxDQUFFLElBQXVDLENBQUMsSUFBSSxDQUFDLEVBQ3BELElBQXVDLENBQUMsUUFBUSxFQUNoRCxJQUF1QyxDQUFDLElBQUksRUFDNUMsSUFBdUMsQ0FBQyxNQUFNLEVBQzlDLElBQXVDLENBQUMsV0FBVyxDQUNwRCxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzVELENBQUM7UUFDRixDQUFDLENBQUM7S0FDRixDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxNQUEwQjtJQUNoRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBNkIsRUFBRSxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3pHLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUF1QyxFQUFFLENBQUMsQ0FBQyxZQUFZLDhCQUE4QixDQUFDLENBQUM7SUFDL0gsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsQ0FBQztBQUNuQyxDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLGdCQUFtQyxFQUFFLFFBQTJCLEVBQUUsTUFBYyxFQUFFLGNBQTZCLElBQUksRUFBRSxVQUF5QixJQUFJO0lBQ3BMLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNsQixJQUFJLFdBQVcsSUFBSSxXQUFXLEtBQUssZ0JBQWdCLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQ25GLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixxQ0FBcUM7WUFDckMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELFFBQVEsSUFBSSxHQUFHLGVBQWUsR0FBRyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDL0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLFFBQVEsSUFBSSxHQUFHLG9CQUFvQixHQUFHLE9BQU8sR0FBRyxDQUFDO1FBQ2xELENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxRQUFRLEdBQUcsTUFBTSxDQUFDO0FBQzFCLENBQUMifQ==