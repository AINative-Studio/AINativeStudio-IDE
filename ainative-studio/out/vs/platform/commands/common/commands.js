/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { markAsSingleton, toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { validateConstraints } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ICommandService = createDecorator('commandService');
export const CommandsRegistry = new class {
    constructor() {
        this._commands = new Map();
        this._onDidRegisterCommand = new Emitter();
        this.onDidRegisterCommand = this._onDidRegisterCommand.event;
    }
    registerCommand(idOrCommand, handler) {
        if (!idOrCommand) {
            throw new Error(`invalid command`);
        }
        if (typeof idOrCommand === 'string') {
            if (!handler) {
                throw new Error(`invalid command`);
            }
            return this.registerCommand({ id: idOrCommand, handler });
        }
        // add argument validation if rich command metadata is provided
        if (idOrCommand.metadata && Array.isArray(idOrCommand.metadata.args)) {
            const constraints = [];
            for (const arg of idOrCommand.metadata.args) {
                constraints.push(arg.constraint);
            }
            const actualHandler = idOrCommand.handler;
            idOrCommand.handler = function (accessor, ...args) {
                validateConstraints(args, constraints);
                return actualHandler(accessor, ...args);
            };
        }
        // find a place to store the command
        const { id } = idOrCommand;
        let commands = this._commands.get(id);
        if (!commands) {
            commands = new LinkedList();
            this._commands.set(id, commands);
        }
        const removeFn = commands.unshift(idOrCommand);
        const ret = toDisposable(() => {
            removeFn();
            const command = this._commands.get(id);
            if (command?.isEmpty()) {
                this._commands.delete(id);
            }
        });
        // tell the world about this command
        this._onDidRegisterCommand.fire(id);
        return markAsSingleton(ret);
    }
    registerCommandAlias(oldId, newId) {
        return CommandsRegistry.registerCommand(oldId, (accessor, ...args) => accessor.get(ICommandService).executeCommand(newId, ...args));
    }
    getCommand(id) {
        const list = this._commands.get(id);
        if (!list || list.isEmpty()) {
            return undefined;
        }
        return Iterable.first(list);
    }
    getCommands() {
        const result = new Map();
        for (const key of this._commands.keys()) {
            const command = this.getCommand(key);
            if (command) {
                result.set(key, command);
            }
        }
        return result;
    }
};
CommandsRegistry.registerCommand('noop', () => { });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29tbWFuZHMvY29tbW9uL2NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFNUQsT0FBTyxFQUFlLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFrQixtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXBGLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sNkNBQTZDLENBQUM7QUFFaEcsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQztBQXNEbEYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQXFCLElBQUk7SUFBQTtRQUVwQyxjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUM7UUFFcEQsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQVUsQ0FBQztRQUN0RCx5QkFBb0IsR0FBa0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQztJQTJFakYsQ0FBQztJQXpFQSxlQUFlLENBQUMsV0FBOEIsRUFBRSxPQUF5QjtRQUV4RSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxPQUFPLEVB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