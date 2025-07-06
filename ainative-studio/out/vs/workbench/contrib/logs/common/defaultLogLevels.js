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
import { ILogService, ILoggerService, LogLevelToString, getLogLevel, parseLogLevel } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
import { isString, isUndefined } from '../../../../base/common/types.js';
import { EXTENSION_IDENTIFIER_WITH_LOG_REGEX } from '../../../../platform/environment/common/environmentService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { parse } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
export const IDefaultLogLevelsService = createDecorator('IDefaultLogLevelsService');
let DefaultLogLevelsService = class DefaultLogLevelsService extends Disposable {
    constructor(environmentService, fileService, jsonEditingService, logService, loggerService) {
        super();
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.jsonEditingService = jsonEditingService;
        this.logService = logService;
        this.loggerService = loggerService;
        this._onDidChangeDefaultLogLevels = this._register(new Emitter);
        this.onDidChangeDefaultLogLevels = this._onDidChangeDefaultLogLevels.event;
    }
    async getDefaultLogLevels() {
        const argvLogLevel = await this._parseLogLevelsFromArgv();
        return {
            default: argvLogLevel?.default ?? this._getDefaultLogLevelFromEnv(),
            extensions: argvLogLevel?.extensions ?? this._getExtensionsDefaultLogLevelsFromEnv()
        };
    }
    async getDefaultLogLevel(extensionId) {
        const argvLogLevel = await this._parseLogLevelsFromArgv() ?? {};
        if (extensionId) {
            extensionId = extensionId.toLowerCase();
            return this._getDefaultLogLevel(argvLogLevel, extensionId);
        }
        else {
            return this._getDefaultLogLevel(argvLogLevel);
        }
    }
    async setDefaultLogLevel(defaultLogLevel, extensionId) {
        const argvLogLevel = await this._parseLogLevelsFromArgv() ?? {};
        if (extensionId) {
            extensionId = extensionId.toLowerCase();
            const currentDefaultLogLevel = this._getDefaultLogLevel(argvLogLevel, extensionId);
            argvLogLevel.extensions = argvLogLevel.extensions ?? [];
            const extension = argvLogLevel.extensions.find(([extension]) => extension === extensionId);
            if (extension) {
                extension[1] = defaultLogLevel;
            }
            else {
                argvLogLevel.extensions.push([extensionId, defaultLogLevel]);
            }
            await this._writeLogLevelsToArgv(argvLogLevel);
            const extensionLoggers = [...this.loggerService.getRegisteredLoggers()].filter(logger => logger.extensionId && logger.extensionId.toLowerCase() === extensionId);
            for (const { resource } of extensionLoggers) {
                if (this.loggerService.getLogLevel(resource) === currentDefaultLogLevel) {
                    this.loggerService.setLogLevel(resource, defaultLogLevel);
                }
            }
        }
        else {
            const currentLogLevel = this._getDefaultLogLevel(argvLogLevel);
            argvLogLevel.default = defaultLogLevel;
            await this._writeLogLevelsToArgv(argvLogLevel);
            if (this.loggerService.getLogLevel() === currentLogLevel) {
                this.loggerService.setLogLevel(defaultLogLevel);
            }
        }
        this._onDidChangeDefaultLogLevels.fire();
    }
    _getDefaultLogLevel(argvLogLevels, extension) {
        if (extension) {
            const extensionLogLevel = argvLogLevels.extensions?.find(([extensionId]) => extensionId === extension);
            if (extensionLogLevel) {
                return extensionLogLevel[1];
            }
        }
        return argvLogLevels.default ?? getLogLevel(this.environmentService);
    }
    async _writeLogLevelsToArgv(logLevels) {
        const logLevelsValue = [];
        if (!isUndefined(logLevels.default)) {
            logLevelsValue.push(LogLevelToString(logLevels.default));
        }
        for (const [extension, logLevel] of logLevels.extensions ?? []) {
            logLevelsValue.push(`${extension}=${LogLevelToString(logLevel)}`);
        }
        await this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['log-level'], value: logLevelsValue.length ? logLevelsValue : undefined }], true);
    }
    async _parseLogLevelsFromArgv() {
        const result = { extensions: [] };
        const logLevels = await this._readLogLevelsFromArgv();
        for (const extensionLogLevel of logLevels) {
            const matches = EXTENSION_IDENTIFIER_WITH_LOG_REGEX.exec(extensionLogLevel);
            if (matches && matches[1] && matches[2]) {
                const logLevel = parseLogLevel(matches[2]);
                if (!isUndefined(logLevel)) {
                    result.extensions?.push([matches[1].toLowerCase(), logLevel]);
                }
            }
            else {
                const logLevel = parseLogLevel(extensionLogLevel);
                if (!isUndefined(logLevel)) {
                    result.default = logLevel;
                }
            }
        }
        return !isUndefined(result.default) || result.extensions?.length ? result : undefined;
    }
    async _readLogLevelsFromArgv() {
        try {
            const content = await this.fileService.readFile(this.environmentService.argvResource);
            const argv = parse(content.value.toString());
            return isString(argv['log-level']) ? [argv['log-level']] : Array.isArray(argv['log-level']) ? argv['log-level'] : [];
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
        return [];
    }
    _getDefaultLogLevelFromEnv() {
        return getLogLevel(this.environmentService);
    }
    _getExtensionsDefaultLogLevelsFromEnv() {
        const result = [];
        for (const [extension, logLevelValue] of this.environmentService.extensionLogLevel ?? []) {
            const logLevel = parseLogLevel(logLevelValue);
            if (!isUndefined(logLevel)) {
                result.push([extension, logLevel]);
            }
        }
        return result;
    }
};
DefaultLogLevelsService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, IJSONEditingService),
    __param(3, ILogService),
    __param(4, ILoggerService)
], DefaultLogLevelsService);
registerSingleton(IDefaultLogLevelsService, DefaultLogLevelsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdExvZ0xldmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvZ3MvY29tbW9uL2RlZmF1bHRMb2dMZXZlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQVksZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMxRyxPQUFPLEVBQXVCLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEgsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBU2xFLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLGVBQWUsQ0FBMkIsMEJBQTBCLENBQUMsQ0FBQztBQWtCOUcsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTy9DLFlBQytC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