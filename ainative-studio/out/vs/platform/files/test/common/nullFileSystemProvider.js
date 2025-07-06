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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVsbEZpbGVTeXN0ZW1Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9jb21tb24vbnVsbEZpbGVTeXN0ZW1Qcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBSy9FLE1BQU0sT0FBTyxzQkFBc0I7SUFVbEMsWUFBb0Isb0JBQXVDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO1FBQTVELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBMkM7UUFSaEYsaUJBQVksc0RBQTJFO1FBRXRFLDZCQUF3QixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDdkQsNEJBQXVCLEdBQWdCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUM7UUFFbkUscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUM7UUFDakUsb0JBQWUsR0FBa0MsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQztJQUVGLENBQUM7SUFFckYsb0JBQW9CLENBQUMsT0FBc0I7UUFDMUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQTRDO1FBQzNELElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRWpDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQWEsRUFBRSxJQUFtQixJQUFpQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRixLQUFLLENBQUMsSUFBSSxDQUFDLFFBQWEsSUFBb0IsT0FBTyxTQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBYSxJQUFtQixPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDL0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFhLElBQW1DLE9BQU8sU0FBVSxDQUFDLENBQUMsQ0FBQztJQUNsRixLQUFLLENBQUMsTUFBTSxDQUFDLFFBQWEsRUFBRSxJQUF3QixJQUFtQixPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDMUYsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFTLEVBQUUsRUFBTyxFQUFFLElBQTJCLElBQW1CLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNsRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVMsRUFBRSxFQUFPLEVBQUUsSUFBMkIsSUFBbUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2hHLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBYSxJQUF5QixPQUFPLFNBQVUsQ0FBQyxDQUFDLENBQUM7SUFDekUsY0FBYyxDQUFDLFFBQWEsRUFBRSxJQUE0QixFQUFFLEtBQXdCLElBQXNDLE9BQU8sU0FBVSxDQUFDLENBQUMsQ0FBQztJQUM5SSxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQWEsRUFBRSxPQUFtQixFQUFFLElBQXVCLElBQW1CLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNqSCxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQWEsRUFBRSxJQUFzQixJQUFxQixPQUFPLFNBQVUsQ0FBQyxDQUFDLENBQUM7SUFDekYsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFVLElBQW1CLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUM1RCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQVUsRUFBRSxHQUFXLEVBQUUsSUFBZ0IsRUFBRSxNQUFjLEVBQUUsTUFBYyxJQUFxQixPQUFPLFNBQVUsQ0FBQyxDQUFDLENBQUM7SUFDN0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFVLEVBQUUsR0FBVyxFQUFFLElBQWdCLEVBQUUsTUFBYyxFQUFFLE1BQWMsSUFBcUIsT0FBTyxTQUFVLENBQUMsQ0FBQyxDQUFDO0NBQzlIIn0=