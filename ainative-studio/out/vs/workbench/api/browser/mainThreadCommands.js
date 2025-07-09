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
import { DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { isString } from '../../../base/common/types.js';
let MainThreadCommands = class MainThreadCommands {
    constructor(extHostContext, _commandService, _extensionService) {
        this._commandService = _commandService;
        this._extensionService = _extensionService;
        this._commandRegistrations = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostCommands);
        this._generateCommandsDocumentationRegistration = CommandsRegistry.registerCommand('_generateCommandsDocumentation', () => this._generateCommandsDocumentation());
    }
    dispose() {
        this._commandRegistrations.dispose();
        this._generateCommandsDocumentationRegistration.dispose();
    }
    async _generateCommandsDocumentation() {
        const result = await this._proxy.$getContributedCommandMetadata();
        // add local commands
        const commands = CommandsRegistry.getCommands();
        for (const [id, command] of commands) {
            if (command.metadata) {
                result[id] = command.metadata;
            }
        }
        // print all as markdown
        const all = [];
        for (const id in result) {
            all.push('`' + id + '` - ' + _generateMarkdown(result[id]));
        }
        console.log(all.join('\n'));
    }
    $registerCommand(id) {
        this._commandRegistrations.set(id, CommandsRegistry.registerCommand(id, (accessor, ...args) => {
            return this._proxy.$executeContributedCommand(id, ...args).then(result => {
                return revive(result);
            });
        }));
    }
    $unregisterCommand(id) {
        this._commandRegistrations.deleteAndDispose(id);
    }
    $fireCommandActivationEvent(id) {
        const activationEvent = `onCommand:${id}`;
        if (!this._extensionService.activationEventIsDone(activationEvent)) {
            // this is NOT awaited because we only use it as drive-by-activation
            // for commands that are already known inside the extension host
            this._extensionService.activateByEvent(activationEvent);
        }
    }
    async $executeCommand(id, args, retry) {
        if (args instanceof SerializableObjectWithBuffers) {
            args = args.value;
        }
        for (let i = 0; i < args.length; i++) {
            args[i] = revive(args[i]);
        }
        if (retry && args.length > 0 && !CommandsRegistry.getCommand(id)) {
            await this._extensionService.activateByEvent(`onCommand:${id}`);
            throw new Error('$executeCommand:retry');
        }
        return this._commandService.executeCommand(id, ...args);
    }
    $getCommands() {
        return Promise.resolve([...CommandsRegistry.getCommands().keys()]);
    }
};
MainThreadCommands = __decorate([
    extHostNamedCustomer(MainContext.MainThreadCommands),
    __param(1, ICommandService),
    __param(2, IExtensionService)
], MainThreadCommands);
export { MainThreadCommands };
// --- command doc
function _generateMarkdown(description) {
    if (typeof description === 'string') {
        return description;
    }
    else {
        const descriptionString = isString(description.description)
            ? description.description
            // Our docs website is in English, so keep the original here.
            : description.description.original;
        const parts = [descriptionString];
        parts.push('\n\n');
        if (description.args) {
            for (const arg of description.args) {
                parts.push(`* _${arg.name}_ - ${arg.description || ''}\n`);
            }
        }
        if (description.returns) {
            parts.push(`* _(returns)_ - ${description.returns}`);
        }
        parts.push('\n\n');
        return parts.join('');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQW9CLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3BILE9BQU8sRUFBbUIsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEVBQU8sNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN6RyxPQUFPLEVBQXdCLGNBQWMsRUFBRSxXQUFXLEVBQTJCLE1BQU0sK0JBQStCLENBQUM7QUFDM0gsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBSWxELElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBTTlCLFlBQ0MsY0FBK0IsRUFDZCxlQUFpRCxFQUMvQyxpQkFBcUQ7UUFEdEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzlCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFQeEQsMEJBQXFCLEdBQUcsSUFBSSxhQUFhLEVBQVUsQ0FBQztRQVNwRSxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRXRFLElBQUksQ0FBQywwQ0FBMEMsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENB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