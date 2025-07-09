/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import assert from 'assert';
import { tmpdir } from 'os';
import { basename, dirname, join } from '../../../../base/common/path.js';
import { Promises, RimRafMode } from '../../../../base/node/pfs.js';
import { getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { watchFileContents } from '../../node/watcher/nodejs/nodejsWatcherLib.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { getDriveLetter } from '../../../../base/common/extpath.js';
import { ltrim } from '../../../../base/common/strings.js';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { NodeJSWatcher } from '../../node/watcher/nodejs/nodejsWatcher.js';
import { FileAccess } from '../../../../base/common/network.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { addUNCHostToAllowlist } from '../../../../base/node/unc.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { TestParcelWatcher } from './parcelWatcher.test.js';
// this suite has shown flaky runs in Azure pipelines where
// tasks would just hang and timeout after a while (not in
// mocha but generally). as such they will run only on demand
// whenever we update the watcher library.
suite.skip('File Watcher (node.js)', function () {
    this.timeout(10000);
    class TestNodeJSWatcher extends NodeJSWatcher {
        constructor() {
            super(...arguments);
            this.suspendedWatchRequestPollingInterval = 100;
            this._onDidWatch = this._register(new Emitter());
            this.onDidWatch = this._onDidWatch.event;
            this.onWatchFail = this._onDidWatchFail.event;
        }
        getUpdateWatchersDelay() {
            return 0;
        }
        async doWatch(requests) {
            await super.doWatch(requests);
            for (const watcher of this.watchers) {
                await watcher.instance.ready;
            }
            this._onDidWatch.fire();
        }
    }
    let testDir;
    let watcher;
    let loggingEnabled = false;
    function enableLogging(enable) {
        loggingEnabled = enable;
        watcher?.setVerboseLogging(enable);
    }
    enableLogging(loggingEnabled);
    setup(async () => {
        await createWatcher(undefined);
        // Rule out strange testing conditions by using the realpath
        // here. for example, on macOS the tmp dir is potentially a
        // symlink in some of the root folders, which is a rather
        // unrealisic case for the file watcher.
        testDir = URI.file(getRandomTestPath(fs.realpathSync(tmpdir()), 'vsctests', 'filewatcher')).fsPath;
        const sourceDir = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/service').fsPath;
        await Promises.copy(sourceDir, testDir, { preserveSymlinks: false });
    });
    async function createWatcher(accessor) {
        await watcher?.stop();
        watcher?.dispose();
        watcher = new TestNodeJSWatcher(accessor);
        watcher?.setVerboseLogging(loggingEnabled);
        watcher.onDidLogMessage(e => {
            if (loggingEnabled) {
                console.log(`[non-recursive watcher test message] ${e.message}`);
            }
        });
        watcher.onDidError(e => {
            if (loggingEnabled) {
                console.log(`[non-recursive watcher test error] ${e}`);
            }
        });
    }
    teardown(async () => {
        await watcher.stop();
        watcher.dispose();
        // Possible that the file watcher is still holding
        // onto the folders on Windows specifically and the
        // unlink would fail. In that case, do not fail the
        // test suite.
        return Promises.rm(testDir).catch(error => console.error(error));
    });
    function toMsg(type) {
        switch (type) {
            case 1 /* FileChangeType.ADDED */: return 'added';
            case 2 /* FileChangeType.DELETED */: return 'deleted';
            default: return 'changed';
        }
    }
    async function awaitEvent(service, path, type, correlationId, expectedCount) {
        if (loggingEnabled) {
            console.log(`Awaiting change type '${toMsg(type)}' on file '${path}'`);
        }
        // Await the event
        await new Promise(resolve => {
            let counter = 0;
            const disposable = service.onDidChangeFile(events => {
                for (const event of events) {
                    if (extUriBiasedIgnorePathCase.isEqual(event.resource, URI.file(path)) && event.type === type && (correlationId === null || event.cId === correlationId)) {
                        counter++;
                        if (typeof expectedCount === 'number' && counter < expectedCount) {
                            continue; // not yet
                        }
                        disposable.dispose();
                        resolve();
                        break;
                    }
                }
            });
        });
    }
    test('basics (folder watch)', async function () {
        const request = { path: testDir, excludes: [], recursive: false };
        await watcher.watch([request]);
        assert.strictEqual(watcher.isSuspended(request), false);
        const instance = Array.from(watcher.watchers)[0].instance;
        assert.strictEqual(instance.isReusingRecursiveWatcher, false);
        assert.strictEqual(instance.failed, false);
        // New file
        const newFilePath = join(testDir, 'newFile.txt');
        let changeFuture = awaitEvent(watcher, newFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newFilePath, 'Hello World');
        await changeFuture;
        // New folder
        const newFolderPath = join(testDir, 'New Folder');
        changeFuture = awaitEvent(watcher, newFolderPath, 1 /* FileChangeType.ADDED */);
        await fs.promises.mkdir(newFolderPath);
        await changeFuture;
        // Rename file
        let renamedFilePath = join(testDir, 'renamedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, newFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFilePath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(newFilePath, renamedFilePath);
        await changeFuture;
        // Rename folder
        let renamedFolderPath = join(testDir, 'Renamed Folder');
        changeFuture = Promise.all([
            awaitEvent(watcher, newFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFolderPath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(newFolderPath, renamedFolderPath);
        await changeFuture;
        // Rename file (same name, different case)
        const caseRenamedFilePath = join(testDir, 'RenamedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, caseRenamedFilePath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(renamedFilePath, caseRenamedFilePath);
        await changeFuture;
        renamedFilePath = caseRenamedFilePath;
        // Rename folder (same name, different case)
        const caseRenamedFolderPath = join(testDir, 'REnamed Folder');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, caseRenamedFolderPath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(renamedFolderPath, caseRenamedFolderPath);
        await changeFuture;
        renamedFolderPath = caseRenamedFolderPath;
        // Move file
        const movedFilepath = join(testDir, 'movedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, movedFilepath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(renamedFilePath, movedFilepath);
        await changeFuture;
        // Move folder
        const movedFolderpath = join(testDir, 'Moved Folder');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, movedFolderpath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(renamedFolderPath, movedFolderpath);
        await changeFuture;
        // Copy file
        const copiedFilepath = join(testDir, 'copiedFile.txt');
        changeFuture = awaitEvent(watcher, copiedFilepath, 1 /* FileChangeType.ADDED */);
        await fs.promises.copyFile(movedFilepath, copiedFilepath);
        await changeFuture;
        // Copy folder
        const copiedFolderpath = join(testDir, 'Copied Folder');
        changeFuture = awaitEvent(watcher, copiedFolderpath, 1 /* FileChangeType.ADDED */);
        await Promises.copy(movedFolderpath, copiedFolderpath, { preserveSymlinks: false });
        await changeFuture;
        // Change file
        changeFuture = awaitEvent(watcher, copiedFilepath, 0 /* FileChangeType.UPDATED */);
        await Promises.writeFile(copiedFilepath, 'Hello Change');
        await changeFuture;
        // Create new file
        const anotherNewFilePath = join(testDir, 'anotherNewFile.txt');
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(anotherNewFilePath, 'Hello Another World');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, copiedFilepath, 2 /* FileChangeType.DELETED */);
        await fs.promises.unlink(copiedFilepath);
        await changeFuture;
        // Delete folder
        changeFuture = awaitEvent(watcher, copiedFolderpath, 2 /* FileChangeType.DELETED */);
        await fs.promises.rmdir(copiedFolderpath);
        await changeFuture;
        watcher.dispose();
    });
    test('basics (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        assert.strictEqual(watcher.isSuspended(request), false);
        const instance = Array.from(watcher.watchers)[0].instance;
        assert.strictEqual(instance.isReusingRecursiveWatcher, false);
        assert.strictEqual(instance.failed, false);
        // Change file
        let changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */);
        await fs.promises.unlink(filePath);
        await changeFuture;
        // Recreate watcher
        await Promises.writeFile(filePath, 'Hello Change');
        await watcher.watch([]);
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        // Move file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */);
        await Promises.rename(filePath, `${filePath}-moved`);
        await changeFuture;
    });
    test('atomic writes (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        // Delete + Recreate file
        const newFilePath = join(testDir, 'lorem.txt');
        const changeFuture = awaitEvent(watcher, newFilePath, 0 /* FileChangeType.UPDATED */);
        await fs.promises.unlink(newFilePath);
        Promises.writeFile(newFilePath, 'Hello Atomic World');
        await changeFuture;
    });
    test('atomic writes (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        // Delete + Recreate file
        const newFilePath = join(filePath);
        const changeFuture = awaitEvent(watcher, newFilePath, 0 /* FileChangeType.UPDATED */);
        await fs.promises.unlink(newFilePath);
        Promises.writeFile(newFilePath, 'Hello Atomic World');
        await changeFuture;
    });
    test('multiple events (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        // multiple add
        const newFilePath1 = join(testDir, 'newFile-1.txt');
        const newFilePath2 = join(testDir, 'newFile-2.txt');
        const newFilePath3 = join(testDir, 'newFile-3.txt');
        const addedFuture1 = awaitEvent(watcher, newFilePath1, 1 /* FileChangeType.ADDED */);
        const addedFuture2 = awaitEvent(watcher, newFilePath2, 1 /* FileChangeType.ADDED */);
        const addedFuture3 = awaitEvent(watcher, newFilePath3, 1 /* FileChangeType.ADDED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello World 1'),
            await Promises.writeFile(newFilePath2, 'Hello World 2'),
            await Promises.writeFile(newFilePath3, 'Hello World 3'),
        ]);
        await Promise.all([addedFuture1, addedFuture2, addedFuture3]);
        // multiple change
        const changeFuture1 = awaitEvent(watcher, newFilePath1, 0 /* FileChangeType.UPDATED */);
        const changeFuture2 = awaitEvent(watcher, newFilePath2, 0 /* FileChangeType.UPDATED */);
        const changeFuture3 = awaitEvent(watcher, newFilePath3, 0 /* FileChangeType.UPDATED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello Update 1'),
            await Promises.writeFile(newFilePath2, 'Hello Update 2'),
            await Promises.writeFile(newFilePath3, 'Hello Update 3'),
        ]);
        await Promise.all([changeFuture1, changeFuture2, changeFuture3]);
        // copy with multiple files
        const copyFuture1 = awaitEvent(watcher, join(testDir, 'newFile-1-copy.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture2 = awaitEvent(watcher, join(testDir, 'newFile-2-copy.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture3 = awaitEvent(watcher, join(testDir, 'newFile-3-copy.txt'), 1 /* FileChangeType.ADDED */);
        await Promise.all([
            Promises.copy(join(testDir, 'newFile-1.txt'), join(testDir, 'newFile-1-copy.txt'), { preserveSymlinks: false }),
            Promises.copy(join(testDir, 'newFile-2.txt'), join(testDir, 'newFile-2-copy.txt'), { preserveSymlinks: false }),
            Promises.copy(join(testDir, 'newFile-3.txt'), join(testDir, 'newFile-3-copy.txt'), { preserveSymlinks: false })
        ]);
        await Promise.all([copyFuture1, copyFuture2, copyFuture3]);
        // multiple delete
        const deleteFuture1 = awaitEvent(watcher, newFilePath1, 2 /* FileChangeType.DELETED */);
        const deleteFuture2 = awaitEvent(watcher, newFilePath2, 2 /* FileChangeType.DELETED */);
        const deleteFuture3 = awaitEvent(watcher, newFilePath3, 2 /* FileChangeType.DELETED */);
        await Promise.all([
            await fs.promises.unlink(newFilePath1),
            await fs.promises.unlink(newFilePath2),
            await fs.promises.unlink(newFilePath3)
        ]);
        await Promise.all([deleteFuture1, deleteFuture2, deleteFuture3]);
    });
    test('multiple events (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        // multiple change
        const changeFuture1 = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */);
        await Promise.all([
            await Promises.writeFile(filePath, 'Hello Update 1'),
            await Promises.writeFile(filePath, 'Hello Update 2'),
            await Promises.writeFile(filePath, 'Hello Update 3'),
        ]);
        await Promise.all([changeFuture1]);
    });
    test('excludes can be updated (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: ['**'], recursive: false }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-excludes.txt'));
    });
    test('excludes are ignored (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: ['**'], recursive: false }]);
        return basicCrudTest(filePath, true);
    });
    test('includes can be updated (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['nothing'], recursive: false }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('non-includes are ignored (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], includes: ['nothing'], recursive: false }]);
        return basicCrudTest(filePath, true);
    });
    test('includes are supported (folder watch)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['**/files-includes.txt'], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('includes are supported (folder watch, relative pattern explicit)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: [{ base: testDir, pattern: 'files-includes.txt' }], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('includes are supported (folder watch, relative pattern implicit)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['files-includes.txt'], recursive: false }]);
        return basicCrudTest(join(testDir, 'files-includes.txt'));
    });
    test('correlationId is supported', async function () {
        const correlationId = Math.random();
        await watcher.watch([{ correlationId, path: testDir, excludes: [], recursive: false }]);
        return basicCrudTest(join(testDir, 'newFile.txt'), undefined, correlationId);
    });
    (isWindows /* windows: cannot create file symbolic link without elevated context */ ? test.skip : test)('symlink support (folder watch)', async function () {
        const link = join(testDir, 'deep-linked');
        const linkTarget = join(testDir, 'deep');
        await fs.promises.symlink(linkTarget, link);
        await watcher.watch([{ path: link, excludes: [], recursive: false }]);
        return basicCrudTest(join(link, 'newFile.txt'));
    });
    async function basicCrudTest(filePath, skipAdd, correlationId, expectedCount, awaitWatchAfterAdd) {
        let changeFuture;
        // New file
        if (!skipAdd) {
            changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */, correlationId, expectedCount);
            await Promises.writeFile(filePath, 'Hello World');
            await changeFuture;
            if (awaitWatchAfterAdd) {
                await Event.toPromise(watcher.onDidWatch);
            }
        }
        // Change file
        changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, correlationId, expectedCount);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, correlationId, expectedCount);
        await fs.promises.unlink(await Promises.realpath(filePath)); // support symlinks
        await changeFuture;
    }
    (isWindows /* windows: cannot create file symbolic link without elevated context */ ? test.skip : test)('symlink support (file watch)', async function () {
        const link = join(testDir, 'lorem.txt-linked');
        const linkTarget = join(testDir, 'lorem.txt');
        await fs.promises.symlink(linkTarget, link);
        await watcher.watch([{ path: link, excludes: [], recursive: false }]);
        return basicCrudTest(link, true);
    });
    (!isWindows /* UNC is windows only */ ? test.skip : test)('unc support (folder watch)', async function () {
        addUNCHostToAllowlist('localhost');
        // Local UNC paths are in the form of: \\localhost\c$\my_dir
        const uncPath = `\\\\localhost\\${getDriveLetter(testDir)?.toLowerCase()}$\\${ltrim(testDir.substr(testDir.indexOf(':') + 1), '\\')}`;
        await watcher.watch([{ path: uncPath, excludes: [], recursive: false }]);
        return basicCrudTest(join(uncPath, 'newFile.txt'));
    });
    (!isWindows /* UNC is windows only */ ? test.skip : test)('unc support (file watch)', async function () {
        addUNCHostToAllowlist('localhost');
        // Local UNC paths are in the form of: \\localhost\c$\my_dir
        const uncPath = `\\\\localhost\\${getDriveLetter(testDir)?.toLowerCase()}$\\${ltrim(testDir.substr(testDir.indexOf(':') + 1), '\\')}\\lorem.txt`;
        await watcher.watch([{ path: uncPath, excludes: [], recursive: false }]);
        return basicCrudTest(uncPath, true);
    });
    (isLinux /* linux: is case sensitive */ ? test.skip : test)('wrong casing (folder watch)', async function () {
        const wrongCase = join(dirname(testDir), basename(testDir).toUpperCase());
        await watcher.watch([{ path: wrongCase, excludes: [], recursive: false }]);
        return basicCrudTest(join(wrongCase, 'newFile.txt'));
    });
    (isLinux /* linux: is case sensitive */ ? test.skip : test)('wrong casing (file watch)', async function () {
        const filePath = join(testDir, 'LOREM.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false }]);
        return basicCrudTest(filePath, true);
    });
    test('invalid path does not explode', async function () {
        const invalidPath = join(testDir, 'invalid');
        await watcher.watch([{ path: invalidPath, excludes: [], recursive: false }]);
    });
    test('watchFileContents', async function () {
        const watchedPath = join(testDir, 'lorem.txt');
        const cts = new CancellationTokenSource();
        const readyPromise = new DeferredPromise();
        const chunkPromise = new DeferredPromise();
        const watchPromise = watchFileContents(watchedPath, () => chunkPromise.complete(), () => readyPromise.complete(), cts.token);
        await readyPromise.p;
        Promises.writeFile(watchedPath, 'Hello World');
        await chunkPromise.p;
        cts.cancel(); // this will resolve `watchPromise`
        return watchPromise;
    });
    test('watching same or overlapping paths supported when correlation is applied', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], recursive: false, correlationId: 1 }
        ]);
        await basicCrudTest(join(testDir, 'newFile_1.txt'), undefined, null, 1);
        await watcher.watch([
            { path: testDir, excludes: [], recursive: false, correlationId: 1 },
            { path: testDir, excludes: [], recursive: false, correlationId: 2, },
            { path: testDir, excludes: [], recursive: false, correlationId: undefined }
        ]);
        await basicCrudTest(join(testDir, 'newFile_2.txt'), undefined, null, 3);
        await basicCrudTest(join(testDir, 'otherNewFile.txt'), undefined, null, 3);
    });
    test('watching missing path emits watcher fail event', async function () {
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'missing');
        watcher.watch([{ path: folderPath, excludes: [], recursive: true }]);
        await onDidWatchFail;
    });
    test('deleting watched path emits watcher fail and delete event when correlated (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false, correlationId: 1 }]);
        const instance = Array.from(watcher.watchers)[0].instance;
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, 1);
        fs.promises.unlink(filePath);
        await onDidWatchFail;
        await changeFuture;
        assert.strictEqual(instance.failed, true);
    });
    (isMacintosh || isWindows /* macOS: does not seem to report deletes on folders | Windows: reports on('error') event only */ ? test.skip : test)('deleting watched path emits watcher fail and delete event when correlated (folder watch)', async function () {
        const folderPath = join(testDir, 'deep');
        await watcher.watch([{ path: folderPath, excludes: [], recursive: false, correlationId: 1 }]);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const changeFuture = awaitEvent(watcher, folderPath, 2 /* FileChangeType.DELETED */, 1);
        Promises.rm(folderPath, RimRafMode.UNLINK);
        await onDidWatchFail;
        await changeFuture;
    });
    test('watch requests support suspend/resume (file, does not exist in beginning)', async function () {
        const filePath = join(testDir, 'not-found.txt');
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), 'polling');
        await basicCrudTest(filePath, undefined, null, undefined, true);
        await basicCrudTest(filePath, undefined, null, undefined, true);
    });
    test('watch requests support suspend/resume (file, exists in beginning)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        await basicCrudTest(filePath, true);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), 'polling');
        await basicCrudTest(filePath, undefined, null, undefined, true);
    });
    (isWindows /* Windows: does not seem to report this */ ? test.skip : test)('watch requests support suspend/resume (folder, does not exist in beginning)', async function () {
        let onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'not-found');
        const request = { path: folderPath, excludes: [], recursive: false };
        await watcher.watch([request]);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), 'polling');
        let changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
        let onDidWatch = Event.toPromise(watcher.onDidWatch);
        await fs.promises.mkdir(folderPath);
        await changeFuture;
        await onDidWatch;
        assert.strictEqual(watcher.isSuspended(request), false);
        if (isWindows) { // somehow failing on macOS/Linux
            const filePath = join(folderPath, 'newFile.txt');
            await basicCrudTest(filePath);
            onDidWatchFail = Event.toPromise(watcher.onWatchFail);
            await fs.promises.rmdir(folderPath);
            await onDidWatchFail;
            changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
            onDidWatch = Event.toPromise(watcher.onDidWatch);
            await fs.promises.mkdir(folderPath);
            await changeFuture;
            await onDidWatch;
            await timeout(500); // somehow needed on Linux
            await basicCrudTest(filePath);
        }
    });
    (isMacintosh /* macOS: does not seem to report this */ ? test.skip : test)('watch requests support suspend/resume (folder, exists in beginning)', async function () {
        const folderPath = join(testDir, 'deep');
        await watcher.watch([{ path: folderPath, excludes: [], recursive: false }]);
        const filePath = join(folderPath, 'newFile.txt');
        await basicCrudTest(filePath);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        await Promises.rm(folderPath);
        await onDidWatchFail;
        const changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
        const onDidWatch = Event.toPromise(watcher.onDidWatch);
        await fs.promises.mkdir(folderPath);
        await changeFuture;
        await onDidWatch;
        await timeout(500); // somehow needed on Linux
        await basicCrudTest(filePath);
    });
    test('parcel watcher reused when present for non-recursive file watching (uncorrelated)', function () {
        return testParcelWatcherReused(undefined);
    });
    test('parcel watcher reused when present for non-recursive file watching (correlated)', function () {
        return testParcelWatcherReused(2);
    });
    function createParcelWatcher() {
        const recursiveWatcher = new TestParcelWatcher();
        recursiveWatcher.setVerboseLogging(loggingEnabled);
        recursiveWatcher.onDidLogMessage(e => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test message] ${e.message}`);
            }
        });
        recursiveWatcher.onDidError(e => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test error] ${e.error}`);
            }
        });
        return recursiveWatcher;
    }
    async function testParcelWatcherReused(correlationId) {
        const recursiveWatcher = createParcelWatcher();
        await recursiveWatcher.watch([{ path: testDir, excludes: [], recursive: true, correlationId: 1 }]);
        const recursiveInstance = Array.from(recursiveWatcher.watchers)[0];
        assert.strictEqual(recursiveInstance.subscriptionsCount, 0);
        await createWatcher(recursiveWatcher);
        const filePath = join(testDir, 'deep', 'conway.js');
        await watcher.watch([{ path: filePath, excludes: [], recursive: false, correlationId }]);
        const { instance } = Array.from(watcher.watchers)[0];
        assert.strictEqual(instance.isReusingRecursiveWatcher, true);
        assert.strictEqual(recursiveInstance.subscriptionsCount, 1);
        let changeFuture = awaitEvent(watcher, filePath, isMacintosh /* somehow fsevents seems to report still on the initial create from test setup */ ? 1 /* FileChangeType.ADDED */ : 0 /* FileChangeType.UPDATED */, correlationId);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        await recursiveWatcher.stop();
        recursiveWatcher.dispose();
        await timeout(500); // give the watcher some time to restart
        changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, correlationId);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        assert.strictEqual(instance.isReusingRecursiveWatcher, false);
    }
    test('watch requests support suspend/resume (file, does not exist in beginning, parcel watcher reused)', async function () {
        const recursiveWatcher = createParcelWatcher();
        await recursiveWatcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        await createWatcher(recursiveWatcher);
        const filePath = join(testDir, 'not-found-2.txt');
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const request = { path: filePath, excludes: [], recursive: false };
        await watcher.watch([request]);
        await onDidWatchFail;
        assert.strictEqual(watcher.isSuspended(request), true);
        const changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        assert.strictEqual(watcher.isSuspended(request), false);
    });
    test('event type filter (file watch)', async function () {
        const filePath = join(testDir, 'lorem.txt');
        const request = { path: filePath, excludes: [], recursive: false, filter: 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */, correlationId: 1 };
        await watcher.watch([request]);
        // Change file
        let changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, 1);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, 1);
        await fs.promises.unlink(filePath);
        await changeFuture;
    });
    test('event type filter (folder watch)', async function () {
        const request = { path: testDir, excludes: [], recursive: false, filter: 2 /* FileChangeFilter.UPDATED */ | 8 /* FileChangeFilter.DELETED */, correlationId: 1 };
        await watcher.watch([request]);
        // Change file
        const filePath = join(testDir, 'lorem.txt');
        let changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, 1);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, 1);
        await fs.promises.unlink(filePath);
        await changeFuture;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZWpzV2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3Qvbm9kZS9ub2RlanNXYXRjaGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUc1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU1RCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDZEQUE2RDtBQUM3RCwwQ0FBMEM7QUFFMUMsS0FBSyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtJQUVwQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXBCLE1BQU0saUJBQWtCLFNBQVEsYUFBYTtRQUE3Qzs7WUFFNkIseUNBQW9DLEdBQUcsR0FBRyxDQUFDO1lBRXRELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7WUFDMUQsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1lBRXBDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUM7UUFjbkQsQ0FBQztRQVptQixzQkFBc0I7WUFDeEMsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRWtCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBcUM7WUFDckUsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlCLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNyQyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1lBQzlCLENBQUM7WUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLENBQUM7S0FDRDtJQUVELElBQUksT0FBZSxDQUFDO0lBQ3BCLElBQUksT0FBMEIsQ0FBQztJQUUvQixJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFFM0IsU0FBUyxhQUFhLENBQUMsTUFBZTtRQUNyQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQ3hCLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRTlCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUUvQiw0REFBNEQ7UUFDNUQsMkRBQTJEO1FBQzNELHlEQUF5RDtRQUN6RCx3Q0FBd0M7UUFDeEMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUVuRyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRTlGLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssVUFBVSxhQUFhLENBQUMsUUFBb0Q7UUFDaEYsTUFBTSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDdEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBRW5CLE9BQU8sR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUzQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNCLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ2xFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVsQixrREFBa0Q7UUFDbEQsbURBQW1EO1FBQ25ELG1EQUFtRDtRQUNuRCxjQUFjO1FBQ2QsT0FBTyxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNsRSxDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsS0FBSyxDQUFDLElBQW9CO1FBQ2xDLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxpQ0FBeUIsQ0FBQyxDQUFDLE9BQU8sT0FBTyxDQUFDO1lBQzFDLG1DQUEyQixDQUFDLENBQUMsT0FBTyxTQUFTLENBQUM7WUFDOUMsT0FBTyxDQUFDLENBQUMsT0FBTyxTQUFTLENBQUM7UUFDM0IsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLFVBQVUsVUFBVSxDQUFDLE9BQTBCLEVBQUUsSUFBWSxFQUFFLElBQW9CLEVBQUUsYUFBNkIsRUFBRSxhQUFzQjtRQUM5SSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxJQUFJLE9BQU8sQ0FBTyxPQUFPLENBQUMsRUFBRTtZQUNqQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDaEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbkQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDNUIsSUFBSSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssYUFBYSxDQUFDLEVBQUUsQ0FBQzt3QkFDMUosT0FBTyxFQUFFLENBQUM7d0JBQ1YsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLGFBQWEsRUFBRSxDQUFDOzRCQUNsRSxTQUFTLENBQUMsVUFBVTt3QkFDckIsQ0FBQzt3QkFFRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3JCLE9BQU8sRUFBRSxDQUFDO3dCQUNWLE1BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSztRQUNsQyxNQUFNLE9BQU8sR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDbEUsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUzQyxXQUFXO1FBQ1gsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNqRCxJQUFJLFlBQVksR0FBcUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxXQUFXLCtCQUF1QixDQUFDO1FBQzVGLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDckQsTUFBTSxZQUFZLENBQUM7UUFFbkIsYUFBYTtRQUNiLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEQsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSwrQkFBdUIsQ0FBQztRQUN4RSxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sWUFBWSxDQUFDO1FBRW5CLGNBQWM7UUFDZCxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdkQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxXQUFXLGlDQUF5QjtZQUN4RCxVQUFVLENBQUMsT0FBTyxFQUFFLGVBQWUsK0JBQXVCO1NBQzFELENBQUMsQ0FBQztRQUNILE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEQsTUFBTSxZQUFZLENBQUM7UUFFbkIsZ0JBQWdCO1FBQ2hCLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3hELFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQzFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxpQ0FBeUI7WUFDMUQsVUFBVSxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsK0JBQXVCO1NBQzVELENBQUMsQ0FBQztRQUNILE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN4RCxNQUFNLFlBQVksQ0FBQztRQUVuQiwwQ0FBMEM7UUFDMUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDN0QsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxlQUFlLGlDQUF5QjtZQUM1RCxVQUFVLENBQUMsT0FBTyxFQUFFLG1CQUFtQiwrQkFBdUI7U0FDOUQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVELE1BQU0sWUFBWSxDQUFDO1FBQ25CLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQztRQUV0Qyw0Q0FBNEM7UUFDNUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDOUQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsaUNBQXlCO1lBQzlELFVBQVUsQ0FBQyxPQUFPLEVBQUUscUJBQXFCLCtCQUF1QjtTQUNoRSxDQUFDLENBQUM7UUFDSCxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNoRSxNQUFNLFlBQVksQ0FBQztRQUNuQixpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQztRQUUxQyxZQUFZO1FBQ1osTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNyRCxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUMxQixVQUFVLENBQUMsT0FBTyxFQUFFLGVBQWUsaUNBQXlCO1lBQzVELFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSwrQkFBdUI7U0FDeEQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN0RCxNQUFNLFlBQVksQ0FBQztRQUVuQixjQUFjO1FBQ2QsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN0RCxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUMxQixVQUFVLENBQUMsT0FBTyxFQUFFLGlCQUFpQixpQ0FBeUI7WUFDOUQsVUFBVSxDQUFDLE9BQU8sRUFBRSxlQUFlLCtCQUF1QjtTQUMxRCxDQUFDLENBQUM7UUFDSCxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDMUQsTUFBTSxZQUFZLENBQUM7UUFFbkIsWUFBWTtRQUNaLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxjQUFjLCtCQUF1QixDQUFDO1FBQ3pFLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFELE1BQU0sWUFBWSxDQUFDO1FBRW5CLGNBQWM7UUFDZCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDeEQsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLCtCQUF1QixDQUFDO1FBQzNFLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sWUFBWSxDQUFDO1FBRW5CLGNBQWM7UUFDZCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxjQUFjLGlDQUF5QixDQUFDO1FBQzNFLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDekQsTUFBTSxZQUFZLENBQUM7UUFFbkIsa0JBQWtCO1FBQ2xCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQy9ELFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGtCQUFrQiwrQkFBdUIsQ0FBQztRQUM3RSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNwRSxNQUFNLFlBQVksQ0FBQztRQUVuQixjQUFjO1FBQ2QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxpQ0FBeUIsQ0FBQztRQUMzRSxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sWUFBWSxDQUFDO1FBRW5CLGdCQUFnQjtRQUNoQixZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsaUNBQXlCLENBQUM7UUFDN0UsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sWUFBWSxDQUFDO1FBRW5CLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQkFBcUIsRUFBRSxLQUFLO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDNUMsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ25FLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFM0MsY0FBYztRQUNkLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxpQ0FBeUIsQ0FBQztRQUN6RSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sWUFBWSxDQUFDO1FBRW5CLGNBQWM7UUFDZCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLGlDQUF5QixDQUFDO1FBQ3JFLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsTUFBTSxZQUFZLENBQUM7UUFFbkIsbUJBQW1CO1FBQ25CLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFMUUsWUFBWTtRQUNaLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsaUNBQXlCLENBQUM7UUFDckUsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLFFBQVEsUUFBUSxDQUFDLENBQUM7UUFDckQsTUFBTSxZQUFZLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSztRQUN6QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpFLHlCQUF5QjtRQUN6QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sWUFBWSxHQUFxQixVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsaUNBQXlCLENBQUM7UUFDaEcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sWUFBWSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUs7UUFDdkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFFLHlCQUF5QjtRQUN6QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkMsTUFBTSxZQUFZLEdBQXFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsV0FBVyxpQ0FBeUIsQ0FBQztRQUNoRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdEQsTUFBTSxZQUFZLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsS0FBSztRQUMzQyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpFLGVBQWU7UUFFZixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUVwRCxNQUFNLFlBQVksR0FBcUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLCtCQUF1QixDQUFDO1FBQy9GLE1BQU0sWUFBWSxHQUFxQixVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksK0JBQXVCLENBQUM7UUFDL0YsTUFBTSxZQUFZLEdBQXFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSwrQkFBdUIsQ0FBQztRQUUvRixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUM7WUFDdkQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUM7WUFDdkQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUM7U0FDdkQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRTlELGtCQUFrQjtRQUVsQixNQUFNLGFBQWEsR0FBcUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLGlDQUF5QixDQUFDO1FBQ2xHLE1BQU0sYUFBYSxHQUFxQixVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksaUNBQXlCLENBQUM7UUFDbEcsTUFBTSxhQUFhLEdBQXFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxpQ0FBeUIsQ0FBQztRQUVsRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQztZQUN4RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDO1lBQ3hELE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUM7U0FDeEQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBRWpFLDJCQUEyQjtRQUUzQixNQUFNLFdBQVcsR0FBcUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLCtCQUF1QixDQUFDO1FBQ3JILE1BQU0sV0FBVyxHQUFxQixVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsK0JBQXVCLENBQUM7UUFDckgsTUFBTSxXQUFXLEdBQXFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQywrQkFBdUIsQ0FBQztRQUVySCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDO1lBQy9HLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUMvRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUM7U0FDL0csQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRTNELGtCQUFrQjtRQUVsQixNQUFNLGFBQWEsR0FBcUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLGlDQUF5QixDQUFDO1FBQ2xHLE1BQU0sYUFBYSxHQUFxQixVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksaUNBQXlCLENBQUM7UUFDbEcsTUFBTSxhQUFhLEdBQXFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxpQ0FBeUIsQ0FBQztRQUVsRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDdEMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDdEMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUs7UUFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTFFLGtCQUFrQjtRQUVsQixNQUFNLGFBQWEsR0FBcUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLGlDQUF5QixDQUFDO1FBRTlGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDO1lBQ3BELE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUM7WUFDcEQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQztTQUNwRCxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUs7UUFDbkQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0UsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6RSxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLO1FBQzlDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDNUMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUUsT0FBTyxhQUFhLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUs7UUFDbkQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpFLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUs7UUFDbEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWpHLE9BQU8sYUFBYSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLO1FBQ2xELE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5RyxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrRUFBa0UsRUFBRSxLQUFLO1FBQzdFLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFdkksT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0VBQWtFLEVBQUUsS0FBSztRQUM3RSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0csT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSztRQUN2QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDcEMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEYsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDOUUsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLFNBQVMsQ0FBQyx3RUFBd0UsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZ0NBQWdDLEVBQUUsS0FBSztRQUM5SSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFNUMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0RSxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLFVBQVUsYUFBYSxDQUFDLFFBQWdCLEVBQUUsT0FBaUIsRUFBRSxhQUE2QixFQUFFLGFBQXNCLEVBQUUsa0JBQTRCO1FBQ3BKLElBQUksWUFBOEIsQ0FBQztRQUVuQyxXQUFXO1FBQ1gsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxnQ0FBd0IsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ2pHLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDbEQsTUFBTSxZQUFZLENBQUM7WUFDbkIsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUN4QixNQUFNLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDO1FBRUQsY0FBYztRQUNkLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsa0NBQTBCLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNuRyxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sWUFBWSxDQUFDO1FBRW5CLGNBQWM7UUFDZCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLGtDQUEwQixhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbkcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtRQUNoRixNQUFNLFlBQVksQ0FBQztJQUNwQixDQUFDO0lBRUQsQ0FBQyxTQUFTLENBQUMsd0VBQXdFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLDhCQUE4QixFQUFFLEtBQUs7UUFDNUksTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFNUMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV0RSxPQUFPLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyw0QkFBNEIsRUFBRSxLQUFLO1FBQzVGLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5DLDREQUE0RDtRQUM1RCxNQUFNLE9BQU8sR0FBRyxrQkFBa0IsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUV0SSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXpFLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUNwRCxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLDBCQUEwQixFQUFFLEtBQUs7UUFDMUYscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFbkMsNERBQTREO1FBQzVELE1BQU0sT0FBTyxHQUFHLGtCQUFrQixjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDO1FBRWpKLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekUsT0FBTyxhQUFhLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUFDO0lBRUgsQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLDZCQUE2QixFQUFFLEtBQUs7UUFDL0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUUxRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNFLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUN0RCxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxLQUFLO1FBQzdGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDNUMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUUxRSxPQUFPLGFBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSztRQUMxQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSztRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRS9DLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUUxQyxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO1FBQ2pELE1BQU0sWUFBWSxHQUFHLElBQUksZUFBZSxFQUFRLENBQUM7UUFDakQsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRTdILE1BQU0sWUFBWSxDQUFDLENBQUMsQ0FBQztRQUVyQixRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUUvQyxNQUFNLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFckIsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsbUNBQW1DO1FBRWpELE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEtBQUs7UUFDckYsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDO1lBQ25CLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRTtTQUNuRSxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEUsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDO1lBQ25CLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRTtZQUNuRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLEdBQUc7WUFDcEUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFO1NBQzNFLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4RSxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLO1FBQzNELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckUsTUFBTSxjQUFjLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0ZBQXdGLEVBQUUsS0FBSztRQUNuRyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTVDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1RixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFFMUQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLGtDQUEwQixDQUFDLENBQUMsQ0FBQztRQUM5RSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QixNQUFNLGNBQWMsQ0FBQztRQUNyQixNQUFNLFlBQVksQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsaUdBQWlHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLDBGQUEwRixFQUFFLEtBQUs7UUFDaFAsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV6QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFOUYsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLGtDQUEwQixDQUFDLENBQUMsQ0FBQztRQUNoRixRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsTUFBTSxjQUFjLENBQUM7UUFDckIsTUFBTSxZQUFZLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkVBQTJFLEVBQUUsS0FBSztRQUN0RixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVELE1BQU0sT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUNuRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sY0FBYyxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU1RCxNQUFNLGFBQWEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEUsTUFBTSxhQUFhLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEtBQUs7UUFDOUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM1QyxNQUFNLE9BQU8sR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDbkUsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUUvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1RCxNQUFNLGFBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEMsTUFBTSxjQUFjLENBQUM7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVELE1BQU0sYUFBYSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsU0FBUyxDQUFDLDJDQUEyQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyw2RUFBNkUsRUFBRSxLQUFLO1FBQzlKLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTFELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDOUMsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ3JFLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxjQUFjLENBQUM7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVELElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSwrQkFBdUIsQ0FBQztRQUN6RSxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sWUFBWSxDQUFDO1FBQ25CLE1BQU0sVUFBVSxDQUFDO1FBRWpCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4RCxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUMsaUNBQWlDO1lBQ2pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDakQsTUFBTSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFOUIsY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEMsTUFBTSxjQUFjLENBQUM7WUFFckIsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSwrQkFBdUIsQ0FBQztZQUNyRSxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakQsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwQyxNQUFNLFlBQVksQ0FBQztZQUNuQixNQUFNLFVBQVUsQ0FBQztZQUVqQixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtZQUU5QyxNQUFNLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLFdBQVcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMscUVBQXFFLEVBQUUsS0FBSztRQUN0SixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUUsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1RCxNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDOUIsTUFBTSxjQUFjLENBQUM7UUFFckIsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLCtCQUF1QixDQUFDO1FBQzNFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEMsTUFBTSxZQUFZLENBQUM7UUFDbkIsTUFBTSxVQUFVLENBQUM7UUFFakIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7UUFFOUMsTUFBTSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUZBQW1GLEVBQUU7UUFDekYsT0FBTyx1QkFBdUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpRkFBaUYsRUFBRTtRQUN2RixPQUFPLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxtQkFBbUI7UUFDM0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDakQsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkQsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BDLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvQixJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMxRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLGdCQUFnQixDQUFDO0lBQ3pCLENBQUM7SUFFRCxLQUFLLFVBQVUsdUJBQXVCLENBQUMsYUFBaUM7UUFDdkUsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsRUFBRSxDQUFDO1FBQy9DLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRW5HLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTVELE1BQU0sYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDcEQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekYsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFNUQsSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLGtGQUFrRixDQUFDLENBQUMsOEJBQXNCLENBQUMsK0JBQXVCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDaE4sTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNsRCxNQUFNLFlBQVksQ0FBQztRQUVuQixNQUFNLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlCLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTNCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDO1FBRTVELFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsa0NBQTBCLGFBQWEsQ0FBQyxDQUFDO1FBQ3BGLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEQsTUFBTSxZQUFZLENBQUM7UUFFbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELElBQUksQ0FBQyxrR0FBa0csRUFBRSxLQUFLO1FBQzdHLE1BQU0sZ0JBQWdCLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQztRQUMvQyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFakYsTUFBTSxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUV0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFbEQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ25FLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0IsTUFBTSxjQUFjLENBQUM7UUFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXZELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSwrQkFBdUIsQ0FBQztRQUN6RSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sWUFBWSxDQUFDO1FBRW5CLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLO1FBQzNDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDNUMsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsbUVBQW1ELEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDO1FBQ2xKLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFL0IsY0FBYztRQUNkLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxrQ0FBMEIsQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFlBQVksQ0FBQztRQUVuQixjQUFjO1FBQ2QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxrQ0FBMEIsQ0FBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuQyxNQUFNLFlBQVksQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLO1FBQzdDLE1BQU0sT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLG1FQUFtRCxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNqSixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRS9CLGNBQWM7UUFDZCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzVDLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxrQ0FBMEIsQ0FBQyxDQUFDLENBQUM7UUFDNUUsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFlBQVksQ0FBQztRQUVuQixjQUFjO1FBQ2QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxrQ0FBMEIsQ0FBQyxDQUFDLENBQUM7UUFDeEUsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuQyxNQUFNLFlBQVksQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=