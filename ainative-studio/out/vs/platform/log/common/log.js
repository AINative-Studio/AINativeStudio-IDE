/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { isWindows } from '../../../base/common/platform.js';
import { joinPath } from '../../../base/common/resources.js';
import { isNumber, isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { RawContextKey } from '../../contextkey/common/contextkey.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ILogService = createDecorator('logService');
export const ILoggerService = createDecorator('loggerService');
function now() {
    return new Date().toISOString();
}
export function isLogLevel(thing) {
    return isNumber(thing);
}
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Off"] = 0] = "Off";
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    LogLevel[LogLevel["Info"] = 3] = "Info";
    LogLevel[LogLevel["Warning"] = 4] = "Warning";
    LogLevel[LogLevel["Error"] = 5] = "Error";
})(LogLevel || (LogLevel = {}));
export const DEFAULT_LOG_LEVEL = LogLevel.Info;
export function canLog(loggerLevel, messageLevel) {
    return loggerLevel !== LogLevel.Off && loggerLevel <= messageLevel;
}
export function log(logger, level, message) {
    switch (level) {
        case LogLevel.Trace:
            logger.trace(message);
            break;
        case LogLevel.Debug:
            logger.debug(message);
            break;
        case LogLevel.Info:
            logger.info(message);
            break;
        case LogLevel.Warning:
            logger.warn(message);
            break;
        case LogLevel.Error:
            logger.error(message);
            break;
        case LogLevel.Off: /* do nothing */ break;
        default: throw new Error(`Invalid log level ${level}`);
    }
}
function format(args, verbose = false) {
    let result = '';
    for (let i = 0; i < args.length; i++) {
        let a = args[i];
        if (a instanceof Error) {
            a = toErrorMessage(a, verbose);
        }
        if (typeof a === 'object') {
            try {
                a = JSON.stringify(a);
            }
            catch (e) { }
        }
        result += (i > 0 ? ' ' : '') + a;
    }
    return result;
}
export class AbstractLogger extends Disposable {
    constructor() {
        super(...arguments);
        this.level = DEFAULT_LOG_LEVEL;
        this._onDidChangeLogLevel = this._register(new Emitter());
        this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;
    }
    setLevel(level) {
        if (this.level !== level) {
            this.level = level;
            this._onDidChangeLogLevel.fire(this.level);
        }
    }
    getLevel() {
        return this.level;
    }
    checkLogLevel(level) {
        return canLog(this.level, level);
    }
    canLog(level) {
        if (this._store.isDisposed) {
            return false;
        }
        return this.checkLogLevel(level);
    }
}
export class AbstractMessageLogger extends AbstractLogger {
    constructor(logAlways) {
        super();
        this.logAlways = logAlways;
    }
    checkLogLevel(level) {
        return this.logAlways || super.checkLogLevel(level);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.log(LogLevel.Trace, format([message, ...args], true));
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.log(LogLevel.Debug, format([message, ...args]));
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.log(LogLevel.Info, format([message, ...args]));
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.log(LogLevel.Warning, format([message, ...args]));
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (message instanceof Error) {
                const array = Array.prototype.slice.call(arguments);
                array[0] = message.stack;
                this.log(LogLevel.Error, format(array));
            }
            else {
                this.log(LogLevel.Error, format([message, ...args]));
            }
        }
    }
    flush() { }
}
export class ConsoleMainLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.setLevel(logLevel);
        this.useColors = !isWindows;
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log(`\x1b[90m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[main ${now()}]`, message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log(`\x1b[90m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[main ${now()}]`, message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log(`\x1b[90m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[main ${now()}]`, message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn(`\x1b[93m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.warn(`[main ${now()}]`, message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error(`\x1b[91m[main ${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.error(`[main ${now()}]`, message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
export class ConsoleLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL, useColors = true) {
        super();
        this.useColors = useColors;
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log('%cTRACE', 'color: #888', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log('%cDEBUG', 'background: #eee; color: #888', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log('%c INFO', 'color: #33f', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn('%c WARN', 'color: #993', message, ...args);
            }
            else {
                console.log(message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error('%c  ERR', 'color: #f33', message, ...args);
            }
            else {
                console.error(message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
export class AdapterLogger extends AbstractLogger {
    constructor(adapter, logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.adapter = adapter;
        this.setLevel(logLevel);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            this.adapter.log(LogLevel.Trace, [this.extractMessage(message), ...args]);
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            this.adapter.log(LogLevel.Debug, [this.extractMessage(message), ...args]);
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            this.adapter.log(LogLevel.Info, [this.extractMessage(message), ...args]);
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            this.adapter.log(LogLevel.Warning, [this.extractMessage(message), ...args]);
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            this.adapter.log(LogLevel.Error, [this.extractMessage(message), ...args]);
        }
    }
    extractMessage(msg) {
        if (typeof msg === 'string') {
            return msg;
        }
        return toErrorMessage(msg, this.canLog(LogLevel.Trace));
    }
    flush() {
        // noop
    }
}
export class MultiplexLogger extends AbstractLogger {
    constructor(loggers) {
        super();
        this.loggers = loggers;
        if (loggers.length) {
            this.setLevel(loggers[0].getLevel());
        }
    }
    setLevel(level) {
        for (const logger of this.loggers) {
            logger.setLevel(level);
        }
        super.setLevel(level);
    }
    trace(message, ...args) {
        for (const logger of this.loggers) {
            logger.trace(message, ...args);
        }
    }
    debug(message, ...args) {
        for (const logger of this.loggers) {
            logger.debug(message, ...args);
        }
    }
    info(message, ...args) {
        for (const logger of this.loggers) {
            logger.info(message, ...args);
        }
    }
    warn(message, ...args) {
        for (const logger of this.loggers) {
            logger.warn(message, ...args);
        }
    }
    error(message, ...args) {
        for (const logger of this.loggers) {
            logger.error(message, ...args);
        }
    }
    flush() {
        for (const logger of this.loggers) {
            logger.flush();
        }
    }
    dispose() {
        for (const logger of this.loggers) {
            logger.dispose();
        }
        super.dispose();
    }
}
export class AbstractLoggerService extends Disposable {
    constructor(logLevel, logsHome, loggerResources) {
        super();
        this.logLevel = logLevel;
        this.logsHome = logsHome;
        this._loggers = new ResourceMap();
        this._onDidChangeLoggers = this._register(new Emitter);
        this.onDidChangeLoggers = this._onDidChangeLoggers.event;
        this._onDidChangeLogLevel = this._register(new Emitter);
        this.onDidChangeLogLevel = this._onDidChangeLogLevel.event;
        this._onDidChangeVisibility = this._register(new Emitter);
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        if (loggerResources) {
            for (const loggerResource of loggerResources) {
                this._loggers.set(loggerResource.resource, { logger: undefined, info: loggerResource });
            }
        }
    }
    getLoggerEntry(resourceOrId) {
        if (isString(resourceOrId)) {
            return [...this._loggers.values()].find(logger => logger.info.id === resourceOrId);
        }
        return this._loggers.get(resourceOrId);
    }
    getLogger(resourceOrId) {
        return this.getLoggerEntry(resourceOrId)?.logger;
    }
    createLogger(idOrResource, options) {
        const resource = this.toResource(idOrResource);
        const id = isString(idOrResource) ? idOrResource : (options?.id ?? hash(resource.toString()).toString(16));
        let logger = this._loggers.get(resource)?.logger;
        const logLevel = options?.logLevel === 'always' ? LogLevel.Trace : options?.logLevel;
        if (!logger) {
            logger = this.doCreateLogger(resource, logLevel ?? this.getLogLevel(resource) ?? this.logLevel, { ...options, id });
        }
        const loggerEntry = {
            logger,
            info: {
                resource,
                id,
                logLevel,
                name: options?.name,
                hidden: options?.hidden,
                group: options?.group,
                extensionId: options?.extensionId,
                when: options?.when
            }
        };
        this.registerLogger(loggerEntry.info);
        // TODO: @sandy081 Remove this once registerLogger can take ILogger
        this._loggers.set(resource, loggerEntry);
        return logger;
    }
    toResource(idOrResource) {
        return isString(idOrResource) ? joinPath(this.logsHome, `${idOrResource}.log`) : idOrResource;
    }
    setLogLevel(arg1, arg2) {
        if (URI.isUri(arg1)) {
            const resource = arg1;
            const logLevel = arg2;
            const logger = this._loggers.get(resource);
            if (logger && logLevel !== logger.info.logLevel) {
                logger.info.logLevel = logLevel === this.logLevel ? undefined : logLevel;
                logger.logger?.setLevel(logLevel);
                this._loggers.set(logger.info.resource, logger);
                this._onDidChangeLogLevel.fire([resource, logLevel]);
            }
        }
        else {
            this.logLevel = arg1;
            for (const [resource, logger] of this._loggers.entries()) {
                if (this._loggers.get(resource)?.info.logLevel === undefined) {
                    logger.logger?.setLevel(this.logLevel);
                }
            }
            this._onDidChangeLogLevel.fire(this.logLevel);
        }
    }
    setVisibility(resourceOrId, visibility) {
        const logger = this.getLoggerEntry(resourceOrId);
        if (logger && visibility !== !logger.info.hidden) {
            logger.info.hidden = !visibility;
            this._loggers.set(logger.info.resource, logger);
            this._onDidChangeVisibility.fire([logger.info.resource, visibility]);
        }
    }
    getLogLevel(resource) {
        let logLevel;
        if (resource) {
            logLevel = this._loggers.get(resource)?.info.logLevel;
        }
        return logLevel ?? this.logLevel;
    }
    registerLogger(resource) {
        const existing = this._loggers.get(resource.resource);
        if (existing) {
            if (existing.info.hidden !== resource.hidden) {
                this.setVisibility(resource.resource, !resource.hidden);
            }
        }
        else {
            this._loggers.set(resource.resource, { info: resource, logger: undefined });
            this._onDidChangeLoggers.fire({ added: [resource], removed: [] });
        }
    }
    deregisterLogger(idOrResource) {
        const resource = this.toResource(idOrResource);
        const existing = this._loggers.get(resource);
        if (existing) {
            if (existing.logger) {
                existing.logger.dispose();
            }
            this._loggers.delete(resource);
            this._onDidChangeLoggers.fire({ added: [], removed: [existing.info] });
        }
    }
    *getRegisteredLoggers() {
        for (const entry of this._loggers.values()) {
            yield entry.info;
        }
    }
    getRegisteredLogger(resource) {
        return this._loggers.get(resource)?.info;
    }
    dispose() {
        this._loggers.forEach(logger => logger.logger?.dispose());
        this._loggers.clear();
        super.dispose();
    }
}
export class NullLogger {
    constructor() {
        this.onDidChangeLogLevel = new Emitter().event;
    }
    setLevel(level) { }
    getLevel() { return LogLevel.Info; }
    trace(message, ...args) { }
    debug(message, ...args) { }
    info(message, ...args) { }
    warn(message, ...args) { }
    error(message, ...args) { }
    critical(message, ...args) { }
    dispose() { }
    flush() { }
}
export class NullLogService extends NullLogger {
}
export function getLogLevel(environmentService) {
    if (environmentService.verbose) {
        return LogLevel.Trace;
    }
    if (typeof environmentService.logLevel === 'string') {
        const logLevel = parseLogLevel(environmentService.logLevel.toLowerCase());
        if (logLevel !== undefined) {
            return logLevel;
        }
    }
    return DEFAULT_LOG_LEVEL;
}
export function LogLevelToString(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace: return 'trace';
        case LogLevel.Debug: return 'debug';
        case LogLevel.Info: return 'info';
        case LogLevel.Warning: return 'warn';
        case LogLevel.Error: return 'error';
        case LogLevel.Off: return 'off';
    }
}
export function LogLevelToLocalizedString(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace: return { original: 'Trace', value: nls.localize('trace', "Trace") };
        case LogLevel.Debug: return { original: 'Debug', value: nls.localize('debug', "Debug") };
        case LogLevel.Info: return { original: 'Info', value: nls.localize('info', "Info") };
        case LogLevel.Warning: return { original: 'Warning', value: nls.localize('warn', "Warning") };
        case LogLevel.Error: return { original: 'Error', value: nls.localize('error', "Error") };
        case LogLevel.Off: return { original: 'Off', value: nls.localize('off', "Off") };
    }
}
export function parseLogLevel(logLevel) {
    switch (logLevel) {
        case 'trace':
            return LogLevel.Trace;
        case 'debug':
            return LogLevel.Debug;
        case 'info':
            return LogLevel.Info;
        case 'warn':
            return LogLevel.Warning;
        case 'error':
            return LogLevel.Error;
        case 'critical':
            return LogLevel.Error;
        case 'off':
            return LogLevel.Off;
    }
    return undefined;
}
// Contexts
export const CONTEXT_LOG_LEVEL = new RawContextKey('logLevel', LogLevelToString(LogLevel.Info));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9jb21tb24vbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBVyxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFOUUsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBYyxZQUFZLENBQUMsQ0FBQztBQUN0RSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixlQUFlLENBQUMsQ0FBQztBQUUvRSxTQUFTLEdBQUc7SUFDWCxPQUFPLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDakMsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsS0FBYztJQUN4QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQVksUUFPWDtBQVBELFdBQVksUUFBUTtJQUNuQixxQ0FBRyxDQUFBO0lBQ0gseUNBQUssQ0FBQTtJQUNMLHlDQUFLLENBQUE7SUFDTCx1Q0FBSSxDQUFBO0lBQ0osNkNBQU8sQ0FBQTtJQUNQLHlDQUFLLENBQUE7QUFDTixDQUFDLEVBUFcsUUFBUSxLQUFSLFFBQVEsUUFPbkI7QUFFRCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBYSxRQUFRLENBQUMsSUFBSSxDQUFDO0FBbUJ6RCxNQUFNLFVBQVUsTUFBTSxDQUFDLFdBQXFCLEVBQUUsWUFBc0I7SUFDbkUsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLEdBQUcsSUFBSSxXQUFXLElBQUksWUFBWSxDQUFDO0FBQ3BFLENBQUM7QUFFRCxNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQWUsRUFBRSxLQUFlLEVBQUUsT0FBZTtJQUNwRSxRQUFRLEtBQUssRUFBRSxDQUFDO1FBQ2YsS0FBSyxRQUFRLENBQUMsS0FBSztZQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQ2xELEtBQUssUUFBUSxDQUFDLEtBQUs7WUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQUMsTUFBTTtRQUNsRCxLQUFLLFFBQVEsQ0FBQyxJQUFJO1lBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUFDLE1BQU07UUFDaEQsS0FBSyxRQUFRLENBQUMsT0FBTztZQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFBQyxNQUFNO1FBQ25ELEtBQUssUUFBUSxDQUFDLEtBQUs7WUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQUMsTUFBTTtRQUNsRCxLQUFLLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNO1FBQzFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDeEQsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBQyxJQUFTLEVBQUUsVUFBbUIsS0FBSztJQUNsRCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7SUFFaEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN0QyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEIsSUFBSSxDQUFDLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDeEIsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDO2dCQUNKLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoQixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQztBQWdLRCxNQUFNLE9BQWdCLGNBQWUsU0FBUSxVQUFVO0lBQXZEOztRQUVTLFVBQUssR0FBYSxpQkFBaUIsQ0FBQztRQUMzQix5QkFBb0IsR0FBc0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBWSxDQUFDLENBQUM7UUFDMUYsd0JBQW1CLEdBQW9CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUM7SUE4QmpGLENBQUM7SUE1QkEsUUFBUSxDQUFDLEtBQWU7UUFDdkIsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ25CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNuQixDQUFDO0lBRVMsYUFBYSxDQUFDLEtBQWU7UUFDdEMsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRVMsTUFBTSxDQUFDLEtBQWU7UUFDL0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzVCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNsQyxDQUFDO0NBUUQ7QUFFRCxNQUFNLE9BQWdCLHFCQUFzQixTQUFRLGNBQWM7SUFFakUsWUFBNkIsU0FBbUI7UUFDL0MsS0FBSyxFQUFFLENBQUM7UUFEb0IsY0FBUyxHQUFULFNBQVMsQ0FBVTtJQUVoRCxDQUFDO0lBRWtCLGFBQWEsQ0FBQyxLQUFlO1FBQy9DLE9BQU8sSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBdUIsRUFBRSxHQUFHLElBQVc7UUFDNUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksT0FBTyxZQUFZLEtBQUssRUFBRSxDQUFDO2dCQUM5QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFVLENBQUM7Z0JBQzdELEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO2dCQUN6QixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDekMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxLQUFXLENBQUM7Q0FHakI7QUFHRCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsY0FBYztJQUlwRCxZQUFZLFdBQXFCLGlCQUFpQjtRQUNqRCxLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLFNBQVMsQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNsRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEdBQUcsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDakUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNqRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDbEQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNsRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDbkQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ25FLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNwRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTztJQUNSLENBQUM7Q0FFRDtBQUVELE1BQU0sT0FBTyxhQUFjLFNBQVEsY0FBYztJQUVoRCxZQUFZLFdBQXFCLGlCQUFpQixFQUFtQixZQUFxQixJQUFJO1FBQzdGLEtBQUssRUFBRSxDQUFDO1FBRDRELGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBRTdGLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ3pELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQy9CLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsK0JBQStCLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDM0UsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDekQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzFELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQy9CLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQzNELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUdELEtBQUs7UUFDSixPQUFPO0lBQ1IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWMsU0FBUSxjQUFjO0lBRWhELFlBQTZCLE9BQTJELEVBQUUsV0FBcUIsaUJBQWlCO1FBQy9ILEtBQUssRUFBRSxDQUFDO1FBRG9CLFlBQU8sR0FBUCxPQUFPLENBQW9EO1FBRXZGLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ3BDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0UsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNFLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVztRQUMzQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzdFLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzVDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0UsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsR0FBbUI7UUFDekMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUM7UUFFRCxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBRUQsS0FBSztRQUNKLE9BQU87SUFDUixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxjQUFjO0lBRWxELFlBQTZCLE9BQStCO1FBQzNELEtBQUssRUFBRSxDQUFDO1FBRG9CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBRTNELElBQUksT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdEMsQ0FBQztJQUNGLENBQUM7SUFFUSxRQUFRLENBQUMsS0FBZTtRQUNoQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLENBQUM7UUFDRCxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNwQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2hDLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVc7UUFDcEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXO1FBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVztRQUNuQyxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQy9CLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQXVCLEVBQUUsR0FBRyxJQUFXO1FBQzVDLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2hCLENBQUM7SUFDRixDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO1FBQ0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7Q0FDRDtBQUlELE1BQU0sT0FBZ0IscUJBQXNCLFNBQVEsVUFBVTtJQWU3RCxZQUNXLFFBQWtCLEVBQ1gsUUFBYSxFQUM5QixlQUEyQztRQUUzQyxLQUFLLEVBQUUsQ0FBQztRQUpFLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDWCxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBYmQsYUFBUSxHQUFHLElBQUksV0FBVyxFQUFlLENBQUM7UUFFbkQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQWlFLENBQUMsQ0FBQztRQUMzRyx1QkFBa0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBRXJELHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFtQyxDQUFDLENBQUM7UUFDOUUsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQztRQUV2RCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBdUIsQ0FBQyxDQUFDO1FBQ3BFLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUM7UUFRbEUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixLQUFLLE1BQU0sY0FBYyxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUN6RixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsWUFBMEI7UUFDaEQsSUFBSSxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssWUFBWSxDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVELFNBQVMsQ0FBQyxZQUEwQjtRQUNuQyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQ2xELENBQUM7SUFFRCxZQUFZLENBQUMsWUFBMEIsRUFBRSxPQUF3QjtRQUNoRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNHLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQztRQUNqRCxNQUFNLFFBQVEsR0FBRyxPQUFPLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztRQUNyRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckgsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFnQjtZQUNoQyxNQUFNO1lBQ04sSUFBSSxFQUFFO2dCQUNMLFFBQVE7Z0JBQ1IsRUFBRTtnQkFDRixRQUFRO2dCQUNSLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSTtnQkFDbkIsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNO2dCQUN2QixLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUs7Z0JBQ3JCLFdBQVcsRUFBRSxPQUFPLEVBQUUsV0FBVztnQkFDakMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJO2FBQ25CO1NBQ0QsQ0FBQztRQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekMsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRVMsVUFBVSxDQUFDLFlBQTBCO1FBQzlDLE9BQU8sUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLFlBQVksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztJQUMvRixDQUFDO0lBSUQsV0FBVyxDQUFDLElBQVMsRUFBRSxJQUFVO1FBQ2hDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztZQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDM0MsSUFBSSxNQUFNLElBQUksUUFBUSxLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDekUsTUFBTSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEQsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDckIsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUM5RCxNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsWUFBMEIsRUFBRSxVQUFtQjtRQUM1RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2pELElBQUksTUFBTSxJQUFJLFVBQVUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxVQUFVLENBQUM7WUFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNGLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBYztRQUN6QixJQUFJLFFBQVEsQ0FBQztRQUNiLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUN2RCxDQUFDO1FBQ0QsT0FBTyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQztJQUNsQyxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQXlCO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0RCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RCxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkUsQ0FBQztJQUNGLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxZQUEwQjtRQUMxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDckIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMzQixDQUFDO1lBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVELENBQUMsb0JBQW9CO1FBQ3BCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQztRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVELG1CQUFtQixDQUFDLFFBQWE7UUFDaEMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUM7SUFDMUMsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBR0Q7QUFFRCxNQUFNLE9BQU8sVUFBVTtJQUF2QjtRQUNVLHdCQUFtQixHQUFvQixJQUFJLE9BQU8sRUFBWSxDQUFDLEtBQUssQ0FBQztJQVcvRSxDQUFDO0lBVkEsUUFBUSxDQUFDLEtBQWUsSUFBVSxDQUFDO0lBQ25DLFFBQVEsS0FBZSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzlDLEtBQUssQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXLElBQVUsQ0FBQztJQUNoRCxLQUFLLENBQUMsT0FBZSxFQUFFLEdBQUcsSUFBVyxJQUFVLENBQUM7SUFDaEQsSUFBSSxDQUFDLE9BQWUsRUFBRSxHQUFHLElBQVcsSUFBVSxDQUFDO0lBQy9DLElBQUksQ0FBQyxPQUFlLEVBQUUsR0FBRyxJQUFXLElBQVUsQ0FBQztJQUMvQyxLQUFLLENBQUMsT0FBdUIsRUFBRSxHQUFHLElBQVcsSUFBVSxDQUFDO0lBQ3hELFFBQVEsQ0FBQyxPQUF1QixFQUFFLEdBQUcsSUFBVyxJQUFVLENBQUM7SUFDM0QsT0FBTyxLQUFXLENBQUM7SUFDbkIsS0FBSyxLQUFXLENBQUM7Q0FDakI7QUFFRCxNQUFNLE9BQU8sY0FBZSxTQUFRLFVBQVU7Q0FFN0M7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUFDLGtCQUF1QztJQUNsRSxJQUFJLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hDLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQztJQUN2QixDQUFDO0lBQ0QsSUFBSSxPQUFPLGtCQUFrQixDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyRCxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDMUUsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLGlCQUFpQixDQUFDO0FBQzFCLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsUUFBa0I7SUFDbEQsUUFBUSxRQUFRLEVBQUUsQ0FBQztRQUNsQixLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQztRQUNwQyxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQztRQUNwQyxLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQztRQUNsQyxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLE1BQU0sQ0FBQztRQUNyQyxLQUFLLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLE9BQU8sQ0FBQztRQUNwQyxLQUFLLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQztJQUNqQyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxRQUFrQjtJQUMzRCxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3pGLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3pGLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ3JGLEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQzlGLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3pGLEtBQUssUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO0lBQ2xGLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxRQUFnQjtJQUM3QyxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCLEtBQUssT0FBTztZQUNYLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQztRQUN2QixLQUFLLE9BQU87WUFDWCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDdkIsS0FBSyxNQUFNO1lBQ1YsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ3RCLEtBQUssTUFBTTtZQUNWLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUN6QixLQUFLLE9BQU87WUFDWCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDdkIsS0FBSyxVQUFVO1lBQ2QsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ3ZCLEtBQUssS0FBSztZQUNULE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQztJQUN0QixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQztBQUVELFdBQVc7QUFDWCxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FBUyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMifQ==