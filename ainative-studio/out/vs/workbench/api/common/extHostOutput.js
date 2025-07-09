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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0T3V0cHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQTJELE1BQU0sdUJBQXVCLENBQUM7QUFHN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQVcsY0FBYyxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQVksYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEosT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNySCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQs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