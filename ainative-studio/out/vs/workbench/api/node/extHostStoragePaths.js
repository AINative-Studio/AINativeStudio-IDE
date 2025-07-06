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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2VQYXRocy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RTdG9yYWdlUGF0aHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixJQUFJLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVyRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsMkJBQTJCO0lBQXRFOztRQUVTLDBCQUFxQixHQUFnQixJQUFJLENBQUM7SUFrRG5ELENBQUM7SUFoRG1CLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxXQUFtQjtRQUNuRSxNQUFNLG1CQUFtQixHQUFHLE1BQU0sS0FBSyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzdFLElBQUksbUJBQW1CLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqRCxPQUFPLG1CQUFtQixDQUFDO1FBQzVCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsd0JBQXdCLEVBQUUsQ0FB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