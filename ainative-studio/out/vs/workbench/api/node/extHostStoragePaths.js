/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionStoragePaths as CommonExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { IntervalTimer, timeout } from '../../../base/common/async.js';
import { Promises } from '../../../base/node/pfs.js';
export class ExtensionStoragePaths extends CommonExtensionStoragePaths {
    constructor() {
        super(...arguments);
        this._workspaceStorageLock = null;
    }
    async _getWorkspaceStorageURI(storageName) {
        const workspaceStorageURI = await super._getWorkspaceStorageURI(storageName);
        if (workspaceStorageURI.scheme !== Schemas.file) {
            return workspaceStorageURI;
        }
        if (this._environment.skipWorkspaceStorageLock) {
            this._logService.info(`Skipping acquiring lock for ${workspaceStorageURI.fsPath}.`);
            return workspaceStorageURI;
        }
        const workspaceStorageBase = workspaceStorageURI.fsPath;
        let attempt = 0;
        do {
            let workspaceStoragePath;
            if (attempt === 0) {
                workspaceStoragePath = workspaceStorageBase;
            }
            else {
                workspaceStoragePath = (/[/\\]$/.test(workspaceStorageBase)
                    ? `${workspaceStorageBase.substr(0, workspaceStorageBase.length - 1)}-${attempt}`
                    : `${workspaceStorageBase}-${attempt}`);
            }
            await mkdir(workspaceStoragePath);
            const lockfile = path.join(workspaceStoragePath, 'vscode.lock');
            const lock = await tryAcquireLock(this._logService, lockfile, false);
            if (lock) {
                this._workspaceStorageLock = lock;
                process.on('exit', () => {
                    lock.dispose();
                });
                return URI.file(workspaceStoragePath);
            }
            attempt++;
        } while (attempt < 10);
        // just give up
        return workspaceStorageURI;
    }
    onWillDeactivateAll() {
        // the lock will be released soon
        this._workspaceStorageLock?.setWillRelease(6000);
    }
}
async function mkdir(dir) {
    try {
        await fs.promises.stat(dir);
        return;
    }
    catch {
        // doesn't exist, that's OK
    }
    try {
        await fs.promises.mkdir(dir, { recursive: true });
    }
    catch {
    }
}
const MTIME_UPDATE_TIME = 1000; // 1s
const STALE_LOCK_TIME = 10 * 60 * 1000; // 10 minutes
class Lock extends Disposable {
    constructor(logService, filename) {
        super();
        this.logService = logService;
        this.filename = filename;
        this._timer = this._register(new IntervalTimer());
        this._timer.cancelAndSet(async () => {
            const contents = await readLockfileContents(logService, filename);
            if (!contents || contents.pid !== process.pid) {
                // we don't hold the lock anymore ...
                logService.info(`Lock '${filename}': The lock was lost unexpectedly.`);
                this._timer.cancel();
            }
            try {
                await fs.promises.utimes(filename, new Date(), new Date());
            }
            catch (err) {
                logService.error(err);
                logService.info(`Lock '${filename}': Could not update mtime.`);
            }
        }, MTIME_UPDATE_TIME);
    }
    dispose() {
        super.dispose();
        try {
            fs.unlinkSync(this.filename);
        }
        catch (err) { }
    }
    async setWillRelease(timeUntilReleaseMs) {
        this.logService.info(`Lock '${this.filename}': Marking the lockfile as scheduled to be released in ${timeUntilReleaseMs} ms.`);
        try {
            const contents = {
                pid: process.pid,
                willReleaseAt: Date.now() + timeUntilReleaseMs
            };
            await Promises.writeFile(this.filename, JSON.stringify(contents), { flag: 'w' });
        }
        catch (err) {
            this.logService.error(err);
        }
    }
}
/**
 * Attempt to acquire a lock on a directory.
 * This does not use the real `flock`, but uses a file.
 * @returns a disposable if the lock could be acquired or null if it could not.
 */
async function tryAcquireLock(logService, filename, isSecondAttempt) {
    try {
        const contents = {
            pid: process.pid,
            willReleaseAt: 0
        };
        await Promises.writeFile(filename, JSON.stringify(contents), { flag: 'wx' });
    }
    catch (err) {
        logService.error(err);
    }
    // let's see if we got the lock
    const contents = await readLockfileContents(logService, filename);
    if (!contents || contents.pid !== process.pid) {
        // we didn't get the lock
        if (isSecondAttempt) {
            logService.info(`Lock '${filename}': Could not acquire lock, giving up.`);
            return null;
        }
        logService.info(`Lock '${filename}': Could not acquire lock, checking if the file is stale.`);
        return checkStaleAndTryAcquireLock(logService, filename);
    }
    // we got the lock
    logService.info(`Lock '${filename}': Lock acquired.`);
    return new Lock(logService, filename);
}
/**
 * @returns 0 if the pid cannot be read
 */
async function readLockfileContents(logService, filename) {
    let contents;
    try {
        contents = await fs.promises.readFile(filename);
    }
    catch (err) {
        // cannot read the file
        logService.error(err);
        return null;
    }
    try {
        return JSON.parse(String(contents));
    }
    catch (err) {
        // cannot parse the file
        logService.error(err);
        return null;
    }
}
/**
 * @returns 0 if the mtime cannot be read
 */
async function readmtime(logService, filename) {
    let stats;
    try {
        stats = await fs.promises.stat(filename);
    }
    catch (err) {
        // cannot read the file stats to check if it is stale or not
        logService.error(err);
        return 0;
    }
    return stats.mtime.getTime();
}
function processExists(pid) {
    try {
        process.kill(pid, 0); // throws an exception if the process doesn't exist anymore.
        return true;
    }
    catch (e) {
        return false;
    }
}
async function checkStaleAndTryAcquireLock(logService, filename) {
    const contents = await readLockfileContents(logService, filename);
    if (!contents) {
        logService.info(`Lock '${filename}': Could not read pid of lock holder.`);
        return tryDeleteAndAcquireLock(logService, filename);
    }
    if (contents.willReleaseAt) {
        let timeUntilRelease = contents.willReleaseAt - Date.now();
        if (timeUntilRelease < 5000) {
            if (timeUntilRelease > 0) {
                logService.info(`Lock '${filename}': The lockfile is scheduled to be released in ${timeUntilRelease} ms.`);
            }
            else {
                logService.info(`Lock '${filename}': The lockfile is scheduled to have been released.`);
            }
            while (timeUntilRelease > 0) {
                await timeout(Math.min(100, timeUntilRelease));
                const mtime = await readmtime(logService, filename);
                if (mtime === 0) {
                    // looks like the lock was released
                    return tryDeleteAndAcquireLock(logService, filename);
                }
                timeUntilRelease = contents.willReleaseAt - Date.now();
            }
            return tryDeleteAndAcquireLock(logService, filename);
        }
    }
    if (!processExists(contents.pid)) {
        logService.info(`Lock '${filename}': The pid ${contents.pid} appears to be gone.`);
        return tryDeleteAndAcquireLock(logService, filename);
    }
    const mtime1 = await readmtime(logService, filename);
    const elapsed1 = Date.now() - mtime1;
    if (elapsed1 <= STALE_LOCK_TIME) {
        // the lock does not look stale
        logService.info(`Lock '${filename}': The lock does not look stale, elapsed: ${elapsed1} ms, giving up.`);
        return null;
    }
    // the lock holder updates the mtime every 1s.
    // let's give it a chance to update the mtime
    // in case of a wake from sleep or something similar
    logService.info(`Lock '${filename}': The lock looks stale, waiting for 2s.`);
    await timeout(2000);
    const mtime2 = await readmtime(logService, filename);
    const elapsed2 = Date.now() - mtime2;
    if (elapsed2 <= STALE_LOCK_TIME) {
        // the lock does not look stale
        logService.info(`Lock '${filename}': The lock does not look stale, elapsed: ${elapsed2} ms, giving up.`);
        return null;
    }
    // the lock looks stale
    logService.info(`Lock '${filename}': The lock looks stale even after waiting for 2s.`);
    return tryDeleteAndAcquireLock(logService, filename);
}
async function tryDeleteAndAcquireLock(logService, filename) {
    logService.info(`Lock '${filename}': Deleting a stale lock.`);
    try {
        await fs.promises.unlink(filename);
    }
    catch (err) {
        // cannot delete the file
        // maybe the file is already deleted
    }
    return tryAcquireLock(logService, filename, true);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2VQYXRocy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdFN0b3JhZ2VQYXRocy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUscUJBQXFCLElBQUksMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRXJELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSwyQkFBMkI7SUFBdEU7O1FBRVMsMEJBQXFCLEdBQWdCLElBQUksQ0FBQztJQWtEbkQsQ0FBQztJQWhEbUIsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFdBQW1CO1FBQ25FLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxLQUFLLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDN0UsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2pELE9BQU8sbUJBQW1CLENBQUM7UUFDNUIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lB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