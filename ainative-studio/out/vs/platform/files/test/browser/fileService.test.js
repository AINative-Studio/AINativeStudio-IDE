/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { bufferToReadable, bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { consumeStream, newWriteableStream } from '../../../../base/common/stream.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { FileType, isFileSystemWatcher } from '../../common/files.js';
import { FileService } from '../../common/fileService.js';
import { NullFileSystemProvider } from '../common/nullFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
suite('File Service', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('provider registration', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        const resource = URI.parse('test://foo/bar');
        const provider = new NullFileSystemProvider();
        assert.strictEqual(await service.canHandleResource(resource), false);
        assert.strictEqual(service.hasProvider(resource), false);
        assert.strictEqual(service.getProvider(resource.scheme), undefined);
        const registrations = [];
        disposables.add(service.onDidChangeFileSystemProviderRegistrations(e => {
            registrations.push(e);
        }));
        const capabilityChanges = [];
        disposables.add(service.onDidChangeFileSystemProviderCapabilities(e => {
            capabilityChanges.push(e);
        }));
        let registrationDisposable;
        let callCount = 0;
        disposables.add(service.onWillActivateFileSystemProvider(e => {
            callCount++;
            if (e.scheme === 'test' && callCount === 1) {
                e.join(new Promise(resolve => {
                    registrationDisposable = service.registerProvider('test', provider);
                    resolve();
                }));
            }
        }));
        assert.strictEqual(await service.canHandleResource(resource), true);
        assert.strictEqual(service.hasProvider(resource), true);
        assert.strictEqual(service.getProvider(resource.scheme), provider);
        assert.strictEqual(registrations.length, 1);
        assert.strictEqual(registrations[0].scheme, 'test');
        assert.strictEqual(registrations[0].added, true);
        assert.ok(registrationDisposable);
        assert.strictEqual(capabilityChanges.length, 0);
        provider.setCapabilities(8 /* FileSystemProviderCapabilities.FileFolderCopy */);
        assert.strictEqual(capabilityChanges.length, 1);
        provider.setCapabilities(2048 /* FileSystemProviderCapabilities.Readonly */);
        assert.strictEqual(capabilityChanges.length, 2);
        await service.activateProvider('test');
        assert.strictEqual(callCount, 2); // activation is called again
        assert.strictEqual(service.hasCapability(resource, 2048 /* FileSystemProviderCapabilities.Readonly */), true);
        assert.strictEqual(service.hasCapability(resource, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */), false);
        registrationDisposable.dispose();
        assert.strictEqual(await service.canHandleResource(resource), false);
        assert.strictEqual(service.hasProvider(resource), false);
        assert.strictEqual(registrations.length, 2);
        assert.strictEqual(registrations[1].scheme, 'test');
        assert.strictEqual(registrations[1].added, false);
    });
    test('watch', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        let disposeCounter = 0;
        disposables.add(service.registerProvider('test', new NullFileSystemProvider(() => {
            return toDisposable(() => {
                disposeCounter++;
            });
        })));
        await service.activateProvider('test');
        const resource1 = URI.parse('test://foo/bar1');
        const watcher1Disposable = service.watch(resource1);
        await timeout(0); // service.watch() is async
        assert.strictEqual(disposeCounter, 0);
        watcher1Disposable.dispose();
        assert.strictEqual(disposeCounter, 1);
        disposeCounter = 0;
        const resource2 = URI.parse('test://foo/bar2');
        const watcher2Disposable1 = service.watch(resource2);
        const watcher2Disposable2 = service.watch(resource2);
        const watcher2Disposable3 = service.watch(resource2);
        await timeout(0); // service.watch() is async
        assert.strictEqual(disposeCounter, 0);
        watcher2Disposable1.dispose();
        assert.strictEqual(disposeCounter, 0);
        watcher2Disposable2.dispose();
        assert.strictEqual(disposeCounter, 0);
        watcher2Disposable3.dispose();
        assert.strictEqual(disposeCounter, 1);
        disposeCounter = 0;
        const resource3 = URI.parse('test://foo/bar3');
        const watcher3Disposable1 = service.watch(resource3);
        const watcher3Disposable2 = service.watch(resource3, { recursive: true, excludes: [] });
        const watcher3Disposable3 = service.watch(resource3, { recursive: false, excludes: [], includes: [] });
        await timeout(0); // service.watch() is async
        assert.strictEqual(disposeCounter, 0);
        watcher3Disposable1.dispose();
        assert.strictEqual(disposeCounter, 1);
        watcher3Disposable2.dispose();
        assert.strictEqual(disposeCounter, 2);
        watcher3Disposable3.dispose();
        assert.strictEqual(disposeCounter, 3);
        service.dispose();
    });
    test('watch - with corelation', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        const provider = new class extends NullFileSystemProvider {
            constructor() {
                super(...arguments);
                this._testOnDidChangeFile = new Emitter();
                this.onDidChangeFile = this._testOnDidChangeFile.event;
            }
            fireFileChange(changes) {
                this._testOnDidChangeFile.fire(changes);
            }
        };
        disposables.add(service.registerProvider('test', provider));
        await service.activateProvider('test');
        const globalEvents = [];
        disposables.add(service.onDidFilesChange(e => {
            globalEvents.push(e);
        }));
        const watcher0 = disposables.add(service.watch(URI.parse('test://watch/folder1'), { recursive: true, excludes: [], includes: [] }));
        assert.strictEqual(isFileSystemWatcher(watcher0), false);
        const watcher1 = disposables.add(service.watch(URI.parse('test://watch/folder2'), { recursive: true, excludes: [], includes: [], correlationId: 100 }));
        assert.strictEqual(isFileSystemWatcher(watcher1), true);
        const watcher2 = disposables.add(service.watch(URI.parse('test://watch/folder3'), { recursive: true, excludes: [], includes: [], correlationId: 200 }));
        assert.strictEqual(isFileSystemWatcher(watcher2), true);
        const watcher1Events = [];
        disposables.add(watcher1.onDidChange(e => {
            watcher1Events.push(e);
        }));
        const watcher2Events = [];
        disposables.add(watcher2.onDidChange(e => {
            watcher2Events.push(e);
        }));
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder1'), type: 1 /* FileChangeType.ADDED */ }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder2'), type: 1 /* FileChangeType.ADDED */, cId: 100 }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder2'), type: 1 /* FileChangeType.ADDED */, cId: 100 }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder3/file'), type: 0 /* FileChangeType.UPDATED */, cId: 200 }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder3'), type: 0 /* FileChangeType.UPDATED */, cId: 200 }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder4'), type: 1 /* FileChangeType.ADDED */, cId: 50 }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder4'), type: 1 /* FileChangeType.ADDED */, cId: 60 }]);
        provider.fireFileChange([{ resource: URI.parse('test://watch/folder4'), type: 1 /* FileChangeType.ADDED */, cId: 70 }]);
        assert.strictEqual(globalEvents.length, 1);
        assert.strictEqual(watcher1Events.length, 2);
        assert.strictEqual(watcher2Events.length, 2);
    });
    test('error from readFile bubbles through (https://github.com/microsoft/vscode/issues/118060) - async', async () => {
        testReadErrorBubbles(true);
    });
    test('error from readFile bubbles through (https://github.com/microsoft/vscode/issues/118060)', async () => {
        testReadErrorBubbles(false);
    });
    async function testReadErrorBubbles(async) {
        const service = disposables.add(new FileService(new NullLogService()));
        const provider = new class extends NullFileSystemProvider {
            async stat(resource) {
                return {
                    mtime: Date.now(),
                    ctime: Date.now(),
                    size: 100,
                    type: FileType.File
                };
            }
            readFile(resource) {
                if (async) {
                    return timeout(5, CancellationToken.None).then(() => { throw new Error('failed'); });
                }
                throw new Error('failed');
            }
            open(resource, opts) {
                if (async) {
                    return timeout(5, CancellationToken.None).then(() => { throw new Error('failed'); });
                }
                throw new Error('failed');
            }
            readFileStream(resource, opts, token) {
                if (async) {
                    const stream = newWriteableStream(chunk => chunk[0]);
                    timeout(5, CancellationToken.None).then(() => stream.error(new Error('failed')));
                    return stream;
                }
                throw new Error('failed');
            }
        };
        disposables.add(service.registerProvider('test', provider));
        for (const capabilities of [2 /* FileSystemProviderCapabilities.FileReadWrite */, 16 /* FileSystemProviderCapabilities.FileReadStream */, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */]) {
            provider.setCapabilities(capabilities);
            let e1;
            try {
                await service.readFile(URI.parse('test://foo/bar'));
            }
            catch (error) {
                e1 = error;
            }
            assert.ok(e1);
            let e2;
            try {
                const stream = await service.readFileStream(URI.parse('test://foo/bar'));
                await consumeStream(stream.value, chunk => chunk[0]);
            }
            catch (error) {
                e2 = error;
            }
            assert.ok(e2);
        }
    }
    test('readFile/readFileStream supports cancellation (https://github.com/microsoft/vscode/issues/138805)', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        let readFileStreamReady = undefined;
        const provider = new class extends NullFileSystemProvider {
            async stat(resource) {
                return {
                    mtime: Date.now(),
                    ctime: Date.now(),
                    size: 100,
                    type: FileType.File
                };
            }
            readFileStream(resource, opts, token) {
                const stream = newWriteableStream(chunk => chunk[0]);
                disposables.add(token.onCancellationRequested(() => {
                    stream.error(new Error('Expected cancellation'));
                    stream.end();
                }));
                readFileStreamReady.complete();
                return stream;
            }
        };
        disposables.add(service.registerProvider('test', provider));
        provider.setCapabilities(16 /* FileSystemProviderCapabilities.FileReadStream */);
        let e1;
        try {
            const cts = new CancellationTokenSource();
            readFileStreamReady = new DeferredPromise();
            const promise = service.readFile(URI.parse('test://foo/bar'), undefined, cts.token);
            await Promise.all([readFileStreamReady.p.then(() => cts.cancel()), promise]);
        }
        catch (error) {
            e1 = error;
        }
        assert.ok(e1);
        let e2;
        try {
            const cts = new CancellationTokenSource();
            readFileStreamReady = new DeferredPromise();
            const stream = await service.readFileStream(URI.parse('test://foo/bar'), undefined, cts.token);
            await Promise.all([readFileStreamReady.p.then(() => cts.cancel()), consumeStream(stream.value, chunk => chunk[0])]);
        }
        catch (error) {
            e2 = error;
        }
        assert.ok(e2);
    });
    test('enforced atomic read/write/delete', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        const atomicResource = URI.parse('test://foo/bar/atomic');
        const nonAtomicResource = URI.parse('test://foo/nonatomic');
        let atomicReadCounter = 0;
        let atomicWriteCounter = 0;
        let atomicDeleteCounter = 0;
        const provider = new class extends NullFileSystemProvider {
            async stat(resource) {
                return {
                    type: FileType.File,
                    ctime: Date.now(),
                    mtime: Date.now(),
                    size: 0
                };
            }
            async readFile(resource, opts) {
                if (opts?.atomic) {
                    atomicReadCounter++;
                }
                return new Uint8Array();
            }
            readFileStream(resource, opts, token) {
                return newWriteableStream(chunk => chunk[0]);
            }
            enforceAtomicReadFile(resource) {
                return isEqual(resource, atomicResource);
            }
            async writeFile(resource, content, opts) {
                if (opts.atomic) {
                    atomicWriteCounter++;
                }
            }
            enforceAtomicWriteFile(resource) {
                return isEqual(resource, atomicResource) ? { postfix: '.tmp' } : false;
            }
            async delete(resource, opts) {
                if (opts.atomic) {
                    atomicDeleteCounter++;
                }
            }
            enforceAtomicDelete(resource) {
                return isEqual(resource, atomicResource) ? { postfix: '.tmp' } : false;
            }
        };
        provider.setCapabilities(2 /* FileSystemProviderCapabilities.FileReadWrite */ |
            4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            16 /* FileSystemProviderCapabilities.FileReadStream */ |
            16384 /* FileSystemProviderCapabilities.FileAtomicRead */ |
            32768 /* FileSystemProviderCapabilities.FileAtomicWrite */ |
            65536 /* FileSystemProviderCapabilities.FileAtomicDelete */);
        disposables.add(service.registerProvider('test', provider));
        await service.readFile(atomicResource);
        await service.readFile(nonAtomicResource);
        await service.readFileStream(atomicResource);
        await service.readFileStream(nonAtomicResource);
        await service.writeFile(atomicResource, VSBuffer.fromString(''));
        await service.writeFile(nonAtomicResource, VSBuffer.fromString(''));
        await service.writeFile(atomicResource, bufferToStream(VSBuffer.fromString('')));
        await service.writeFile(nonAtomicResource, bufferToStream(VSBuffer.fromString('')));
        await service.writeFile(atomicResource, bufferToReadable(VSBuffer.fromString('')));
        await service.writeFile(nonAtomicResource, bufferToReadable(VSBuffer.fromString('')));
        await service.del(atomicResource);
        await service.del(nonAtomicResource);
        assert.strictEqual(atomicReadCounter, 2);
        assert.strictEqual(atomicWriteCounter, 3);
        assert.strictEqual(atomicDeleteCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy90ZXN0L2Jyb3dzZXIvZmlsZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUF3QixNQUFNLG1DQUFtQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQTRFLFFBQVEsRUFBNlYsbUJBQW1CLEVBQW9DLE1BQU0sdUJBQXVCLENBQUM7QUFDN2dCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENB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