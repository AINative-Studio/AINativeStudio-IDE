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
import { ThrottledDelayer } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { basename, dirname, joinPath } from '../../../base/common/resources.js';
import { ByteSize, IFileService, whenProviderRegistered } from '../../files/common/files.js';
import { BufferLogger } from './bufferLog.js';
import { AbstractLoggerService, AbstractMessageLogger, LogLevel } from './log.js';
const MAX_FILE_SIZE = 5 * ByteSize.MB;
let FileLogger = class FileLogger extends AbstractMessageLogger {
    constructor(resource, level, donotUseFormatters, fileService) {
        super();
        this.resource = resource;
        this.donotUseFormatters = donotUseFormatters;
        this.fileService = fileService;
        this.backupIndex = 1;
        this.buffer = '';
        this.setLevel(level);
        this.flushDelayer = new ThrottledDelayer(100 /* buffer saves over a short time */);
        this.initializePromise = this.initialize();
    }
    async flush() {
        if (!this.buffer) {
            return;
        }
        await this.initializePromise;
        let content = await this.loadContent();
        if (content.length > MAX_FILE_SIZE) {
            await this.fileService.writeFile(this.getBackupResource(), VSBuffer.fromString(content));
            content = '';
        }
        if (this.buffer) {
            content += this.buffer;
            this.buffer = '';
            await this.fileService.writeFile(this.resource, VSBuffer.fromString(content));
        }
    }
    async initialize() {
        try {
            await this.fileService.createFile(this.resource);
        }
        catch (error) {
            if (error.fileOperationResult !== 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
                throw error;
            }
        }
    }
    log(level, message) {
        if (this.donotUseFormatters) {
            this.buffer += message;
        }
        else {
            this.buffer += `${this.getCurrentTimestamp()} [${this.stringifyLogLevel(level)}] ${message}\n`;
        }
        this.flushDelayer.trigger(() => this.flush());
    }
    getCurrentTimestamp() {
        const toTwoDigits = (v) => v < 10 ? `0${v}` : v;
        const toThreeDigits = (v) => v < 10 ? `00${v}` : v < 100 ? `0${v}` : v;
        const currentTime = new Date();
        return `${currentTime.getFullYear()}-${toTwoDigits(currentTime.getMonth() + 1)}-${toTwoDigits(currentTime.getDate())} ${toTwoDigits(currentTime.getHours())}:${toTwoDigits(currentTime.getMinutes())}:${toTwoDigits(currentTime.getSeconds())}.${toThreeDigits(currentTime.getMilliseconds())}`;
    }
    getBackupResource() {
        this.backupIndex = this.backupIndex > 5 ? 1 : this.backupIndex;
        return joinPath(dirname(this.resource), `${basename(this.resource)}_${this.backupIndex++}`);
    }
    async loadContent() {
        try {
            const content = await this.fileService.readFile(this.resource);
            return content.value.toString();
        }
        catch (e) {
            return '';
        }
    }
    stringifyLogLevel(level) {
        switch (level) {
            case LogLevel.Debug: return 'debug';
            case LogLevel.Error: return 'error';
            case LogLevel.Info: return 'info';
            case LogLevel.Trace: return 'trace';
            case LogLevel.Warning: return 'warning';
        }
        return '';
    }
};
FileLogger = __decorate([
    __param(3, IFileService)
], FileLogger);
export class FileLoggerService extends AbstractLoggerService {
    constructor(logLevel, logsHome, fileService) {
        super(logLevel, logsHome);
        this.fileService = fileService;
    }
    doCreateLogger(resource, logLevel, options) {
        const logger = new BufferLogger(logLevel);
        whenProviderRegistered(resource, this.fileService).then(() => logger.logger = new FileLogger(resource, logger.getLevel(), !!options?.donotUseFormatters, this.fileService));
        return logger;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUxvZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9sb2cvY29tbW9uL2ZpbGVMb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxRQUFRLEVBQTJDLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RJLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQTJDLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUzSCxNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQztBQUV0QyxJQUFNLFVBQVUsR0FBaEIsTUFBTSxVQUFXLFNBQVEscUJBQXFCO0lBTzdDLFlBQ2tCLFFBQWEsRUFDOUIsS0FBZSxFQUNFLGtCQUEyQixFQUM5QixXQUEwQztRQUV4RCxLQUFLLEVBQUUsQ0FBQztRQUxTLGFBQVEsR0FBUixRQUFRLENBQUs7UUFFYix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVM7UUFDYixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQVBqRCxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixXQUFNLEdBQVcsRUFBRSxDQUFDO1FBUzNCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksR0FB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