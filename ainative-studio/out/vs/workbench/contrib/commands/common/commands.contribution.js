/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeStringify } from '../../../../base/common/objects.js';
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
/** Runs several commands passed to it as an argument */
class RunCommands extends Action2 {
    constructor() {
        super({
            id: 'runCommands',
            title: nls.localize2('runCommands', "Run Commands"),
            f1: false,
            metadata: {
                description: nls.localize('runCommands.description', "Run several commands"),
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            required: ['commands'],
                            properties: {
                                commands: {
                                    type: 'array',
                                    description: nls.localize('runCommands.commands', "Commands to run"),
                                    items: {
                                        anyOf: [
                                            {
                                                $ref: 'vscode://schemas/keybindings#/definitions/commandNames'
                                            },
                                            {
                                                type: 'string',
                                            },
                                            {
                                                type: 'object',
                                                required: ['command'],
                                                properties: {
                                                    command: {
                                                        'anyOf': [
                                                            {
                                                                $ref: 'vscode://schemas/keybindings#/definitions/commandNames'
                                                            },
                                                            {
                                                                type: 'string'
                                                            },
                                                        ]
                                                    }
                                                },
                                                $ref: 'vscode://schemas/keybindings#/definitions/commandsSchemas'
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        });
    }
    // dev decisions:
    // - this command takes a single argument-object because
    //	- keybinding definitions don't allow running commands with several arguments
    //  - and we want to be able to take on different other arguments in future, e.g., `runMode : 'serial' | 'concurrent'`
    async run(accessor, args) {
        const notificationService = accessor.get(INotificationService);
        if (!this._isCommandArgs(args)) {
            notificationService.error(nls.localize('runCommands.invalidArgs', "'runCommands' has received an argument with incorrect type. Please, review the argument passed to the command."));
            return;
        }
        if (args.commands.length === 0) {
            notificationService.warn(nls.localize('runCommands.noCommandsToRun', "'runCommands' has not received commands to run. Did you forget to pass commands in the 'runCommands' argument?"));
            return;
        }
        const commandService = accessor.get(ICommandService);
        const logService = accessor.get(ILogService);
        let i = 0;
        try {
            for (; i < args.commands.length; ++i) {
                const cmd = args.commands[i];
                logService.debug(`runCommands: executing ${i}-th command: ${safeStringify(cmd)}`);
                await this._runCommand(commandService, cmd);
                logService.debug(`runCommands: executed ${i}-th command`);
            }
        }
        catch (err) {
            logService.debug(`runCommands: executing ${i}-th command resulted in an error: ${err instanceof Error ? err.message : safeStringify(err)}`);
            notificationService.error(err);
        }
    }
    _isCommandArgs(args) {
        if (!args || typeof args !== 'object') {
            return false;
        }
        if (!('commands' in args) || !Array.isArray(args.commands)) {
            return false;
        }
        for (const cmd of args.commands) {
            if (typeof cmd === 'string') {
                continue;
            }
            if (typeof cmd === 'object' && typeof cmd.command === 'string') {
                continue;
            }
            return false;
        }
        return true;
    }
    _runCommand(commandService, cmd) {
        let commandID, commandArgs;
        if (typeof cmd === 'string') {
            commandID = cmd;
        }
        else {
            commandID = cmd.command;
            commandArgs = cmd.args;
        }
        if (commandArgs === undefined) {
            return commandService.executeCommand(commandID);
        }
        else {
            if (Array.isArray(commandArgs)) {
                return commandService.executeCommand(commandID, ...commandArgs);
            }
            else {
                return commandService.executeCommand(commandID, commandArgs);
            }
        }
    }
}
registerAction2(RunCommands);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1hbmRzL2NvbW1vbi9jb21tYW5kcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBUWhHLHdEQUF3RDtBQUN4RCxNQUFNLFdBQVksU0FBUSxPQUFPO0lBRWhDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGFBQWE7WUFDakIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQztZQUNuRCxFQUFFLEVBQUUsS0FBSztZQUNULFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxzQkFBc0IsQ0FBQztnQkFDNUUsSUFBSSxFQUFFO29CQUNMO3dCQUNDLElBQUksRUFBRSxNQUFNO3dCQUNaLE1BQU0sRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUM7NEJBQ3RCLFVBQVUsRUFBRTtnQ0FDWCxRQUFRLEVBQUU7b0NBQ1QsSUFBSSxFQUFFLE9B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