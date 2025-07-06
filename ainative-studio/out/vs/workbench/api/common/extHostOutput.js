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
import { MainContext } from './extHost.protocol.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { AbstractMessageLogger, ILoggerService, ILogService, log, parseLogLevel } from '../../../platform/log/common/log.js';
import { OutputChannelUpdateMode } from '../../services/output/common/output.js';
import { IExtHostConsumerFileSystem } from './extHostFileSystemConsumer.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { toLocalISOString } from '../../../base/common/date.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { isString } from '../../../base/common/types.js';
import { FileSystemProviderErrorCode, toFileSystemProviderErrorCode } from '../../../platform/files/common/files.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
class ExtHostOutputChannel extends AbstractMessageLogger {
    constructor(id, name, logger, proxy, extension) {
        super();
        this.id = id;
        this.name = name;
        this.logger = logger;
        this.proxy = proxy;
        this.extension = extension;
        this.offset = 0;
        this.visible = false;
        this.setLevel(logger.getLevel());
        this._register(logger.onDidChangeLogLevel(level => this.setLevel(level)));
        this._register(toDisposable(() => this.proxy.$dispose(this.id)));
    }
    get logLevel() {
        return this.getLevel();
    }
    appendLine(value) {
        this.append(value + '\n');
    }
    append(value) {
        this.info(value);
    }
    clear() {
        const till = this.offset;
        this.logger.flush();
        this.proxy.$update(this.id, OutputChannelUpdateMode.Clear, till);
    }
    replace(value) {
        const till = this.offset;
        this.info(value);
        this.proxy.$update(this.id, OutputChannelUpdateMode.Replace, till);
        if (this.visible) {
            this.logger.flush();
        }
    }
    show(columnOrPreserveFocus, preserveFocus) {
        this.logger.flush();
        this.proxy.$reveal(this.id, !!(typeof columnOrPreserveFocus === 'boolean' ? columnOrPreserveFocus : preserveFocus));
    }
    hide() {
        this.proxy.$close(this.id);
    }
    log(level, message) {
        this.offset += VSBuffer.fromString(message).byteLength;
        log(this.logger, level, message);
        if (this.visible) {
            this.logger.flush();
            this.proxy.$update(this.id, OutputChannelUpdateMode.Append);
        }
    }
}
class ExtHostLogOutputChannel extends ExtHostOutputChannel {
    appendLine(value) {
        this.append(value);
    }
}
let ExtHostOutputService = class ExtHostOutputService {
    constructor(extHostRpc, initData, extHostFileSystem, extHostFileSystemInfo, loggerService, logService) {
        this.initData = initData;
        this.extHostFileSystem = extHostFileSystem;
        this.extHostFileSystemInfo = extHostFileSystemInfo;
        this.loggerService = loggerService;
        this.logService = logService;
        this.extensionLogDirectoryPromise = new Map();
        this.namePool = 1;
        this.channels = new Map();
        this.visibleChannelId = null;
        this.proxy = extHostRpc.getProxy(MainContext.MainThreadOutputService);
        this.outputsLocation = this.extHostFileSystemInfo.extUri.joinPath(initData.logsLocation, `output_logging_${toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '')}`);
    }
    $setVisibleChannel(visibleChannelId) {
        this.visibleChannelId = visibleChannelId;
        for (const [id, channel] of this.channels) {
            channel.visible = id === this.visibleChannelId;
        }
    }
    createOutputChannel(name, options, extension) {
        name = name.trim();
        if (!name) {
            throw new Error('illegal argument `name`. must not be falsy');
        }
        const log = typeof options === 'object' && options.log;
        const languageId = isString(options) ? options : undefined;
        if (isString(languageId) && !languageId.trim()) {
            throw new Error('illegal argument `languageId`. must not be empty');
        }
        let logLevel;
        const logLevelValue = this.initData.environment.extensionLogLevel?.find(([identifier]) => ExtensionIdentifier.equals(extension.identifier, identifier))?.[1];
        if (logLevelValue) {
            logLevel = parseLogLevel(logLevelValue);
        }
        const channelDisposables = new DisposableStore();
        const extHostOutputChannel = log
            ? this.doCreateLogOutputChannel(name, logLevel, extension, channelDisposables)
            : this.doCreateOutputChannel(name, languageId, extension, channelDisposables);
        extHostOutputChannel.then(channel => {
            this.channels.set(channel.id, channel);
            channel.visible = channel.id === this.visibleChannelId;
            channelDisposables.add(toDisposable(() => this.channels.delete(channel.id)));
        });
        return log
            ? this.createExtHostLogOutputChannel(name, logLevel ?? this.logService.getLevel(), extHostOutputChannel, channelDisposables)
            : this.createExtHostOutputChannel(name, extHostOutputChannel, channelDisposables);
    }
    async doCreateOutputChannel(name, languageId, extension, channelDisposables) {
        if (!this.outputDirectoryPromise) {
            this.outputDirectoryPromise = this.extHostFileSystem.value.createDirectory(this.outputsLocation).then(() => this.outputsLocation);
        }
        const outputDir = await this.outputDirectoryPromise;
        const file = this.extHostFileSystemInfo.extUri.joinPath(outputDir, `${this.namePool++}-${name.replace(/[\\/:\*\?"<>\|]/g, '')}.log`);
        const logger = channelDisposables.add(this.loggerService.createLogger(file, { logLevel: 'always', donotRotate: true, donotUseFormatters: true, hidden: true }));
        const id = await this.proxy.$register(name, file, languageId, extension.identifier.value);
        channelDisposables.add(toDisposable(() => this.loggerService.deregisterLogger(file)));
        return new ExtHostOutputChannel(id, name, logger, this.proxy, extension);
    }
    async doCreateLogOutputChannel(name, logLevel, extension, channelDisposables) {
        const extensionLogDir = await this.createExtensionLogDirectory(extension);
        const fileName = name.replace(/[\\/:\*\?"<>\|]/g, '');
        const file = this.extHostFileSystemInfo.extUri.joinPath(extensionLogDir, `${fileName}.log`);
        const id = `${extension.identifier.value}.${fileName}`;
        const logger = channelDisposables.add(this.loggerService.createLogger(file, { id, name, logLevel, extensionId: extension.identifier.value }));
        channelDisposables.add(toDisposable(() => this.loggerService.deregisterLogger(file)));
        return new ExtHostLogOutputChannel(id, name, logger, this.proxy, extension);
    }
    createExtensionLogDirectory(extension) {
        let extensionLogDirectoryPromise = this.extensionLogDirectoryPromise.get(extension.identifier.value);
        if (!extensionLogDirectoryPromise) {
            const extensionLogDirectory = this.extHostFileSystemInfo.extUri.joinPath(this.initData.logsLocation, extension.identifier.value);
            this.extensionLogDirectoryPromise.set(extension.identifier.value, extensionLogDirectoryPromise = (async () => {
                try {
                    await this.extHostFileSystem.value.createDirectory(extensionLogDirectory);
                }
                catch (err) {
                    if (toFileSystemProviderErrorCode(err) !== FileSystemProviderErrorCode.FileExists) {
                        throw err;
                    }
                }
                return extensionLogDirectory;
            })());
        }
        return extensionLogDirectoryPromise;
    }
    createExtHostOutputChannel(name, channelPromise, channelDisposables) {
        const validate = () => {
            if (channelDisposables.isDisposed) {
                throw new Error('Channel has been closed');
            }
        };
        channelPromise.then(channel => channelDisposables.add(channel));
        return {
            get name() { return name; },
            append(value) {
                validate();
                channelPromise.then(channel => channel.append(value));
            },
            appendLine(value) {
                validate();
                channelPromise.then(channel => channel.appendLine(value));
            },
            clear() {
                validate();
                channelPromise.then(channel => channel.clear());
            },
            replace(value) {
                validate();
                channelPromise.then(channel => channel.replace(value));
            },
            show(columnOrPreserveFocus, preserveFocus) {
                validate();
                channelPromise.then(channel => channel.show(columnOrPreserveFocus, preserveFocus));
            },
            hide() {
                validate();
                channelPromise.then(channel => channel.hide());
            },
            dispose() {
                channelDisposables.dispose();
            }
        };
    }
    createExtHostLogOutputChannel(name, logLevel, channelPromise, channelDisposables) {
        const validate = () => {
            if (channelDisposables.isDisposed) {
                throw new Error('Channel has been closed');
            }
        };
        const onDidChangeLogLevel = channelDisposables.add(new Emitter());
        function setLogLevel(newLogLevel) {
            logLevel = newLogLevel;
            onDidChangeLogLevel.fire(newLogLevel);
        }
        channelPromise.then(channel => {
            if (channel.logLevel !== logLevel) {
                setLogLevel(channel.logLevel);
            }
            channelDisposables.add(channel.onDidChangeLogLevel(e => setLogLevel(e)));
        });
        return {
            ...this.createExtHostOutputChannel(name, channelPromise, channelDisposables),
            get logLevel() { return logLevel; },
            onDidChangeLogLevel: onDidChangeLogLevel.event,
            trace(value, ...args) {
                validate();
                channelPromise.then(channel => channel.trace(value, ...args));
            },
            debug(value, ...args) {
                validate();
                channelPromise.then(channel => channel.debug(value, ...args));
            },
            info(value, ...args) {
                validate();
                channelPromise.then(channel => channel.info(value, ...args));
            },
            warn(value, ...args) {
                validate();
                channelPromise.then(channel => channel.warn(value, ...args));
            },
            error(value, ...args) {
                validate();
                channelPromise.then(channel => channel.error(value, ...args));
            }
        };
    }
};
ExtHostOutputService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostConsumerFileSystem),
    __param(3, IExtHostFileSystemInfo),
    __param(4, ILoggerService),
    __param(5, ILogService)
], ExtHostOutputService);
export { ExtHostOutputService };
export const IExtHostOutputService = createDecorator('IExtHostOutputService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RPdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBMkQsTUFBTSx1QkFBdUIsQ0FBQztBQUc3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUF5QixNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBVyxjQUFjLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBWSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoSixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxP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