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
/* eslint-disable local/code-no-native-private */
import { validateConstraint } from '../../../base/common/types.js';
import * as extHostTypes from './extHostTypes.js';
import * as extHostTypeConverter from './extHostTypeConverters.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { MainContext } from './extHost.protocol.js';
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { revive } from '../../../base/common/marshalling.js';
import { Range } from '../../../editor/common/core/range.js';
import { Position } from '../../../editor/common/core/position.js';
import { URI } from '../../../base/common/uri.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { TestItemImpl } from './extHostTestItem.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { TelemetryTrustedValue } from '../../../platform/telemetry/common/telemetryUtils.js';
import { IExtHostTelemetry } from './extHostTelemetry.js';
import { generateUuid } from '../../../base/common/uuid.js';
let ExtHostCommands = class ExtHostCommands {
    #proxy;
    #telemetry;
    #extHostTelemetry;
    constructor(extHostRpc, logService, extHostTelemetry) {
        this._commands = new Map();
        this._apiCommands = new Map();
        this.#proxy = extHostRpc.getProxy(MainContext.MainThreadCommands);
        this._logService = logService;
        this.#extHostTelemetry = extHostTelemetry;
        this.#telemetry = extHostRpc.getProxy(MainContext.MainThreadTelemetry);
        this.converter = new CommandsConverter(this, id => {
            // API commands that have no return type (void) can be
            // converted to their internal command and don't need
            // any indirection commands
            const candidate = this._apiCommands.get(id);
            return candidate?.result === ApiCommandResult.Void
                ? candidate : undefined;
        }, logService);
        this._argumentProcessors = [
            {
                processArgument(a) {
                    // URI, Regex
                    return revive(a);
                }
            },
            {
                processArgument(arg) {
                    return cloneAndChange(arg, function (obj) {
                        // Reverse of https://github.com/microsoft/vscode/blob/1f28c5fc681f4c01226460b6d1c7e91b8acb4a5b/src/vs/workbench/api/node/extHostCommands.ts#L112-L127
                        if (Range.isIRange(obj)) {
                            return extHostTypeConverter.Range.to(obj);
                        }
                        if (Position.isIPosition(obj)) {
                            return extHostTypeConverter.Position.to(obj);
                        }
                        if (Range.isIRange(obj.range) && URI.isUri(obj.uri)) {
                            return extHostTypeConverter.location.to(obj);
                        }
                        if (obj instanceof VSBuffer) {
                            return obj.buffer.buffer;
                        }
                        if (!Array.isArray(obj)) {
                            return obj;
                        }
                    });
                }
            }
        ];
    }
    registerArgumentProcessor(processor) {
        this._argumentProcessors.push(processor);
    }
    registerApiCommand(apiCommand) {
        const registration = this.registerCommand(false, apiCommand.id, async (...apiArgs) => {
            const internalArgs = apiCommand.args.map((arg, i) => {
                if (!arg.validate(apiArgs[i])) {
                    throw new Error(`Invalid argument '${arg.name}' when running '${apiCommand.id}', received: ${typeof apiArgs[i] === 'object' ? JSON.stringify(apiArgs[i], null, '\t') : apiArgs[i]} `);
                }
                return arg.convert(apiArgs[i]);
            });
            const internalResult = await this.executeCommand(apiCommand.internalId, ...internalArgs);
            return apiCommand.result.convert(internalResult, apiArgs, this.converter);
        }, undefined, {
            description: apiCommand.description,
            args: apiCommand.args,
            returns: apiCommand.result.description
        });
        this._apiCommands.set(apiCommand.id, apiCommand);
        return new extHostTypes.Disposable(() => {
            registration.dispose();
            this._apiCommands.delete(apiCommand.id);
        });
    }
    registerCommand(global, id, callback, thisArg, metadata, extension) {
        this._logService.trace('ExtHostCommands#registerCommand', id);
        if (!id.trim().length) {
            throw new Error('invalid id');
        }
        if (this._commands.has(id)) {
            throw new Error(`command '${id}' already exists`);
        }
        this._commands.set(id, { callback, thisArg, metadata, extension });
        if (global) {
            this.#proxy.$registerCommand(id);
        }
        return new extHostTypes.Disposable(() => {
            if (this._commands.delete(id)) {
                if (global) {
                    this.#proxy.$unregisterCommand(id);
                }
            }
        });
    }
    executeCommand(id, ...args) {
        this._logService.trace('ExtHostCommands#executeCommand', id);
        return this._doExecuteCommand(id, args, true);
    }
    async _doExecuteCommand(id, args, retry) {
        if (this._commands.has(id)) {
            // - We stay inside the extension host and support
            // 	 to pass any kind of parameters around.
            // - We still emit the corresponding activation event
            //   BUT we don't await that event
            this.#proxy.$fireCommandActivationEvent(id);
            return this._executeContributedCommand(id, args, false);
        }
        else {
            // automagically convert some argument types
            let hasBuffers = false;
            const toArgs = cloneAndChange(args, function (value) {
                if (value instanceof extHostTypes.Position) {
                    return extHostTypeConverter.Position.from(value);
                }
                else if (value instanceof extHostTypes.Range) {
                    return extHostTypeConverter.Range.from(value);
                }
                else if (value instanceof extHostTypes.Location) {
                    return extHostTypeConverter.location.from(value);
                }
                else if (extHostTypes.NotebookRange.isNotebookRange(value)) {
                    return extHostTypeConverter.NotebookRange.from(value);
                }
                else if (value instanceof ArrayBuffer) {
                    hasBuffers = true;
                    return VSBuffer.wrap(new Uint8Array(value));
                }
                else if (value instanceof Uint8Array) {
                    hasBuffers = true;
                    return VSBuffer.wrap(value);
                }
                else if (value instanceof VSBuffer) {
                    hasBuffers = true;
                    return value;
                }
                if (!Array.isArray(value)) {
                    return value;
                }
            });
            try {
                const result = await this.#proxy.$executeCommand(id, hasBuffers ? new SerializableObjectWithBuffers(toArgs) : toArgs, retry);
                return revive(result);
            }
            catch (e) {
                // Rerun the command when it wasn't known, had arguments, and when retry
                // is enabled. We do this because the command might be registered inside
                // the extension host now and can therefore accept the arguments as-is.
                if (e instanceof Error && e.message === '$executeCommand:retry') {
                    return this._doExecuteCommand(id, args, false);
                }
                else {
                    throw e;
                }
            }
        }
    }
    async _executeContributedCommand(id, args, annotateError) {
        const command = this._commands.get(id);
        if (!command) {
            throw new Error('Unknown command');
        }
        const { callback, thisArg, metadata } = command;
        if (metadata?.args) {
            for (let i = 0; i < metadata.args.length; i++) {
                try {
                    validateConstraint(args[i], metadata.args[i].constraint);
                }
                catch (err) {
                    throw new Error(`Running the contributed command: '${id}' failed. Illegal argument '${metadata.args[i].name}' - ${metadata.args[i].description}`);
                }
            }
        }
        const stopWatch = StopWatch.create();
        try {
            return await callback.apply(thisArg, args);
        }
        catch (err) {
            // The indirection-command from the converter can fail when invoking the actual
            // command and in that case it is better to blame the correct command
            if (id === this.converter.delegatingCommandId) {
                const actual = this.converter.getActualCommand(...args);
                if (actual) {
                    id = actual.command;
                }
            }
            this._logService.error(err, id, command.extension?.identifier);
            if (!annotateError) {
                throw err;
            }
            if (command.extension?.identifier) {
                const reported = this.#extHostTelemetry.onExtensionError(command.extension.identifier, err);
                this._logService.trace('forwarded error to extension?', reported, command.extension?.identifier);
            }
            throw new class CommandError extends Error {
                constructor() {
                    super(toErrorMessage(err));
                    this.id = id;
                    this.source = command.extension?.displayName ?? command.extension?.name;
                }
            };
        }
        finally {
            this._reportTelemetry(command, id, stopWatch.elapsed());
        }
    }
    _reportTelemetry(command, id, duration) {
        if (!command.extension) {
            return;
        }
        this.#telemetry.$publicLog2('Extension:ActionExecuted', {
            extensionId: command.extension.identifier.value,
            id: new TelemetryTrustedValue(id),
            duration: duration,
        });
    }
    $executeContributedCommand(id, ...args) {
        this._logService.trace('ExtHostCommands#$executeContributedCommand', id);
        const cmdHandler = this._commands.get(id);
        if (!cmdHandler) {
            return Promise.reject(new Error(`Contributed command '${id}' does not exist.`));
        }
        else {
            args = args.map(arg => this._argumentProcessors.reduce((r, p) => p.processArgument(r, cmdHandler.extension), arg));
            return this._executeContributedCommand(id, args, true);
        }
    }
    getCommands(filterUnderscoreCommands = false) {
        this._logService.trace('ExtHostCommands#getCommands', filterUnderscoreCommands);
        return this.#proxy.$getCommands().then(result => {
            if (filterUnderscoreCommands) {
                result = result.filter(command => command[0] !== '_');
            }
            return result;
        });
    }
    $getContributedCommandMetadata() {
        const result = Object.create(null);
        for (const [id, command] of this._commands) {
            const { metadata } = command;
            if (metadata) {
                result[id] = metadata;
            }
        }
        return Promise.resolve(result);
    }
};
ExtHostCommands = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostTelemetry)
], ExtHostCommands);
export { ExtHostCommands };
export const IExtHostCommands = createDecorator('IExtHostCommands');
export class CommandsConverter {
    // --- conversion between internal and api commands
    constructor(_commands, _lookupApiCommand, _logService) {
        this._commands = _commands;
        this._lookupApiCommand = _lookupApiCommand;
        this._logService = _logService;
        this.delegatingCommandId = `__vsc${generateUuid()}`;
        this._cache = new Map();
        this._cachIdPool = 0;
        this._commands.registerCommand(true, this.delegatingCommandId, this._executeConvertedCommand, this);
    }
    toInternal(command, disposables) {
        if (!command) {
            return undefined;
        }
        const result = {
            $ident: undefined,
            id: command.command,
            title: command.title,
            tooltip: command.tooltip
        };
        if (!command.command) {
            // falsy command id -> return converted command but don't attempt any
            // argument or API-command dance since this command won't run anyways
            return result;
        }
        const apiCommand = this._lookupApiCommand(command.command);
        if (apiCommand) {
            // API command with return-value can be converted inplace
            result.id = apiCommand.internalId;
            result.arguments = apiCommand.args.map((arg, i) => arg.convert(command.arguments && command.arguments[i]));
        }
        else if (isNonEmptyArray(command.arguments)) {
            // we have a contributed command with arguments. that
            // means we don't want to send the arguments around
            const id = `${command.command} /${++this._cachIdPool}`;
            this._cache.set(id, command);
            disposables.add(toDisposable(() => {
                this._cache.delete(id);
                this._logService.trace('CommandsConverter#DISPOSE', id);
            }));
            result.$ident = id;
            result.id = this.delegatingCommandId;
            result.arguments = [id];
            this._logService.trace('CommandsConverter#CREATE', command.command, id);
        }
        return result;
    }
    fromInternal(command) {
        if (typeof command.$ident === 'string') {
            return this._cache.get(command.$ident);
        }
        else {
            return {
                command: command.id,
                title: command.title,
                arguments: command.arguments
            };
        }
    }
    getActualCommand(...args) {
        return this._cache.get(args[0]);
    }
    _executeConvertedCommand(...args) {
        const actualCmd = this.getActualCommand(...args);
        this._logService.trace('CommandsConverter#EXECUTE', args[0], actualCmd ? actualCmd.command : 'MISSING');
        if (!actualCmd) {
            return Promise.reject(`Actual command not found, wanted to execute ${args[0]}`);
        }
        return this._commands.executeCommand(actualCmd.command, ...(actualCmd.arguments || []));
    }
}
export class ApiCommandArgument {
    static { this.Uri = new ApiCommandArgument('uri', 'Uri of a text document', v => URI.isUri(v), v => v); }
    static { this.Position = new ApiCommandArgument('position', 'A position in a text document', v => extHostTypes.Position.isPosition(v), extHostTypeConverter.Position.from); }
    static { this.Range = new ApiCommandArgument('range', 'A range in a text document', v => extHostTypes.Range.isRange(v), extHostTypeConverter.Range.from); }
    static { this.Selection = new ApiCommandArgument('selection', 'A selection in a text document', v => extHostTypes.Selection.isSelection(v), extHostTypeConverter.Selection.from); }
    static { this.Number = new ApiCommandArgument('number', '', v => typeof v === 'number', v => v); }
    static { this.String = new ApiCommandArgument('string', '', v => typeof v === 'string', v => v); }
    static { this.StringArray = ApiCommandArgument.Arr(ApiCommandArgument.String); }
    static Arr(element) {
        return new ApiCommandArgument(`${element.name}_array`, `Array of ${element.name}, ${element.description}`, (v) => Array.isArray(v) && v.every(e => element.validate(e)), (v) => v.map(e => element.convert(e)));
    }
    static { this.CallHierarchyItem = new ApiCommandArgument('item', 'A call hierarchy item', v => v instanceof extHostTypes.CallHierarchyItem, extHostTypeConverter.CallHierarchyItem.from); }
    static { this.TypeHierarchyItem = new ApiCommandArgument('item', 'A type hierarchy item', v => v instanceof extHostTypes.TypeHierarchyItem, extHostTypeConverter.TypeHierarchyItem.from); }
    static { this.TestItem = new ApiCommandArgument('testItem', 'A VS Code TestItem', v => v instanceof TestItemImpl, extHostTypeConverter.TestItem.from); }
    static { this.TestProfile = new ApiCommandArgument('testProfile', 'A VS Code test profile', v => v instanceof extHostTypes.TestRunProfileBase, extHostTypeConverter.TestRunProfile.from); }
    constructor(name, description, validate, convert) {
        this.name = name;
        this.description = description;
        this.validate = validate;
        this.convert = convert;
    }
    optional() {
        return new ApiCommandArgument(this.name, `(optional) ${this.description}`, value => value === undefined || value === null || this.validate(value), value => value === undefined ? undefined : value === null ? null : this.convert(value));
    }
    with(name, description) {
        return new ApiCommandArgument(name ?? this.name, description ?? this.description, this.validate, this.convert);
    }
}
export class ApiCommandResult {
    static { this.Void = new ApiCommandResult('no result', v => v); }
    constructor(description, convert) {
        this.description = description;
        this.convert = convert;
    }
}
export class ApiCommand {
    constructor(id, internalId, description, args, result) {
        this.id = id;
        this.internalId = internalId;
        this.description = description;
        this.args = args;
        this.result = result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFbkUsT0FBTyxLQUFLLFlBQVksTUFBTSxtQkFBbUIsQ0FBQztBQUNsRCxPQUFPLEtBQUssb0JBQW9CLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQTZHLE1BQU0sdUJBQXVCLENBQUM7QUFDL0osT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFtQixZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxRQUFR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