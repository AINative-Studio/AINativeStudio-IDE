/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ByteSize } from '../../files/common/files.js';
import { AbstractMessageLogger, LogLevel } from '../common/log.js';
var SpdLogLevel;
(function (SpdLogLevel) {
    SpdLogLevel[SpdLogLevel["Trace"] = 0] = "Trace";
    SpdLogLevel[SpdLogLevel["Debug"] = 1] = "Debug";
    SpdLogLevel[SpdLogLevel["Info"] = 2] = "Info";
    SpdLogLevel[SpdLogLevel["Warning"] = 3] = "Warning";
    SpdLogLevel[SpdLogLevel["Error"] = 4] = "Error";
    SpdLogLevel[SpdLogLevel["Critical"] = 5] = "Critical";
    SpdLogLevel[SpdLogLevel["Off"] = 6] = "Off";
})(SpdLogLevel || (SpdLogLevel = {}));
async function createSpdLogLogger(name, logfilePath, filesize, filecount, donotUseFormatters) {
    // Do not crash if spdlog cannot be loaded
    try {
        const _spdlog = await import('@vscode/spdlog');
        _spdlog.setFlushOn(SpdLogLevel.Trace);
        const logger = await _spdlog.createAsyncRotatingLogger(name, logfilePath, filesize, filecount);
        if (donotUseFormatters) {
            logger.clearFormatters();
        }
        else {
            logger.setPattern('%Y-%m-%d %H:%M:%S.%e [%l] %v');
        }
        return logger;
    }
    catch (e) {
        console.error(e);
    }
    return null;
}
function log(logger, level, message) {
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
function setLogLevel(logger, level) {
    switch (level) {
        case LogLevel.Trace:
            logger.setLevel(SpdLogLevel.Trace);
            break;
        case LogLevel.Debug:
            logger.setLevel(SpdLogLevel.Debug);
            break;
        case LogLevel.Info:
            logger.setLevel(SpdLogLevel.Info);
            break;
        case LogLevel.Warning:
            logger.setLevel(SpdLogLevel.Warning);
            break;
        case LogLevel.Error:
            logger.setLevel(SpdLogLevel.Error);
            break;
        case LogLevel.Off:
            logger.setLevel(SpdLogLevel.Off);
            break;
        default: throw new Error(`Invalid log level ${level}`);
    }
}
export class SpdLogLogger extends AbstractMessageLogger {
    constructor(name, filepath, rotating, donotUseFormatters, level) {
        super();
        this.buffer = [];
        this.setLevel(level);
        this._loggerCreationPromise = this._createSpdLogLogger(name, filepath, rotating, donotUseFormatters);
        this._register(this.onDidChangeLogLevel(level => {
            if (this._logger) {
                setLogLevel(this._logger, level);
            }
        }));
    }
    async _createSpdLogLogger(name, filepath, rotating, donotUseFormatters) {
        const filecount = rotating ? 6 : 1;
        const filesize = (30 / filecount) * ByteSize.MB;
        const logger = await createSpdLogLogger(name, filepath, filesize, filecount, donotUseFormatters);
        if (logger) {
            this._logger = logger;
            setLogLevel(this._logger, this.getLevel());
            for (const { level, message } of this.buffer) {
                log(this._logger, level, message);
            }
            this.buffer = [];
        }
    }
    log(level, message) {
        if (this._logger) {
            log(this._logger, level, message);
        }
        else if (this.getLevel() <= level) {
            this.buffer.push({ level, message });
        }
    }
    flush() {
        if (this._logger) {
            this.flushLogger();
        }
        else {
            this._loggerCreationPromise.then(() => this.flushLogger());
        }
    }
    dispose() {
        if (this._logger) {
            this.disposeLogger();
        }
        else {
            this._loggerCreationPromise.then(() => this.disposeLogger());
        }
        super.dispose();
    }
    flushLogger() {
        if (this._logger) {
            this._logger.flush();
        }
    }
    disposeLogger() {
        if (this._logger) {
            this._logger.drop();
            this._logger = undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BkbG9nTG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xvZy9ub2RlL3NwZGxvZ0xvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFXLFFBQVEsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRTVFLElBQUssV0FRSjtBQVJELFdBQUssV0FBVztJQUNmLCtDQUFLLENBQUE7SUFDTCwrQ0FBSyxDQUFBO0lBQ0wsNkNBQUksQ0FBQTtJQUNKLG1EQUFPLENBQUE7SUFDUCwrQ0FBSyxDQUFBO0lBQ0wscURBQVEsQ0FBQTtJQUNSLDJDQUFHLENBQUE7QUFDSixDQUFDLEVBUkksV0FBVyxLQUFYLFdBQVcsUUFRZjtBQUVELEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsV0FBbUIsRUFBRSxRQUFnQixFQUFFLFNBQWlCLEVBQUUsa0JBQTJCO0lBQ3BJLDBDQUEwQztJQUMxQyxJQUFJLENBQUM7UUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9GLElBQUksa0JBQWtCLEVBQUUsQ0FBQztZQUN4QixNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDMUIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLENBQUM7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