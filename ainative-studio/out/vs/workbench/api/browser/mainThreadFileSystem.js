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
var MainThreadFileSystem_1;
import { Emitter, Event } from '../../../base/common/event.js';
import { toDisposable, DisposableStore, DisposableMap } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService, FileType, FileOperationError, FileSystemProviderErrorCode, FilePermission, toFileSystemProviderErrorCode } from '../../../platform/files/common/files.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { VSBuffer } from '../../../base/common/buffer.js';
let MainThreadFileSystem = MainThreadFileSystem_1 = class MainThreadFileSystem {
    constructor(extHostContext, _fileService) {
        this._fileService = _fileService;
        this._fileProvider = new DisposableMap();
        this._disposables = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystem);
        const infoProxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystemInfo);
        for (const entry of _fileService.listCapabilities()) {
            infoProxy.$acceptProviderInfos(URI.from({ scheme: entry.scheme, path: '/dummy' }), entry.capabilities);
        }
        this._disposables.add(_fileService.onDidChangeFileSystemProviderRegistrations(e => infoProxy.$acceptProviderInfos(URI.from({ scheme: e.scheme, path: '/dummy' }), e.provider?.capabilities ?? null)));
        this._disposables.add(_fileService.onDidChangeFileSystemProviderCapabilities(e => infoProxy.$acceptProviderInfos(URI.from({ scheme: e.scheme, path: '/dummy' }), e.provider.capabilities)));
    }
    dispose() {
        this._disposables.dispose();
        this._fileProvider.dispose();
    }
    async $registerFileSystemProvider(handle, scheme, capabilities, readonlyMessage) {
        this._fileProvider.set(handle, new RemoteFileSystemProvider(this._fileService, scheme, capabilities, readonlyMessage, handle, this._proxy));
    }
    $unregisterProvider(handle) {
        this._fileProvider.deleteAndDispose(handle);
    }
    $onFileSystemChange(handle, changes) {
        const fileProvider = this._fileProvider.get(handle);
        if (!fileProvider) {
            throw new Error('Unknown file provider');
        }
        fileProvider.$onFileSystemChange(changes);
    }
    // --- consumer fs, vscode.workspace.fs
    async $stat(uri) {
        try {
            const stat = await this._fileService.stat(URI.revive(uri));
            return {
                ctime: stat.ctime,
                mtime: stat.mtime,
                size: stat.size,
                permissions: stat.readonly ? FilePermission.Readonly : undefined,
                type: MainThreadFileSystem_1._asFileType(stat)
            };
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $readdir(uri) {
        try {
            const stat = await this._fileService.resolve(URI.revive(uri), { resolveMetadata: false });
            if (!stat.isDirectory) {
                const err = new Error(stat.name);
                err.name = FileSystemProviderErrorCode.FileNotADirectory;
                throw err;
            }
            return !stat.children ? [] : stat.children.map(child => [child.name, MainThreadFileSystem_1._asFileType(child)]);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    static _asFileType(stat) {
        let res = 0;
        if (stat.isFile) {
            res += FileType.File;
        }
        else if (stat.isDirectory) {
            res += FileType.Directory;
        }
        if (stat.isSymbolicLink) {
            res += FileType.SymbolicLink;
        }
        return res;
    }
    async $readFile(uri) {
        try {
            const file = await this._fileService.readFile(URI.revive(uri));
            return file.value;
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $writeFile(uri, content) {
        try {
            await this._fileService.writeFile(URI.revive(uri), content);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $rename(source, target, opts) {
        try {
            await this._fileService.move(URI.revive(source), URI.revive(target), opts.overwrite);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $copy(source, target, opts) {
        try {
            await this._fileService.copy(URI.revive(source), URI.revive(target), opts.overwrite);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $mkdir(uri) {
        try {
            await this._fileService.createFolder(URI.revive(uri));
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    async $delete(uri, opts) {
        try {
            return await this._fileService.del(URI.revive(uri), opts);
        }
        catch (err) {
            return MainThreadFileSystem_1._handleError(err);
        }
    }
    static _handleError(err) {
        if (err instanceof FileOperationError) {
            switch (err.fileOperationResult) {
                case 1 /* FileOperationResult.FILE_NOT_FOUND */:
                    err.name = FileSystemProviderErrorCode.FileNotFound;
                    break;
                case 0 /* FileOperationResult.FILE_IS_DIRECTORY */:
                    err.name = FileSystemProviderErrorCode.FileIsADirectory;
                    break;
                case 6 /* FileOperationResult.FILE_PERMISSION_DENIED */:
                    err.name = FileSystemProviderErrorCode.NoPermissions;
                    break;
                case 4 /* FileOperationResult.FILE_MOVE_CONFLICT */:
                    err.name = FileSystemProviderErrorCode.FileExists;
                    break;
            }
        }
        else if (err instanceof Error) {
            const code = toFileSystemProviderErrorCode(err);
            if (code !== FileSystemProviderErrorCode.Unknown) {
                err.name = code;
            }
        }
        throw err;
    }
    $ensureActivation(scheme) {
        return this._fileService.activateProvider(scheme);
    }
};
MainThreadFileSystem = MainThreadFileSystem_1 = __decorate([
    extHostNamedCustomer(MainContext.MainThreadFileSystem),
    __param(1, IFileService)
], MainThreadFileSystem);
export { MainThreadFileSystem };
class RemoteFileSystemProvider {
    constructor(fileService, scheme, capabilities, readOnlyMessage, _handle, _proxy) {
        this.readOnlyMessage = readOnlyMessage;
        this._handle = _handle;
        this._proxy = _proxy;
        this._onDidChange = new Emitter();
        this.onDidChangeFile = this._onDidChange.event;
        this.onDidChangeCapabilities = Event.None;
        this.capabilities = capabilities;
        this._registration = fileService.registerProvider(scheme, this);
    }
    dispose() {
        this._registration.dispose();
        this._onDidChange.dispose();
    }
    watch(resource, opts) {
        const session = Math.random();
        this._proxy.$watch(this._handle, session, resource, opts);
        return toDisposable(() => {
            this._proxy.$unwatch(this._handle, session);
        });
    }
    $onFileSystemChange(changes) {
        this._onDidChange.fire(changes.map(RemoteFileSystemProvider._createFileChange));
    }
    static _createFileChange(dto) {
        return { resource: URI.revive(dto.resource), type: dto.type };
    }
    // --- forwarding calls
    async stat(resource) {
        try {
            return await this._proxy.$stat(this._handle, resource);
        }
        catch (err) {
            throw err;
        }
    }
    async readFile(resource) {
        const buffer = await this._proxy.$readFile(this._handle, resource);
        return buffer.buffer;
    }
    writeFile(resource, content, opts) {
        return this._proxy.$writeFile(this._handle, resource, VSBuffer.wrap(content), opts);
    }
    delete(resource, opts) {
        return this._proxy.$delete(this._handle, resource, opts);
    }
    mkdir(resource) {
        return this._proxy.$mkdir(this._handle, resource);
    }
    readdir(resource) {
        return this._proxy.$readdir(this._handle, resource);
    }
    rename(resource, target, opts) {
        return this._proxy.$rename(this._handle, resource, target, opts);
    }
    copy(resource, target, opts) {
        return this._proxy.$copy(this._handle, resource, target, opts);
    }
    open(resource, opts) {
        return this._proxy.$open(this._handle, resource, opts);
    }
    close(fd) {
        return this._proxy.$close(this._handle, fd);
    }
    async read(fd, pos, data, offset, length) {
        const readData = await this._proxy.$read(this._handle, fd, pos, length);
        data.set(readData.buffer, offset);
        return readData.byteLength;
    }
    write(fd, pos, data, offset, length) {
        return this._proxy.$write(this._handle, fd, pos, VSBuffer.wrap(data).slice(offset, offset + length));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEZpbGVTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRGaWxlU3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBZSxZQUFZLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFrRSxZQUFZLEVBQXdCLFFBQVEsRUFBK0Qsa0JBQWtCLEVBQXVCLDJCQUEyQixFQUF3SixjQUFjLEVBQUUsNkJBQTZCLEVBQTJDLE1BQU0seUNBQXlDLENBQUM7QUFDeGhCLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUEwQyxXQUFXLEVBQTZCLE1BQU0sK0JBQStCLENBQUM7QUFDL0ksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSW5ELElBQU0sb0JBQW9CLDRCQUExQixNQUFNLG9CQUFvQjtJQU1oQyxZQUNDLGNBQStCLEVBQ2pCLFlBQTJDO1FBQTFCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBTHpDLGtCQUFhLEdBQUcsSUFBSSxhQUFhLEVBQW9DLENBQUM7UUFDdEUsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBTXJELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV4RSxNQUFNLFNB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