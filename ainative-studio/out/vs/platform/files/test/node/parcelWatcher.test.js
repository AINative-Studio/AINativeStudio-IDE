/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { realpathSync, promises } from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../../base/common/async.js';
import { dirname, join } from '../../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { Promises, RimRafMode } from '../../../../base/node/pfs.js';
import { getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { ParcelWatcher } from '../../node/watcher/parcel/parcelWatcher.js';
import { getDriveLetter } from '../../../../base/common/extpath.js';
import { ltrim } from '../../../../base/common/strings.js';
import { FileAccess } from '../../../../base/common/network.js';
import { extUriBiasedIgnorePathCase } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { addUNCHostToAllowlist } from '../../../../base/node/unc.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export class TestParcelWatcher extends ParcelWatcher {
    constructor() {
        super(...arguments);
        this.suspendedWatchRequestPollingInterval = 100;
        this._onDidWatch = this._register(new Emitter());
        this.onDidWatch = this._onDidWatch.event;
        this.onWatchFail = this._onDidWatchFail.event;
    }
    async testRemoveDuplicateRequests(paths, excludes = []) {
        // Work with strings as paths to simplify testing
        const requests = paths.map(path => {
            return { path, excludes, recursive: true };
        });
        return (await this.removeDuplicateRequests(requests, false /* validate paths skipped for tests */)).map(request => request.path);
    }
    getUpdateWatchersDelay() {
        return 0;
    }
    async doWatch(requests) {
        await super.doWatch(requests);
        await this.whenReady();
        this._onDidWatch.fire();
    }
    async whenReady() {
        for (const watcher of this.watchers) {
            await watcher.ready;
        }
    }
}
// this suite has shown flaky runs in Azure pipelines where
// tasks would just hang and timeout after a while (not in
// mocha but generally). as such they will run only on demand
// whenever we update the watcher library.
suite.skip('File Watcher (parcel)', function () {
    this.timeout(10000);
    let testDir;
    let watcher;
    let loggingEnabled = false;
    function enableLogging(enable) {
        loggingEnabled = enable;
        watcher?.setVerboseLogging(enable);
    }
    enableLogging(loggingEnabled);
    setup(async () => {
        watcher = new TestParcelWatcher();
        watcher.setVerboseLogging(loggingEnabled);
        watcher.onDidLogMessage(e => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test message] ${e.message}`);
            }
        });
        watcher.onDidError(e => {
            if (loggingEnabled) {
                console.log(`[recursive watcher test error] ${e.error}`);
            }
        });
        // Rule out strange testing conditions by using the realpath
        // here. for example, on macOS the tmp dir is potentially a
        // symlink in some of the root folders, which is a rather
        // unrealisic case for the file watcher.
        testDir = URI.file(getRandomTestPath(realpathSync(tmpdir()), 'vsctests', 'filewatcher')).fsPath;
        const sourceDir = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/service').fsPath;
        await Promises.copy(sourceDir, testDir, { preserveSymlinks: false });
    });
    teardown(async () => {
        const watchers = Array.from(watcher.watchers).length;
        let stoppedInstances = 0;
        for (const instance of watcher.watchers) {
            Event.once(instance.onDidStop)(() => {
                if (instance.stopped) {
                    stoppedInstances++;
                }
            });
        }
        await watcher.stop();
        assert.strictEqual(stoppedInstances, watchers, 'All watchers must be stopped before the test ends');
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
    async function awaitEvent(watcher, path, type, failOnEventReason, correlationId, expectedCount) {
        if (loggingEnabled) {
            console.log(`Awaiting change type '${toMsg(type)}' on file '${path}'`);
        }
        // Await the event
        const res = await new Promise((resolve, reject) => {
            let counter = 0;
            const disposable = watcher.onDidChangeFile(events => {
                for (const event of events) {
                    if (extUriBiasedIgnorePathCase.isEqual(event.resource, URI.file(path)) && event.type === type && (correlationId === null || event.cId === correlationId)) {
                        counter++;
                        if (typeof expectedCount === 'number' && counter < expectedCount) {
                            continue; // not yet
                        }
                        disposable.dispose();
                        if (failOnEventReason) {
                            reject(new Error(`Unexpected file event: ${failOnEventReason}`));
                        }
                        else {
                            setImmediate(() => resolve(events)); // copied from parcel watcher tests, seems to drop unrelated events on macOS
                        }
                        break;
                    }
                }
            });
        });
        // Unwind from the event call stack: we have seen crashes in Parcel
        // when e.g. calling `unsubscribe` directly from the stack of a file
        // change event
        // Refs: https://github.com/microsoft/vscode/issues/137430
        await timeout(1);
        return res;
    }
    function awaitMessage(watcher, type) {
        if (loggingEnabled) {
            console.log(`Awaiting message of type ${type}`);
        }
        // Await the message
        return new Promise(resolve => {
            const disposable = watcher.onDidLogMessage(msg => {
                if (msg.type === type) {
                    disposable.dispose();
                    resolve();
                }
            });
        });
    }
    test('basics', async function () {
        const request = { path: testDir, excludes: [], recursive: true };
        await watcher.watch([request]);
        const instance = Array.from(watcher.watchers)[0];
        assert.strictEqual(request, instance.request);
        assert.strictEqual(instance.failed, false);
        assert.strictEqual(instance.stopped, false);
        const disposables = new DisposableStore();
        const subscriptions1 = new Map();
        const subscriptions2 = new Map();
        // New file
        const newFilePath = join(testDir, 'deep', 'newFile.txt');
        disposables.add(instance.subscribe(newFilePath, change => subscriptions1.set(change.resource.fsPath, change.type)));
        disposables.add(instance.subscribe(newFilePath, change => subscriptions2.set(change.resource.fsPath, change.type))); // can subscribe multiple times
        assert.strictEqual(instance.include(newFilePath), true);
        assert.strictEqual(instance.exclude(newFilePath), false);
        let changeFuture = awaitEvent(watcher, newFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newFilePath, 'Hello World');
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFilePath), 1 /* FileChangeType.ADDED */);
        assert.strictEqual(subscriptions2.get(newFilePath), 1 /* FileChangeType.ADDED */);
        // New folder
        const newFolderPath = join(testDir, 'deep', 'New Folder');
        disposables.add(instance.subscribe(newFolderPath, change => subscriptions1.set(change.resource.fsPath, change.type)));
        const disposable = instance.subscribe(newFolderPath, change => subscriptions2.set(change.resource.fsPath, change.type));
        disposable.dispose();
        assert.strictEqual(instance.include(newFolderPath), true);
        assert.strictEqual(instance.exclude(newFolderPath), false);
        changeFuture = awaitEvent(watcher, newFolderPath, 1 /* FileChangeType.ADDED */);
        await promises.mkdir(newFolderPath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFolderPath), 1 /* FileChangeType.ADDED */);
        assert.strictEqual(subscriptions2.has(newFolderPath), false /* subscription was disposed before the event */);
        // Rename file
        let renamedFilePath = join(testDir, 'deep', 'renamedFile.txt');
        disposables.add(instance.subscribe(renamedFilePath, change => subscriptions1.set(change.resource.fsPath, change.type)));
        changeFuture = Promise.all([
            awaitEvent(watcher, newFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFilePath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(newFilePath, renamedFilePath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFilePath), 2 /* FileChangeType.DELETED */);
        assert.strictEqual(subscriptions1.get(renamedFilePath), 1 /* FileChangeType.ADDED */);
        // Rename folder
        let renamedFolderPath = join(testDir, 'deep', 'Renamed Folder');
        disposables.add(instance.subscribe(renamedFolderPath, change => subscriptions1.set(change.resource.fsPath, change.type)));
        changeFuture = Promise.all([
            awaitEvent(watcher, newFolderPath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, renamedFolderPath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(newFolderPath, renamedFolderPath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(newFolderPath), 2 /* FileChangeType.DELETED */);
        assert.strictEqual(subscriptions1.get(renamedFolderPath), 1 /* FileChangeType.ADDED */);
        // Rename file (same name, different case)
        const caseRenamedFilePath = join(testDir, 'deep', 'RenamedFile.txt');
        changeFuture = Promise.all([
            awaitEvent(watcher, renamedFilePath, 2 /* FileChangeType.DELETED */),
            awaitEvent(watcher, caseRenamedFilePath, 1 /* FileChangeType.ADDED */)
        ]);
        await Promises.rename(renamedFilePath, caseRenamedFilePath);
        await changeFuture;
        renamedFilePath = caseRenamedFilePath;
        // Rename folder (same name, different case)
        const caseRenamedFolderPath = join(testDir, 'deep', 'REnamed Folder');
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
        const copiedFilepath = join(testDir, 'deep', 'copiedFile.txt');
        changeFuture = awaitEvent(watcher, copiedFilepath, 1 /* FileChangeType.ADDED */);
        await promises.copyFile(movedFilepath, copiedFilepath);
        await changeFuture;
        // Copy folder
        const copiedFolderpath = join(testDir, 'deep', 'Copied Folder');
        changeFuture = awaitEvent(watcher, copiedFolderpath, 1 /* FileChangeType.ADDED */);
        await Promises.copy(movedFolderpath, copiedFolderpath, { preserveSymlinks: false });
        await changeFuture;
        // Change file
        changeFuture = awaitEvent(watcher, copiedFilepath, 0 /* FileChangeType.UPDATED */);
        await Promises.writeFile(copiedFilepath, 'Hello Change');
        await changeFuture;
        // Create new file
        const anotherNewFilePath = join(testDir, 'deep', 'anotherNewFile.txt');
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(anotherNewFilePath, 'Hello Another World');
        await changeFuture;
        // Read file does not emit event
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 0 /* FileChangeType.UPDATED */, 'unexpected-event-from-read-file');
        await promises.readFile(anotherNewFilePath);
        await Promise.race([timeout(100), changeFuture]);
        // Stat file does not emit event
        changeFuture = awaitEvent(watcher, anotherNewFilePath, 0 /* FileChangeType.UPDATED */, 'unexpected-event-from-stat');
        await promises.stat(anotherNewFilePath);
        await Promise.race([timeout(100), changeFuture]);
        // Stat folder does not emit event
        changeFuture = awaitEvent(watcher, copiedFolderpath, 0 /* FileChangeType.UPDATED */, 'unexpected-event-from-stat');
        await promises.stat(copiedFolderpath);
        await Promise.race([timeout(100), changeFuture]);
        // Delete file
        changeFuture = awaitEvent(watcher, copiedFilepath, 2 /* FileChangeType.DELETED */);
        disposables.add(instance.subscribe(copiedFilepath, change => subscriptions1.set(change.resource.fsPath, change.type)));
        await promises.unlink(copiedFilepath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(copiedFilepath), 2 /* FileChangeType.DELETED */);
        // Delete folder
        changeFuture = awaitEvent(watcher, copiedFolderpath, 2 /* FileChangeType.DELETED */);
        disposables.add(instance.subscribe(copiedFolderpath, change => subscriptions1.set(change.resource.fsPath, change.type)));
        await promises.rmdir(copiedFolderpath);
        await changeFuture;
        assert.strictEqual(subscriptions1.get(copiedFolderpath), 2 /* FileChangeType.DELETED */);
        disposables.dispose();
    });
    (isMacintosh /* this test seems not possible with fsevents backend */ ? test.skip : test)('basics (atomic writes)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        // Delete + Recreate file
        const newFilePath = join(testDir, 'deep', 'conway.js');
        const changeFuture = awaitEvent(watcher, newFilePath, 0 /* FileChangeType.UPDATED */);
        await promises.unlink(newFilePath);
        Promises.writeFile(newFilePath, 'Hello Atomic World');
        await changeFuture;
    });
    (!isLinux /* polling is only used in linux environments (WSL) */ ? test.skip : test)('basics (polling)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], pollingInterval: 100, recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    async function basicCrudTest(filePath, correlationId, expectedCount) {
        // New file
        let changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */, undefined, correlationId, expectedCount);
        await Promises.writeFile(filePath, 'Hello World');
        await changeFuture;
        // Change file
        changeFuture = awaitEvent(watcher, filePath, 0 /* FileChangeType.UPDATED */, undefined, correlationId, expectedCount);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, undefined, correlationId, expectedCount);
        await promises.unlink(filePath);
        await changeFuture;
    }
    test('multiple events', async function () {
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        await promises.mkdir(join(testDir, 'deep-multiple'));
        // multiple add
        const newFilePath1 = join(testDir, 'newFile-1.txt');
        const newFilePath2 = join(testDir, 'newFile-2.txt');
        const newFilePath3 = join(testDir, 'newFile-3.txt');
        const newFilePath4 = join(testDir, 'deep-multiple', 'newFile-1.txt');
        const newFilePath5 = join(testDir, 'deep-multiple', 'newFile-2.txt');
        const newFilePath6 = join(testDir, 'deep-multiple', 'newFile-3.txt');
        const addedFuture1 = awaitEvent(watcher, newFilePath1, 1 /* FileChangeType.ADDED */);
        const addedFuture2 = awaitEvent(watcher, newFilePath2, 1 /* FileChangeType.ADDED */);
        const addedFuture3 = awaitEvent(watcher, newFilePath3, 1 /* FileChangeType.ADDED */);
        const addedFuture4 = awaitEvent(watcher, newFilePath4, 1 /* FileChangeType.ADDED */);
        const addedFuture5 = awaitEvent(watcher, newFilePath5, 1 /* FileChangeType.ADDED */);
        const addedFuture6 = awaitEvent(watcher, newFilePath6, 1 /* FileChangeType.ADDED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello World 1'),
            await Promises.writeFile(newFilePath2, 'Hello World 2'),
            await Promises.writeFile(newFilePath3, 'Hello World 3'),
            await Promises.writeFile(newFilePath4, 'Hello World 4'),
            await Promises.writeFile(newFilePath5, 'Hello World 5'),
            await Promises.writeFile(newFilePath6, 'Hello World 6')
        ]);
        await Promise.all([addedFuture1, addedFuture2, addedFuture3, addedFuture4, addedFuture5, addedFuture6]);
        // multiple change
        const changeFuture1 = awaitEvent(watcher, newFilePath1, 0 /* FileChangeType.UPDATED */);
        const changeFuture2 = awaitEvent(watcher, newFilePath2, 0 /* FileChangeType.UPDATED */);
        const changeFuture3 = awaitEvent(watcher, newFilePath3, 0 /* FileChangeType.UPDATED */);
        const changeFuture4 = awaitEvent(watcher, newFilePath4, 0 /* FileChangeType.UPDATED */);
        const changeFuture5 = awaitEvent(watcher, newFilePath5, 0 /* FileChangeType.UPDATED */);
        const changeFuture6 = awaitEvent(watcher, newFilePath6, 0 /* FileChangeType.UPDATED */);
        await Promise.all([
            await Promises.writeFile(newFilePath1, 'Hello Update 1'),
            await Promises.writeFile(newFilePath2, 'Hello Update 2'),
            await Promises.writeFile(newFilePath3, 'Hello Update 3'),
            await Promises.writeFile(newFilePath4, 'Hello Update 4'),
            await Promises.writeFile(newFilePath5, 'Hello Update 5'),
            await Promises.writeFile(newFilePath6, 'Hello Update 6')
        ]);
        await Promise.all([changeFuture1, changeFuture2, changeFuture3, changeFuture4, changeFuture5, changeFuture6]);
        // copy with multiple files
        const copyFuture1 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy', 'newFile-1.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture2 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy', 'newFile-2.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture3 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy', 'newFile-3.txt'), 1 /* FileChangeType.ADDED */);
        const copyFuture4 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy'), 1 /* FileChangeType.ADDED */);
        await Promises.copy(join(testDir, 'deep-multiple'), join(testDir, 'deep-multiple-copy'), { preserveSymlinks: false });
        await Promise.all([copyFuture1, copyFuture2, copyFuture3, copyFuture4]);
        // multiple delete (single files)
        const deleteFuture1 = awaitEvent(watcher, newFilePath1, 2 /* FileChangeType.DELETED */);
        const deleteFuture2 = awaitEvent(watcher, newFilePath2, 2 /* FileChangeType.DELETED */);
        const deleteFuture3 = awaitEvent(watcher, newFilePath3, 2 /* FileChangeType.DELETED */);
        const deleteFuture4 = awaitEvent(watcher, newFilePath4, 2 /* FileChangeType.DELETED */);
        const deleteFuture5 = awaitEvent(watcher, newFilePath5, 2 /* FileChangeType.DELETED */);
        const deleteFuture6 = awaitEvent(watcher, newFilePath6, 2 /* FileChangeType.DELETED */);
        await Promise.all([
            await promises.unlink(newFilePath1),
            await promises.unlink(newFilePath2),
            await promises.unlink(newFilePath3),
            await promises.unlink(newFilePath4),
            await promises.unlink(newFilePath5),
            await promises.unlink(newFilePath6)
        ]);
        await Promise.all([deleteFuture1, deleteFuture2, deleteFuture3, deleteFuture4, deleteFuture5, deleteFuture6]);
        // multiple delete (folder)
        const deleteFolderFuture1 = awaitEvent(watcher, join(testDir, 'deep-multiple'), 2 /* FileChangeType.DELETED */);
        const deleteFolderFuture2 = awaitEvent(watcher, join(testDir, 'deep-multiple-copy'), 2 /* FileChangeType.DELETED */);
        await Promise.all([Promises.rm(join(testDir, 'deep-multiple'), RimRafMode.UNLINK), Promises.rm(join(testDir, 'deep-multiple-copy'), RimRafMode.UNLINK)]);
        await Promise.all([deleteFolderFuture1, deleteFolderFuture2]);
    });
    test('subsequent watch updates watchers (path)', async function () {
        await watcher.watch([{ path: testDir, excludes: [join(realpathSync(testDir), 'unrelated')], recursive: true }]);
        // New file (*.txt)
        let newTextFilePath = join(testDir, 'deep', 'newFile.txt');
        let changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        await changeFuture;
        await watcher.watch([{ path: join(testDir, 'deep'), excludes: [join(realpathSync(testDir), 'unrelated')], recursive: true }]);
        newTextFilePath = join(testDir, 'deep', 'newFile2.txt');
        changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        await changeFuture;
        await watcher.watch([{ path: join(testDir, 'deep'), excludes: [realpathSync(testDir)], recursive: true }]);
        await watcher.watch([{ path: join(testDir, 'deep'), excludes: [], recursive: true }]);
        newTextFilePath = join(testDir, 'deep', 'newFile3.txt');
        changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        await changeFuture;
    });
    test('invalid path does not crash watcher', async function () {
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true },
            { path: join(testDir, 'invalid-folder'), excludes: [], recursive: true },
            { path: FileAccess.asFileUri('').fsPath, excludes: [], recursive: true }
        ]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('subsequent watch updates watchers (excludes)', async function () {
        await watcher.watch([{ path: testDir, excludes: [realpathSync(testDir)], recursive: true }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('subsequent watch updates watchers (includes)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['nothing'], recursive: true }]);
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('includes are supported', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['**/deep/**'], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('includes are supported (relative pattern explicit)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: [{ base: testDir, pattern: 'deep/newFile.txt' }], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('includes are supported (relative pattern implicit)', async function () {
        await watcher.watch([{ path: testDir, excludes: [], includes: ['deep/newFile.txt'], recursive: true }]);
        return basicCrudTest(join(testDir, 'deep', 'newFile.txt'));
    });
    test('excludes are supported (path)', async function () {
        return testExcludes([join(realpathSync(testDir), 'deep')]);
    });
    test('excludes are supported (glob)', function () {
        return testExcludes(['deep/**']);
    });
    async function testExcludes(excludes) {
        await watcher.watch([{ path: testDir, excludes, recursive: true }]);
        // New file (*.txt)
        const newTextFilePath = join(testDir, 'deep', 'newFile.txt');
        const changeFuture = awaitEvent(watcher, newTextFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newTextFilePath, 'Hello World');
        const res = await Promise.any([
            timeout(500).then(() => true),
            changeFuture.then(() => false)
        ]);
        if (!res) {
            assert.fail('Unexpected change event');
        }
    }
    (isWindows /* windows: cannot create file symbolic link without elevated context */ ? test.skip : test)('symlink support (root)', async function () {
        const link = join(testDir, 'deep-linked');
        const linkTarget = join(testDir, 'deep');
        await promises.symlink(linkTarget, link);
        await watcher.watch([{ path: link, excludes: [], recursive: true }]);
        return basicCrudTest(join(link, 'newFile.txt'));
    });
    (isWindows /* windows: cannot create file symbolic link without elevated context */ ? test.skip : test)('symlink support (via extra watch)', async function () {
        const link = join(testDir, 'deep-linked');
        const linkTarget = join(testDir, 'deep');
        await promises.symlink(linkTarget, link);
        await watcher.watch([{ path: testDir, excludes: [], recursive: true }, { path: link, excludes: [], recursive: true }]);
        return basicCrudTest(join(link, 'newFile.txt'));
    });
    (!isWindows /* UNC is windows only */ ? test.skip : test)('unc support', async function () {
        addUNCHostToAllowlist('localhost');
        // Local UNC paths are in the form of: \\localhost\c$\my_dir
        const uncPath = `\\\\localhost\\${getDriveLetter(testDir)?.toLowerCase()}$\\${ltrim(testDir.substr(testDir.indexOf(':') + 1), '\\')}`;
        await watcher.watch([{ path: uncPath, excludes: [], recursive: true }]);
        return basicCrudTest(join(uncPath, 'deep', 'newFile.txt'));
    });
    (isLinux /* linux: is case sensitive */ ? test.skip : test)('wrong casing', async function () {
        const deepWrongCasedPath = join(testDir, 'DEEP');
        await watcher.watch([{ path: deepWrongCasedPath, excludes: [], recursive: true }]);
        return basicCrudTest(join(deepWrongCasedPath, 'newFile.txt'));
    });
    test('invalid folder does not explode', async function () {
        const invalidPath = join(testDir, 'invalid');
        await watcher.watch([{ path: invalidPath, excludes: [], recursive: true }]);
    });
    (isWindows /* flaky on windows */ ? test.skip : test)('deleting watched path without correlation restarts watching', async function () {
        const watchedPath = join(testDir, 'deep');
        await watcher.watch([{ path: watchedPath, excludes: [], recursive: true }]);
        // Delete watched path and await
        const warnFuture = awaitMessage(watcher, 'warn');
        await Promises.rm(watchedPath, RimRafMode.UNLINK);
        await warnFuture;
        // Restore watched path
        await timeout(1500); // node.js watcher used for monitoring folder restore is async
        await promises.mkdir(watchedPath);
        await timeout(1500); // restart is delayed
        await watcher.whenReady();
        // Verify events come in again
        const newFilePath = join(watchedPath, 'newFile.txt');
        const changeFuture = awaitEvent(watcher, newFilePath, 1 /* FileChangeType.ADDED */);
        await Promises.writeFile(newFilePath, 'Hello World');
        await changeFuture;
    });
    test('correlationId is supported', async function () {
        const correlationId = Math.random();
        await watcher.watch([{ correlationId, path: testDir, excludes: [], recursive: true }]);
        return basicCrudTest(join(testDir, 'newFile.txt'), correlationId);
    });
    test('should not exclude roots that do not overlap', async () => {
        if (isWindows) {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a']), ['C:\\a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\b']), ['C:\\a', 'C:\\b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\b', 'C:\\c\\d\\e']), ['C:\\a', 'C:\\b', 'C:\\c\\d\\e']);
        }
        else {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a']), ['/a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/b']), ['/a', '/b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/b', '/c/d/e']), ['/a', '/b', '/c/d/e']);
        }
    });
    test('should remove sub-folders of other paths', async () => {
        if (isWindows) {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\a\\b']), ['C:\\a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\b', 'C:\\a\\b']), ['C:\\a', 'C:\\b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\b\\a', 'C:\\a', 'C:\\b', 'C:\\a\\b']), ['C:\\a', 'C:\\b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['C:\\a', 'C:\\a\\b', 'C:\\a\\c\\d']), ['C:\\a']);
        }
        else {
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/a/b']), ['/a']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/b', '/a/b']), ['/a', '/b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/b/a', '/a', '/b', '/a/b']), ['/a', '/b']);
            assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/a', '/a/b', '/a/c/d']), ['/a']);
        }
    });
    test('should ignore when everything excluded', async () => {
        assert.deepStrictEqual(await watcher.testRemoveDuplicateRequests(['/foo/bar', '/bar'], ['**', 'something']), []);
    });
    test('watching same or overlapping paths supported when correlation is applied', async () => {
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true, correlationId: 1 }
        ]);
        await basicCrudTest(join(testDir, 'newFile.txt'), null, 1);
        // same path, same options
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [], recursive: true, correlationId: 2, },
            { path: testDir, excludes: [], recursive: true, correlationId: undefined }
        ]);
        await basicCrudTest(join(testDir, 'newFile.txt'), null, 3);
        await basicCrudTest(join(testDir, 'otherNewFile.txt'), null, 3);
        // same path, different options
        await watcher.watch([
            { path: testDir, excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [], recursive: true, correlationId: 2 },
            { path: testDir, excludes: [], recursive: true, correlationId: undefined },
            { path: testDir, excludes: [join(realpathSync(testDir), 'deep')], recursive: true, correlationId: 3 },
            { path: testDir, excludes: [join(realpathSync(testDir), 'other')], recursive: true, correlationId: 4 },
        ]);
        await basicCrudTest(join(testDir, 'newFile.txt'), null, 5);
        await basicCrudTest(join(testDir, 'otherNewFile.txt'), null, 5);
        // overlapping paths (same options)
        await watcher.watch([
            { path: dirname(testDir), excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [], recursive: true, correlationId: 2 },
            { path: join(testDir, 'deep'), excludes: [], recursive: true, correlationId: 3 },
        ]);
        await basicCrudTest(join(testDir, 'deep', 'newFile.txt'), null, 3);
        await basicCrudTest(join(testDir, 'deep', 'otherNewFile.txt'), null, 3);
        // overlapping paths (different options)
        await watcher.watch([
            { path: dirname(testDir), excludes: [], recursive: true, correlationId: 1 },
            { path: testDir, excludes: [join(realpathSync(testDir), 'some')], recursive: true, correlationId: 2 },
            { path: join(testDir, 'deep'), excludes: [join(realpathSync(testDir), 'other')], recursive: true, correlationId: 3 },
        ]);
        await basicCrudTest(join(testDir, 'deep', 'newFile.txt'), null, 3);
        await basicCrudTest(join(testDir, 'deep', 'otherNewFile.txt'), null, 3);
    });
    test('watching missing path emits watcher fail event', async function () {
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'missing');
        watcher.watch([{ path: folderPath, excludes: [], recursive: true }]);
        await onDidWatchFail;
    });
    test('deleting watched path emits watcher fail and delete event if correlated', async function () {
        const folderPath = join(testDir, 'deep');
        await watcher.watch([{ path: folderPath, excludes: [], recursive: true, correlationId: 1 }]);
        let failed = false;
        const instance = Array.from(watcher.watchers)[0];
        assert.strictEqual(instance.include(folderPath), true);
        instance.onDidFail(() => failed = true);
        const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const changeFuture = awaitEvent(watcher, folderPath, 2 /* FileChangeType.DELETED */, undefined, 1);
        Promises.rm(folderPath, RimRafMode.UNLINK);
        await onDidWatchFail;
        await changeFuture;
        assert.strictEqual(failed, true);
        assert.strictEqual(instance.failed, true);
    });
    (!isMacintosh /* Linux/Windows: times out for some reason */ ? test.skip : test)('watch requests support suspend/resume (folder, does not exist in beginning, not reusing watcher)', async () => {
        await testWatchFolderDoesNotExist(false);
    });
    test('watch requests support suspend/resume (folder, does not exist in beginning, reusing watcher)', async () => {
        await testWatchFolderDoesNotExist(true);
    });
    async function testWatchFolderDoesNotExist(reuseExistingWatcher) {
        let onDidWatchFail = Event.toPromise(watcher.onWatchFail);
        const folderPath = join(testDir, 'not-found');
        const requests = [];
        if (reuseExistingWatcher) {
            requests.push({ path: testDir, excludes: [], recursive: true });
            await watcher.watch(requests);
        }
        const request = { path: folderPath, excludes: [], recursive: true };
        requests.push(request);
        await watcher.watch(requests);
        await onDidWatchFail;
        if (reuseExistingWatcher) {
            assert.strictEqual(watcher.isSuspended(request), true);
        }
        else {
            assert.strictEqual(watcher.isSuspended(request), 'polling');
        }
        let changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
        let onDidWatch = Event.toPromise(watcher.onDidWatch);
        await promises.mkdir(folderPath);
        await changeFuture;
        await onDidWatch;
        assert.strictEqual(watcher.isSuspended(request), false);
        const filePath = join(folderPath, 'newFile.txt');
        await basicCrudTest(filePath);
        if (!reuseExistingWatcher) {
            onDidWatchFail = Event.toPromise(watcher.onWatchFail);
            await Promises.rm(folderPath);
            await onDidWatchFail;
            changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
            onDidWatch = Event.toPromise(watcher.onDidWatch);
            await promises.mkdir(folderPath);
            await changeFuture;
            await onDidWatch;
            await basicCrudTest(filePath);
        }
    }
    (!isMacintosh /* Linux/Windows: times out for some reason */ ? test.skip : test)('watch requests support suspend/resume (folder, exist in beginning, not reusing watcher)', async () => {
        await testWatchFolderExists(false);
    });
    test('watch requests support suspend/resume (folder, exist in beginning, reusing watcher)', async () => {
        await testWatchFolderExists(true);
    });
    async function testWatchFolderExists(reuseExistingWatcher) {
        const folderPath = join(testDir, 'deep');
        const requests = [{ path: folderPath, excludes: [], recursive: true }];
        if (reuseExistingWatcher) {
            requests.push({ path: testDir, excludes: [], recursive: true });
        }
        await watcher.watch(requests);
        const filePath = join(folderPath, 'newFile.txt');
        await basicCrudTest(filePath);
        if (!reuseExistingWatcher) {
            const onDidWatchFail = Event.toPromise(watcher.onWatchFail);
            await Promises.rm(folderPath);
            await onDidWatchFail;
            const changeFuture = awaitEvent(watcher, folderPath, 1 /* FileChangeType.ADDED */);
            const onDidWatch = Event.toPromise(watcher.onDidWatch);
            await promises.mkdir(folderPath);
            await changeFuture;
            await onDidWatch;
            await basicCrudTest(filePath);
        }
    }
    test('watch request reuses another recursive watcher even when requests are coming in at the same time', async function () {
        const folderPath1 = join(testDir, 'deep', 'not-existing1');
        const folderPath2 = join(testDir, 'deep', 'not-existing2');
        const folderPath3 = join(testDir, 'not-existing3');
        const requests = [
            { path: folderPath1, excludes: [], recursive: true, correlationId: 1 },
            { path: folderPath2, excludes: [], recursive: true, correlationId: 2 },
            { path: folderPath3, excludes: [], recursive: true, correlationId: 3 },
            { path: join(testDir, 'deep'), excludes: [], recursive: true }
        ];
        await watcher.watch(requests);
        assert.strictEqual(watcher.isSuspended(requests[0]), true);
        assert.strictEqual(watcher.isSuspended(requests[1]), true);
        assert.strictEqual(watcher.isSuspended(requests[2]), 'polling');
        assert.strictEqual(watcher.isSuspended(requests[3]), false);
    });
    test('event type filter', async function () {
        const request = { path: testDir, excludes: [], recursive: true, filter: 4 /* FileChangeFilter.ADDED */ | 8 /* FileChangeFilter.DELETED */, correlationId: 1 };
        await watcher.watch([request]);
        // Change file
        const filePath = join(testDir, 'lorem-newfile.txt');
        let changeFuture = awaitEvent(watcher, filePath, 1 /* FileChangeType.ADDED */, undefined, 1);
        await Promises.writeFile(filePath, 'Hello Change');
        await changeFuture;
        // Delete file
        changeFuture = awaitEvent(watcher, filePath, 2 /* FileChangeType.DELETED */, undefined, 1);
        await promises.unlink(filePath);
        await changeFuture;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyY2VsV2F0Y2hlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3Qvbm9kZS9wYXJjZWxXYXRjaGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXZFLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxhQUFhO0lBQXBEOztRQUU2Qix5Q0FBb0MsR0FBRyxHQUFHLENBQUM7UUFFdEQsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUMxRCxlQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFFcEMsZ0JBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQztJQTRCbkQsQ0FBQztJQTFCQSxLQUFLLENBQUMsMkJBQTJCLENBQUMsS0FBZSxFQUFFLFdBQXFCLEVBQUU7UUFFekUsaURBQWlEO1FBQ2pELE1BQU0sUUFBUSxHQUE2QixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzNELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEksQ0FBQztJQUVrQixzQkFBc0I7UUFDeEMsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRWtCLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBa0M7UUFDbEUsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRXZCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTO1FBQ2QsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCwyREFBMkQ7QUFDM0QsMERBQTBEO0FBQzFELDZEQUE2RDtBQUM3RCwwQ0FBMEM7QUFFMUMsS0FBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtJQUVuQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXBCLElBQUksT0FBZSxDQUFDO0lBQ3BCLElBQUksT0FBMEIsQ0FBQztJQUUvQixJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUM7SUFFM0IsU0FBUyxhQUFhLENBQUMsTUFBZTtRQUNyQyxjQUFjLEdBQUcsTUFBTSxDQUFDO1FBQ3hCLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRTlCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixPQUFPLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ2xDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUxQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNCLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDMUQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsNERBQTREO1FBQzVELDJEQUEyRDtRQUMzRCx5REFBeUQ7UUFDekQsd0NBQXdDO1FBQ3hDLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUVoRyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRTlGLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNuQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDckQsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUM7UUFDekIsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFO2dCQUNuQyxJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDdEIsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDcEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLG1EQUFtRCxDQUFDLENBQUM7UUFDcEcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRWxCLGtEQUFrRDtRQUNsRCxtREFBbUQ7UUFDbkQsbURBQW1EO1FBQ25ELGNBQWM7UUFDZCxPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxLQUFLLENBQUMsSUFBb0I7UUFDbEMsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLGlDQUF5QixDQUFDLENBQUMsT0FBTyxPQUFPLENBQUM7WUFDMUMsbUNBQTJCLENBQUMsQ0FBQyxPQUFPLFNBQVMsQ0FBQztZQUM5QyxPQUFPLENBQUMsQ0FBQyxPQUFPLFNBQVMsQ0FBQztRQUMzQixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssVUFBVSxVQUFVLENBQUMsT0FBMEIsRUFBRSxJQUFZLEVBQUUsSUFBb0IsRUFBRSxpQkFBMEIsRUFBRSxhQUE2QixFQUFFLGFBQXNCO1FBQzFLLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksR0FBRyxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksT0FBTyxDQUFnQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUNoRSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDaEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbkQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDNUIsSUFBSSwwQkFBMEIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssYUFBYSxDQUFDLEVBQUUsQ0FBQzt3QkFDMUosT0FBTyxFQUFFLENBQUM7d0JBQ1YsSUFBSSxPQUFPLGFBQWEsS0FBSyxRQUFRLElBQUksT0FBTyxHQUFHLGFBQWEsRUFBRSxDQUFDOzRCQUNsRSxTQUFTLENBQUMsVUFBVTt3QkFDckIsQ0FBQzt3QkFFRCxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3JCLElBQUksaUJBQWlCLEVBQUUsQ0FBQzs0QkFDdkIsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLDBCQUEwQixpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQzt3QkFDbEUsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLDRFQUE0RTt3QkFDbEgsQ0FBQzt3QkFDRCxNQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxtRUFBbUU7UUFDbkUsb0VBQW9FO1FBQ3BFLGVBQWU7UUFDZiwwREFBMEQ7UUFDMUQsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFakIsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsT0FBMEIsRUFBRSxJQUFtRDtRQUNwRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLElBQUksRUFBRSxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUVELG9CQUFvQjtRQUNwQixPQUFPLElBQUksT0FBTyxDQUFPLE9BQU8sQ0FBQyxFQUFFO1lBQ2xDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ2hELElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDdkIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNyQixPQUFPLEVBQUUsQ0FBQztnQkFDWCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUs7UUFDbkIsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQ2pFLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFL0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFNUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUUxQyxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztRQUN6RCxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztRQUV6RCxXQUFXO1FBQ1gsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDekQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwSCxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsK0JBQStCO1FBQ3BKLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsSUFBSSxZQUFZLEdBQXFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsV0FBVywrQkFBdUIsQ0FBQztRQUM1RixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sWUFBWSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsK0JBQXVCLENBQUM7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQywrQkFBdUIsQ0FBQztRQUUxRSxhQUFhO1FBQ2IsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDMUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0SCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDeEgsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDM0QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsYUFBYSwrQkFBdUIsQ0FBQztRQUN4RSxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDcEMsTUFBTSxZQUFZLENBQUM7UUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQywrQkFBdUIsQ0FBQztRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7UUFFOUcsY0FBYztRQUNkLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDL0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4SCxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUMxQixVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsaUNBQXlCO1lBQ3hELFVBQVUsQ0FBQyxPQUFPLEVBQUUsZUFBZSwrQkFBdUI7U0FDMUQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRCxNQUFNLFlBQVksQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGlDQUF5QixDQUFDO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsK0JBQXVCLENBQUM7UUFFOUUsZ0JBQWdCO1FBQ2hCLElBQUksaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUgsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxhQUFhLGlDQUF5QjtZQUMxRCxVQUFVLENBQUMsT0FBTyxFQUFFLGlCQUFpQiwrQkFBdUI7U0FDNUQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sWUFBWSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsaUNBQXlCLENBQUM7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLCtCQUF1QixDQUFDO1FBRWhGLDBDQUEwQztRQUMxQyxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDckUsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxlQUFlLGlDQUF5QjtZQUM1RCxVQUFVLENBQUMsT0FBTyxFQUFFLG1CQUFtQiwrQkFBdUI7U0FDOUQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVELE1BQU0sWUFBWSxDQUFDO1FBQ25CLGVBQWUsR0FBRyxtQkFBbUIsQ0FBQztRQUV0Qyw0Q0FBNEM7UUFDNUMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3RFLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQzFCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLGlDQUF5QjtZQUM5RCxVQUFVLENBQUMsT0FBTyxFQUFFLHFCQUFxQiwrQkFBdUI7U0FDaEUsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDaEUsTUFBTSxZQUFZLENBQUM7UUFDbkIsaUJBQWlCLEdBQUcscUJBQXFCLENBQUM7UUFFMUMsWUFBWTtRQUNaLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDckQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxlQUFlLGlDQUF5QjtZQUM1RCxVQUFVLENBQUMsT0FBTyxFQUFFLGFBQWEsK0JBQXVCO1NBQ3hELENBQUMsQ0FBQztRQUNILE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdEQsTUFBTSxZQUFZLENBQUM7UUFFbkIsY0FBYztRQUNkLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdEQsWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDMUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsaUNBQXlCO1lBQzlELFVBQVUsQ0FBQyxPQUFPLEVBQUUsZUFBZSwrQkFBdUI7U0FDMUQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzFELE1BQU0sWUFBWSxDQUFDO1FBRW5CLFlBQVk7UUFDWixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQy9ELFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGNBQWMsK0JBQXVCLENBQUM7UUFDekUsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN2RCxNQUFNLFlBQVksQ0FBQztRQUVuQixjQUFjO1FBQ2QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNoRSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsK0JBQXVCLENBQUM7UUFDM0UsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDcEYsTUFBTSxZQUFZLENBQUM7UUFFbkIsY0FBYztRQUNkLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGNBQWMsaUNBQXlCLENBQUM7UUFDM0UsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN6RCxNQUFNLFlBQVksQ0FBQztRQUVuQixrQkFBa0I7UUFDbEIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3ZFLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGtCQUFrQiwrQkFBdUIsQ0FBQztRQUM3RSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUNwRSxNQUFNLFlBQVksQ0FBQztRQUVuQixnQ0FBZ0M7UUFDaEMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLGtDQUEwQixpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2xILE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRWpELGdDQUFnQztRQUNoQyxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxrQkFBa0Isa0NBQTBCLDRCQUE0QixDQUFDLENBQUM7UUFDN0csTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEMsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFakQsa0NBQWtDO1FBQ2xDLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGdCQUFnQixrQ0FBMEIsNEJBQTRCLENBQUMsQ0FBQztRQUMzRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN0QyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUVqRCxjQUFjO1FBQ2QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxpQ0FBeUIsQ0FBQztRQUMzRSxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZILE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN0QyxNQUFNLFlBQVksQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGlDQUF5QixDQUFDO1FBRS9FLGdCQUFnQjtRQUNoQixZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsaUNBQXlCLENBQUM7UUFDN0UsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pILE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sWUFBWSxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBeUIsQ0FBQztRQUVqRixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLFdBQVcsQ0FBQyx3REFBd0QsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsd0JBQXdCLEVBQUUsS0FBSztRQUN4SCxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhFLHlCQUF5QjtRQUN6QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN2RCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsaUNBQXlCLENBQUM7UUFDOUUsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdEQsTUFBTSxZQUFZLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLENBQUMsT0FBTyxDQUFDLHNEQUFzRCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLO1FBQzdHLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU5RixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxVQUFVLGFBQWEsQ0FBQyxRQUFnQixFQUFFLGFBQTZCLEVBQUUsYUFBc0I7UUFFbkcsV0FBVztRQUNYLElBQUksWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxnQ0FBd0IsU0FBUyxFQUFFLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNoSCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sWUFBWSxDQUFDO1FBRW5CLGNBQWM7UUFDZCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLGtDQUEwQixTQUFTLEVBQUUsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlHLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkQsTUFBTSxZQUFZLENBQUM7UUFFbkIsY0FBYztRQUNkLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsa0NBQTBCLFNBQVMsRUFBRSxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDOUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sWUFBWSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSztRQUM1QixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFFckQsZUFBZTtRQUVmLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDcEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNwRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRXJFLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSwrQkFBdUIsQ0FBQztRQUM3RSxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksK0JBQXVCLENBQUM7UUFDN0UsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLCtCQUF1QixDQUFDO1FBQzdFLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSwrQkFBdUIsQ0FBQztRQUM3RSxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksK0JBQXVCLENBQUM7UUFDN0UsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLCtCQUF1QixDQUFDO1FBRTdFLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztZQUN2RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztZQUN2RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztZQUN2RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztZQUN2RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztZQUN2RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQztTQUN2RCxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFeEcsa0JBQWtCO1FBRWxCLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxpQ0FBeUIsQ0FBQztRQUNoRixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksaUNBQXlCLENBQUM7UUFDaEYsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLGlDQUF5QixDQUFDO1FBQ2hGLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxpQ0FBeUIsQ0FBQztRQUNoRixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksaUNBQXlCLENBQUM7UUFDaEYsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLGlDQUF5QixDQUFDO1FBRWhGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDO1lBQ3hELE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQztZQUN4RCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDO1lBQ3hELE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEQsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQztTQUN4RCxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFOUcsMkJBQTJCO1FBRTNCLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxlQUFlLENBQUMsK0JBQXVCLENBQUM7UUFDcEgsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGVBQWUsQ0FBQywrQkFBdUIsQ0FBQztRQUNwSCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZUFBZSxDQUFDLCtCQUF1QixDQUFDO1FBQ3BILE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQywrQkFBdUIsQ0FBQztRQUVuRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXRILE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFFeEUsaUNBQWlDO1FBRWpDLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxpQ0FBeUIsQ0FBQztRQUNoRixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksaUNBQXlCLENBQUM7UUFDaEYsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLGlDQUF5QixDQUFDO1FBQ2hGLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxpQ0FBeUIsQ0FBQztRQUNoRixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFlBQVksaUNBQXlCLENBQUM7UUFDaEYsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLGlDQUF5QixDQUFDO1FBRWhGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO1lBQ25DLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDbkMsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztZQUNuQyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO1lBQ25DLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7WUFDbkMsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFFOUcsMkJBQTJCO1FBRTNCLE1BQU0sbUJBQW1CLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxpQ0FBeUIsQ0FBQztRQUN4RyxNQUFNLG1CQUFtQixHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxpQ0FBeUIsQ0FBQztRQUU3RyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFekosTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUs7UUFDckQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhILG1CQUFtQjtRQUNuQixJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMzRCxJQUFJLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLGVBQWUsK0JBQXVCLENBQUM7UUFDOUUsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN6RCxNQUFNLFlBQVksQ0FBQztRQUVuQixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlILGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN4RCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxlQUFlLCtCQUF1QixDQUFDO1FBQzFFLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDekQsTUFBTSxZQUFZLENBQUM7UUFFbkIsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNHLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN4RCxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxlQUFlLCtCQUF1QixDQUFDO1FBQzFFLE1BQU0sUUFBUSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDekQsTUFBTSxZQUFZLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSztRQUNoRCxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDbkIsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtZQUNoRCxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQ3hFLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtTQUN4RSxDQUFDLENBQUM7UUFFSCxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEtBQUs7UUFDekQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0YsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV4RSxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEtBQUs7UUFDekQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhFLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSztRQUNuQyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWxHLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUUsS0FBSztRQUMvRCxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBJLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0RBQW9ELEVBQUUsS0FBSztRQUMvRCxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEcsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUM1RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxLQUFLO1FBQzFDLE9BQU8sWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsT0FBTyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxVQUFVLFlBQVksQ0FBQyxRQUFrQjtRQUM3QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEUsbUJBQW1CO1FBQ25CLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzdELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsZUFBZSwrQkFBdUIsQ0FBQztRQUNoRixNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRXpELE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztZQUM3QixZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQztTQUM5QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixNQUFNLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDeEMsQ0FBQztJQUNGLENBQUM7SUFFRCxDQUFDLFNBQVMsQ0FBQyx3RUFBd0UsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsd0JBQXdCLEVBQUUsS0FBSztRQUN0SSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDekMsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6QyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXJFLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsU0FBUyxDQUFDLHdFQUF3RSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLO1FBQ2pKLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRXpDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXZILE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsRUFBRSxLQUFLO1FBQzdFLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5DLDREQUE0RDtRQUM1RCxNQUFNLE9BQU8sR0FBRyxrQkFBa0IsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUV0SSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhFLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEtBQUs7UUFDaEYsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWpELE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVuRixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLO1FBQzVDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFN0MsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDLENBQUMsQ0FBQztJQUVILENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyw2REFBNkQsRUFBRSxLQUFLO1FBQ3pILE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFMUMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU1RSxnQ0FBZ0M7UUFDaEMsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNqRCxNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxNQUFNLFVBQVUsQ0FBQztRQUVqQix1QkFBdUI7UUFDdkIsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyw4REFBOEQ7UUFDbkYsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMscUJBQXFCO1FBQzFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRTFCLDhCQUE4QjtRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsV0FBVywrQkFBdUIsQ0FBQztRQUM1RSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sWUFBWSxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUs7UUFDdkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXZGLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN4RixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUMxRyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQ3pJLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzlGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDbkgsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3BHLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0SCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2xJLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxPQUFPLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BILENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdEcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM5RyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyRyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2xILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNGLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQztZQUNuQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsMEJBQTBCO1FBQzFCLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQztZQUNuQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7WUFDbEUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxHQUFHO1lBQ25FLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRTtTQUMxRSxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhFLCtCQUErQjtRQUMvQixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDbkIsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFO1lBQ2xFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRTtZQUNsRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUU7WUFDMUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7WUFDckcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7U0FDdEcsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoRSxtQ0FBbUM7UUFDbkMsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDO1lBQ25CLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRTtZQUMzRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7WUFDbEUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRTtTQUNoRixDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkUsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFeEUsd0NBQXdDO1FBQ3hDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQztZQUNuQixFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7WUFDM0UsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7WUFDckcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFO1NBQ3BILENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLGFBQWEsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRSxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLO1FBQzNELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFckUsTUFBTSxjQUFjLENBQUM7SUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUVBQXlFLEVBQUUsS0FBSztRQUNwRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXpDLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUU3RixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDbkIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3ZELFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBRXhDLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxrQ0FBMEIsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNGLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzQyxNQUFNLGNBQWMsQ0FBQztRQUNyQixNQUFNLFlBQVksQ0FBQztRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxDQUFDLENBQUMsV0FBVyxDQUFDLDhDQUE4QyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxrR0FBa0csRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvTCxNQUFNLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzFDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhGQUE4RixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9HLE1BQU0sMkJBQTJCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLFVBQVUsMkJBQTJCLENBQUMsb0JBQTZCO1FBQ3ZFLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTFELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFOUMsTUFBTSxRQUFRLEdBQTZCLEVBQUUsQ0FBQztRQUM5QyxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUEyQixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDNUYsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV2QixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUIsTUFBTSxjQUFjLENBQUM7UUFFckIsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxVQUFVLCtCQUF1QixDQUFDO1FBQ3pFLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNqQyxNQUFNLFlBQVksQ0FBQztRQUNuQixNQUFNLFVBQVUsQ0FBQztRQUVqQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNqRCxNQUFNLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUU5QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixjQUFjLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEQsTUFBTSxRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sY0FBYyxDQUFDO1lBRXJCLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsK0JBQXVCLENBQUM7WUFDckUsVUFBVSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNqQyxNQUFNLFlBQVksQ0FBQztZQUNuQixNQUFNLFVBQVUsQ0FBQztZQUVqQixNQUFNLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVELENBQUMsQ0FBQyxXQUFXLENBQUMsOENBQThDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLHlGQUF5RixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RMLE1BQU0scUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUZBQXFGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEcsTUFBTSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssVUFBVSxxQkFBcUIsQ0FBQyxvQkFBNkI7UUFDakUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV6QyxNQUFNLFFBQVEsR0FBNkIsQ0FBQyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNqRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTlCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDakQsTUFBTSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFOUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDM0IsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUQsTUFBTSxRQUFRLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlCLE1BQU0sY0FBYyxDQUFDO1lBRXJCLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsVUFBVSwrQkFBdUIsQ0FBQztZQUMzRSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUN2RCxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDakMsTUFBTSxZQUFZLENBQUM7WUFDbkIsTUFBTSxVQUFVLENBQUM7WUFFakIsTUFBTSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsa0dBQWtHLEVBQUUsS0FBSztRQUM3RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMzRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRW5ELE1BQU0sUUFBUSxHQUE2QjtZQUMxQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUU7WUFDdEUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFO1lBQ3RFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRTtZQUN0RSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtTQUM5RCxDQUFDO1FBRUYsTUFBTSxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQkFBbUIsRUFBRSxLQUFLO1FBQzlCLE1BQU0sT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLGlFQUFpRCxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUM5SSxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRS9CLGNBQWM7UUFDZCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDcEQsSUFBSSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxRQUFRLGdDQUF3QixTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckYsTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFlBQVksQ0FBQztRQUVuQixjQUFjO1FBQ2QsWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxrQ0FBMEIsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoQyxNQUFNLFlBQVksQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=