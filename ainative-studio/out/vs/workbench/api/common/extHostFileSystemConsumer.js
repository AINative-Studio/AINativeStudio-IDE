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
var ExtHostConsumerFileSystem_1;
import { MainContext } from './extHost.protocol.js';
import * as files from '../../../platform/files/common/files.js';
import { FileSystemError } from './extHostTypes.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceQueue } from '../../../base/common/async.js';
import { extUri, extUriIgnorePathCase } from '../../../base/common/resources.js';
import { Schemas } from '../../../base/common/network.js';
let ExtHostConsumerFileSystem = ExtHostConsumerFileSystem_1 = class ExtHostConsumerFileSystem {
    constructor(extHostRpc, fileSystemInfo) {
        this._fileSystemProvider = new Map();
        this._writeQueue = new ResourceQueue();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadFileSystem);
        const that = this;
        this.value = Object.freeze({
            async stat(uri) {
                try {
                    let stat;
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        stat = await provider.impl.stat(uri);
                    }
                    else {
                        stat = await that._proxy.$stat(uri);
                    }
                    return {
                        type: stat.type,
                        ctime: stat.ctime,
                        mtime: stat.mtime,
                        size: stat.size,
                        permissions: stat.permissions === files.FilePermission.Readonly ? 1 : undefined
                    };
                }
                catch (err) {
                    ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async readDirectory(uri) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return (await provider.impl.readDirectory(uri)).slice(); // safe-copy
                    }
                    else {
                        return await that._proxy.$readdir(uri);
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async createDirectory(uri) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider && !provider.isReadonly) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return await that.mkdirp(provider.impl, provider.extUri, uri);
                    }
                    else {
                        return await that._proxy.$mkdir(uri);
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async readFile(uri) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return (await provider.impl.readFile(uri)).slice(); // safe-copy
                    }
                    else {
                        const buff = await that._proxy.$readFile(uri);
                        return buff.buffer;
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async writeFile(uri, content) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider && !provider.isReadonly) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        await that.mkdirp(provider.impl, provider.extUri, provider.extUri.dirname(uri));
                        return await that._writeQueue.queueFor(uri, () => Promise.resolve(provider.impl.writeFile(uri, content, { create: true, overwrite: true })));
                    }
                    else {
                        return await that._proxy.$writeFile(uri, VSBuffer.wrap(content));
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async delete(uri, options) {
                try {
                    const provider = that._fileSystemProvider.get(uri.scheme);
                    if (provider && !provider.isReadonly && !options?.useTrash /* no shortcut: use trash */) {
                        // use shortcut
                        await that._proxy.$ensureActivation(uri.scheme);
                        return await provider.impl.delete(uri, { recursive: false, ...options });
                    }
                    else {
                        return await that._proxy.$delete(uri, { recursive: false, useTrash: false, atomic: false, ...options });
                    }
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async rename(oldUri, newUri, options) {
                try {
                    // no shortcut: potentially involves different schemes, does mkdirp
                    return await that._proxy.$rename(oldUri, newUri, { ...{ overwrite: false }, ...options });
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            async copy(source, destination, options) {
                try {
                    // no shortcut: potentially involves different schemes, does mkdirp
                    return await that._proxy.$copy(source, destination, { ...{ overwrite: false }, ...options });
                }
                catch (err) {
                    return ExtHostConsumerFileSystem_1._handleError(err);
                }
            },
            isWritableFileSystem(scheme) {
                const capabilities = fileSystemInfo.getCapabilities(scheme);
                if (typeof capabilities === 'number') {
                    return !(capabilities & 2048 /* files.FileSystemProviderCapabilities.Readonly */);
                }
                return undefined;
            }
        });
    }
    async mkdirp(provider, providerExtUri, directory) {
        const directoriesToCreate = [];
        while (!providerExtUri.isEqual(directory, providerExtUri.dirname(directory))) {
            try {
                const stat = await provider.stat(directory);
                if ((stat.type & files.FileType.Directory) === 0) {
                    throw FileSystemError.FileExists(`Unable to create folder '${directory.scheme === Schemas.file ? directory.fsPath : directory.toString(true)}' that already exists but is not a directory`);
                }
                break; // we have hit a directory that exists -> good
            }
            catch (error) {
                if (files.toFileSystemProviderErrorCode(error) !== files.FileSystemProviderErrorCode.FileNotFound) {
                    throw error;
                }
                // further go up and remember to create this directory
                directoriesToCreate.push(providerExtUri.basename(directory));
                directory = providerExtUri.dirname(directory);
            }
        }
        for (let i = directoriesToCreate.length - 1; i >= 0; i--) {
            directory = providerExtUri.joinPath(directory, directoriesToCreate[i]);
            try {
                await provider.createDirectory(directory);
            }
            catch (error) {
                if (files.toFileSystemProviderErrorCode(error) !== files.FileSystemProviderErrorCode.FileExists) {
                    // For mkdirp() we tolerate that the mkdir() call fails
                    // in case the folder already exists. This follows node.js
                    // own implementation of fs.mkdir({ recursive: true }) and
                    // reduces the chances of race conditions leading to errors
                    // if multiple calls try to create the same folders
                    // As such, we only throw an error here if it is other than
                    // the fact that the file already exists.
                    // (see also https://github.com/microsoft/vscode/issues/89834)
                    throw error;
                }
            }
        }
    }
    static _handleError(err) {
        // desired error type
        if (err instanceof FileSystemError) {
            throw err;
        }
        // file system provider error
        if (err instanceof files.FileSystemProviderError) {
            switch (err.code) {
                case files.FileSystemProviderErrorCode.FileExists: throw FileSystemError.FileExists(err.message);
                case files.FileSystemProviderErrorCode.FileNotFound: throw FileSystemError.FileNotFound(err.message);
                case files.FileSystemProviderErrorCode.FileNotADirectory: throw FileSystemError.FileNotADirectory(err.message);
                case files.FileSystemProviderErrorCode.FileIsADirectory: throw FileSystemError.FileIsADirectory(err.message);
                case files.FileSystemProviderErrorCode.NoPermissions: throw FileSystemError.NoPermissions(err.message);
                case files.FileSystemProviderErrorCode.Unavailable: throw FileSystemError.Unavailable(err.message);
                default: throw new FileSystemError(err.message, err.name);
            }
        }
        // generic error
        if (!(err instanceof Error)) {
            throw new FileSystemError(String(err));
        }
        // no provider (unknown scheme) error
        if (err.name === 'ENOPRO' || err.message.includes('ENOPRO')) {
            throw FileSystemError.Unavailable(err.message);
        }
        // file system error
        switch (err.name) {
            case files.FileSystemProviderErrorCode.FileExists: throw FileSystemError.FileExists(err.message);
            case files.FileSystemProviderErrorCode.FileNotFound: throw FileSystemError.FileNotFound(err.message);
            case files.FileSystemProviderErrorCode.FileNotADirectory: throw FileSystemError.FileNotADirectory(err.message);
            case files.FileSystemProviderErrorCode.FileIsADirectory: throw FileSystemError.FileIsADirectory(err.message);
            case files.FileSystemProviderErrorCode.NoPermissions: throw FileSystemError.NoPermissions(err.message);
            case files.FileSystemProviderErrorCode.Unavailable: throw FileSystemError.Unavailable(err.message);
            default: throw new FileSystemError(err.message, err.name);
        }
    }
    // ---
    addFileSystemProvider(scheme, provider, options) {
        this._fileSystemProvider.set(scheme, { impl: provider, extUri: options?.isCaseSensitive ? extUri : extUriIgnorePathCase, isReadonly: !!options?.isReadonly });
        return toDisposable(() => this._fileSystemProvider.delete(scheme));
    }
    getFileSystemProviderExtUri(scheme) {
        return this._fileSystemProvider.get(scheme)?.extUri ?? extUri;
    }
};
ExtHostConsumerFileSystem = ExtHostConsumerFileSystem_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostFileSystemInfo)
], ExtHostConsumerFileSystem);
export { ExtHostConsumerFileSystem };
export const IExtHostConsumerFileSystem = createDecorator('IExtHostConsumerFileSystem');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1Db25zdW1lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RmlsZVN5c3RlbUNvbnN1bWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUE2QixNQUFNLHVCQUF1QixDQUFDO0FBRS9FLE9BQU8sS0FBSyxLQUFLLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RCxPQUFPLEVBQVcsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR25ELElBQU0seUJBQXlCLGlDQUEvQixNQUFNLHlCQUF5QjtJQVdyQyxZQUNxQixVQUE4QixFQUMxQixjQUFzQztRQU45Qyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBcUYsQ0FBQztRQUVuSCxnQkFBVyxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7UUFNbEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxV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