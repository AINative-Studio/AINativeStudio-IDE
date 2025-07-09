/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class NullFileSystemProvider {
    constructor(disposableFactory = () => Disposable.None) {
        this.disposableFactory = disposableFactory;
        this.capabilities = 2048 /* FileSystemProviderCapabilities.Readonly */;
        this._onDidChangeCapabilities = new Emitter();
        this.onDidChangeCapabilities = this._onDidChangeCapabilities.event;
        this._onDidChangeFile = new Emitter();
        this.onDidChangeFile = this._onDidChangeFile.event;
    }
    emitFileChangeEvents(changes) {
        this._onDidChangeFile.fire(changes);
    }
    setCapabilities(capabilities) {
        this.capabilities = capabilities;
        this._onDidChangeCapabilities.fire();
    }
    watch(resource, opts) { return this.disposableFactory(); }
    async stat(resource) { return undefined; }
    async mkdir(resource) { return undefined; }
    async readdir(resource) { return undefined; }
    async delete(resource, opts) { return undefined; }
    async rename(from, to, opts) { return undefined; }
    async copy(from, to, opts) { return undefined; }
    async readFile(resource) { return undefined; }
    readFileStream(resource, opts, token) { return undefined; }
    async writeFile(resource, content, opts) { return undefined; }
    async open(resource, opts) { return undefined; }
    async close(fd) { return undefined; }
    async read(fd, pos, data, offset, length) { return undefined; }
    async write(fd, pos, data, offset, length) { return undefined; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy90ZXN0L2NvbW1vbi9udWxsRmlsZVN5c3RlbVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFLL0UsTUFBTSxPQUFPLHNCQUFzQjtJQVVsQyxZQUFvQixvQkFBdUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUk7UUFBNUQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEyQztRQVJoRixpQkFBWSxzREFBMkU7UUFFdEUsNkJBQXdCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUN2RCw0QkFBdUIsR0FBZ0IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQztRQUVuRSxxQkFBZ0IsR0FBRyxJQUFJLE9BQU8sRUFBMEIsQ0FBQztRQUNqRSxvQkFBZSxHQUFrQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDO0lBRUYsQ0FBQztJQUVyRixvQkFBb0IsQ0FBQyxPQUFzQjtRQUMxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBNEM7UUFDM0QsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFFakMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFFRCxLQUFLLENBQUMsUUFBYSxFQUFFLElBQW1CLElBQWlCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNGLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYSxJQUFvQixPQUFPLFNBQVUsQ0FBQyxDQUFDLENBQUM7SUFDaEUsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFhLElBQW1CLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMvRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWEsSUFBbUMsT0FBTyxTQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ2xGLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBYSxFQUFFLElBQXdCLElBQW1CLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUMxRixLQUFLLENBQUMsTUFBTSxDQUFDLElBQVMsRUFBRSxFQUFPLEVBQUUsSUFBMkIsSUFBbUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2xHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBUyxFQUFFLEVBQU8sRUFBRSxJQUEyQixJQUFtQixPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDaEcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhLElBQXlCLE9BQU8sU0FBVSxDQUFDLENBQUMsQ0FBQztJQUN6RSxjQUFjLENBQUMsUUFBYSxFQUFFLElBQTRCLEVBQUUsS0FBd0IsSUFBc0MsT0FBTyxTQUFVLENBQUMsQ0FBQyxDQUFDO0lBQzlJLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBYSxFQUFFLE9BQW1CLEVBQUUsSUFBdUIsSUFBbUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2pILEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYSxFQUFFLElBQXNCLElBQXFCLE9BQU8sU0FBVSxDQUFDLENBQUMsQ0FBQztJQUN6RixLQUFLLENBQUMsS0FBSyxDQUFDLEVBQVUsSUFBbUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzVELEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBVSxFQUFFLEdBQVcsRUFBRSxJQUFnQixFQUFFLE1BQWMsRUFBRSxNQUFjLElBQXFCLE9BQU8sU0FBVSxDQUFDLENBQUMsQ0FBQztJQUM3SCxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQVUsRUFBRSxHQUFXLEVBQUUsSUFBZ0IsRUFBRSxNQUFjLEVBQUUsTUFBYyxJQUFxQixPQUFPLFNBQVUsQ0FBQyxDQUFDLENBQUM7Q0FDOUgifQ==